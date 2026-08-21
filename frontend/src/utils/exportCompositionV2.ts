import type { EditorState, SonFaceLayerState } from '../types/editor'

export type ExportFormat = 'png' | 'jpeg' | 'webp'
export type ExportOptions = {
  format: ExportFormat
  width: number
  height: number
  quality: number
}

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

function affineFromTriangles(source: [number, number][], target: [number, number][]) {
  const [s0, s1, s2] = source
  const [t0, t1, t2] = target
  const determinant = s0[0] * (s1[1] - s2[1]) + s1[0] * (s2[1] - s0[1]) + s2[0] * (s0[1] - s1[1])
  if (Math.abs(determinant) < 0.00001) return null
  const inverse = [
    [(s1[1] - s2[1]) / determinant, (s2[0] - s1[0]) / determinant, (s1[0] * s2[1] - s2[0] * s1[1]) / determinant],
    [(s2[1] - s0[1]) / determinant, (s0[0] - s2[0]) / determinant, (s2[0] * s0[1] - s0[0] * s2[1]) / determinant],
    [(s0[1] - s1[1]) / determinant, (s1[0] - s0[0]) / determinant, (s0[0] * s1[1] - s1[0] * s0[1]) / determinant],
  ]
  return {
    a: t0[0] * inverse[0][0] + t1[0] * inverse[1][0] + t2[0] * inverse[2][0],
    c: t0[0] * inverse[0][1] + t1[0] * inverse[1][1] + t2[0] * inverse[2][1],
    e: t0[0] * inverse[0][2] + t1[0] * inverse[1][2] + t2[0] * inverse[2][2],
    b: t0[1] * inverse[0][0] + t1[1] * inverse[1][0] + t2[1] * inverse[2][0],
    d: t0[1] * inverse[0][1] + t1[1] * inverse[1][1] + t2[1] * inverse[2][1],
    f: t0[1] * inverse[0][2] + t1[1] * inverse[1][2] + t2[1] * inverse[2][2],
  }
}

function meshTriangles() {
  const triangles: number[][] = []
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      const topLeft = row * 4 + column
      triangles.push([topLeft, topLeft + 1, topLeft + 5], [topLeft, topLeft + 5, topLeft + 4])
    }
  }
  return triangles
}

function drawMeshFace(target: CanvasRenderingContext2D, source: HTMLImageElement, layer: SonFaceLayerState, width: number, height: number) {
  const faceCanvas = document.createElement('canvas')
  faceCanvas.width = width
  faceCanvas.height = height
  const faceContext = faceCanvas.getContext('2d')
  if (!faceContext) return
  const mesh = layer.mesh
  for (const indices of meshTriangles()) {
    const sourcePoints = indices.map((index) => [mesh[index].sourceX * source.width, mesh[index].sourceY * source.height] as [number, number])
    const targetPoints = indices.map((index) => [mesh[index].targetX * width, mesh[index].targetY * height] as [number, number])
    const transform = affineFromTriangles(sourcePoints, targetPoints)
    if (!transform) continue
    faceContext.save()
    faceContext.beginPath()
    faceContext.moveTo(targetPoints[0][0], targetPoints[0][1])
    targetPoints.slice(1).forEach((point) => faceContext.lineTo(point[0], point[1]))
    faceContext.closePath()
    faceContext.clip()
    faceContext.setTransform(transform.a, transform.b, transform.c, transform.d, transform.e, transform.f)
    faceContext.drawImage(source, 0, 0)
    faceContext.restore()
  }
  if (layer.mask.length >= 3) {
    faceContext.save()
    faceContext.globalCompositeOperation = 'destination-in'
    faceContext.beginPath()
    faceContext.moveTo(layer.mask[0].x * width, layer.mask[0].y * height)
    layer.mask.slice(1).forEach((point) => faceContext.lineTo(point.x * width, point.y * height))
    faceContext.closePath()
    faceContext.fill()
    faceContext.restore()
  }
  target.save()
  target.globalAlpha = layer.opacity
  target.globalCompositeOperation = layer.blend === 'soft' ? 'multiply' : 'source-over'
  target.translate(layer.x * (target.canvas.width) + width / 2, layer.y * target.canvas.height + height / 2)
  target.rotate((layer.rotation * Math.PI) / 180)
  target.drawImage(faceCanvas, -width / 2, -height / 2, width, height)
  target.restore()
}

function drawLayerPreview(target: CanvasRenderingContext2D, image: HTMLImageElement, layer: SonFaceLayerState, width: number, height: number, outputWidth: number, outputHeight: number) {
  target.save()
  target.globalAlpha = layer.opacity
  target.globalCompositeOperation = layer.blend === 'soft' ? 'multiply' : 'source-over'
  target.translate(layer.x * outputWidth + width / 2, layer.y * outputHeight + height / 2)
  target.rotate((layer.rotation * Math.PI) / 180)
  target.drawImage(image, -width / 2, -height / 2, width, height)
  target.restore()
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
  context.drawImage(original, 0, 0, output.width, output.height)

  const layer = state.sonFace
  if (layer.width > 0 && layer.height > 0 && state.sourceFaceUrl) {
    const width = Math.max(2, Math.round(layer.width * output.width))
    const height = Math.max(2, Math.round(layer.height * output.height))
    const source = await loadImage(state.sourceFaceUrl)
    if (layer.warpedPreviewUrl) {
      drawLayerPreview(context, await loadImage(layer.warpedPreviewUrl), layer, width, height, output.width, output.height)
    } else {
      drawMeshFace(context, source, layer, width, height)
    }
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
