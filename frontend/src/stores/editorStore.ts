import { create } from 'zustand'
import type {
  ActiveTool,
  CaptionState,
  DetectedFace,
  EditorState,
  EditorStatus,
  FaceEditMode,
  ImageFileMeta,
  MeshPoint,
  NormalizedPoint,
  SonFaceLayerState,
  ViewportState,
} from '../types/editor'
const anthonyFaceUrl = '/source-faces/anthony-front.png'

const defaultCaption: CaptionState = {
  text: 'son 😭',
  x: 0.08,
  y: 0.12,
  width: 0.34,
  scale: 1,
  rotation: 0,
  visible: true,
}

export const createRegularMesh = (): MeshPoint[] => Array.from({ length: 16 }, (_, index) => {
  const column = index % 4
  const row = Math.floor(index / 4)
  return { sourceX: column / 3, sourceY: row / 3, targetX: column / 3, targetY: row / 3 }
})

export const createDefaultMask = (): NormalizedPoint[] => [
  { x: 0.5, y: 0.01 }, { x: 0.7, y: 0.04 }, { x: 0.87, y: 0.17 }, { x: 0.97, y: 0.38 },
  { x: 0.94, y: 0.62 }, { x: 0.82, y: 0.84 }, { x: 0.64, y: 0.98 }, { x: 0.5, y: 1 },
  { x: 0.36, y: 0.98 }, { x: 0.18, y: 0.84 }, { x: 0.06, y: 0.62 }, { x: 0.03, y: 0.38 },
  { x: 0.13, y: 0.17 }, { x: 0.3, y: 0.04 },
]

const emptySonFace: SonFaceLayerState = {
  id: 'son-face-1',
  sourceUrl: anthonyFaceUrl,
  sourceName: 'Anthony Mackie',
  targetFaceId: null,
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  rotation: 0,
  opacity: 0.92,
  blend: 'sticker',
  mesh: createRegularMesh(),
  topology: '4x4-v1',
  mask: createDefaultMask(),
  feather: 5,
  warpedPreviewUrl: null,
  manuallyAdjusted: false,
}

function createSonFace(face: DetectedFace | null, sourceUrl: string | null, sourceName: string | null): SonFaceLayerState {
  if (!face) return { ...emptySonFace, sourceUrl, sourceName, mesh: createRegularMesh(), mask: createDefaultMask() }
  const mesh = createRegularMesh()
  const landmarks = face.landmarks ?? {}
  const mapped = Object.entries(landmarks).map(([name, point]) => ({
    name,
    x: Math.max(0, Math.min(1, (point.x - face.bbox.x) / Math.max(0.001, face.bbox.width))),
    y: Math.max(0, Math.min(1, (point.y - face.bbox.y) / Math.max(0.001, face.bbox.height))),
  }))
  const place = (index: number, names: string[]) => {
    const points = mapped.filter((item) => names.includes(item.name))
    if (!points.length) return
    mesh[index].targetX = points.reduce((sum, item) => sum + item.x, 0) / points.length
    mesh[index].targetY = points.reduce((sum, item) => sum + item.y, 0) / points.length
  }
  place(1, ['left_eye'])
  place(2, ['right_eye'])
  place(6, ['nose_tip'])
  place(9, ['top_lip', 'bottom_lip'])
  place(13, ['chin'])
  return {
    ...emptySonFace,
    id: `son-face-${face.id}`,
    sourceUrl,
    sourceName,
    targetFaceId: face.id,
    x: face.bbox.x,
    y: face.bbox.y,
    width: face.bbox.width,
    height: face.bbox.height,
    mesh,
    mask: createDefaultMask(),
  }
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
  setImageDimensions: (width: number, height: number) => void
  setSourceFace: (input: { url: string; name: string }) => void
  setFaces: (faces: DetectedFace[], badge?: EditorState['modelBadge']) => void
  selectFace: (faceId: string | null) => void
  setFaceEditMode: (mode: FaceEditMode) => void
  setActiveTool: (tool: ActiveTool) => void
  selectLayer: (layer: EditorState['selectedLayer']) => void
  updateCaption: (caption: Partial<CaptionState>) => void
  updateSonFace: (face: Partial<SonFaceLayerState>) => void
  updateMeshPoint: (index: number, point: Partial<Pick<MeshPoint, 'targetX' | 'targetY'>>) => void
  updateMaskPoint: (index: number, point: NormalizedPoint) => void
  resetSonFaceShape: () => void
  resetSonFacePosition: () => void
  resetSonFaceMask: () => void
  setViewport: (viewport: Partial<ViewportState>) => void
  resetView: () => void
  setPreviewUrl: (url: string | null) => void
  setFinalUrl: (url: string | null) => void
  setExportModalOpen: (open: boolean) => void
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
  sourceFaceUrl: anthonyFaceUrl,
  sourceFaceName: 'Anthony Mackie',
  imageLoadState: 'idle',
  imageFile: null,
  faces: [],
  selectedFaceId: null,
  faceEditMode: 'move',
  activeTool: 'select',
  caption: defaultCaption,
  sonFace: emptySonFace,
  viewport: defaultViewport,
  modelBadge: import.meta.env.VITE_USE_MOCK_BACKEND === 'true' ? 'mock-data' : 'backend-disconnected',
  selectedLayer: null,
  exportModalOpen: false,
  status: 'EMPTY',
  error: null,
}

export const useEditorStore = create<EditorStore>((set) => ({
  ...initialState,
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error, status: error ? 'ERROR' : 'EMPTY' }),
  setImageLoadState: (imageLoadState) => set({ imageLoadState }),
  setUploadedImage: ({ url, width, height, file }) =>
    set((state) => ({
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
      sonFace: { ...emptySonFace, sourceUrl: state.sourceFaceUrl, sourceName: state.sourceFaceName, mesh: createRegularMesh(), mask: createDefaultMask() },
      faceEditMode: 'move',
      status: 'FACE_SELECTION',
      error: null,
    })),
  setImageDimensions: (imageWidth, imageHeight) => set({ imageWidth, imageHeight }),
  setSourceFace: ({ url, name }) => set((state) => ({ sourceFaceUrl: url, sourceFaceName: name, sonFace: { ...state.sonFace, sourceUrl: url, sourceName: name, warpedPreviewUrl: null } })),
  setFaces: (faces, badge) => set((state) => {
    const selectedFaceId = faces.length === 1 ? faces[0].id : null
    const selectedFace = faces.find((face) => face.id === selectedFaceId) ?? null
    return {
      faces,
      selectedFaceId,
      selectedLayer: selectedFaceId ? 'face' : null,
      sonFace: selectedFace ? createSonFace(selectedFace, state.sourceFaceUrl, state.sourceFaceName) : { ...state.sonFace, targetFaceId: null, warpedPreviewUrl: null },
      modelBadge: badge ?? (faces.some((face) => face.source === 'mock') ? 'mock-data' : faces.some((face) => face.source === 'external-baseline') ? 'production-detector' : 'custom-detector'),
      status: faces.length > 0 ? 'READY_TO_GENERATE' : 'FACE_SELECTION',
    }
  }),
  selectFace: (faceId) => set((state) => {
    const face = state.faces.find((item) => item.id === faceId) ?? null
    const changed = faceId !== state.selectedFaceId
    return {
      selectedFaceId: faceId,
      selectedLayer: faceId ? 'face' : null,
      sonFace: changed && face ? createSonFace(face, state.sourceFaceUrl, state.sourceFaceName) : state.sonFace,
      status: faceId ? 'READY_TO_GENERATE' : 'FACE_SELECTION',
    }
  }),
  setFaceEditMode: (faceEditMode) => set({ faceEditMode, selectedLayer: 'face' }),
  setActiveTool: (activeTool) => set({ activeTool }),
  selectLayer: (selectedLayer) => set({ selectedLayer }),
  updateCaption: (caption) => set((state) => ({ caption: { ...state.caption, ...caption } })),
  updateSonFace: (face) => set((state) => ({ sonFace: { ...state.sonFace, ...face, manuallyAdjusted: true } })),
  updateMeshPoint: (index, point) => set((state) => ({ sonFace: { ...state.sonFace, mesh: state.sonFace.mesh.map((item, itemIndex) => itemIndex === index ? { ...item, ...point } : item), warpedPreviewUrl: null, manuallyAdjusted: true } })),
  updateMaskPoint: (index, point) => set((state) => ({ sonFace: { ...state.sonFace, mask: state.sonFace.mask.map((item, itemIndex) => itemIndex === index ? point : item), warpedPreviewUrl: null, manuallyAdjusted: true } })),
  resetSonFaceShape: () => set((state) => ({ sonFace: { ...state.sonFace, mesh: createRegularMesh(), warpedPreviewUrl: null, manuallyAdjusted: false } })),
  resetSonFacePosition: () => set((state) => {
    const face = state.faces.find((item) => item.id === state.selectedFaceId)
    return face ? { sonFace: { ...state.sonFace, x: face.bbox.x, y: face.bbox.y, width: face.bbox.width, height: face.bbox.height, rotation: 0, warpedPreviewUrl: null } } : state
  }),
  resetSonFaceMask: () => set((state) => ({ sonFace: { ...state.sonFace, mask: createDefaultMask(), warpedPreviewUrl: null } })),
  setViewport: (viewport) => set((state) => ({ viewport: { ...state.viewport, ...viewport } })),
  resetView: () => set({ viewport: defaultViewport }),
  setPreviewUrl: (previewUrl) => set({ previewUrl }),
  setFinalUrl: (finalUrl) => set({ finalUrl }),
  setExportModalOpen: (exportModalOpen) => set({ exportModalOpen }),
  reset: () => set({ ...initialState }),
}))
