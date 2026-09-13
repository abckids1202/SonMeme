import type { NormalizedBox, NormalizedPoint, SonFaceLayerState } from '../types/editor'

type Affine = { a: number; b: number; c: number; d: number; e: number; f: number }

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not load the face source.'))
    image.src = url
  })
}

function affineFromTriangles(source: [number, number][], target: [number, number][]): Affine | null {
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

function clampCrop(crop: NormalizedBox): NormalizedBox {
  const x = Math.max(0, Math.min(0.98, crop.x))
  const y = Math.max(0, Math.min(0.98, crop.y))
  const width = Math.max(0.02, Math.min(1 - x, crop.width))
  const height = Math.max(0.02, Math.min(1 - y, crop.height))
  return { x, y, width, height }
}

function drawTriangle(
  context: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  sourcePoints: [number, number][],
  targetPoints: [number, number][],
) {
  const transform = affineFromTriangles(sourcePoints, targetPoints)
  if (!transform) return
  context.save()
  context.beginPath()
  context.moveTo(targetPoints[0][0], targetPoints[0][1])
  targetPoints.slice(1).forEach((point) => context.lineTo(point[0], point[1]))
  context.closePath()
  context.clip()
  context.setTransform(transform.a, transform.b, transform.c, transform.d, transform.e, transform.f)
  context.drawImage(source, 0, 0)
  context.restore()
}

function sourceCanvas(image: HTMLImageElement, crop: NormalizedBox, mask: NormalizedPoint[], width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Your browser could not create a face canvas.')
  const safeCrop = clampCrop(crop)
  context.drawImage(image, safeCrop.x * image.naturalWidth, safeCrop.y * image.naturalHeight, safeCrop.width * image.naturalWidth, safeCrop.height * image.naturalHeight, 0, 0, width, height)
  if (mask.length >= 3) {
    context.save()
    context.globalCompositeOperation = 'destination-in'
    context.beginPath()
    context.moveTo(mask[0].x * width, mask[0].y * height)
    mask.slice(1).forEach((point) => context.lineTo(point.x * width, point.y * height))
    context.closePath()
    context.fill()
    context.restore()
  }
  return canvas
}

export async function renderFaceLayer(
  sourceUrl: string,
  crop: NormalizedBox,
  mask: NormalizedPoint[],
  corners: SonFaceLayerState['distortCorners'],
  width: number,
  height: number,
): Promise<string> {
  const image = await loadImage(sourceUrl)
  const outputWidth = Math.max(2, Math.round(width))
  const outputHeight = Math.max(2, Math.round(height))
  const source = sourceCanvas(image, crop, mask, outputWidth, outputHeight)
  const output = document.createElement('canvas')
  output.width = outputWidth
  output.height = outputHeight
  const context = output.getContext('2d')
  if (!context) throw new Error('Your browser could not create a face preview.')
  const sourcePoints: [number, number][] = [[0, 0], [outputWidth, 0], [outputWidth, outputHeight], [0, outputHeight]]
  const targetPoints: [number, number][] = corners.map((point) => [point.x * outputWidth, point.y * outputHeight])
  drawTriangle(context, source, [sourcePoints[0], sourcePoints[1], sourcePoints[2]], [targetPoints[0], targetPoints[1], targetPoints[2]])
  drawTriangle(context, source, [sourcePoints[0], sourcePoints[2], sourcePoints[3]], [targetPoints[0], targetPoints[2], targetPoints[3]])
  return output.toDataURL('image/png')
}

export async function renderFaceLayerImage(
  sourceUrl: string,
  crop: NormalizedBox,
  mask: NormalizedPoint[],
  corners: SonFaceLayerState['distortCorners'],
  maxSide = 1024,
): Promise<string> {
  const image = await loadImage(sourceUrl)
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight))
  return renderFaceLayer(sourceUrl, crop, mask, corners, Math.max(2, image.naturalWidth * scale), Math.max(2, image.naturalHeight * scale))
}

