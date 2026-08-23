import { API_BASE_URL } from './client'
import type { LiquifyState, MeshPoint, NormalizedPoint, SemanticHandles } from '../types/editor'

type WarpInput = {
  sourceUrl: string
  semanticHandles?: SemanticHandles
  liquify?: LiquifyState
  mesh?: MeshPoint[]
  mask: NormalizedPoint[]
  width: number
  height: number
  feather: number
  revision?: number
  signal?: AbortSignal
}

export async function requestWarpPreview(input: WarpInput): Promise<{ url: string; revision: number }> {
  const sourceResponse = await fetch(input.sourceUrl, { signal: input.signal })
  if (!sourceResponse.ok) throw new Error('Could not read the Son face source.')
  const sourceBlob = await sourceResponse.blob()
  const form = new FormData()
  form.append('source', sourceBlob, 'son-face.png')
  if (input.semanticHandles) form.append('semantic', JSON.stringify(input.semanticHandles))
  form.append('mesh', JSON.stringify(input.mesh ?? []))
  form.append('liquify', JSON.stringify(input.liquify ?? null))
  form.append('mask', JSON.stringify(input.mask))
  form.append('width', String(Math.max(2, Math.round(input.width))))
  form.append('height', String(Math.max(2, Math.round(input.height))))
  form.append('feather', String(input.feather))
  form.append('revision', String(input.revision ?? 0))
  const response = await fetch(`${API_BASE_URL}/warp`, { method: 'POST', body: form, signal: input.signal })
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.detail ?? `Warp failed with ${response.status}`)
  return { url: URL.createObjectURL(await response.blob()), revision: Number(response.headers.get('X-Warp-Revision') ?? input.revision ?? 0) }
}
