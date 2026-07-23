import { Circle, Group, Image as KonvaImage, Label, Layer, Rect, Stage, Tag, Text, Transformer } from 'react-konva'
import { useMemo } from 'react'
import { useEditorStore } from '../../stores/editorStore'
import { bboxToStageRect, fitImageToStage, imageToStagePoint, zoomAtPoint } from '../../utils/coordinates'
import { useKonvaImage } from './useKonvaImage'

const stageSize = { width: 960, height: 620 }

const emojiGlyph = {
  crying: '😭',
  sob: '😢',
  skull: '💀',
}

export function SonifyStage() {
  const originalUrl = useEditorStore((state) => state.originalUrl)
  const imageWidth = useEditorStore((state) => state.imageWidth)
  const imageHeight = useEditorStore((state) => state.imageHeight)
  const imageLoadState = useEditorStore((state) => state.imageLoadState)
  const faces = useEditorStore((state) => state.faces)
  const selectedFaceId = useEditorStore((state) => state.selectedFaceId)
  const caption = useEditorStore((state) => state.caption)
  const emoji = useEditorStore((state) => state.emoji)
  const viewport = useEditorStore((state) => state.viewport)
  const selectedLayer = useEditorStore((state) => state.selectedLayer)
  const selectLayer = useEditorStore((state) => state.selectLayer)
  const selectFace = useEditorStore((state) => state.selectFace)
  const updateCaption = useEditorStore((state) => state.updateCaption)
  const updateEmoji = useEditorStore((state) => state.updateEmoji)
  const setViewport = useEditorStore((state) => state.setViewport)
  const image = useKonvaImage(originalUrl)

  const imageRect = useMemo(
    () => fitImageToStage({ width: imageWidth, height: imageHeight }, stageSize, 34),
    [imageHeight, imageWidth],
  )

  const captionPoint = imageToStagePoint({ x: caption.x, y: caption.y }, imageRect, viewport)
  const emojiPoint = imageToStagePoint({ x: emoji.x, y: emoji.y }, imageRect, viewport)

  return (
    <section className="canvas-panel" aria-label="Sonify canvas editor">
      {imageLoadState === 'error' ? (
        <div className="canvas-error" role="alert">
          <strong>Image could not be rendered</strong>
          <span>Try replacing it with a JPEG, PNG, or WebP image.</span>
        </div>
      ) : null}
      <Stage
        width={stageSize.width}
        height={stageSize.height}
        className="sonify-stage"
        onMouseDown={(event) => {
          if (event.target === event.target.getStage()) selectLayer(null)
        }}
        onWheel={(event) => {
          event.evt.preventDefault()
          const pointer = event.target.getStage()?.getPointerPosition()
          if (!pointer) return
          const direction = event.evt.deltaY > 0 ? -1 : 1
          const nextZoom = viewport.zoom * (direction > 0 ? 1.08 : 0.92)
          setViewport(zoomAtPoint(viewport, pointer, nextZoom))
        }}
      >
        <Layer name="imageLayer">
          <Rect x={0} y={0} width={stageSize.width} height={stageSize.height} fill="#101116" />
          {image ? (
            <KonvaImage
              image={image}
              x={imageRect.x + viewport.panX}
              y={imageRect.y + viewport.panY}
              width={imageRect.width * viewport.zoom}
              height={imageRect.height * viewport.zoom}
              listening={false}
            />
          ) : null}
        </Layer>
        <Layer name="detectionLayer">
          {faces.map((face, index) => {
            const rect = bboxToStageRect(face.bbox, imageRect, viewport)
            const selected = selectedFaceId === face.id
            return (
              <Group key={face.id} onClick={() => selectFace(face.id)} onTap={() => selectFace(face.id)}>
                <Rect
                  {...rect}
                  stroke={selected ? '#ffd166' : '#f8fafc'}
                  fill={selected ? 'rgba(255, 209, 102, 0.12)' : 'rgba(248, 250, 252, 0.04)'}
                  strokeWidth={selected ? 3 : 1.5}
                  dash={selected ? [] : [7, 5]}
                  cornerRadius={4}
                />
                <Label x={rect.x} y={rect.y - 24}>
                  <Tag fill={selected ? '#ffd166' : '#1f2027'} cornerRadius={4} />
                  <Text text={`${index + 1}`} fill={selected ? '#161616' : '#f8fafc'} fontStyle="bold" padding={6} fontSize={13} />
                </Label>
                {selected ? <Circle x={rect.x + rect.width} y={rect.y} radius={7} fill="#ffd166" stroke="#161616" strokeWidth={2} /> : null}
              </Group>
            )
          })}
        </Layer>
        <Layer name="textLayer">
          {caption.visible ? (
            <Text
              id="caption-layer"
              text={caption.text}
              x={captionPoint.x}
              y={captionPoint.y}
              fontSize={caption.fontSize * viewport.zoom}
              fontStyle="bold"
              fontFamily="Impact, Arial Black, system-ui"
              fill="#ffffff"
              stroke="#050505"
              strokeWidth={caption.strokeWidth}
              rotation={caption.rotation}
              draggable
              onClick={() => selectLayer('caption')}
              onTap={() => selectLayer('caption')}
              onDragEnd={(event) => {
                updateCaption({
                  x: (event.target.x() - imageRect.x - viewport.panX) / Math.max(1, imageRect.width * viewport.zoom),
                  y: (event.target.y() - imageRect.y - viewport.panY) / Math.max(1, imageRect.height * viewport.zoom),
                  manuallyPlaced: true,
                })
              }}
            />
          ) : null}
          {emoji.visible ? (
            <Text
              id="emoji-layer"
              text={emojiGlyph[emoji.value]}
              x={emojiPoint.x}
              y={emojiPoint.y}
              fontSize={emoji.size * viewport.zoom}
              opacity={emoji.opacity}
              rotation={emoji.rotation}
              draggable
              onClick={() => selectLayer('emoji')}
              onTap={() => selectLayer('emoji')}
              onDragEnd={(event) => {
                updateEmoji({
                  x: (event.target.x() - imageRect.x - viewport.panX) / Math.max(1, imageRect.width * viewport.zoom),
                  y: (event.target.y() - imageRect.y - viewport.panY) / Math.max(1, imageRect.height * viewport.zoom),
                  groupedWithCaption: false,
                })
              }}
            />
          ) : null}
        </Layer>
        <Layer name="guideLayer">
          <Rect
            x={imageRect.x + viewport.panX}
            y={imageRect.y + viewport.panY}
            width={imageRect.width * viewport.zoom}
            height={imageRect.height * viewport.zoom}
            stroke="rgba(255,255,255,0.18)"
            dash={[12, 8]}
            listening={false}
          />
        </Layer>
        <Layer name="selectionLayer">
          {selectedLayer === 'caption' ? <Transformer nodes={[]} rotateEnabled keepRatio enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']} /> : null}
        </Layer>
      </Stage>
    </section>
  )
}
