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

export type ActiveTool = 'select' | 'manual-region' | 'pan'
export type FaceEditMode = 'move' | 'warp' | 'mask'

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
  x: number
  y: number
  width: number
  scale: number
  rotation: number
  visible: boolean
}

export type MeshPoint = {
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
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
  mesh: MeshPoint[]
  topology: '4x4-v1'
  mask: NormalizedPoint[]
  feather: number
  warpedPreviewUrl: string | null
  manuallyAdjusted: boolean
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
  faceEditMode: FaceEditMode
  activeTool: ActiveTool
  caption: CaptionState
  sonFace: SonFaceLayerState
  viewport: ViewportState
  modelBadge: 'backend-disconnected' | 'mock-data' | 'external-baseline' | 'custom-detector' | 'production-detector' | 'manual'
  selectedLayer: 'face' | 'caption' | null
  exportModalOpen: boolean
  status: EditorStatus
  error: string | null
}
