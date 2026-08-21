import { API_BASE_URL } from './client'
import type { MeshPoint, NormalizedPoint } from '../types/editor'

type WarpInput = {
  sourceUrl: string
  mesh: MeshPoint[]
  mask: NormalizedPoint[]
  width: number
  height: number
  feather: number
  signal?: AbortSignal
}

export async function requestWarpPreview(input: WarpInput): Promise<string> {
  const sourceResponse = await fetch(input.sourceUrl, { signal: input.signal })
  if (!sourceResponse.ok) throw new Error('Could not read the Son face source.')
  const sourceBlob = await sourceResponse.blob()
  const form = new FormData()
  form.append('source', sourceBlob, 'son-face.png')
  form.append('mesh', JSON.stringify(input.mesh))
  form.append('mask', JSON.stringify(input.mask))
  form.append('width', String(Math.max(2, Math.round(input.width))))
  form.append('height', String(Math.max(2, Math.round(input.height))))
  form.append('feather', String(input.feather))
  const response = await fetch(`${API_BASE_URL}/warp`, { method: 'POST', body: form, signal: input.signal })
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.detail ?? `Warp failed with ${response.status}`)
  return URL.createObjectURL(await response.blob())
}
