import { Blend, ImagePlus, Move, ScanFace, Sparkles, Type, Wand2 } from 'lucide-react'
import { useRef } from 'react'
import { useEditorStore } from '../../stores/editorStore'

export function PropertiesPanel() {
  const selectedLayer = useEditorStore((state) => state.selectedLayer)
  const selectedFaceId = useEditorStore((state) => state.selectedFaceId)
  const faces = useEditorStore((state) => state.faces)
  const caption = useEditorStore((state) => state.caption)
  const sonFace = useEditorStore((state) => state.sonFace)
  const faceEditMode = useEditorStore((state) => state.faceEditMode)
  const fitGroup = useEditorStore((state) => state.fitGroup)
  const symmetryEnabled = useEditorStore((state) => state.symmetryEnabled)
  const manualFitMode = useEditorStore((state) => state.manualFitMode)
  const updateCaption = useEditorStore((state) => state.updateCaption)
  const updateSonFace = useEditorStore((state) => state.updateSonFace)
  const setFaceEditMode = useEditorStore((state) => state.setFaceEditMode)
  const setFitGroup = useEditorStore((state) => state.setFitGroup)
  const setSymmetryEnabled = useEditorStore((state) => state.setSymmetryEnabled)
  const setManualFitMode = useEditorStore((state) => state.setManualFitMode)
  const setActiveTool = useEditorStore((state) => state.setActiveTool)
  const imageWidth = useEditorStore((state) => state.imageWidth)
  const imageHeight = useEditorStore((state) => state.imageHeight)
  const sourceFaceUrl = useEditorStore((state) => state.sourceFaceUrl)
  const sourceFaceName = useEditorStore((state) => state.sourceFaceName)
  const setSourceFace = useEditorStore((state) => state.setSourceFace)
  const modelBadge = useEditorStore((state) => state.modelBadge)
  const autoFitFace = useEditorStore((state) => state.autoFitFace)
  const resetShape = useEditorStore((state) => state.resetSonFaceShape)
  const resetPosition = useEditorStore((state) => state.resetSonFacePosition)
  const resetMask = useEditorStore((state) => state.resetSonFaceMask)
  const resetLiquify = useEditorStore((state) => state.resetLiquify)
  const setExportModalOpen = useEditorStore((state) => state.setExportModalOpen)
  const sourceInputRef = useRef<HTMLInputElement>(null)

  const selectedFace = faces.find((face) => face.id === selectedFaceId)
  const modes = [
    { mode: 'move' as const, label: 'Move', icon: Move },
    { mode: 'fit' as const, label: 'Fit', icon: ScanFace },
    { mode: 'liquify' as const, label: 'Liquify', icon: Sparkles },
    { mode: 'mask' as const, label: 'Mask', icon: Wand2 },
  ]

  return (
    <aside className="properties-panel" aria-label="Properties panel">
      <section className="property-section">
        <div className="panel-heading"><Type size={18} /><h2>Caption</h2></div>
        <label className="field"><span>Text</span><input aria-label="Caption text" value={caption.text} onChange={(event) => updateCaption({ text: event.target.value })} /></label>
        <label className="checkbox-field"><input type="checkbox" checked={caption.visible} onChange={(event) => updateCaption({ visible: event.target.checked })} /><span>Show caption</span></label>
        {selectedLayer === 'caption' ? <p className="muted-copy">Drag the caption, or use its corner handles to resize and rotate it.</p> : null}
      </section>

      <section className="property-section">
        <div className="panel-heading"><ScanFace size={18} /><h2>Son face</h2></div>
        {selectedFace ? <p className="muted-copy">Face {faces.indexOf(selectedFace) + 1} · {Math.round(selectedFace.confidence * 100)}% confidence</p> : <p className="muted-copy">Choose a detected face, or draw a manual target for anime, drawings, and objects.</p>}
        <div className="mode-switch" role="group" aria-label="Face editing mode">
          {modes.map(({ mode, label, icon: Icon }) => <button key={mode} type="button" className={faceEditMode === mode ? 'active' : ''} onClick={() => setFaceEditMode(mode)} disabled={!selectedFaceId}><Icon size={14} />{label}</button>)}
        </div>
        {selectedFaceId ? <>
          {selectedFace?.source === 'manual' ? <div className="mode-switch" role="group" aria-label="Manual fitting mode">
            <button type="button" className={manualFitMode === 'quick' ? 'active' : ''} onClick={() => { setManualFitMode('quick'); setFaceEditMode('fit') }}>Quick Fit</button>
            <button type="button" className={manualFitMode === 'free' ? 'active' : ''} onClick={() => { setManualFitMode('free'); setFaceEditMode('move') }}>Free Fit</button>
          </div> : null}
          <button type="button" className="button primary full-width" onClick={autoFitFace}><Wand2 size={16} /> Auto Fit</button>
          {faceEditMode === 'fit' ? <div className="fit-controls">
            <label className="field"><span>Adjust</span><select aria-label="Fit group" value={fitGroup} onChange={(event) => setFitGroup(event.target.value as typeof fitGroup)}><option value="individual">One handle</option><option value="whole">Whole face</option><option value="eyes">Eyes</option><option value="mouth">Mouth</option><option value="jaw">Jaw</option></select></label>
            <label className="checkbox-field"><input type="checkbox" checked={symmetryEnabled} onChange={(event) => setSymmetryEnabled(event.target.checked)} /><span>Keep left and right balanced</span></label>
            <p className="muted-copy">Move the yellow handles onto the cyan guides. Space temporarily hides the face.</p>
          </div> : null}
          {faceEditMode === 'liquify' ? <div className="fit-controls">
            <p className="muted-copy">Paint directly on the face to push it into place. The deformation stays separate from Move and Fit.</p>
            <label className="field"><span>Brush size</span><input aria-label="Liquify brush size" type="range" min="0.06" max="0.5" step="0.01" value={sonFace.liquify.brushSize} onChange={(event) => updateSonFace({ liquify: { ...sonFace.liquify, brushSize: Number(event.target.value) } })} /></label>
            <label className="field"><span>Strength</span><input aria-label="Liquify strength" type="range" min="0.1" max="1" step="0.05" value={sonFace.liquify.strength} onChange={(event) => updateSonFace({ liquify: { ...sonFace.liquify, strength: Number(event.target.value) } })} /></label>
            <button type="button" className="button secondary full-width" onClick={resetLiquify}>Reset liquify</button>
          </div> : null}
          <label className="field"><span>Opacity</span><input aria-label="Face opacity" type="range" min="0" max="1" step="0.01" value={sonFace.opacity} onChange={(event) => updateSonFace({ opacity: Number(event.target.value) })} /></label>
          <label className="field"><span>Blend</span><div className="input-with-icon"><Blend size={15} /><select value={sonFace.blend} onChange={(event) => updateSonFace({ blend: event.target.value as 'sticker' | 'soft' })}><option value="sticker">Sticker</option><option value="soft">Soft</option></select></div></label>
          <div className="button-row"><button type="button" className="button secondary" onClick={resetShape}>Reset fit</button><button type="button" className="button secondary" onClick={resetPosition}>Reset position</button></div>
          <details className="advanced-details">
            <summary>Mask and edge</summary>
            <label className="field"><span>Feather</span><input aria-label="Mask feather" type="range" min="0" max="30" value={sonFace.feather} onChange={(event) => updateSonFace({ feather: Number(event.target.value) })} /></label>
            <button type="button" className="button secondary full-width" onClick={resetMask}>Reset mask</button>
          </details>
        </> : null}
        {!selectedFaceId ? <button type="button" className="button secondary full-width" onClick={() => setActiveTool('manual-region')} disabled={imageWidth <= 0 || imageHeight <= 0}>Draw manual target</button> : null}
        {modelBadge === 'backend-disconnected' && imageWidth > 0 ? <p className="muted-copy">Detector unavailable. Manual target is ready.</p> : null}
      </section>

      <section className="property-section source-face-section">
        <div className="panel-heading"><ImagePlus size={18} /><h2>Source</h2></div>
        <div className="source-face-preview">
          {sourceFaceUrl ? <img src={sourceFaceUrl} alt="Selected face source" /> : <span>No source</span>}
          <div><strong>{sourceFaceName ?? 'No source selected'}</strong><small>Semantic fit source</small></div>
        </div>
        <input ref={sourceInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) setSourceFace({ url: URL.createObjectURL(file), name: file.name }) }} />
        <button type="button" className="button secondary full-width" onClick={() => sourceInputRef.current?.click()}><ImagePlus size={16} /> Choose another face image</button>
      </section>

      <section className="property-section export-section">
        <div className="panel-heading"><Type size={18} /><h2>Export</h2></div>
        <p className="muted-copy">PNG, JPEG, or WebP at the original image resolution or a preset.</p>
        <button type="button" className="button primary full-width" onClick={() => setExportModalOpen(true)} disabled={!imageWidth || !imageHeight}>Export image</button>
      </section>
    </aside>
  )
}
