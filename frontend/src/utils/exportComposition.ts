import type { EditorState } from '../types/editor'

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not load an image for export.'))
    image.src = url
  })
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not create the exported image.'))), 'image/png')
  })
}

export async function renderComposition(state: EditorState): Promise<Blob> {
  if (!state.originalUrl || state.imageWidth <= 0 || state.imageHeight <= 0) throw new Error('Upload an image before exporting.')
  const canvas = document.createElement('canvas')
  canvas.width = state.imageWidth
  canvas.height = state.imageHeight
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Your browser could not create an export canvas.')

  const original = await loadImage(state.originalUrl)
  context.drawImage(original, 0, 0, state.imageWidth, state.imageHeight)

  const face = state.faces.find((item) => item.id === state.selectedFaceId)
  if (face && state.sourceFaceUrl) {
    try {
      const source = await loadImage(state.sourceFaceUrl)
      const target = {
        x: face.bbox.x * state.imageWidth,
        y: face.bbox.y * state.imageHeight,
        width: face.bbox.width * state.imageWidth,
        height: face.bbox.height * state.imageHeight,
      }
      const expansion = state.faceTransform.maskExpansion / 100
      const maskWidth = target.width * (1 + expansion * 2)
      const maskHeight = target.height * (1 + expansion * 2)
      const maskX = target.x - target.width * expansion
      const maskY = target.y - target.height * expansion
      const x = target.x + target.width * state.faceTransform.offsetX
      const y = target.y + target.height * state.faceTransform.offsetY
      const width = target.width * state.faceTransform.scale
      const height = target.height * state.faceTransform.scale

      context.save()
      context.beginPath()
      context.ellipse(maskX + maskWidth / 2, maskY + maskHeight / 2, maskWidth / 2, maskHeight / 2, 0, 0, Math.PI * 2)
      context.clip()
      context.globalAlpha = state.faceTransform.blendStrength
      context.translate(x + width / 2, y + height / 2)
      context.rotate((state.faceTransform.rotation * Math.PI) / 180)
      context.transform(1, Math.tan((state.faceTransform.skewY * Math.PI) / 180), Math.tan((state.faceTransform.skewX * Math.PI) / 180), 1, 0, 0)
      context.drawImage(source, -width / 2, -height / 2, width, height)
      context.restore()
    } catch {
      // The original image remains exportable if an optional source layer fails.
    }
  }

  const scale = state.imageWidth / 960
  if (state.caption.visible && state.caption.text) {
    const fontSize = Math.max(12, state.caption.fontSize * scale)
    const x = state.caption.x * state.imageWidth
    const y = state.caption.y * state.imageHeight
    context.save()
    context.font = `700 ${fontSize}px Impact, Arial Black, sans-serif`
    context.textBaseline = 'top'
    context.lineJoin = 'round'
    context.lineWidth = state.caption.strokeWidth * scale
    context.strokeStyle = '#050505'
    context.fillStyle = '#ffffff'
    context.translate(x, y)
    context.rotate((state.caption.rotation * Math.PI) / 180)
    context.strokeText(state.caption.text, 0, 0)
    context.fillText(state.caption.text, 0, 0)
    context.restore()
  }
  if (state.emoji.visible) {
    const fontSize = Math.max(14, state.emoji.size * scale)
    context.save()
    context.font = `${fontSize}px sans-serif`
    context.textBaseline = 'top'
    context.globalAlpha = state.emoji.opacity
    context.translate(state.emoji.x * state.imageWidth, state.emoji.y * state.imageHeight)
    context.rotate((state.emoji.rotation * Math.PI) / 180)
    context.fillText({ crying: '😭', sob: '😢', skull: '💀' }[state.emoji.value], 0, 0)
    context.restore()
  }
  return canvasBlob(canvas)
}

export async function downloadComposition(state: EditorState): Promise<void> {
  const blob = await renderComposition(state)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${state.imageFile?.name.replace(/\.[^.]+$/, '') ?? 'sonify'}-son.png`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
