import { Layer, Rect, Stage, Text } from 'react-konva'
import { useEditorStore } from '../../stores/editorStore'

export function EditorCanvas() {
  const originalUrl = useEditorStore((state) => state.originalUrl)
  const faces = useEditorStore((state) => state.faces)
  const selectedFaceId = useEditorStore((state) => state.selectedFaceId)
  const caption = useEditorStore((state) => state.caption)

  return (
    <section className="canvas-shell" aria-label="Meme editor canvas">
      {originalUrl ? (
        <img className="source-preview" src={originalUrl} alt="Uploaded source" />
      ) : (
        <div className="empty-canvas">
          <strong>Drop an image to start</strong>
          <span>The first runnable milestone focuses on app structure and workflow states.</span>
        </div>
      )}
      <Stage width={840} height={540} className="konva-stage">
        <Layer>
          {faces.map((face) => (
            <Rect
              key={face.id}
              x={face.box.x}
              y={face.box.y}
              width={face.box.width}
              height={face.box.height}
              stroke={selectedFaceId === face.id ? '#ffd166' : '#f8fafc'}
              strokeWidth={selectedFaceId === face.id ? 4 : 2}
              dash={selectedFaceId === face.id ? [] : [8, 6]}
            />
          ))}
          {caption.visible ? (
            <Text
              text={caption.text}
              x={caption.x}
              y={caption.y}
              fontSize={caption.fontSize}
              fontStyle="bold"
              fill="#ffffff"
              stroke="#050505"
              strokeWidth={caption.strokeWidth}
              rotation={caption.rotation}
            />
          ) : null}
        </Layer>
      </Stage>
    </section>
  )
}
