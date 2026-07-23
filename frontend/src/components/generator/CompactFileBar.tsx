import { RefreshCcw, Trash2 } from 'lucide-react'
import { useEditorStore } from '../../stores/editorStore'
import { ImageDropzone } from '../upload/ImageDropzone'

function formatBytes(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export function CompactFileBar() {
  const imageFile = useEditorStore((state) => state.imageFile)
  const imageWidth = useEditorStore((state) => state.imageWidth)
  const imageHeight = useEditorStore((state) => state.imageHeight)
  const reset = useEditorStore((state) => state.reset)

  if (!imageFile) return null

  return (
    <section className="compact-file-bar" aria-label="Current image">
      <div>
        <strong>{imageFile.name}</strong>
        <span>{imageWidth} × {imageHeight} · {formatBytes(imageFile.size)} · Orientation {imageFile.orientation}</span>
      </div>
      <div className="file-actions">
        <ImageDropzone />
        <button type="button" className="icon-button" aria-label="Remove image" onClick={reset}>
          <Trash2 size={17} />
        </button>
        <button type="button" className="icon-button" aria-label="Reset view">
          <RefreshCcw size={17} />
        </button>
      </div>
    </section>
  )
}
