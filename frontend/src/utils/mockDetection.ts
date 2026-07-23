import type { DetectedFace } from '../types/editor'

export function createMockFaces(width: number, height: number): DetectedFace[] {
  if (width <= 0 || height <= 0) return []
  const portrait = height >= width
  const primary = portrait
    ? { x: 0.29, y: 0.18, width: 0.42, height: 0.34 }
    : { x: 0.38, y: 0.2, width: 0.22, height: 0.28 }

  return [
    {
      id: 'mock-face-1',
      bbox: primary,
      confidence: 0.93,
      source: 'mock',
      pose: { yaw: 0, pitch: 0, roll: 0 },
    },
  ]
}
