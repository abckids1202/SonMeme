import type { GenerationPreset, NormalizedBox, NormalizedPoint } from '../types/editor'
import { API_BASE_URL } from './client'

export type GenerationJobStatus = 'queued' | 'running' | 'complete' | 'failed' | 'cancelled'

export type GenerationCapabilities = {
  enabled: boolean
  configured: boolean
  provider: string
  message: string
}

export type GenerationJob = {
  job_id: string
  status: GenerationJobStatus
  result_url: string | null
  error: string | null
  provider: string
}

export type GenerationTarget = {
  kind: 'face' | 'manual'
  bbox: NormalizedBox
  face_id?: string | null
  landmarks?: Record<string, NormalizedPoint>
  corners?: NormalizedPoint[]
}

type GenerationInput = {
  targetUrl: string
  targetName: string
  targetType: string
  sourceUrl: string
  sourceName: string
  sourceCrop: NormalizedBox
  sourceMask: NormalizedPoint[]
  target: GenerationTarget
  preset: GenerationPreset
  prompt?: string
  signal?: AbortSignal
}

function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`
}

async function responseError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null) as { detail?: string } | null
  return body?.detail ?? `${fallback} (${response.status})`
}

async function urlToFile(url: string, name: string, fallbackType: string): Promise<File> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Could not read ${name}.`)
  const blob = await response.blob()
  return new File([blob], name, { type: blob.type || fallbackType || 'image/png' })
}

export async function getGenerationCapabilities(signal?: AbortSignal): Promise<GenerationCapabilities> {
  const response = await fetch(apiUrl('/generation/capabilities'), { signal })
  if (!response.ok) throw new Error(await responseError(response, 'Could not check Instant AI'))
  return await response.json() as GenerationCapabilities
}

export async function createGenerationJob(input: GenerationInput): Promise<GenerationJob> {
  const [targetFile, sourceFile] = await Promise.all([
    urlToFile(input.targetUrl, input.targetName, input.targetType),
    urlToFile(input.sourceUrl, input.sourceName, 'image/png'),
  ])
  const form = new FormData()
  form.append('target_image', targetFile)
  form.append('source_image', sourceFile)
  form.append('preset', input.preset)
  form.append('target', JSON.stringify(input.target))
  form.append('source_crop', JSON.stringify(input.sourceCrop))
  form.append('source_mask', JSON.stringify(input.sourceMask))
  if (input.prompt) form.append('prompt', input.prompt)
  const response = await fetch(apiUrl('/generation/jobs'), { method: 'POST', body: form, signal: input.signal })
  if (!response.ok) throw new Error(await responseError(response, 'Instant AI could not start'))
  return await response.json() as GenerationJob
}

export async function getGenerationJob(jobId: string, signal?: AbortSignal): Promise<GenerationJob> {
  const response = await fetch(apiUrl(`/generation/jobs/${encodeURIComponent(jobId)}`), { signal })
  if (!response.ok) throw new Error(await responseError(response, 'Could not read Instant AI status'))
  return await response.json() as GenerationJob
}

export async function cancelGenerationJob(jobId: string): Promise<GenerationJob> {
  const response = await fetch(apiUrl(`/generation/jobs/${encodeURIComponent(jobId)}/cancel`), { method: 'POST' })
  if (!response.ok) throw new Error(await responseError(response, 'Could not cancel Instant AI'))
  return await response.json() as GenerationJob
}

export async function waitForGenerationJob(
  jobId: string,
  onUpdate: (job: GenerationJob) => void,
  signal?: AbortSignal,
): Promise<GenerationJob & { resultUrl: string }> {
  let job = await getGenerationJob(jobId, signal)
  onUpdate(job)
  while (job.status === 'queued' || job.status === 'running') {
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(resolve, 700)
      signal?.addEventListener('abort', () => { window.clearTimeout(timeout); reject(new DOMException('Generation cancelled', 'AbortError')) }, { once: true })
    })
    job = await getGenerationJob(jobId, signal)
    onUpdate(job)
  }
  if (job.status !== 'complete' || !job.result_url) throw new Error(job.error ?? 'Instant AI did not produce an image.')
  const result = await fetch(apiUrl(job.result_url), { signal })
  if (!result.ok) throw new Error(await responseError(result, 'Could not download the generated image'))
  const blob = await result.blob()
  return { ...job, resultUrl: URL.createObjectURL(blob) }
}
