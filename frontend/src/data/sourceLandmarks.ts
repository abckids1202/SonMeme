import type { SemanticHandleId, SemanticHandles } from '../types/editor'

// Cached once from the bundled Anthony source using the same production landmark analyzer as targets.
const sourcePoints: Record<SemanticHandleId, { x: number; y: number }> = {
  foreheadCenter: { x: 0.58, y: 0.22 },
  leftTemple: { x: 0.27, y: 0.40 },
  rightTemple: { x: 0.95, y: 0.45 },
  leftEye: { x: 0.5343, y: 0.4854 },
  rightEye: { x: 0.8333, y: 0.5158 },
  nose: { x: 0.7048, y: 0.7060 },
  leftMouth: { x: 0.625, y: 0.793 },
  rightMouth: { x: 0.758, y: 0.800 },
  leftJaw: { x: 0.30, y: 0.79 },
  rightJaw: { x: 0.94, y: 0.84 },
  chin: { x: 0.5944, y: 0.7540 },
}

export function createSourceSemanticHandles(): SemanticHandles {
  return Object.fromEntries(Object.entries(sourcePoints).map(([id, point]) => [id, {
    source: { ...point },
    target: { ...point },
    guide: null,
  }])) as SemanticHandles
}
