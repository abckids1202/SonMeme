import { ChevronDown, ImagePlus, ScanFace, Type } from 'lucide-react'
import { useRef } from 'react'
import { useEditorStore } from '../../stores/editorStore'

export function PropertiesPanel() {
  const selectedLayer = useEditorStore((state) => state.selectedLayer)
  const selectedFaceId = useEditorStore((state) => state.selectedFaceId)
  const faces = useEditorStore((state) => state.faces)
  const caption = useEditorStore((state) => state.caption)
  const sonFace = useEditorStore((state) => state.sonFace)
  const faceEditMode = useEditorStore((state) => state.faceEditMode)
  const updateCaption = useEditorStore((state) => state.updateCaption)
  const updateSonFace = useEditorStore((state) => state.updateSonFace)
  const setFaceEditMode = useEditorStore((state) => state.setFaceEditMode)
  const setActiveTool = useEditorStore((state) => state.setActiveTool)
  const imageWidth = useEditorStore((state) => state.imageWidth)
  const imageHeight = useEditorStore((state) => state.imageHeight)
  const sourceFaceUrl = useEditorStore((state) => state.sourceFaceUrl)
  const sourceFaceName = useEditorStore((state) => state.sourceFaceName)
  const setSourceFace = useEditorStore((state) => state.setSourceFace)
  const modelBadge = useEditorStore((state) => state.modelBadge)
  const resetShape = useEditorStore((state) => state.resetSonFaceShape)
  const resetPosition = useEditorStore((state) => state.resetSonFacePosition)
  const resetMask = useEditorStore((state) => state.resetSonFaceMask)
  const setExportModalOpen = useEditorStore((state) => state.setExportModalOpen)
  const sourceInputRef = useRef<HTMLInputElement>(null)

  const selectedFace = faces.find((face) => face.id === selectedFaceId)

  return (
    <aside className="properties-panel" aria-label="Properties panel">
      <section className="property-section">
        <div className="panel-heading"><Type size={18} /><h2>Caption</h2></div>
        <label className="field"><span>Text</span><input aria-label="Caption text" value={caption.text} onChange={(event) => updateCaption({ text: event.target.value })} /></label>
        <label className="checkbox-field"><input type="checkbox" checked={caption.visible} onChange={(event) => updateCaption({ visible: event.target.checked })} /><span>Show caption</span></label>
        {selectedLayer === 'caption' ? <p className="muted-copy">Drag, resize, and rotate the caption directly on the canvas.</p> : null}
      </section>

      <section className="property-section">
        <div className="panel-heading"><ScanFace size={18} /><h2>Face Fit</h2></div>
        {selectedFace ? <p className="muted-copy">Face {faces.indexOf(selectedFace) + 1} · {Math.round(selectedFace.confidence * 100)}% confidence</p> : <p className="muted-copy">{modelBadge === 'production-detector' ? 'No face found. Use Manual Target for anime, drawings, objects, or unusual angles.' : 'Use Manual Target to choose any region.'}</p>}
        <div className="mode-switch" role="group" aria-label="Face editing mode">
          {(['move', 'warp', 'mask'] as const).map((mode) => <button key={mode} type="button" className={faceEditMode === mode ? 'active' : ''} onClick={() => setFaceEditMode(mode)} disabled={!selectedFaceId}>{mode}</button>)}
        </div>
        <label className="field"><span>Opacity</span><input aria-label="Face opacity" type="range" min="0" max="1" step="0.01" value={sonFace.opacity} onChange={(event) => updateSonFace({ opacity: Number(event.target.value) })} /></label>
        <label className="field"><span>Blend</span><select value={sonFace.blend} onChange={(event) => updateSonFace({ blend: event.target.value as 'sticker' | 'soft' })}><option value="sticker">Sticker</option><option value="soft">Soft</option></select></label>
        <div className="button-row"><button type="button" className="button secondary" onClick={resetShape} disabled={!selectedFaceId}>Reset shape</button><button type="button" className="button secondary" onClick={resetPosition} disabled={!selectedFaceId}>Reset position</button></div>
        <details className="advanced-details">
          <summary><ChevronDown size={15} /> Advanced</summary>
          <label className="field"><span>Feather</span><input aria-label="Mask feather" type="range" min="0" max="30" value={sonFace.feather} onChange={(event) => updateSonFace({ feather: Number(event.target.value) })} /></label>
          <button type="button" className="button secondary full-width" onClick={resetMask} disabled={!selectedFaceId}>Reset mask</button>
        </details>
        {!selectedFaceId ? <button type="button" className="button secondary full-width" onClick={() => setActiveTool('manual-region')} disabled={imageWidth <= 0 || imageHeight <= 0}>Manual Target</button> : null}
      </section>

      <section className="property-section source-face-section">
        <div className="panel-heading"><ImagePlus size={18} /><h2>Source</h2></div>
        <div className="source-face-preview">
          {sourceFaceUrl ? <img src={sourceFaceUrl} alt="Selected face source" /> : <span>No source</span>}
          <div><strong>{sourceFaceName ?? 'No source selected'}</strong><small>Warpable Son face layer</small></div>
        </div>
        <input
          ref={sourceInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) setSourceFace({ url: URL.createObjectURL(file), name: file.name })
          }}
        />
        <button type="button" className="button secondary full-width" onClick={() => sourceInputRef.current?.click()}>
          <ImagePlus size={16} /> Choose another face image
        </button>
      </section>

      <section className="property-section export-section">
        <div className="panel-heading"><Type size={18} /><h2>Export</h2></div>
        <p className="muted-copy">PNG, JPEG, or WebP at the original image resolution or a preset.</p>
        <button type="button" className="button primary full-width" onClick={() => setExportModalOpen(true)} disabled={!imageWidth || !imageHeight}>Export image</button>
      </section>
    </aside>
  )
}
