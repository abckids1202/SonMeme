export type EditorStatus =
  | 'EMPTY'
  | 'UPLOADING'
  | 'DETECTING'
  | 'FACE_SELECTION'
  | 'READY_TO_GENERATE'
  | 'GENERATING_PREVIEW'
  | 'PREVIEW_READY'
  | 'GENERATING_FINAL'
  | 'COMPLETE'
  | 'ERROR'

export type GenerationPreset = 'natural' | 'scene-blend' | 'meme'
export type GenerationStatus = 'idle' | 'checking' | 'queued' | 'running' | 'complete' | 'failed' | 'cancelled'

export type GenerationState = {
  status: GenerationStatus
  preset: GenerationPreset
  jobId: string | null
  resultUrl: string | null
  active: boolean
  providerConfigured: boolean | null
  noticeAcknowledged: boolean
  error: string | null
  targetType: 'face' | 'faces' | 'object' | 'unknown' | null
  confidence: number | null
  model: string | null
}

export type ImageLoadState = 'idle' | 'reading' | 'decoding' | 'ready' | 'error'

export type ActiveTool = 'select' | 'manual-region' | 'pan'
export type FaceEditMode = 'move' | 'resize' | 'rotate' | 'distort' | 'fit' | 'liquify' | 'mask'
export type SemanticHandleId =
  | 'foreheadCenter'
  | 'leftTemple'
  | 'rightTemple'
  | 'leftEye'
  | 'rightEye'
  | 'nose'
  | 'leftMouth'
  | 'rightMouth'
  | 'leftJaw'
  | 'rightJaw'
  | 'chin'

export type FitGroup = 'individual' | 'whole' | 'eyes' | 'mouth' | 'jaw'
export type ManualFitMode = 'quick' | 'free'

export type NormalizedPoint = {
  x: number
  y: number
}

export type NormalizedBox = {
  x: number
  y: number
  width: number
  height: number
}

export type DetectedFace = {
  id: string
  bbox: NormalizedBox
  confidence: number
  source: 'mock' | 'manual' | 'custom-detector' | 'external-baseline'
  landmarks?: Record<string, NormalizedPoint>
  pose?: {
    yaw: number
    pitch: number
    roll: number
  }
}

export type CaptionState = {
  text: string
  fontFamily: CaptionFont
  x: number
  y: number
  width: number
  scale: number
  rotation: number
  visible: boolean
}

export type CaptionFont = 'impact' | 'arial' | 'comic' | 'sans'
export type ExportFormat = 'png' | 'jpeg'

export type MeshPoint = {
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
}

export type SemanticHandle = {
  source: NormalizedPoint
  target: NormalizedPoint
  guide: NormalizedPoint | null
}

export type SemanticHandles = Record<SemanticHandleId, SemanticHandle>

export type LiquifyState = {
  gridSize: 16
  offsets: NormalizedPoint[]
  brushSize: number
  strength: number
}

export type SonFaceLayerState = {
  id: string
  sourceUrl: string | null
  sourceName: string | null
  targetFaceId: string | null
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
  blend: 'sticker' | 'soft'
  semanticHandles: SemanticHandles
  liquify: LiquifyState
  mesh: MeshPoint[]
  topology: 'tps-v1'
  mask: NormalizedPoint[]
  feather: number
  warpedPreviewUrl: string | null
  manuallyAdjusted: boolean
  warpRevision: number
  distortCorners: [NormalizedPoint, NormalizedPoint, NormalizedPoint, NormalizedPoint]
}

export type ViewportState = {
  zoom: number
  panX: number
  panY: number
}

export type ImageFileMeta = {
  name: string
  size: number
  type: string
  orientation: 'browser-corrected' | 'unknown'
}

export type EditorState = {
  imageId: string | null
  originalUrl: string | null
  previewUrl: string | null
  finalUrl: string | null
  imageWidth: number
  imageHeight: number
  sourceFaceUrl: string | null
  sourceFaceName: string | null
  sourceCrop: NormalizedBox
  sourceMask: NormalizedPoint[]
  sourceConfirmed: boolean
  sourceNeedsReview: boolean
  imageLoadState: ImageLoadState
  imageFile: ImageFileMeta | null
  faces: DetectedFace[]
  selectedFaceId: string | null
  faceEditMode: FaceEditMode
  fitGroup: FitGroup
  symmetryEnabled: boolean
  manualFitMode: ManualFitMode
  activeTool: ActiveTool
  caption: CaptionState
  sonFace: SonFaceLayerState
  viewport: ViewportState
  modelBadge: 'backend-disconnected' | 'mock-data' | 'external-baseline' | 'custom-detector' | 'production-detector' | 'manual'
  selectedLayer: 'face' | 'caption' | null
  exportModalOpen: boolean
  exportFormat: ExportFormat
  status: EditorStatus
  error: string | null
  historyPast: FaceEditSnapshot[]
  historyFuture: FaceEditSnapshot[]
  generation: GenerationState
}

export type FaceEditSnapshot = {
  sonFace: SonFaceLayerState
  caption: CaptionState
}
