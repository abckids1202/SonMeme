import type { DetectedFace } from '../types/editor'
import { API_BASE_URL } from './client'

type DetectionResponse = {
  imageId: string
  faces: Array<{ id: string; confidence: number; bbox: DetectedFace['bbox']; bboxPixels: { x: number; y: number; width: number; height: number } }>
  model: { customTrained: boolean; inputSize: number; runtime: string }
}

export async function detectImage(file: File): Promise<DetectionResponse> {
  const form = new FormData()
  form.append('image', file)
  const response = await fetch(`${API_BASE_URL}/detection`, { method: 'POST', body: form })
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.detail ?? `Detection failed with ${response.status}`)
  return (await response.json()) as DetectionResponse
}
