import type { EditorState } from '../types/editor'
import { captionFontFamily } from './captionStyle'

export type ExportFormat = 'png' | 'jpeg'
export type ExportOptions = { format: ExportFormat; width: number; height: number; quality: number }

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not load the generated image for export.'))
    image.src = url
  })
}

function canvasBlob(canvas: HTMLCanvasElement, format: ExportFormat, quality: number): Promise<Blob> {
  const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png'
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not create the exported image.')), mime, quality / 100))
}

export async function renderComposition(state: EditorState, options?: ExportOptions): Promise<Blob> {
  const imageUrl = state.generation.resultUrl ?? state.originalUrl
  if (!imageUrl || state.imageWidth <= 0 || state.imageHeight <= 0) throw new Error('Upload an image before exporting.')
  const output = options ?? { format: 'png' as const, width: state.imageWidth, height: state.imageHeight, quality: 92 }
  const canvas = document.createElement('canvas')
  canvas.width = output.width
  canvas.height = output.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Your browser could not create an export canvas.')
  const image = await loadImage(imageUrl)
  context.drawImage(image, 0, 0, output.width, output.height)

  if (state.caption.visible && state.caption.text) {
    context.save()
    context.font = `700 ${Math.max(16, 64 * (output.width / 960) * state.caption.scale)}px ${captionFontFamily(state.caption.fontFamily)}`
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
  return canvasBlob(canvas, output.format, output.quality)
}

export async function downloadComposition(state: EditorState, options?: ExportOptions): Promise<void> {
  const output = options ?? { format: 'png' as const, width: state.imageWidth, height: state.imageHeight, quality: 92 }
  const blob = await renderComposition(state, output)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  const extension = output.format === 'jpeg' ? 'jpg' : 'png'
  anchor.download = `${state.imageFile?.name.replace(/\.[^.]+$/, '') ?? 'sonify'}-son.${extension}`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
