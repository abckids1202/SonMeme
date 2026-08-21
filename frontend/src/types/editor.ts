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

export type ImageLoadState = 'idle' | 'reading' | 'decoding' | 'ready' | 'error'

export type TransformMode = 'classical' | 'neural' | 'cutout'

export type EditorMode = 'replace-detected-face' | 'manual-face-region' | 'free-cutout'

export type ActiveTool = 'select' | 'face' | 'manual-region' | 'text' | 'emoji' | 'cutout' | 'pan'

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
  pose?: {
    yaw: number
    pitch: number
    roll: number
  }
}

export type CaptionState = {
  text: string
  x: number
  y: number
  fontSize: number
  rotation: number
  strokeWidth: number
  visible: boolean
  manuallyPlaced: boolean
}

export type EmojiState = {
  value: 'crying' | 'sob' | 'skull'
  x: number
  y: number
  size: number
  rotation: number
  opacity: number
  visible: boolean
  groupedWithCaption: boolean
}

export type FaceTransformState = {
  scale: number
  offsetX: number
  offsetY: number
  rotation: number
  blendStrength: number
  maskExpansion: number
  feathering: number
  colorMatchStrength: number
  maskPoints: NormalizedPoint[]
  skewX: number
  skewY: number
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
  imageLoadState: ImageLoadState
  imageFile: ImageFileMeta | null
  faces: DetectedFace[]
  selectedFaceId: string | null
  mode: TransformMode
  editorMode: EditorMode
  activeTool: ActiveTool
  caption: CaptionState
  emoji: EmojiState
  faceTransform: FaceTransformState
  viewport: ViewportState
  quickMode: 'quick' | 'advanced'
  modelBadge: 'backend-disconnected' | 'mock-data' | 'external-baseline' | 'custom-detector' | 'production-detector' | 'manual'
  selectedLayer: 'face' | 'caption' | 'emoji' | null
  status: EditorStatus
  error: string | null
}
