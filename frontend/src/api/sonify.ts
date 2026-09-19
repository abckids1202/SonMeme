import { API_BASE_URL } from './client'

export type SonifyResult = {
  image_base64: string
  media_type: string
  width: number
  height: number
  analysis: {
    target_type: 'face' | 'faces' | 'object' | 'unknown'
    confidence: number
    region: { x: number; y: number; width: number; height: number } | null
    description: string
  }
  model: string
}

export async function generateSonify(file: File, signal?: AbortSignal): Promise<SonifyResult> {
  const form = new FormData()
  form.append('target_image', file)
  const response = await fetch(`${API_BASE_URL}/sonify`, { method: 'POST', body: form, signal })
  if (!response.ok) {
    let message = `Generation failed with ${response.status}.`
    try {
      const body = await response.json() as { detail?: string }
      if (body.detail) message = body.detail
    } catch {
      // Keep the HTTP status when the server did not return JSON.
    }
    throw new Error(message)
  }
  return await response.json() as SonifyResult
}

export function sonifyImageUrl(result: SonifyResult): string {
  return `data:${result.media_type};base64,${result.image_base64}`
}
