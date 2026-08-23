import { create } from 'zustand'
import { createSourceSemanticHandles } from '../data/sourceLandmarks'
import type {
  ActiveTool,
  CaptionState,
  DetectedFace,
  EditorState,
  EditorStatus,
  FaceEditMode,
  FaceEditSnapshot,
  FitGroup,
  ImageFileMeta,
  LiquifyState,
  ManualFitMode,
  MeshPoint,
  NormalizedPoint,
  SemanticHandleId,
  SemanticHandles,
  SonFaceLayerState,
  ViewportState,
} from '../types/editor'

const anthonyFaceUrl = '/source-faces/anthony-front.png'
const semanticIds: SemanticHandleId[] = [
  'foreheadCenter', 'leftTemple', 'rightTemple', 'leftEye', 'rightEye', 'nose',
  'leftMouth', 'rightMouth', 'leftJaw', 'rightJaw', 'chin',
]

const canonicalTarget: Record<SemanticHandleId, NormalizedPoint> = {
  foreheadCenter: { x: 0.5, y: 0.12 },
  leftTemple: { x: 0.12, y: 0.27 },
  rightTemple: { x: 0.88, y: 0.27 },
  leftEye: { x: 0.31, y: 0.37 },
  rightEye: { x: 0.69, y: 0.37 },
  nose: { x: 0.5, y: 0.56 },
  leftMouth: { x: 0.39, y: 0.69 },
  rightMouth: { x: 0.61, y: 0.69 },
  leftJaw: { x: 0.17, y: 0.79 },
  rightJaw: { x: 0.83, y: 0.79 },
  chin: { x: 0.5, y: 0.93 },
}

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

export const createDefaultLiquify = (): LiquifyState => ({
  gridSize: 16,
  offsets: Array.from({ length: 16 * 16 }, () => ({ x: 0, y: 0 })),
  brushSize: 0.22,
  strength: 0.65,
})

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, value))
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function localPoint(face: DetectedFace, point: NormalizedPoint | [number, number]): NormalizedPoint {
  const x = Array.isArray(point) ? point[0] : point.x
  const y = Array.isArray(point) ? point[1] : point.y
  return {
    x: clamp((x - face.bbox.x) / Math.max(0.001, face.bbox.width)),
    y: clamp((y - face.bbox.y) / Math.max(0.001, face.bbox.height)),
  }
}

function targetSemanticHandles(face: DetectedFace | null): SemanticHandles {
  const handles = createSourceSemanticHandles()
  semanticIds.forEach((id) => { handles[id].target = { ...canonicalTarget[id] } })
  if (!face?.landmarks) return handles

  const points = face.landmarks
  const leftEye = points.left_eye ? localPoint(face, points.left_eye) : null
  const rightEye = points.right_eye ? localPoint(face, points.right_eye) : null
  const nose = points.nose_tip ? localPoint(face, points.nose_tip) : null
  const topLip = points.top_lip ? localPoint(face, points.top_lip) : null
  const bottomLip = points.bottom_lip ? localPoint(face, points.bottom_lip) : null
  const chin = points.chin ? localPoint(face, points.chin) : null
  const eyeCenter = leftEye && rightEye ? { x: (leftEye.x + rightEye.x) / 2, y: (leftEye.y + rightEye.y) / 2 } : canonicalTarget.foreheadCenter
  const eyeSpan = leftEye && rightEye ? Math.abs(rightEye.x - leftEye.x) : 0.38
  const mouthCenter = topLip && bottomLip
    ? { x: (topLip.x + bottomLip.x) / 2, y: (topLip.y + bottomLip.y) / 2 }
    : canonicalTarget.leftMouth
  const mouthHalf = Math.max(0.06, eyeSpan * 0.23)
  const guide: Partial<Record<SemanticHandleId, NormalizedPoint>> = {
    foreheadCenter: { x: eyeCenter.x, y: clamp(eyeCenter.y - eyeSpan * 0.82, 0.04, 0.35) },
    leftTemple: { x: 0.08, y: clamp(eyeCenter.y - 0.02) },
    rightTemple: { x: 0.92, y: clamp(eyeCenter.y - 0.02) },
    leftEye: leftEye ?? undefined,
    rightEye: rightEye ?? undefined,
    nose: nose ?? undefined,
    leftMouth: { x: clamp(mouthCenter.x - mouthHalf), y: mouthCenter.y },
    rightMouth: { x: clamp(mouthCenter.x + mouthHalf), y: mouthCenter.y },
    leftJaw: { x: 0.12, y: clamp((chin?.y ?? 0.9) - 0.05) },
    rightJaw: { x: 0.88, y: clamp((chin?.y ?? 0.9) - 0.05) },
    chin: chin ?? undefined,
  }
  semanticIds.forEach((id) => {
    const point = guide[id]
    if (point) {
      handles[id].guide = { ...point }
      handles[id].target = { ...point }
    }
  })
  return handles
}

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
  semanticHandles: targetSemanticHandles(null),
  liquify: createDefaultLiquify(),
  mesh: createRegularMesh(),
  topology: 'tps-v1',
  mask: createDefaultMask(),
  feather: 5,
  warpedPreviewUrl: null,
  manuallyAdjusted: false,
  warpRevision: 0,
}

function createSonFace(face: DetectedFace | null, sourceUrl: string | null, sourceName: string | null): SonFaceLayerState {
  if (!face) return { ...clone(emptySonFace), sourceUrl, sourceName, semanticHandles: targetSemanticHandles(null) }
  return {
    ...clone(emptySonFace),
    id: `son-face-${face.id}`,
    sourceUrl,
    sourceName,
    targetFaceId: face.id,
    x: face.bbox.x,
    y: face.bbox.y,
    width: face.bbox.width,
    height: face.bbox.height,
    semanticHandles: targetSemanticHandles(face),
    warpRevision: 1,
  }
}

const defaultViewport: ViewportState = { zoom: 1, panX: 0, panY: 0 }

function dirtyFace(face: SonFaceLayerState, changes: Partial<SonFaceLayerState>): SonFaceLayerState {
  return { ...face, ...changes, warpedPreviewUrl: null, warpRevision: face.warpRevision + 1, manuallyAdjusted: true }
}

function snapshot(state: EditorState): FaceEditSnapshot {
  return { sonFace: clone(state.sonFace), caption: { ...state.caption } }
}

const symmetricPair: Partial<Record<SemanticHandleId, SemanticHandleId>> = {
  leftTemple: 'rightTemple', rightTemple: 'leftTemple',
  leftEye: 'rightEye', rightEye: 'leftEye',
  leftMouth: 'rightMouth', rightMouth: 'leftMouth',
  leftJaw: 'rightJaw', rightJaw: 'leftJaw',
}

const groupIds: Record<FitGroup, SemanticHandleId[]> = {
  individual: [],
  whole: semanticIds,
  eyes: ['leftEye', 'rightEye'],
  mouth: ['leftMouth', 'rightMouth'],
  jaw: ['leftJaw', 'rightJaw', 'chin'],
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
  setFitGroup: (group: FitGroup) => void
  setManualFitMode: (mode: ManualFitMode) => void
  setSymmetryEnabled: (enabled: boolean) => void
  setActiveTool: (tool: ActiveTool) => void
  selectLayer: (layer: EditorState['selectedLayer']) => void
  updateCaption: (caption: Partial<CaptionState>) => void
  updateSonFace: (face: Partial<SonFaceLayerState>) => void
  updateMeshPoint: (index: number, point: Partial<Pick<MeshPoint, 'targetX' | 'targetY'>>) => void
  updateSemanticHandle: (id: SemanticHandleId, point: NormalizedPoint) => void
  applyLiquifyStroke: (center: NormalizedPoint, delta: NormalizedPoint) => void
  updateMaskPoint: (index: number, point: NormalizedPoint) => void
  autoFitFace: () => void
  resetSonFaceShape: () => void
  resetSonFacePosition: () => void
  resetSonFaceMask: () => void
  resetLiquify: () => void
  recordFaceEditHistory: () => void
  undo: () => void
  redo: () => void
  setWarpedPreview: (url: string | null, revision: number) => void
  setViewport: (viewport: Partial<ViewportState>) => void
  resetView: () => void
  setPreviewUrl: (url: string | null) => void
  setFinalUrl: (url: string | null) => void
  setExportModalOpen: (open: boolean) => void
  reset: () => void
}

export type EditorStore = EditorState & EditorActions

const initialState: EditorState = {
  imageId: null, originalUrl: null, previewUrl: null, finalUrl: null,
  imageWidth: 0, imageHeight: 0, sourceFaceUrl: anthonyFaceUrl, sourceFaceName: 'Anthony Mackie',
  imageLoadState: 'idle', imageFile: null, faces: [], selectedFaceId: null,
  faceEditMode: 'move', fitGroup: 'individual', symmetryEnabled: true, manualFitMode: 'quick', activeTool: 'select',
  caption: defaultCaption, sonFace: emptySonFace, viewport: defaultViewport,
  modelBadge: import.meta.env.VITE_USE_MOCK_BACKEND === 'true' ? 'mock-data' : 'backend-disconnected',
  selectedLayer: null, exportModalOpen: false, status: 'EMPTY', error: null,
  historyPast: [], historyFuture: [],
}

export const useEditorStore = create<EditorStore>((set) => ({
  ...initialState,
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error, status: error ? 'ERROR' : 'EMPTY' }),
  setImageLoadState: (imageLoadState) => set({ imageLoadState }),
  setUploadedImage: ({ url, width, height, file }) => set((state) => ({
    imageId: crypto.randomUUID(), originalUrl: url, previewUrl: null, finalUrl: null,
    imageWidth: width, imageHeight: height, imageLoadState: 'ready', imageFile: file,
    faces: [], selectedFaceId: null, selectedLayer: null, viewport: defaultViewport,
    caption: defaultCaption, sonFace: createSonFace(null, state.sourceFaceUrl, state.sourceFaceName),
    faceEditMode: 'move', fitGroup: 'individual', symmetryEnabled: true, manualFitMode: 'quick',
    status: 'FACE_SELECTION', error: null, historyPast: [], historyFuture: [],
  })),
  setImageDimensions: (imageWidth, imageHeight) => set({ imageWidth, imageHeight }),
  setSourceFace: ({ url, name }) => set((state) => ({ sourceFaceUrl: url, sourceFaceName: name, sonFace: dirtyFace(state.sonFace, { sourceUrl: url, sourceName: name }) })),
  setFaces: (faces, badge) => set((state) => {
    const selectedFaceId = faces.length === 1 ? faces[0].id : null
    const selectedFace = faces.find((face) => face.id === selectedFaceId) ?? null
    return {
      faces, selectedFaceId, selectedLayer: selectedFaceId ? 'face' : null,
      sonFace: selectedFace ? createSonFace(selectedFace, state.sourceFaceUrl, state.sourceFaceName) : { ...state.sonFace, targetFaceId: null, warpedPreviewUrl: null },
      symmetryEnabled: selectedFace ? Math.abs(selectedFace.pose?.yaw ?? 0) < 18 : true,
      modelBadge: badge ?? (faces.some((face) => face.source === 'mock') ? 'mock-data' : faces.some((face) => face.source === 'external-baseline') ? 'production-detector' : 'custom-detector'),
      status: faces.length > 0 ? 'READY_TO_GENERATE' : 'FACE_SELECTION', historyPast: [], historyFuture: [],
    }
  }),
  selectFace: (faceId) => set((state) => {
    const face = state.faces.find((item) => item.id === faceId) ?? null
    const changed = faceId !== state.selectedFaceId
    return { selectedFaceId: faceId, selectedLayer: faceId ? 'face' : null, sonFace: changed && face ? createSonFace(face, state.sourceFaceUrl, state.sourceFaceName) : state.sonFace, symmetryEnabled: face ? Math.abs(face.pose?.yaw ?? 0) < 18 : state.symmetryEnabled, status: faceId ? 'READY_TO_GENERATE' : 'FACE_SELECTION', historyPast: [], historyFuture: [] }
  }),
  setFaceEditMode: (faceEditMode) => set({ faceEditMode, selectedLayer: 'face' }),
  setFitGroup: (fitGroup) => set({ fitGroup }),
  setManualFitMode: (manualFitMode) => set({ manualFitMode }),
  setSymmetryEnabled: (symmetryEnabled) => set({ symmetryEnabled }),
  setActiveTool: (activeTool) => set({ activeTool }),
  selectLayer: (selectedLayer) => set({ selectedLayer }),
  updateCaption: (caption) => set((state) => ({ caption: { ...state.caption, ...caption } })),
  updateSonFace: (changes) => set((state) => {
    if (Object.prototype.hasOwnProperty.call(changes, 'warpedPreviewUrl')) return { sonFace: { ...state.sonFace, ...changes } }
    return { sonFace: dirtyFace(state.sonFace, changes) }
  }),
  updateMeshPoint: (index, point) => set((state) => ({ sonFace: dirtyFace(state.sonFace, { mesh: state.sonFace.mesh.map((item, itemIndex) => itemIndex === index ? { ...item, ...point } : item) }) })),
  updateSemanticHandle: (id, point) => set((state) => {
    const next = { ...state.sonFace.semanticHandles }
    const current = next[id].target
    const snapped = next[id].guide && Math.hypot(next[id].guide.x - point.x, next[id].guide.y - point.y) < 0.035 ? next[id].guide : point
    const delta = { x: clamp(snapped.x) - current.x, y: clamp(snapped.y) - current.y }
    const ids = state.fitGroup === 'individual' ? [id] : groupIds[state.fitGroup].includes(id) ? groupIds[state.fitGroup] : [id]
    ids.forEach((itemId) => {
      next[itemId] = { ...next[itemId], target: { x: clamp(next[itemId].target.x + delta.x), y: clamp(next[itemId].target.y + delta.y) } }
    })
    if (state.symmetryEnabled) {
      const pair = symmetricPair[id]
      if (pair && next[pair]) next[pair] = { ...next[pair], target: { x: clamp(1 - next[id].target.x), y: next[id].target.y } }
    }
    return { sonFace: dirtyFace(state.sonFace, { semanticHandles: next }) }
  }),
  applyLiquifyStroke: (center, delta) => set((state) => {
    const { gridSize, offsets, brushSize, strength } = state.sonFace.liquify
    const nextOffsets = offsets.map((offset, index) => {
      const column = index % gridSize
      const row = Math.floor(index / gridSize)
      const point = { x: column / (gridSize - 1), y: row / (gridSize - 1) }
      const distance = Math.hypot(point.x - center.x, point.y - center.y)
      const influence = distance >= brushSize ? 0 : Math.exp(-((distance / Math.max(0.001, brushSize)) ** 2) * 2.4)
      return { x: Math.max(-0.35, Math.min(0.35, offset.x + delta.x * strength * influence)), y: Math.max(-0.35, Math.min(0.35, offset.y + delta.y * strength * influence)) }
    })
    return { sonFace: dirtyFace(state.sonFace, { liquify: { ...state.sonFace.liquify, offsets: nextOffsets } }) }
  }),
  updateMaskPoint: (index, point) => set((state) => ({ sonFace: dirtyFace(state.sonFace, { mask: state.sonFace.mask.map((item, itemIndex) => itemIndex === index ? { x: clamp(point.x), y: clamp(point.y) } : item) }) })),
  autoFitFace: () => set((state) => {
    const face = state.faces.find((item) => item.id === state.selectedFaceId)
    if (!face) return state
    return { sonFace: dirtyFace(state.sonFace, { x: face.bbox.x, y: face.bbox.y, width: face.bbox.width, height: face.bbox.height, rotation: 0, semanticHandles: targetSemanticHandles(face), manuallyAdjusted: false }) }
  }),
  resetSonFaceShape: () => set((state) => {
    const face = state.faces.find((item) => item.id === state.selectedFaceId)
    return { sonFace: dirtyFace(state.sonFace, { semanticHandles: targetSemanticHandles(face ?? null), mesh: createRegularMesh(), manuallyAdjusted: false }) }
  }),
  resetSonFacePosition: () => set((state) => {
    const face = state.faces.find((item) => item.id === state.selectedFaceId)
    return face ? { sonFace: dirtyFace(state.sonFace, { x: face.bbox.x, y: face.bbox.y, width: face.bbox.width, height: face.bbox.height, rotation: 0 }) } : state
  }),
  resetSonFaceMask: () => set((state) => ({ sonFace: dirtyFace(state.sonFace, { mask: createDefaultMask() }) })),
  resetLiquify: () => set((state) => ({ sonFace: dirtyFace(state.sonFace, { liquify: { ...createDefaultLiquify(), brushSize: state.sonFace.liquify.brushSize, strength: state.sonFace.liquify.strength } }) })),
  recordFaceEditHistory: () => set((state) => ({ historyPast: [...state.historyPast.slice(-39), snapshot(state)], historyFuture: [] })),
  undo: () => set((state) => {
    const previous = state.historyPast.at(-1)
    if (!previous) return state
    return { sonFace: { ...previous.sonFace, warpRevision: state.sonFace.warpRevision + 1, warpedPreviewUrl: null }, caption: previous.caption, historyPast: state.historyPast.slice(0, -1), historyFuture: [snapshot(state), ...state.historyFuture] }
  }),
  redo: () => set((state) => {
    const next = state.historyFuture[0]
    if (!next) return state
    return { sonFace: { ...next.sonFace, warpRevision: state.sonFace.warpRevision + 1, warpedPreviewUrl: null }, caption: next.caption, historyPast: [...state.historyPast, snapshot(state)], historyFuture: state.historyFuture.slice(1) }
  }),
  setWarpedPreview: (url, revision) => set((state) => state.sonFace.warpRevision === revision ? { sonFace: { ...state.sonFace, warpedPreviewUrl: url } } : state),
  setViewport: (viewport) => set((state) => ({ viewport: { ...state.viewport, ...viewport } })),
  resetView: () => set({ viewport: defaultViewport }),
  setPreviewUrl: (previewUrl) => set({ previewUrl }),
  setFinalUrl: (finalUrl) => set({ finalUrl }),
  setExportModalOpen: (exportModalOpen) => set({ exportModalOpen }),
  reset: () => set({ ...initialState }),
}))
