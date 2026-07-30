import { ImagePlus, ScanFace, SlidersHorizontal, Type } from 'lucide-react'
import { useRef } from 'react'
import { useEditorStore } from '../../stores/editorStore'

export function PropertiesPanel() {
  const quickMode = useEditorStore((state) => state.quickMode)
  const setQuickMode = useEditorStore((state) => state.setQuickMode)
  const selectedLayer = useEditorStore((state) => state.selectedLayer)
  const selectedFaceId = useEditorStore((state) => state.selectedFaceId)
  const faces = useEditorStore((state) => state.faces)
  const caption = useEditorStore((state) => state.caption)
  const emoji = useEditorStore((state) => state.emoji)
  const transform = useEditorStore((state) => state.faceTransform)
  const updateCaption = useEditorStore((state) => state.updateCaption)
  const updateEmoji = useEditorStore((state) => state.updateEmoji)
  const updateTransform = useEditorStore((state) => state.updateTransform)
  const setFaces = useEditorStore((state) => state.setFaces)
  const imageWidth = useEditorStore((state) => state.imageWidth)
  const imageHeight = useEditorStore((state) => state.imageHeight)
  const sourceFaceUrl = useEditorStore((state) => state.sourceFaceUrl)
  const sourceFaceName = useEditorStore((state) => state.sourceFaceName)
  const setSourceFace = useEditorStore((state) => state.setSourceFace)
  const sourceInputRef = useRef<HTMLInputElement>(null)

  const selectedFace = faces.find((face) => face.id === selectedFaceId)

  return (
    <aside className="properties-panel" aria-label="Properties panel">
      <div className="quick-toggle" role="group" aria-label="Control density">
        <button type="button" className={quickMode === 'quick' ? 'active' : ''} onClick={() => setQuickMode('quick')}>Quick</button>
        <button type="button" className={quickMode === 'advanced' ? 'active' : ''} onClick={() => setQuickMode('advanced')}>Advanced</button>
      </div>

      {selectedLayer === 'caption' ? (
        <section className="property-section">
          <div className="panel-heading"><Type size={18} /><h2>Caption</h2></div>
          <label className="field"><span>Text</span><input value={caption.text} onChange={(event) => updateCaption({ text: event.target.value })} /></label>
          <label className="field"><span>Font size</span><input type="number" min="18" max="180" value={caption.fontSize} onChange={(event) => updateCaption({ fontSize: Number(event.target.value) })} /></label>
          <label className="field"><span>Stroke width</span><input type="number" min="0" max="16" value={caption.strokeWidth} onChange={(event) => updateCaption({ strokeWidth: Number(event.target.value) })} /></label>
          <label className="field"><span>Rotation</span><input type="range" min="-45" max="45" value={caption.rotation} onChange={(event) => updateCaption({ rotation: Number(event.target.value) })} /></label>
          <label className="checkbox-field"><input type="checkbox" checked={caption.visible} onChange={(event) => updateCaption({ visible: event.target.checked })} /><span>Visible</span></label>
        </section>
      ) : selectedLayer === 'emoji' ? (
        <section className="property-section">
          <div className="panel-heading"><Type size={18} /><h2>Emoji</h2></div>
          <label className="field"><span>Emoji</span><select value={emoji.value} onChange={(event) => updateEmoji({ value: event.target.value as typeof emoji.value })}><option value="crying">Crying</option><option value="sob">Sob</option><option value="skull">Skull</option></select></label>
          <label className="field"><span>Size</span><input type="number" min="18" max="220" value={emoji.size} onChange={(event) => updateEmoji({ size: Number(event.target.value) })} /></label>
          <label className="field"><span>Opacity</span><input type="range" min="0" max="1" step="0.01" value={emoji.opacity} onChange={(event) => updateEmoji({ opacity: Number(event.target.value) })} /></label>
          <label className="checkbox-field"><input type="checkbox" checked={emoji.groupedWithCaption} onChange={(event) => updateEmoji({ groupedWithCaption: event.target.checked })} /><span>Group with text</span></label>
        </section>
      ) : (
        <section className="property-section">
          <div className="panel-heading"><ScanFace size={18} /><h2>{selectedFace ? 'Selected face' : 'Workflow'}</h2></div>
          {selectedFace ? (
            <>
              <p className="muted-copy">Face {faces.indexOf(selectedFace) + 1} · {Math.round(selectedFace.confidence * 100)}% confidence · {selectedFace.source}</p>
              <button type="button" className="button primary full-width" onClick={() => useEditorStore.getState().selectLayer('face')}>Replace this face</button>
            </>
          ) : (
            <>
              <p className="muted-copy">{faces.length === 0 ? 'No detector result yet. Use mock boxes while training, draw a manual region, or use free cutout mode.' : 'Which person should become “son”?'}</p>
              <button type="button" className="button secondary full-width" onClick={() => setFaces([{ id: 'mock-face-1', bbox: { x: 0.38, y: 0.2, width: 0.22, height: 0.28 }, confidence: 0.93, source: 'mock', pose: { yaw: 0, pitch: 0, roll: 0 } }], 'mock-data')} disabled={imageWidth <= 0 || imageHeight <= 0}>Use mock detector box</button>
            </>
          )}
        </section>
      )}

      <section className="property-section source-face-section">
        <div className="panel-heading"><ImagePlus size={18} /><h2>Face source</h2></div>
        <div className="source-face-preview">
          {sourceFaceUrl ? <img src={sourceFaceUrl} alt="Selected face source" /> : <span>No source</span>}
          <div><strong>{sourceFaceName ?? 'No source selected'}</strong><small>Clipped to the selected target face</small></div>
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

      <section className="property-section">
        <div className="panel-heading"><SlidersHorizontal size={18} /><h2>Replacement</h2></div>
        <label className="field"><span>Blend strength</span><input type="range" min="0" max="1" step="0.01" value={transform.blendStrength} onChange={(event) => updateTransform({ blendStrength: Number(event.target.value) })} /></label>
        <label className="field"><span>Face size</span><input type="range" min="0.65" max="1.5" step="0.01" value={transform.scale} onChange={(event) => updateTransform({ scale: Number(event.target.value) })} /></label>
        {quickMode === 'advanced' ? (
          <>
            <label className="field"><span>X offset</span><input type="range" min="-0.35" max="0.35" step="0.01" value={transform.offsetX} onChange={(event) => updateTransform({ offsetX: Number(event.target.value) })} /></label>
            <label className="field"><span>Y offset</span><input type="range" min="-0.35" max="0.35" step="0.01" value={transform.offsetY} onChange={(event) => updateTransform({ offsetY: Number(event.target.value) })} /></label>
            <label className="field"><span>Mask feathering</span><input type="number" min="0" max="80" value={transform.feathering} onChange={(event) => updateTransform({ feathering: Number(event.target.value) })} /></label>
            <label className="field"><span>Mask expansion</span><input type="range" min="0" max="24" value={transform.maskExpansion} onChange={(event) => updateTransform({ maskExpansion: Number(event.target.value) })} /></label>
            <label className="field"><span>Rotation</span><input type="range" min="-30" max="30" value={transform.rotation} onChange={(event) => updateTransform({ rotation: Number(event.target.value) })} /></label>
          </>
        ) : null}
      </section>
    </aside>
  )
}
