import { describe, expect, it } from 'vitest'
import type { DetectedFace } from '../types/editor'
import { sourceCropForFace, sourceMaskForFace } from './sourceFace'

const face: DetectedFace = {
  id: 'source-face',
  bbox: { x: 0.3, y: 0.2, width: 0.3, height: 0.45 },
  confidence: 0.97,
  source: 'external-baseline',
  landmarks: {
    left_eye: { x: 0.38, y: 0.36 },
    right_eye: { x: 0.52, y: 0.36 },
    chin: { x: 0.45, y: 0.57 },
  },
}

describe('source face preparation', () => {
  it('adds safe padding around an automatically detected source face', () => {
    const crop = sourceCropForFace(face)

    expect(crop.x).toBeLessThan(face.bbox.x)
    expect(crop.y).toBeLessThan(face.bbox.y)
    expect(crop.x + crop.width).toBeGreaterThan(face.bbox.x + face.bbox.width)
    expect(crop.y + crop.height).toBeGreaterThan(face.bbox.y + face.bbox.height)
  })

  it('creates a normalized face mask that stays inside the crop', () => {
    const crop = sourceCropForFace(face)
    const mask = sourceMaskForFace(face, crop)

    expect(mask.length).toBe(20)
    expect(mask.every((point) => point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1)).toBe(true)
  })
})
