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
})
