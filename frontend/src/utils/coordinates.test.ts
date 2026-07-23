import { describe, expect, it } from 'vitest'
import { bboxToStageRect, fitImageToStage, imagePixelsToNormalized, normalizedToImagePixels, stageToImagePoint } from './coordinates'

describe('coordinate helpers', () => {
  it('converts between normalized and image pixels', () => {
    expect(normalizedToImagePixels({ x: 0.5, y: 0.25 }, { width: 800, height: 400 })).toEqual({ x: 400, y: 100 })
    expect(imagePixelsToNormalized({ x: 200, y: 100 }, { width: 800, height: 400 })).toEqual({ x: 0.25, y: 0.25 })
  })

  it('fits an image without stretching', () => {
    const rect = fitImageToStage({ width: 1600, height: 900 }, { width: 1000, height: 700 }, 40)

    expect(Math.round(rect.width)).toBe(920)
    expect(Math.round(rect.height)).toBe(518)
    expect(Math.round(rect.x)).toBe(40)
  })

  it('maps bounding boxes into the stage viewport', () => {
    const rect = bboxToStageRect(
      { x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
      { x: 100, y: 50, width: 800, height: 400 },
      { zoom: 1, panX: 0, panY: 0 },
    )

    expect(rect).toEqual({ x: 300, y: 150, width: 400, height: 200 })
  })

  it('maps stage points back into image coordinates with zoom and pan', () => {
    const point = stageToImagePoint(
      { x: 500, y: 300 },
      { x: 100, y: 50, width: 800, height: 400 },
      { zoom: 2, panX: 20, panY: -10 },
    )

    expect(point.x).toBeCloseTo(0.2375)
    expect(point.y).toBeCloseTo(0.325)
  })
})
