import { MousePointerSquareDashed } from 'lucide-react'
import { useEditorStore } from '../../stores/editorStore'

export function FaceSelectionPanel() {
  const faces = useEditorStore((state) => state.faces)
  const selectedFaceId = useEditorStore((state) => state.selectedFaceId)
  const selectFace = useEditorStore((state) => state.selectFace)

  return (
    <section className="panel">
      <div className="panel-heading">
        <MousePointerSquareDashed size={18} aria-hidden="true" />
        <h2>Face selection</h2>
      </div>
      {faces.length === 0 ? (
        <div className="empty-note">
          <p>No detected faces yet.</p>
          <button type="button" className="button secondary" disabled>
            Retry at lower threshold
          </button>
          <button type="button" className="button secondary" disabled>
            Manually draw region
          </button>
          <small>Manual regions will be experimental once upload and detection endpoints land.</small>
        </div>
      ) : (
        <div className="face-list">
          {faces.map((face, index) => (
            <button
              key={face.id}
              type="button"
              className={selectedFaceId === face.id ? 'face-item selected' : 'face-item'}
              onClick={() => selectFace(face.id)}
            >
              <span>Face {index + 1}</span>
              <small>{Math.round(face.confidence * 100)}% confidence</small>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
