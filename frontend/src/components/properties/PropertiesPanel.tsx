import { Blend, Check, ImagePlus, RotateCw, ScanFace, SlidersHorizontal, Sparkles } from 'lucide-react'
import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { detectImage } from '../../api/detection'
import { useEditorStore } from '../../stores/editorStore'
import type { DetectedFace, FaceEditMode, NormalizedBox } from '../../types/editor'
import { fullSourceCrop, sourceCropForFace, sourceMaskForFace } from '../../utils/sourceFace'
import { InstantAIPanel } from '../generator/InstantAIPanel'

const modes: Array<{ mode: FaceEditMode; label: string; icon: typeof ScanFace }> = [
  { mode: 'move', label: 'Move', icon: ScanFace },
  { mode: 'resize', label: 'Resize', icon: SlidersHorizontal },
  { mode: 'rotate', label: 'Rotate', icon: RotateCw },
  { mode: 'distort', label: 'Distort', icon: Sparkles },
]

function CropField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="field compact-field"><span>{label}</span><input type="number" min="0" max="1" step="0.01" value={Number(value.toFixed(2))} onChange={(event) => onChange(Number(event.target.value))} /></label>
}

function SourceCropEditor({ url, crop, onChange }: { url: string; crop: NormalizedBox; onChange: (crop: NormalizedBox) => void }) {
  const frameRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startX: number; startY: number; crop: NormalizedBox; handle: number | null } | null>(null)
  const pointFromEvent = (event: ReactPointerEvent) => {
    const frame = frameRef.current?.getBoundingClientRect()
    if (!frame) return { x: 0, y: 0 }
    return { x: Math.max(0, Math.min(1, (event.clientX - frame.left) / frame.width)), y: Math.max(0, Math.min(1, (event.clientY - frame.top) / frame.height)) }
  }
  const updateFromPointer = (event: ReactPointerEvent) => {
    const start = dragRef.current
    if (!start) return
    const point = pointFromEvent(event)
    const dx = point.x - start.startX
    const dy = point.y - start.startY
    const right = start.crop.x + start.crop.width
    const bottom = start.crop.y + start.crop.height
    let next = start.crop
    if (start.handle === null) next = { ...start.crop, x: Math.max(0, Math.min(1 - start.crop.width, start.crop.x + dx)), y: Math.max(0, Math.min(1 - start.crop.height, start.crop.y + dy)) }
    if (start.handle === 0) next = { x: Math.max(0, Math.min(right - 0.02, start.crop.x + dx)), y: Math.max(0, Math.min(bottom - 0.02, start.crop.y + dy)), width: right - Math.max(0, Math.min(right - 0.02, start.crop.x + dx)), height: bottom - Math.max(0, Math.min(bottom - 0.02, start.crop.y + dy)) }
    if (start.handle === 1) next = { x: start.crop.x, y: Math.max(0, Math.min(bottom - 0.02, start.crop.y + dy)), width: Math.max(0.02, Math.min(1 - start.crop.x, point.x - start.crop.x)), height: bottom - Math.max(0, Math.min(bottom - 0.02, start.crop.y + dy)) }
    if (start.handle === 2) next = { ...start.crop, width: Math.max(0.02, Math.min(1 - start.crop.x, point.x - start.crop.x)), height: Math.max(0.02, Math.min(1 - start.crop.y, point.y - start.crop.y)) }
    if (start.handle === 3) next = { x: Math.max(0, Math.min(right - 0.02, start.crop.x + dx)), y: start.crop.y, width: right - Math.max(0, Math.min(right - 0.02, start.crop.x + dx)), height: Math.max(0.02, Math.min(1 - start.crop.y, point.y - start.crop.y)) }
    onChange(next)
  }
  return <div className="source-crop-editor" ref={frameRef} onPointerMove={updateFromPointer} onPointerUp={() => { dragRef.current = null }} onPointerCancel={() => { dragRef.current = null }}>
    <img src={url} alt="Source crop preview" draggable={false} />
    <div className="source-crop-box" style={{ left: `${crop.x * 100}%`, top: `${crop.y * 100}%`, width: `${crop.width * 100}%`, height: `${crop.height * 100}%` }} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); const point = pointFromEvent(event); dragRef.current = { startX: point.x, startY: point.y, crop, handle: null } }}>
      {[0, 1, 2, 3].map((handle) => <span key={handle} className={`crop-handle crop-handle-${handle}`} onPointerDown={(event) => { event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); const point = pointFromEvent(event); dragRef.current = { startX: point.x, startY: point.y, crop, handle } }} />)}
    </div>
  </div>
}

export function PropertiesPanel() {
  const selectedFaceId = useEditorStore((state) => state.selectedFaceId)
  const faces = useEditorStore((state) => state.faces)
  const caption = useEditorStore((state) => state.caption)
  const sonFace = useEditorStore((state) => state.sonFace)
  const faceEditMode = useEditorStore((state) => state.faceEditMode)
  const sourceFaceUrl = useEditorStore((state) => state.sourceFaceUrl)
  const sourceFaceName = useEditorStore((state) => state.sourceFaceName)
  const sourceCrop = useEditorStore((state) => state.sourceCrop)
  const sourceNeedsReview = useEditorStore((state) => state.sourceNeedsReview)
  const modelBadge = useEditorStore((state) => state.modelBadge)
  const updateCaption = useEditorStore((state) => state.updateCaption)
  const updateSonFace = useEditorStore((state) => state.updateSonFace)
  const setFaceEditMode = useEditorStore((state) => state.setFaceEditMode)
  const setActiveTool = useEditorStore((state) => state.setActiveTool)
  const selectFace = useEditorStore((state) => state.selectFace)
  const setSourceFace = useEditorStore((state) => state.setSourceFace)
  const confirmSourceFace = useEditorStore((state) => state.confirmSourceFace)
  const resetPosition = useEditorStore((state) => state.resetSonFacePosition)
  const resetShape = useEditorStore((state) => state.resetSonFaceShape)
  const setExportModalOpen = useEditorStore((state) => state.setExportModalOpen)
  const sourceInputRef = useRef<HTMLInputElement>(null)
  const [sourceBusy, setSourceBusy] = useState(false)
  const [sourceMessage, setSourceMessage] = useState('')
  const [sourceChoices, setSourceChoices] = useState<DetectedFace[]>([])
  const [pendingSource, setPendingSource] = useState<{ url: string; name: string } | null>(null)
  const selectedFace = faces.find((face) => face.id === selectedFaceId)

  const updateCrop = (changes: Partial<NormalizedBox>) => {
    const next = { ...sourceCrop, ...changes }
    const safe = { ...next, width: Math.max(0.02, Math.min(1 - next.x, next.width)), height: Math.max(0.02, Math.min(1 - next.y, next.height)) }
    setSourceFace({ url: sourceFaceUrl ?? '', name: sourceFaceName ?? 'Source face', crop: safe, needsReview: true })
  }

  const applyPreparedSource = (url: string, name: string, source: DetectedFace) => {
    const crop = sourceCropForFace(source)
    const mask = sourceMaskForFace(source, crop)
    setSourceFace({ url, name, crop, mask, needsReview: true })
    setSourceMessage('Check the crop, then confirm it.')
  }

  const chooseSource = async (file: File) => {
    setSourceBusy(true)
    setSourceMessage('Finding a source face…')
    const url = URL.createObjectURL(file)
    try {
      const detection = await detectImage(file)
      const detectedSources = detection.faces.map((item) => ({ ...item, source: detection.model.production ? 'external-baseline' as const : 'custom-detector' as const, landmarks: Object.fromEntries(Object.entries(item.landmarks ?? {}).map(([key, point]) => [key, { x: point[0], y: point[1] }])) }))
      const source = [...detectedSources].sort((first, second) => (second.bbox.width * second.bbox.height) - (first.bbox.width * first.bbox.height))[0]
      if (source) {
        setSourceChoices(detectedSources)
        setPendingSource({ url, name: file.name })
        applyPreparedSource(url, file.name, source)
        if (detectedSources.length > 1) setSourceMessage('Largest face selected. Choose another if needed, then check the crop.')
      } else {
        setSourceChoices([])
        setPendingSource({ url, name: file.name })
        setSourceFace({ url, name: file.name, crop: fullSourceCrop(), needsReview: true })
        setSourceMessage('No face found. Adjust the crop fields, then confirm.')
      }
    } catch {
      setSourceChoices([])
      setPendingSource({ url, name: file.name })
      setSourceFace({ url, name: file.name, crop: fullSourceCrop(), needsReview: true })
      setSourceMessage('Source detection failed. Adjust the crop fields, then confirm.')
    } finally {
      setSourceBusy(false)
    }
  }

  return <aside className="properties-panel" aria-label="Face controls">
    <InstantAIPanel />
    <section className="property-section face-target-section">
      <div className="panel-heading"><ScanFace size={18} /><h2>Target face</h2></div>
      {faces.length > 0 ? <div className="face-choice-list" role="group" aria-label="Detected faces">
        {faces.map((face, index) => <button key={face.id} type="button" className={face.id === selectedFaceId ? 'face-choice active' : 'face-choice'} onClick={() => selectFace(face.id)}><span>Face {index + 1}</span><small>{Math.round(face.confidence * 100)}%</small></button>)}
      </div> : <p className="muted-copy">No reliable face found. Draw a rectangle around the person or object to place Son.</p>}
      {!selectedFaceId ? <button type="button" className="button primary full-width" onClick={() => setActiveTool('manual-region')}><ScanFace size={16} /> Draw target</button> : null}
      {modelBadge === 'backend-disconnected' ? <p className="muted-copy">Detection is unavailable. Manual targeting still works.</p> : null}
    </section>

    <section className="property-section">
      <div className="panel-heading"><Sparkles size={18} /><h2>Son face</h2></div>
      <p className="muted-copy">{selectedFace ? `Placed on Face ${faces.indexOf(selectedFace) + 1}` : 'Select a face or draw a target region.'}</p>
      <div className="mode-switch" role="group" aria-label="Face editing mode">
        {modes.map(({ mode, label, icon: Icon }) => <button key={mode} type="button" className={faceEditMode === mode ? 'active' : ''} onClick={() => setFaceEditMode(mode)} disabled={!selectedFaceId}><Icon size={14} />{label}</button>)}
      </div>
      {selectedFaceId ? <>
        <button type="button" className="button secondary full-width" onClick={resetPosition}>Reset to target</button>
        {faceEditMode === 'distort' ? <p className="muted-copy">Drag the four corner points on the canvas to fit the face to the scene.</p> : <p className="muted-copy">Drag the face directly. Resize keeps its proportions; Rotate shows a rotation handle.</p>}
        <label className="field"><span>Opacity</span><input aria-label="Face opacity" type="range" min="0" max="1" step="0.01" value={sonFace.opacity} onChange={(event) => updateSonFace({ opacity: Number(event.target.value) })} /></label>
        <label className="field"><span>Blend</span><div className="input-with-icon"><Blend size={15} /><select value={sonFace.blend} onChange={(event) => updateSonFace({ blend: event.target.value as 'sticker' | 'soft' })}><option value="sticker">Sticker</option><option value="soft">Soft</option></select></div></label>
        <button type="button" className="button secondary full-width" onClick={resetShape}>Reset shape</button>
      </> : null}
    </section>

    <section className="property-section source-face-section">
      <div className="panel-heading"><ImagePlus size={18} /><h2>Source</h2></div>
      <div className="source-face-preview">{sourceFaceUrl ? <img src={sourceFaceUrl} alt="Selected source face" /> : <span>No source</span>}<div><strong>{sourceFaceName ?? 'Anthony Mackie'}</strong><small>Ready to insert</small></div></div>
      <input ref={sourceInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void chooseSource(file); event.currentTarget.value = '' }} />
      <button type="button" className="button secondary full-width" onClick={() => sourceInputRef.current?.click()} disabled={sourceBusy}><ImagePlus size={16} /> {sourceBusy ? 'Preparing source…' : 'Change source face'}</button>
      {sourceMessage ? <p className="muted-copy" role="status">{sourceMessage}</p> : null}
      {sourceNeedsReview && sourceFaceUrl ? <>
        {sourceChoices.length > 1 && pendingSource ? <div className="face-choice-list source-choice-list" role="group" aria-label="Source faces">{sourceChoices.map((face, index) => <button key={face.id} type="button" className={sourceFaceName === pendingSource.name && sourceCrop.x === sourceCropForFace(face).x ? 'face-choice active' : 'face-choice'} onClick={() => applyPreparedSource(pendingSource.url, pendingSource.name, face)}><span>Source {index + 1}</span><small>{Math.round(face.confidence * 100)}%</small></button>)}</div> : null}
        <SourceCropEditor url={sourceFaceUrl} crop={sourceCrop} onChange={(crop) => updateCrop(crop)} />
        <div className="crop-grid"><CropField label="Left" value={sourceCrop.x} onChange={(value) => updateCrop({ x: Math.max(0, Math.min(0.98, value)) })} /><CropField label="Top" value={sourceCrop.y} onChange={(value) => updateCrop({ y: Math.max(0, Math.min(0.98, value)) })} /><CropField label="Width" value={sourceCrop.width} onChange={(value) => updateCrop({ width: Math.max(0.02, value) })} /><CropField label="Height" value={sourceCrop.height} onChange={(value) => updateCrop({ height: Math.max(0.02, value) })} /></div>
        <button type="button" className="button primary full-width" onClick={confirmSourceFace}><Check size={16} /> Use this source</button>
      </> : null}
    </section>

    <section className="property-section">
      <div className="panel-heading"><Sparkles size={18} /><h2>Caption</h2></div>
      <label className="field"><span>Text</span><input aria-label="Caption text" value={caption.text} onChange={(event) => updateCaption({ text: event.target.value })} /></label>
      <label className="checkbox-field"><input type="checkbox" checked={caption.visible} onChange={(event) => updateCaption({ visible: event.target.checked })} /><span>Show son caption</span></label>
    </section>

    <section className="property-section export-section"><button type="button" className="button primary full-width" onClick={() => setExportModalOpen(true)}><Check size={16} /> Export image</button></section>
  </aside>
}
