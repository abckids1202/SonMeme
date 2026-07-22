import { describe, expect, it } from 'vitest'
import { useEditorStore } from './editorStore'

describe('editor store', () => {
  it('uses the required default caption', () => {
    useEditorStore.getState().reset()

    expect(useEditorStore.getState().caption.text).toBe('son 😭')
  })

  it('auto-selects a single detected face', () => {
    useEditorStore.getState().reset()
    useEditorStore.getState().setFaces([
      {
        id: 'face-1',
        box: { x: 10, y: 20, width: 100, height: 120 },
        confidence: 0.91,
        source: 'custom-detector',
      },
    ])

    expect(useEditorStore.getState().selectedFaceId).toBe('face-1')
    expect(useEditorStore.getState().status).toBe('READY_TO_GENERATE')
  })
})
