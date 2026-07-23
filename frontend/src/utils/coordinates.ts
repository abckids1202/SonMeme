import type { NormalizedBox, NormalizedPoint, ViewportState } from '../types/editor'

export type Size = {
  width: number
  height: number
}

export type StageRect = {
  x: number
  y: number
  width: number
  height: number
}

export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 5

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
}

export function normalizedToImagePixels(point: NormalizedPoint, image: Size): NormalizedPoint {
  return {
    x: point.x * image.width,
    y: point.y * image.height,
  }
}

export function imagePixelsToNormalized(point: NormalizedPoint, image: Size): NormalizedPoint {
  return {
    x: image.width === 0 ? 0 : point.x / image.width,
    y: image.height === 0 ? 0 : point.y / image.height,
  }
}

export function fitImageToStage(image: Size, stage: Size, margin = 40): StageRect {
  if (image.width <= 0 || image.height <= 0 || stage.width <= 0 || stage.height <= 0) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }

  const usableWidth = Math.max(1, stage.width - margin * 2)
  const usableHeight = Math.max(1, stage.height - margin * 2)
  const scale = Math.min(usableWidth / image.width, usableHeight / image.height)
  const width = image.width * scale
  const height = image.height * scale

  return {
    x: (stage.width - width) / 2,
    y: (stage.height - height) / 2,
    width,
    height,
  }
}

export function imageToStagePoint(point: NormalizedPoint, imageRect: StageRect, viewport: ViewportState): NormalizedPoint {
  return {
    x: imageRect.x + point.x * imageRect.width * viewport.zoom + viewport.panX,
    y: imageRect.y + point.y * imageRect.height * viewport.zoom + viewport.panY,
  }
}

export function stageToImagePoint(point: NormalizedPoint, imageRect: StageRect, viewport: ViewportState): NormalizedPoint {
  const width = Math.max(1, imageRect.width * viewport.zoom)
  const height = Math.max(1, imageRect.height * viewport.zoom)

  return {
    x: (point.x - imageRect.x - viewport.panX) / width,
    y: (point.y - imageRect.y - viewport.panY) / height,
  }
}

export function bboxToStageRect(box: NormalizedBox, imageRect: StageRect, viewport: ViewportState): StageRect {
  const topLeft = imageToStagePoint({ x: box.x, y: box.y }, imageRect, viewport)
  return {
    x: topLeft.x,
    y: topLeft.y,
    width: box.width * imageRect.width * viewport.zoom,
    height: box.height * imageRect.height * viewport.zoom,
  }
}

export function zoomAtPoint(
  viewport: ViewportState,
  pointer: NormalizedPoint,
  nextZoom: number,
): ViewportState {
  const zoom = clampZoom(nextZoom)
  const zoomRatio = zoom / viewport.zoom
  return {
    zoom,
    panX: pointer.x - (pointer.x - viewport.panX) * zoomRatio,
    panY: pointer.y - (pointer.y - viewport.panY) * zoomRatio,
  }
}
