import { describe, expect, it } from 'vitest'
import { useEditorStore } from './editorStore'

describe('editor store', () => {
  it('uses text and emoji as separate editable defaults', () => {
    useEditorStore.getState().reset()

    expect(useEditorStore.getState().caption.text).toBe('son')
    expect(useEditorStore.getState().emoji.value).toBe('crying')
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
})
