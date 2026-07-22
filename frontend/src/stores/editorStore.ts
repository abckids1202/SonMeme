import { create } from 'zustand'
import type { CaptionState, DetectedFace, EditorState, EditorStatus, FaceTransformState, TransformMode } from '../types/editor'

const defaultCaption: CaptionState = {
  text: 'son 😭',
  x: 48,
  y: 56,
  fontSize: 64,
  rotation: -3,
  strokeWidth: 6,
  visible: true,
}

const defaultTransform: FaceTransformState = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
  blendStrength: 0.82,
  maskExpansion: 8,
  feathering: 14,
  colorMatchStrength: 0.65,
}

type EditorActions = {
  setStatus: (status: EditorStatus) => void
  setError: (error: string | null) => void
  setUploadedImage: (input: { url: string; width: number; height: number }) => void
  setFaces: (faces: DetectedFace[]) => void
  selectFace: (faceId: string | null) => void
  setMode: (mode: TransformMode) => void
  updateCaption: (caption: Partial<CaptionState>) => void
  updateTransform: (transform: Partial<FaceTransformState>) => void
  reset: () => void
}

export type EditorStore = EditorState & EditorActions

const initialState: EditorState = {
  imageId: null,
  originalUrl: null,
  previewUrl: null,
  finalUrl: null,
  imageWidth: 0,
  imageHeight: 0,
  faces: [],
  selectedFaceId: null,
  mode: 'classical',
  caption: defaultCaption,
  faceTransform: defaultTransform,
  status: 'EMPTY',
  error: null,
}

export const useEditorStore = create<EditorStore>((set) => ({
  ...initialState,
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error, status: error ? 'ERROR' : undefined }),
  setUploadedImage: ({ url, width, height }) =>
    set({
      imageId: null,
      originalUrl: url,
      previewUrl: null,
      finalUrl: null,
      imageWidth: width,
      imageHeight: height,
      faces: [],
      selectedFaceId: null,
      status: 'FACE_SELECTION',
      error: null,
    }),
  setFaces: (faces) =>
    set({
      faces,
      selectedFaceId: faces.length === 1 ? faces[0].id : null,
      status: faces.length > 0 ? 'READY_TO_GENERATE' : 'FACE_SELECTION',
    }),
  selectFace: (faceId) => set({ selectedFaceId: faceId, status: faceId ? 'READY_TO_GENERATE' : 'FACE_SELECTION' }),
  setMode: (mode) => set({ mode }),
  updateCaption: (caption) => set((state) => ({ caption: { ...state.caption, ...caption } })),
  updateTransform: (transform) => set((state) => ({ faceTransform: { ...state.faceTransform, ...transform } })),
  reset: () => set(initialState),
}))
