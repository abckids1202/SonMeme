import { Activity } from 'lucide-react'
import { useEditorStore } from '../../stores/editorStore'

export function StatusBar() {
  const status = useEditorStore((state) => state.status)
  const imageWidth = useEditorStore((state) => state.imageWidth)
  const imageHeight = useEditorStore((state) => state.imageHeight)
  const mode = useEditorStore((state) => state.mode)
  const error = useEditorStore((state) => state.error)

  return (
    <footer className="status-bar">
      <Activity size={17} aria-hidden="true" />
      <span>Status: {status}</span>
      <span>Dimensions: {imageWidth > 0 ? `${imageWidth} x ${imageHeight}` : 'none'}</span>
      <span>Mode: {mode}</span>
      <span>Model: no custom checkpoint loaded</span>
      {error ? <strong>{error}</strong> : null}
    </footer>
  )
}
