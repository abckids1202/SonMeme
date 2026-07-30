import { Circle, Group, Image as KonvaImage, Label, Layer, Line, Rect, Stage, Tag, Text, Transformer } from 'react-konva'
import { useMemo, useRef, useState } from 'react'
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
  const sourceFaceUrl = useEditorStore((state) => state.sourceFaceUrl)
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
  const transform = useEditorStore((state) => state.faceTransform)
  const updateTransform = useEditorStore((state) => state.updateTransform)
  const setFaceMask = useEditorStore((state) => state.setFaceMask)
  const activeTool = useEditorStore((state) => state.activeTool)
  const setViewport = useEditorStore((state) => state.setViewport)
  const replacementRef = useRef<any>(null)
  const [lassoPoints, setLassoPoints] = useState<number[]>([])
  const image = useKonvaImage(originalUrl)
  const sourceFaceImage = useKonvaImage(sourceFaceUrl)

  const imageRect = useMemo(
    () => fitImageToStage({ width: imageWidth, height: imageHeight }, stageSize, 34),
    [imageHeight, imageWidth],
  )

  const captionPoint = imageToStagePoint({ x: caption.x, y: caption.y }, imageRect, viewport)
  const emojiPoint = imageToStagePoint({ x: emoji.x, y: emoji.y }, imageRect, viewport)
  const selectedFace = faces.find((face) => face.id === selectedFaceId)
  const targetRect = selectedFace ? bboxToStageRect(selectedFace.bbox, imageRect, viewport) : null
  const overlayRect = targetRect
    ? {
        x: targetRect.x + targetRect.width * transform.offsetX,
        y: targetRect.y + targetRect.height * transform.offsetY,
        width: targetRect.width * transform.scale,
        height: targetRect.height * transform.scale,
      }
    : null
  const maskLinePoints = targetRect && transform.maskPoints.length > 2
    ? transform.maskPoints.flatMap((point) => [targetRect.x + point.x * targetRect.width, targetRect.y + point.y * targetRect.height])
    : []

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
          if (activeTool === 'manual-region' && targetRect) {
            const point = event.target.getStage()?.getPointerPosition()
            if (point) setLassoPoints([point.x, point.y])
            return
          }
          if (event.target === event.target.getStage()) selectLayer(null)
        }}
        onMouseMove={(event) => {
          if (activeTool === 'manual-region' && lassoPoints.length) {
            const point = event.target.getStage()?.getPointerPosition()
            if (point) setLassoPoints((current) => [...current, point.x, point.y])
          }
        }}
        onMouseUp={(event) => {
          if (activeTool !== 'manual-region' || lassoPoints.length < 4 || !targetRect) return
          const point = event.target.getStage()?.getPointerPosition()
          const points = point ? [...lassoPoints, point.x, point.y] : lassoPoints
          const normalized = []
          for (let index = 0; index < points.length - 1; index += 2) {
            normalized.push({
              x: Math.max(0, Math.min(1, (points[index] - targetRect.x) / targetRect.width)),
              y: Math.max(0, Math.min(1, (points[index + 1] - targetRect.y) / targetRect.height)),
            })
          }
          if (normalized.length >= 3) setFaceMask(normalized)
          setLassoPoints([])
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
        <Layer name="replacementLayer">
          {sourceFaceImage && targetRect && overlayRect ? (
            <Group
              ref={replacementRef}
              draggable={activeTool === 'select' && selectedLayer === 'face'}
              onClick={() => selectLayer('face')}
              onTap={() => selectLayer('face')}
              onDragEnd={(event) => updateTransform({ offsetX: transform.offsetX + (event.target.x() - overlayRect.x) / targetRect.width, offsetY: transform.offsetY + (event.target.y() - overlayRect.y) / targetRect.height })}
              onTransformEnd={(event) => {
                const node = event.target
                updateTransform({ scale: Math.max(0.2, transform.scale * node.scaleX()), rotation: node.rotation() })
                node.scaleX(1)
                node.scaleY(1)
              }}
              clipFunc={(context) => {
                const expansion = transform.maskExpansion / 100
                const x = targetRect.x - targetRect.width * expansion
                const y = targetRect.y - targetRect.height * expansion
                const width = targetRect.width * (1 + expansion * 2)
                const height = targetRect.height * (1 + expansion * 2)
                if (transform.maskPoints.length > 2) {
                  context.beginPath()
                  transform.maskPoints.forEach((point, index) => {
                    const px = targetRect.x + point.x * targetRect.width
                    const py = targetRect.y + point.y * targetRect.height
                    if (index === 0) context.moveTo(px, py)
                    else context.lineTo(px, py)
                  })
                  context.closePath()
                } else {
                  context.beginPath()
                  context.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2)
                  context.closePath()
                }
              }}
            >
              <KonvaImage
                image={sourceFaceImage}
                x={overlayRect.x}
                y={overlayRect.y}
                width={overlayRect.width}
                height={overlayRect.height}
                rotation={transform.rotation}
                opacity={transform.blendStrength}
                listening={false}
              />
            </Group>
          ) : null}
          {maskLinePoints.length > 2 ? <Line points={maskLinePoints} closed stroke="#ffd166" dash={[6, 4]} listening={false} /> : null}
          {lassoPoints.length > 2 ? <Line points={lassoPoints} stroke="#ffd166" dash={[6, 4]} listening={false} /> : null}
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
          {selectedLayer === 'face' && replacementRef.current ? <Transformer nodes={[replacementRef.current]} rotateEnabled keepRatio enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']} /> : null}
        </Layer>
      </Stage>
    </section>
  )
}
