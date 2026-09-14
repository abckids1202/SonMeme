import { Ban, Check, Cloud, RefreshCw, Sparkles, Wand2, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { cancelGenerationJob, createGenerationJob, getGenerationCapabilities, waitForGenerationJob } from '../../api/generation'
import { useEditorStore } from '../../stores/editorStore'
import type { GenerationPreset, NormalizedBox, NormalizedPoint } from '../../types/editor'

const presets: Array<{ value: GenerationPreset; label: string; detail: string }> = [
  { value: 'natural', label: 'Natural', detail: 'Match the face to the target lighting.' },
  { value: 'scene-blend', label: 'Scene blend', detail: 'Let textures and colors shape the face.' },
  { value: 'meme', label: 'Meme', detail: 'Keep the identity with a playful finish.' },
]

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, value))
}

function targetBox(x: number, y: number, width: number, height: number): NormalizedBox {
  const safeWidth = Math.max(0.02, Math.min(1, width))
  const safeHeight = Math.max(0.02, Math.min(1, height))
  return { x: clamp(x, 0, 1 - safeWidth), y: clamp(y, 0, 1 - safeHeight), width: safeWidth, height: safeHeight }
}

export function InstantAIPanel() {
  const originalUrl = useEditorStore((state) => state.originalUrl)
  const imageFile = useEditorStore((state) => state.imageFile)
  const sourceFaceUrl = useEditorStore((state) => state.sourceFaceUrl)
  const sourceFaceName = useEditorStore((state) => state.sourceFaceName)
  const sourceCrop = useEditorStore((state) => state.sourceCrop)
  const sourceMask = useEditorStore((state) => state.sourceMask)
  const sourceConfirmed = useEditorStore((state) => state.sourceConfirmed)
  const faces = useEditorStore((state) => state.faces)
  const selectedFaceId = useEditorStore((state) => state.selectedFaceId)
  const sonFace = useEditorStore((state) => state.sonFace)
  const generation = useEditorStore((state) => state.generation)
  const setGenerationState = useEditorStore((state) => state.setGenerationState)
  const acknowledgeGenerationNotice = useEditorStore((state) => state.acknowledgeGenerationNotice)
  const setExportModalOpen = useEditorStore((state) => state.setExportModalOpen)
  const abortRef = useRef<AbortController | null>(null)
  const selectedFace = faces.find((face) => face.id === selectedFaceId) ?? null
  const busy = generation.status === 'checking' || generation.status === 'queued' || generation.status === 'running'
  const targetReady = Boolean(selectedFaceId && sonFace.width > 0 && sonFace.height > 0)
  const capabilitiesUnknown = generation.providerConfigured === null
  const targetKind = selectedFace?.source === 'manual' ? 'manual' : 'face'

  useEffect(() => {
    if (!originalUrl) return
    const controller = new AbortController()
    void getGenerationCapabilities(controller.signal)
      .then((capabilities) => setGenerationState({ providerConfigured: capabilities.configured }))
      .catch(() => undefined)
    return () => controller.abort()
  }, [originalUrl, setGenerationState])

  useEffect(() => () => abortRef.current?.abort(), [])

  const target = (): { kind: 'face' | 'manual'; bbox: NormalizedBox; face_id: string | null; landmarks: Record<string, NormalizedPoint>; corners: NormalizedPoint[] } => ({
    kind: targetKind,
    bbox: targetBox(sonFace.x, sonFace.y, sonFace.width, sonFace.height),
    face_id: selectedFaceId,
    landmarks: selectedFace?.landmarks ?? {},
    corners: sonFace.distortCorners.map((point) => ({
      x: clamp(sonFace.x + point.x * sonFace.width, -0.5, 1.5),
      y: clamp(sonFace.y + point.y * sonFace.height, -0.5, 1.5),
    })),
  })

  const generate = async () => {
    if (!originalUrl || !sourceFaceUrl || !imageFile || !targetReady || !sourceConfirmed || !generation.noticeAcknowledged || busy) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    if (generation.resultUrl) URL.revokeObjectURL(generation.resultUrl)
    setGenerationState({ status: 'checking', jobId: null, resultUrl: null, active: false, error: null })
    try {
      const job = await createGenerationJob({
        targetUrl: originalUrl,
        targetName: imageFile.name,
        targetType: imageFile.type,
        sourceUrl: sourceFaceUrl,
        sourceName: sourceFaceName ?? 'son-source.png',
        sourceCrop,
        sourceMask,
        target: target(),
        preset: generation.preset,
        signal: controller.signal,
      })
      setGenerationState({ status: job.status, jobId: job.job_id, providerConfigured: true, error: null })
      const complete = await waitForGenerationJob(job.job_id, (update) => setGenerationState({ status: update.status, error: update.error }), controller.signal)
      setGenerationState({ status: 'complete', jobId: complete.job_id, resultUrl: complete.resultUrl, active: false, error: null })
    } catch (error) {
      if (controller.signal.aborted) {
        setGenerationState({ status: 'cancelled', error: null, active: false })
      } else {
        setGenerationState({ status: 'failed', error: error instanceof Error ? error.message : 'Instant AI failed.', active: false })
      }
    }
  }

  const cancel = async () => {
    const jobId = generation.jobId
    abortRef.current?.abort()
    if (jobId) await cancelGenerationJob(jobId).catch(() => undefined)
    setGenerationState({ status: 'cancelled', active: false, error: null })
  }

  const statusText = generation.status === 'checking'
    ? 'Preparing the scene…'
    : generation.status === 'queued'
      ? 'Waiting for the image model…'
      : generation.status === 'running'
        ? 'Blending Son into the scene…'
        : generation.status === 'complete'
          ? generation.active ? 'Using the generated result' : 'Result ready to review'
          : generation.status === 'cancelled' ? 'Generation cancelled' : generation.status === 'failed' ? 'Generation failed' : 'Make a realistic scene blend'

  return <section className="property-section instant-ai-section" aria-label="Instant AI">
    <div className="panel-heading"><Sparkles size={18} /><h2>Instant AI</h2><span className="ai-beta-pill">Beta</span></div>
    <p className="muted-copy">Blend Son into the selected face, person, object, or scene instead of placing a sticker on top.</p>
    <div className="ai-preset-grid" role="group" aria-label="Instant AI style">
      {presets.map((preset) => <button key={preset.value} type="button" className={generation.preset === preset.value ? 'ai-preset active' : 'ai-preset'} onClick={() => setGenerationState({ preset: preset.value })} disabled={busy}><strong>{preset.label}</strong><small>{preset.detail}</small></button>)}
    </div>
    <div className="ai-target-summary"><Cloud size={15} /><span>{targetReady ? `${targetKind === 'manual' ? 'Manual region' : 'Face target'} ready` : 'Select a face or draw a target first'}</span></div>
    {!generation.noticeAcknowledged ? <label className="checkbox-field ai-notice"><input type="checkbox" onChange={(event) => { if (event.target.checked) acknowledgeGenerationNotice() }} /><span>This sends the two active images to the configured AI provider. They are used temporarily and not saved by Sonify.</span></label> : null}
    {generation.providerConfigured === false ? <p className="ai-unavailable"><Ban size={15} /> Add a provider URL and server-side API key to enable Instant AI.</p> : null}
    {generation.error ? <p className="ai-error" role="alert"><X size={15} /> {generation.error}</p> : null}
    {generation.resultUrl ? <div className="ai-result-preview"><img src={generation.resultUrl} alt="Instant AI generated result" /><span>{generation.active ? 'Active result' : 'Review result'}</span></div> : null}
    <div className="ai-status" role="status">{statusText}</div>
    {generation.status === 'complete' && generation.resultUrl && !generation.active ? <div className="button-row ai-result-actions"><button type="button" className="button primary" onClick={() => setGenerationState({ active: true })}><Check size={15} /> Use result</button><button type="button" className="button secondary" onClick={() => void generate()} disabled={busy}><RefreshCw size={15} /> Try again</button></div> : null}
    {generation.status === 'complete' && generation.resultUrl && generation.active ? <div className="button-row ai-result-actions"><button type="button" className="button secondary" onClick={() => setGenerationState({ active: false })}>Edit manually</button><button type="button" className="button primary" onClick={() => setExportModalOpen(true)}>Export result</button></div> : null}
    {busy ? <button type="button" className="button secondary full-width" onClick={() => void cancel()}><X size={15} /> Cancel</button> : <button type="button" className="button primary full-width" onClick={() => void generate()} disabled={!targetReady || !sourceConfirmed || !generation.noticeAcknowledged || generation.providerConfigured === false}><Wand2 size={16} /> {generation.resultUrl ? 'Regenerate with this placement' : 'Instant AI blend'}</button>}
    {capabilitiesUnknown ? <small className="ai-footnote">Provider status is checked when the editor connects to the backend.</small> : null}
  </section>
}
