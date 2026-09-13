import type { DetectedFace, NormalizedBox, NormalizedPoint } from '../types/editor'

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, value))
}

export function sourceCropForFace(face: DetectedFace): NormalizedBox {
  const paddingX = face.bbox.width * 0.2
  const paddingY = face.bbox.height * 0.2
  const x = clamp(face.bbox.x - paddingX)
  const y = clamp(face.bbox.y - paddingY)
  const right = clamp(face.bbox.x + face.bbox.width + paddingX)
  const bottom = clamp(face.bbox.y + face.bbox.height + paddingY)
  return { x, y, width: Math.max(0.02, right - x), height: Math.max(0.02, bottom - y) }
}

export function sourceMaskForFace(face: DetectedFace, crop: NormalizedBox): NormalizedPoint[] {
  const leftEye = face.landmarks?.left_eye
  const rightEye = face.landmarks?.right_eye
  const chin = face.landmarks?.chin
  const eyeCenter = leftEye && rightEye
    ? { x: (leftEye.x + rightEye.x) / 2, y: (leftEye.y + rightEye.y) / 2 }
    : { x: face.bbox.x + face.bbox.width / 2, y: face.bbox.y + face.bbox.height * 0.42 }
  const eyeSpan = leftEye && rightEye ? Math.abs(rightEye.x - leftEye.x) : face.bbox.width * 0.42
  const faceWidth = Math.max(face.bbox.width * 0.84, eyeSpan * 2.25)
  const faceHeight = Math.max(face.bbox.height, faceWidth * 1.18)
  const center = { x: eyeCenter.x, y: chin ? (eyeCenter.y + chin.y) / 2 : face.bbox.y + face.bbox.height * 0.53 }
  const top = center.y - faceHeight * 0.53
  const points: NormalizedPoint[] = []
  for (let index = 0; index < 20; index += 1) {
    const angle = -Math.PI / 2 + (index / 20) * Math.PI * 2
    points.push({
      x: clamp((center.x + Math.cos(angle) * faceWidth / 2 - crop.x) / crop.width),
      y: clamp((top + faceHeight / 2 + Math.sin(angle) * faceHeight / 2 - crop.y) / crop.height),
    })
  }
  return points
}

export function fullSourceCrop(): NormalizedBox {
  return { x: 0, y: 0, width: 1, height: 1 }
}

