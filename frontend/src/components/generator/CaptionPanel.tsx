import { Eye, EyeOff, Type } from 'lucide-react'
import { useEditorStore } from '../../stores/editorStore'

export function CaptionPanel() {
  const caption = useEditorStore((state) => state.caption)
  const updateCaption = useEditorStore((state) => state.updateCaption)
  const exportFormat = useEditorStore((state) => state.exportFormat)
  const setExportFormat = useEditorStore((state) => state.setExportFormat)
  return <div className="caption-panel">
    <div className="panel-heading"><div><p className="eyebrow">Caption</p><h2>Make it yours</h2></div><button type="button" className="icon-button" aria-label={caption.visible ? 'Hide caption' : 'Show caption'} onClick={() => updateCaption({ visible: !caption.visible })}>{caption.visible ? <Eye size={18} /> : <EyeOff size={18} />}</button></div>
    <label className="caption-input"><Type size={17} aria-hidden="true" /><input aria-label="Caption text" value={caption.text} onChange={(event) => updateCaption({ text: event.target.value })} placeholder="son 😭" /></label>
    <label className="field caption-select"><span>Font</span><select aria-label="Caption font" value={caption.fontFamily} onChange={(event) => updateCaption({ fontFamily: event.target.value as typeof caption.fontFamily })}><option value="impact">Impact</option><option value="arial">Arial Black</option><option value="comic">Comic Sans</option><option value="sans">Clean Sans</option></select></label>
    <label className="field caption-select"><span>Export</span><select aria-label="Export format" value={exportFormat} onChange={(event) => setExportFormat(event.target.value as typeof exportFormat)}><option value="png">PNG</option><option value="jpeg">JPG</option></select></label>
  </div>
}
