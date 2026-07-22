import { RotateCcw, Wand2 } from 'lucide-react'
import { useEditorStore } from '../../stores/editorStore'
import type { TransformMode } from '../../types/editor'

const modes: Array<{ value: TransformMode; label: string }> = [
  { value: 'classical', label: 'Classical Warp' },
  { value: 'neural', label: 'Neural Swap' },
  { value: 'cutout', label: 'Intentionally Bad Cutout' },
]

export function GenerationControls() {
  const mode = useEditorStore((state) => state.mode)
  const caption = useEditorStore((state) => state.caption)
  const transform = useEditorStore((state) => state.faceTransform)
  const selectedFaceId = useEditorStore((state) => state.selectedFaceId)
  const setMode = useEditorStore((state) => state.setMode)
  const updateCaption = useEditorStore((state) => state.updateCaption)
  const updateTransform = useEditorStore((state) => state.updateTransform)
  const reset = useEditorStore((state) => state.reset)

  return (
    <section className="panel controls-panel">
      <div className="panel-heading">
        <Wand2 size={18} aria-hidden="true" />
        <h2>Generation</h2>
      </div>

      <label className="field">
        <span>Transformation mode</span>
        <select value={mode} onChange={(event) => setMode(event.target.value as TransformMode)}>
          {modes.map((item) => (
            <option key={item.value} value={item.value} disabled={item.value === 'neural'}>
              {item.label}{item.value === 'neural' ? ' - unavailable' : ''}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Blend strength</span>
        <input type="range" min="0" max="1" step="0.01" value={transform.blendStrength} onChange={(event) => updateTransform({ blendStrength: Number(event.target.value) })} />
      </label>

      <label className="field">
        <span>Replacement scale</span>
        <input type="range" min="0.7" max="1.3" step="0.01" value={transform.scale} onChange={(event) => updateTransform({ scale: Number(event.target.value) })} />
      </label>

      <label className="field">
        <span>Caption text</span>
        <input value={caption.text} onChange={(event) => updateCaption({ text: event.target.value })} />
      </label>

      <div className="control-grid">
        <label className="field">
          <span>Font size</span>
          <input type="number" min="18" max="180" value={caption.fontSize} onChange={(event) => updateCaption({ fontSize: Number(event.target.value) })} />
        </label>
        <label className="field">
          <span>Stroke</span>
          <input type="number" min="0" max="16" value={caption.strokeWidth} onChange={(event) => updateCaption({ strokeWidth: Number(event.target.value) })} />
        </label>
      </div>

      <label className="checkbox-field">
        <input type="checkbox" checked={caption.visible} onChange={(event) => updateCaption({ visible: event.target.checked })} />
        <span>Show caption</span>
      </label>

      <label className="checkbox-field">
        <input type="checkbox" disabled />
        <span>Acknowledge parody use before final export</span>
      </label>

      <button type="button" className="button primary sticky-action" disabled={!selectedFaceId}>
        <Wand2 size={17} aria-hidden="true" />
        Generate preview
      </button>
      <button type="button" className="button secondary" onClick={reset}>
        <RotateCcw size={17} aria-hidden="true" />
        Reset
      </button>
    </section>
  )
}
