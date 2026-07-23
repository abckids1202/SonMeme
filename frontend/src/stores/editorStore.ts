import { create } from 'zustand'
import type {
  ActiveTool,
  CaptionState,
  DetectedFace,
  EditorMode,
  EditorState,
  EditorStatus,
  EmojiState,
  FaceTransformState,
  ImageFileMeta,
  TransformMode,
  ViewportState,
} from '../types/editor'

const defaultCaption: CaptionState = {
  text: 'son',
  x: 0.08,
  y: 0.12,
  fontSize: 64,
  rotation: 0,
  strokeWidth: 6,
  visible: true,
  manuallyPlaced: false,
}

const defaultEmoji: EmojiState = {
  value: 'crying',
  x: 0.24,
  y: 0.12,
  size: 64,
  rotation: 0,
  opacity: 1,
  visible: true,
  groupedWithCaption: true,
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

const defaultViewport: ViewportState = {
  zoom: 1,
  panX: 0,
  panY: 0,
}

type EditorActions = {
  setStatus: (status: EditorStatus) => void
  setError: (error: string | null) => void
  setImageLoadState: (state: EditorState['imageLoadState']) => void
  setUploadedImage: (input: { url: string; width: number; height: number; file: ImageFileMeta }) => void
  setFaces: (faces: DetectedFace[], badge?: EditorState['modelBadge']) => void
  selectFace: (faceId: string | null) => void
  setMode: (mode: TransformMode) => void
  setEditorMode: (mode: EditorMode) => void
  setActiveTool: (tool: ActiveTool) => void
  selectLayer: (layer: EditorState['selectedLayer']) => void
  updateCaption: (caption: Partial<CaptionState>) => void
  updateEmoji: (emoji: Partial<EmojiState>) => void
  updateTransform: (transform: Partial<FaceTransformState>) => void
  setViewport: (viewport: Partial<ViewportState>) => void
  resetView: () => void
  setQuickMode: (mode: EditorState['quickMode']) => void
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
  imageLoadState: 'idle',
  imageFile: null,
  faces: [],
  selectedFaceId: null,
  mode: 'classical',
  editorMode: 'replace-detected-face',
  activeTool: 'select',
  caption: defaultCaption,
  emoji: defaultEmoji,
  faceTransform: defaultTransform,
  viewport: defaultViewport,
  quickMode: (localStorage.getItem('sonify.quickMode') as EditorState['quickMode'] | null) ?? 'quick',
  modelBadge: import.meta.env.VITE_USE_MOCK_BACKEND === 'true' ? 'mock-data' : 'backend-disconnected',
  selectedLayer: null,
  status: 'EMPTY',
  error: null,
}

export const useEditorStore = create<EditorStore>((set) => ({
  ...initialState,
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error, status: error ? 'ERROR' : 'EMPTY' }),
  setImageLoadState: (imageLoadState) => set({ imageLoadState }),
  setUploadedImage: ({ url, width, height, file }) =>
    set({
      imageId: crypto.randomUUID(),
      originalUrl: url,
      previewUrl: null,
      finalUrl: null,
      imageWidth: width,
      imageHeight: height,
      imageLoadState: 'ready',
      imageFile: file,
      faces: [],
      selectedFaceId: null,
      selectedLayer: null,
      viewport: defaultViewport,
      caption: defaultCaption,
      emoji: defaultEmoji,
      status: 'FACE_SELECTION',
      error: null,
    }),
  setFaces: (faces, badge) =>
    set({
      faces,
      selectedFaceId: faces.length === 1 ? faces[0].id : null,
      selectedLayer: faces.length === 1 ? 'face' : null,
      modelBadge: badge ?? (faces.some((face) => face.source === 'mock') ? 'mock-data' : 'custom-detector'),
      status: faces.length > 0 ? 'READY_TO_GENERATE' : 'FACE_SELECTION',
    }),
  selectFace: (faceId) => set({ selectedFaceId: faceId, selectedLayer: faceId ? 'face' : null, status: faceId ? 'READY_TO_GENERATE' : 'FACE_SELECTION' }),
  setMode: (mode) => set({ mode }),
  setEditorMode: (editorMode) => set({ editorMode }),
  setActiveTool: (activeTool) => set({ activeTool }),
  selectLayer: (selectedLayer) => set({ selectedLayer }),
  updateCaption: (caption) => set((state) => ({ caption: { ...state.caption, ...caption } })),
  updateEmoji: (emoji) => set((state) => ({ emoji: { ...state.emoji, ...emoji } })),
  updateTransform: (transform) => set((state) => ({ faceTransform: { ...state.faceTransform, ...transform } })),
  setViewport: (viewport) => set((state) => ({ viewport: { ...state.viewport, ...viewport } })),
  resetView: () => set({ viewport: defaultViewport }),
  setQuickMode: (quickMode) => {
    localStorage.setItem('sonify.quickMode', quickMode)
    set({ quickMode })
  },
  reset: () => set({ ...initialState, quickMode: (localStorage.getItem('sonify.quickMode') as EditorState['quickMode'] | null) ?? 'quick' }),
}))
