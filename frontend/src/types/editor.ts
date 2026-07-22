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

export type TransformMode = 'classical' | 'neural' | 'cutout'

export type DetectedFace = {
  id: string
  box: { x: number; y: number; width: number; height: number }
  confidence: number
  source: 'manual' | 'custom-detector' | 'external-baseline'
}

export type CaptionState = {
  text: string
  x: number
  y: number
  fontSize: number
  rotation: number
  strokeWidth: number
  visible: boolean
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
}

export type EditorState = {
  imageId: string | null
  originalUrl: string | null
  previewUrl: string | null
  finalUrl: string | null
  imageWidth: number
  imageHeight: number
  faces: DetectedFace[]
  selectedFaceId: string | null
  mode: TransformMode
  caption: CaptionState
  faceTransform: FaceTransformState
  status: EditorStatus
  error: string | null
}
