import { describe, expect, it } from 'vitest'
import { useEditorStore } from './editorStore'

describe('editor store', () => {
  it('keeps the meme caption canonical', () => {
    useEditorStore.getState().reset()

    expect(useEditorStore.getState().caption.text).toBe('son 😭')
    expect(useEditorStore.getState().caption.scale).toBe(1)
  })

  it('auto-selects a single detected face', () => {
    useEditorStore.getState().reset()
    useEditorStore.getState().setFaces([
      {
        id: 'face-1',
        bbox: { x: 0.1, y: 0.2, width: 0.2, height: 0.3 },
        confidence: 0.91,
        source: 'custom-detector',
      },
    ])

    expect(useEditorStore.getState().selectedFaceId).toBe('face-1')
    expect(useEditorStore.getState().status).toBe('READY_TO_GENERATE')
  })

  it('auto-selects the largest detected face', () => {
    useEditorStore.getState().reset()
    useEditorStore.getState().setFaces([
      { id: 'small', bbox: { x: 0.1, y: 0.2, width: 0.15, height: 0.15 }, confidence: 0.99, source: 'external-baseline' },
      { id: 'large', bbox: { x: 0.4, y: 0.2, width: 0.35, height: 0.45 }, confidence: 0.88, source: 'external-baseline' },
    ])

    expect(useEditorStore.getState().selectedFaceId).toBe('large')
    expect(useEditorStore.getState().sonFace.targetFaceId).toBe('large')
  })

  it('updates a perspective corner without moving the layer', () => {
    useEditorStore.getState().reset()
    useEditorStore.getState().setFaces([{ id: 'face-corner', bbox: { x: 0.2, y: 0.2, width: 0.4, height: 0.5 }, confidence: 0.9, source: 'external-baseline' }])
    const before = useEditorStore.getState().sonFace
    useEditorStore.getState().updateDistortCorner(0, { x: -0.1, y: 0.08 })
    const after = useEditorStore.getState().sonFace

    expect(after.distortCorners[0]).toEqual({ x: -0.1, y: 0.08 })
    expect(after.x).toBe(before.x)
    expect(after.y).toBe(before.y)
  })

  it('clears stale faces when replacing an image', () => {
    useEditorStore.getState().setFaces([
      { id: 'face-1', bbox: { x: 0, y: 0, width: 0.2, height: 0.2 }, confidence: 0.8, source: 'mock' },
    ])
    useEditorStore.getState().setUploadedImage({
      url: 'blob:test',
      width: 100,
      height: 100,
      file: { name: 'new.png', size: 1000, type: 'image/png', orientation: 'browser-corrected' },
    })

    expect(useEditorStore.getState().faces).toEqual([])
    expect(useEditorStore.getState().selectedFaceId).toBeNull()
  })

  it('resets a deformed mesh without moving the layer', () => {
    useEditorStore.getState().updateMeshPoint(5, { targetX: 0.9, targetY: 0.2 })
    useEditorStore.getState().updateSonFace({ x: 0.2, y: 0.2 })
    useEditorStore.getState().resetSonFaceShape()

    const mesh = useEditorStore.getState().sonFace.mesh
    expect(mesh[5].targetX).toBe(mesh[5].sourceX)
    expect(useEditorStore.getState().sonFace.x).toBe(0.2)
  })

  it('creates semantic guides and mirrors a fit handle', () => {
    useEditorStore.getState().reset()
    useEditorStore.getState().setFaces([{
      id: 'face-semantic',
      bbox: { x: 0.1, y: 0.1, width: 0.5, height: 0.7 },
      confidence: 0.98,
      source: 'external-baseline',
      landmarks: {
        left_eye: { x: 0.25, y: 0.35 },
        right_eye: { x: 0.45, y: 0.36 },
        nose_tip: { x: 0.35, y: 0.5 },
        top_lip: { x: 0.34, y: 0.58 },
        bottom_lip: { x: 0.34, y: 0.6 },
        chin: { x: 0.35, y: 0.75 },
      },
    }])
    const before = useEditorStore.getState().sonFace.semanticHandles.leftEye.target.x
    useEditorStore.getState().recordFaceEditHistory()
    useEditorStore.getState().updateSemanticHandle('leftEye', { x: before + 0.06, y: 0.4 })

    const state = useEditorStore.getState()
    expect(state.sonFace.semanticHandles.rightEye.target.x).toBeCloseTo(1 - state.sonFace.semanticHandles.leftEye.target.x)
    expect(state.sonFace.semanticHandles.leftEye.guide).not.toBeNull()
    state.undo()
    expect(useEditorStore.getState().sonFace.semanticHandles.leftEye.target.x).toBe(before)
  })

  it('keeps liquify separate from layer position', () => {
    useEditorStore.getState().reset()
    useEditorStore.getState().setFaces([{ id: 'face-liquify', bbox: { x: 0.1, y: 0.1, width: 0.4, height: 0.5 }, confidence: 0.9, source: 'manual' }])
    const position = { x: useEditorStore.getState().sonFace.x, y: useEditorStore.getState().sonFace.y }
    useEditorStore.getState().applyLiquifyStroke({ x: 0.5, y: 0.5 }, { x: 0.05, y: -0.02 })

    const state = useEditorStore.getState()
    expect(state.sonFace.x).toEqual(position.x)
    expect(state.sonFace.y).toEqual(position.y)
    expect(state.sonFace.liquify.offsets.some((offset) => offset.x !== 0 || offset.y !== 0)).toBe(true)
  })

  it('invalidates an AI result when placement changes', () => {
    useEditorStore.getState().reset()
    useEditorStore.getState().setFaces([{ id: 'face-ai', bbox: { x: 0.1, y: 0.1, width: 0.4, height: 0.5 }, confidence: 0.9, source: 'manual' }])
    useEditorStore.getState().setGenerationState({ status: 'complete', resultUrl: 'blob:ai', active: true })
    useEditorStore.getState().updateSonFace({ x: 0.2 })

    expect(useEditorStore.getState().generation.resultUrl).toBeNull()
    expect(useEditorStore.getState().generation.active).toBe(false)
  })
})
