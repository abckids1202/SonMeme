import type { EditorState } from '../types/editor'
import { renderFaceLayer } from './faceCompositor'

export type ExportFormat = 'png' | 'jpeg' | 'webp'
export type ExportOptions = { format: ExportFormat; width: number; height: number; quality: number }

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not load an image for export.'))
    image.src = url
  })
}

function canvasBlob(canvas: HTMLCanvasElement, format: ExportFormat, quality: number): Promise<Blob> {
  const mime = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png'
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not create the exported image.'))), mime, quality / 100)
  })
}

export async function renderComposition(state: EditorState, options?: ExportOptions): Promise<Blob> {
  if (!state.originalUrl || state.imageWidth <= 0 || state.imageHeight <= 0) throw new Error('Upload an image before exporting.')
  const output = options ?? { format: 'png' as const, width: state.imageWidth, height: state.imageHeight, quality: 92 }
  const canvas = document.createElement('canvas')
  canvas.width = output.width
  canvas.height = output.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Your browser could not create an export canvas.')
  const original = await loadImage(state.originalUrl)
  const aiResult = state.generation.active && state.generation.resultUrl ? await loadImage(state.generation.resultUrl) : null
  context.drawImage(aiResult ?? original, 0, 0, output.width, output.height)

  const layer = state.sonFace
  if (!aiResult && layer.width > 0 && layer.height > 0 && state.sourceFaceUrl && state.sourceConfirmed) {
    const layerWidth = Math.max(2, Math.round(layer.width * output.width))
    const layerHeight = Math.max(2, Math.round(layer.height * output.height))
    const faceUrl = await renderFaceLayer(state.sourceFaceUrl, state.sourceCrop, state.sourceMask, layer.distortCorners, layerWidth, layerHeight)
    const face = await loadImage(faceUrl)
    context.save()
    context.globalAlpha = layer.opacity
    context.globalCompositeOperation = layer.blend === 'soft' ? 'multiply' : 'source-over'
    context.translate((layer.x + layer.width / 2) * output.width, (layer.y + layer.height / 2) * output.height)
    context.rotate((layer.rotation * Math.PI) / 180)
    context.drawImage(face, -layerWidth / 2, -layerHeight / 2, layerWidth, layerHeight)
    context.restore()
  }

  if (state.caption.visible && state.caption.text) {
    context.save()
    context.font = `700 ${Math.max(16, 64 * (output.width / 960) * state.caption.scale)}px Impact, Arial Black, sans-serif`
    context.textBaseline = 'top'
    context.lineJoin = 'round'
    context.lineWidth = Math.max(3, 7 * (output.width / 960))
    context.strokeStyle = '#050505'
    context.fillStyle = '#ffffff'
    context.translate(state.caption.x * output.width, state.caption.y * output.height)
    context.rotate((state.caption.rotation * Math.PI) / 180)
    context.strokeText(state.caption.text, 0, 0)
    context.fillText(state.caption.text, 0, 0)
    context.restore()
  }
  if (aiResult) {
    context.save()
    context.font = `600 ${Math.max(11, 16 * (output.width / 960))}px Inter, Arial, sans-serif`
    context.textBaseline = 'bottom'
    context.textAlign = 'right'
    context.fillStyle = 'rgba(255, 255, 255, 0.82)'
    context.strokeStyle = 'rgba(0, 0, 0, 0.72)'
    context.lineWidth = Math.max(2, 4 * (output.width / 960))
    const label = 'AI-generated parody'
    context.strokeText(label, output.width - 18, output.height - 14)
    context.fillText(label, output.width - 18, output.height - 14)
    context.restore()
  }
  return canvasBlob(canvas, output.format, output.quality)
}

export async function downloadComposition(state: EditorState, options?: ExportOptions): Promise<void> {
  const output = options ?? { format: 'png' as const, width: state.imageWidth, height: state.imageHeight, quality: 92 }
  const blob = await renderComposition(state, output)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${state.imageFile?.name.replace(/\.[^.]+$/, '') ?? 'sonify'}-son.${output.format}`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
