import { Download, Maximize, Minus, Plus, RotateCcw, Wand2 } from 'lucide-react'
import { useEditorStore } from '../../stores/editorStore'

export function BottomActionBar() {
  const viewport = useEditorStore((state) => state.viewport)
  const setViewport = useEditorStore((state) => state.setViewport)
  const resetView = useEditorStore((state) => state.resetView)
  const hasImage = useEditorStore((state) => Boolean(state.originalUrl))
  const selectedFaceId = useEditorStore((state) => state.selectedFaceId)
  const modelBadge = useEditorStore((state) => state.modelBadge)

  const disabledReason = !hasImage ? 'No image loaded' : !selectedFaceId ? 'Select a face first' : modelBadge === 'backend-disconnected' ? 'Backend unavailable' : ''

  return (
    <footer className="bottom-action-bar" aria-label="Editor actions">
      <div className="action-group">
        <button type="button" className="icon-button" aria-label="Undo" disabled>Undo</button>
        <button type="button" className="icon-button" aria-label="Redo" disabled>Redo</button>
      </div>
      <div className="action-group">
        <button type="button" className="icon-button" aria-label="Zoom out" onClick={() => setViewport({ zoom: Math.max(0.1, viewport.zoom - 0.1) })}><Minus size={16} /></button>
        <span className="zoom-readout">{Math.round(viewport.zoom * 100)}%</span>
        <button type="button" className="icon-button" aria-label="Zoom in" onClick={() => setViewport({ zoom: Math.min(5, viewport.zoom + 0.1) })}><Plus size={16} /></button>
        <button type="button" className="button secondary compact-button" onClick={resetView}><Maximize size={16} /> Fit</button>
        <button type="button" className="button secondary compact-button" onClick={() => setViewport({ zoom: 1, panX: 0, panY: 0 })}><RotateCcw size={16} /> Actual</button>
      </div>
      <div className="comparison-tabs" role="group" aria-label="Comparison mode">
        <button type="button" className="active">Original</button>
        <button type="button">Preview</button>
        <button type="button">Side by side</button>
      </div>
      <div className="action-group right-actions">
        {disabledReason ? <span className="disabled-reason">{disabledReason}</span> : null}
        <button type="button" className="button primary" disabled={Boolean(disabledReason)}><Wand2 size={17} /> Generate Preview</button>
        <button type="button" className="button secondary" disabled={!hasImage}><Download size={17} /> Export</button>
      </div>
    </footer>
  )
}
