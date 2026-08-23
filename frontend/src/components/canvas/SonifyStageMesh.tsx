import { Circle, Group, Image as KonvaImage, Label, Layer, Line, Rect, Stage, Tag, Text, Transformer } from 'react-konva'
import { useEffect, useMemo, useRef, useState } from 'react'
import { requestWarpPreview } from '../../api/warp'
import { useEditorStore } from '../../stores/editorStore'
import type { NormalizedPoint, SemanticHandleId } from '../../types/editor'
import { bboxToStageRect, fitImageToStage, imageToStagePoint, stageToImagePoint, zoomAtPoint } from '../../utils/coordinates'
import { useKonvaImage } from './useKonvaImage'

const stageSize = { width: 960, height: 620 }
type Point = { x: number; y: number }
type ManualRegion = { start: Point; current: Point }

const handleLabels: Record<SemanticHandleId, string> = {
  foreheadCenter: 'forehead', leftTemple: 'temple', rightTemple: 'temple', leftEye: 'eye', rightEye: 'eye',
  nose: 'nose', leftMouth: 'mouth', rightMouth: 'mouth', leftJaw: 'jaw', rightJaw: 'jaw', chin: 'chin',
}

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, value))
}

function isTypingTarget(target: EventTarget | null) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement
}

export function SonifyStageMesh() {
  const originalUrl = useEditorStore((state) => state.originalUrl)
  const imageWidth = useEditorStore((state) => state.imageWidth)
  const imageHeight = useEditorStore((state) => state.imageHeight)
  const sourceFaceUrl = useEditorStore((state) => state.sourceFaceUrl)
  const imageLoadState = useEditorStore((state) => state.imageLoadState)
  const faces = useEditorStore((state) => state.faces)
  const selectedFaceId = useEditorStore((state) => state.selectedFaceId)
  const caption = useEditorStore((state) => state.caption)
  const sonFace = useEditorStore((state) => state.sonFace)
  const faceEditMode = useEditorStore((state) => state.faceEditMode)
  const viewport = useEditorStore((state) => state.viewport)
  const selectedLayer = useEditorStore((state) => state.selectedLayer)
  const activeTool = useEditorStore((state) => state.activeTool)
  const selectLayer = useEditorStore((state) => state.selectLayer)
  const updateCaption = useEditorStore((state) => state.updateCaption)
  const updateSonFace = useEditorStore((state) => state.updateSonFace)
  const updateSemanticHandle = useEditorStore((state) => state.updateSemanticHandle)
  const applyLiquifyStroke = useEditorStore((state) => state.applyLiquifyStroke)
  const updateMaskPoint = useEditorStore((state) => state.updateMaskPoint)
  const recordFaceEditHistory = useEditorStore((state) => state.recordFaceEditHistory)
  const setFaces = useEditorStore((state) => state.setFaces)
  const selectFace = useEditorStore((state) => state.selectFace)
  const setActiveTool = useEditorStore((state) => state.setActiveTool)
  const setViewport = useEditorStore((state) => state.setViewport)
  const setWarpedPreview = useEditorStore((state) => state.setWarpedPreview)
  const [replacementNode, setReplacementNode] = useState<any>(null)
  const [captionNode, setCaptionNode] = useState<any>(null)
  const [manualRegion, setManualRegion] = useState<ManualRegion | null>(null)
  const [compareHidden, setCompareHidden] = useState(false)
  const [liquifyBrush, setLiquifyBrush] = useState<Point | null>(null)
  const liquifyDragRef = useRef<{ last: NormalizedPoint } | null>(null)
  const warpRequestRef = useRef<AbortController | null>(null)
  const warpSequenceRef = useRef(0)
  const previewUrlRef = useRef<string | null>(sonFace.warpedPreviewUrl)

  const image = useKonvaImage(originalUrl, true)
  const warpedFaceImage = useKonvaImage(sonFace.warpedPreviewUrl ?? sourceFaceUrl)
  const imageRect = useMemo(() => fitImageToStage({ width: imageWidth, height: imageHeight }, stageSize, 34), [imageHeight, imageWidth])
  const layerRect = sonFace.width > 0 && sonFace.height > 0
    ? bboxToStageRect({ x: sonFace.x, y: sonFace.y, width: sonFace.width, height: sonFace.height }, imageRect, viewport)
    : null
  const captionPoint = imageToStagePoint({ x: caption.x, y: caption.y }, imageRect, viewport)
  const semanticKey = JSON.stringify(sonFace.semanticHandles)
  const liquifyKey = JSON.stringify(sonFace.liquify.offsets)
  const maskKey = JSON.stringify(sonFace.mask)
  const layerReady = sonFace.width > 0 && sonFace.height > 0

  useEffect(() => {
    if (!sourceFaceUrl || !layerReady || imageWidth <= 0 || imageHeight <= 0) return
    const timer = window.setTimeout(() => {
      warpRequestRef.current?.abort()
      const controller = new AbortController()
      warpRequestRef.current = controller
      const requestId = ++warpSequenceRef.current
      void requestWarpPreview({
        sourceUrl: sourceFaceUrl,
        semanticHandles: sonFace.semanticHandles,
        liquify: sonFace.liquify,
        mask: sonFace.mask,
        width: Math.max(64, Math.min(1024, Math.round(sonFace.width * imageWidth))),
        height: Math.max(64, Math.min(1024, Math.round(sonFace.height * imageHeight))),
        feather: sonFace.feather,
        revision: sonFace.warpRevision,
        signal: controller.signal,
      }).then((result) => {
        if (controller.signal.aborted || requestId !== warpSequenceRef.current) {
          URL.revokeObjectURL(result.url)
          return
        }
        if (previewUrlRef.current && previewUrlRef.current !== result.url) URL.revokeObjectURL(previewUrlRef.current)
        previewUrlRef.current = result.url
        setWarpedPreview(result.url, result.revision)
      }).catch(() => undefined)
    }, 120)
    return () => window.clearTimeout(timer)
  }, [imageHeight, imageWidth, layerReady, liquifyKey, maskKey, semanticKey, sourceFaceUrl, sonFace.feather, sonFace.height, sonFace.liquify, sonFace.mask, sonFace.semanticHandles, sonFace.width, sonFace.warpRevision, sonFace.x, sonFace.y, setWarpedPreview])

  useEffect(() => () => {
    warpRequestRef.current?.abort()
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
  }, [])

  useEffect(() => {
    if (activeTool !== 'manual-region') setManualRegion(null)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === ' ' && !isTypingTarget(event.target)) { event.preventDefault(); setCompareHidden(true) }
      if (event.key === 'Escape') { setLiquifyBrush(null); liquifyDragRef.current = null; setActiveTool('select') }
      if (event.key === 'Delete' && selectedLayer === 'face' && !isTypingTarget(event.target)) selectLayer(null)
    }
    const onKeyUp = (event: KeyboardEvent) => { if (event.key === ' ') setCompareHidden(false) }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp) }
  }, [activeTool, selectLayer, selectedLayer, setActiveTool])

  const pointerPosition = (event: any): Point | null => event.target.getStage()?.getPointerPosition() ?? null
  const stageToLayerPoint = (point: Point) => {
    const imagePoint = stageToImagePoint(point, imageRect, viewport)
    return {
      x: clamp((imagePoint.x - sonFace.x) / Math.max(0.001, sonFace.width)),
      y: clamp((imagePoint.y - sonFace.y) / Math.max(0.001, sonFace.height)),
    }
  }
  const commitManualRegion = (region: ManualRegion) => {
    const left = Math.min(region.start.x, region.current.x)
    const top = Math.min(region.start.y, region.current.y)
    const right = Math.max(region.start.x, region.current.x)
    const bottom = Math.max(region.start.y, region.current.y)
    const topLeft = stageToImagePoint({ x: left, y: top }, imageRect, viewport)
    const bottomRight = stageToImagePoint({ x: right, y: bottom }, imageRect, viewport)
    const x = clamp(topLeft.x)
    const y = clamp(topLeft.y)
    const rightNormalized = clamp(bottomRight.x)
    const bottomNormalized = clamp(bottomRight.y)
    if (rightNormalized - x < 0.02 || bottomNormalized - y < 0.02) return
    const manualFace = { id: `manual-${crypto.randomUUID()}`, bbox: { x, y, width: rightNormalized - x, height: bottomNormalized - y }, confidence: 1, source: 'manual' as const }
    setFaces([manualFace], 'manual')
    selectFace(manualFace.id)
    setManualRegion(null)
    setActiveTool('select')
  }
  const regionRect = manualRegion ? { x: Math.min(manualRegion.start.x, manualRegion.current.x), y: Math.min(manualRegion.start.y, manualRegion.current.y), width: Math.abs(manualRegion.current.x - manualRegion.start.x), height: Math.abs(manualRegion.current.y - manualRegion.start.y) } : null
  const semanticStagePoints = Object.entries(sonFace.semanticHandles).map(([id, handle]) => ({
    id: id as SemanticHandleId,
    target: imageToStagePoint({ x: sonFace.x + handle.target.x * sonFace.width, y: sonFace.y + handle.target.y * sonFace.height }, imageRect, viewport),
    guide: handle.guide ? imageToStagePoint({ x: sonFace.x + handle.guide.x * sonFace.width, y: sonFace.y + handle.guide.y * sonFace.height }, imageRect, viewport) : null,
  }))
  const maskStagePoints = sonFace.mask.map((point) => imageToStagePoint({ x: sonFace.x + point.x * sonFace.width, y: sonFace.y + point.y * sonFace.height }, imageRect, viewport))
  const maskLine = maskStagePoints.flatMap((point) => [point.x, point.y])
  const effectiveOpacity = compareHidden ? 0 : faceEditMode === 'fit' ? Math.min(0.5, sonFace.opacity) : sonFace.opacity
  const brushRadius = layerRect ? Math.max(10, sonFace.liquify.brushSize * Math.min(layerRect.width, layerRect.height)) : 20

  return (
    <section className="canvas-panel" aria-label="Sonify canvas editor">
      {imageLoadState === 'error' ? <div className="canvas-error" role="alert"><strong>Image could not be rendered</strong><span>Try replacing it with a JPEG, PNG, or WebP image.</span></div> : null}
      <Stage
        width={stageSize.width}
        height={stageSize.height}
        className="sonify-stage"
        onMouseDown={(event) => {
          const point = pointerPosition(event)
          if (activeTool === 'manual-region' && point && imageRect.width > 0) { setManualRegion({ start: point, current: point }); return }
          if (faceEditMode === 'liquify' && selectedLayer === 'face' && point) {
            recordFaceEditHistory()
            const local = stageToLayerPoint(point)
            liquifyDragRef.current = { last: local }
            setLiquifyBrush(point)
            return
          }
          if (event.target === event.target.getStage()) selectLayer(null)
        }}
        onMouseMove={(event) => {
          const point = pointerPosition(event)
          if (manualRegion && point) setManualRegion((current) => current ? { ...current, current: point } : current)
          if (liquifyDragRef.current && point) {
            const local = stageToLayerPoint(point)
            const last = liquifyDragRef.current.last
            applyLiquifyStroke(local, { x: local.x - last.x, y: local.y - last.y })
            liquifyDragRef.current.last = local
            setLiquifyBrush(point)
          }
        }}
        onMouseUp={(event) => {
          if (manualRegion) {
            const point = pointerPosition(event)
            commitManualRegion(point ? { ...manualRegion, current: point } : manualRegion)
          }
          liquifyDragRef.current = null
          if (!pointerPosition(event)) setLiquifyBrush(null)
        }}
        onMouseLeave={() => { liquifyDragRef.current = null; setLiquifyBrush(null) }}
        onWheel={(event) => {
          event.evt.preventDefault()
          const pointer = event.target.getStage()?.getPointerPosition()
          if (!pointer) return
          const direction = event.evt.deltaY > 0 ? -1 : 1
          setViewport(zoomAtPoint(viewport, pointer, viewport.zoom * (direction > 0 ? 1.08 : 0.92)))
        }}
      >
        <Layer name="imageLayer">
          <Rect x={0} y={0} width={stageSize.width} height={stageSize.height} fill="#101116" />
          {image ? <KonvaImage image={image} x={imageRect.x + viewport.panX} y={imageRect.y + viewport.panY} width={imageRect.width * viewport.zoom} height={imageRect.height * viewport.zoom} listening={false} /> : null}
        </Layer>
        <Layer name="detectionLayer">
          {faces.map((face, index) => {
            const rect = bboxToStageRect(face.bbox, imageRect, viewport)
            const selected = selectedFaceId === face.id
            return <Group key={face.id} onClick={() => selectFace(face.id)} onTap={() => selectFace(face.id)}>
              <Rect {...rect} stroke={selected ? '#ffd166' : '#f8fafc'} fill={selected ? 'rgba(255, 209, 102, 0.12)' : 'rgba(248, 250, 252, 0.04)'} strokeWidth={selected ? 3 : 1.5} dash={selected ? [] : [7, 5]} cornerRadius={4} />
              <Label x={rect.x} y={rect.y - 24}><Tag fill={selected ? '#ffd166' : '#1f2027'} cornerRadius={4} /><Text text={`${index + 1}`} fill={selected ? '#161616' : '#f8fafc'} fontStyle="bold" padding={6} fontSize={13} /></Label>
            </Group>
          })}
        </Layer>
        <Layer name="replacementLayer">
          {warpedFaceImage && layerRect ? <KonvaImage
            ref={(node) => { if (node && node !== replacementNode) setReplacementNode(node) }}
            image={warpedFaceImage}
            x={layerRect.x}
            y={layerRect.y}
            width={layerRect.width}
            height={layerRect.height}
            rotation={sonFace.rotation}
            opacity={effectiveOpacity}
            draggable={faceEditMode === 'move' && selectedLayer === 'face'}
            onClick={() => selectLayer('face')}
            onTap={() => selectLayer('face')}
            onDragStart={recordFaceEditHistory}
            onDragEnd={(event) => {
              const next = stageToImagePoint({ x: event.target.x(), y: event.target.y() }, imageRect, viewport)
              updateSonFace({ x: clamp(next.x), y: clamp(next.y) })
            }}
            onTransformStart={recordFaceEditHistory}
            onTransformEnd={(event) => {
              const node = event.target
              const nextWidth = Math.max(0.02, (node.width() * node.scaleX()) / Math.max(1, imageRect.width * viewport.zoom))
              const nextHeight = Math.max(0.02, (node.height() * node.scaleY()) / Math.max(1, imageRect.height * viewport.zoom))
              const nextPosition = stageToImagePoint({ x: node.x(), y: node.y() }, imageRect, viewport)
              updateSonFace({ x: clamp(nextPosition.x), y: clamp(nextPosition.y), width: nextWidth, height: nextHeight, rotation: node.rotation() })
              node.scaleX(1)
              node.scaleY(1)
            }}
          /> : null}
        </Layer>
        <Layer name="textLayer">
          {caption.visible && caption.text ? <Text
            ref={(node) => { if (node && node !== captionNode) setCaptionNode(node) }}
            id="caption-layer"
            text={caption.text}
            x={captionPoint.x}
            y={captionPoint.y}
            width={caption.width * imageRect.width * viewport.zoom}
            fontSize={64 * viewport.zoom}
            fontStyle="bold"
            fontFamily="Impact, Arial Black, system-ui"
            fill="#ffffff"
            stroke="#050505"
            strokeWidth={7 * viewport.zoom}
            lineJoin="round"
            scaleX={caption.scale}
            scaleY={caption.scale}
            rotation={caption.rotation}
            draggable
            onClick={() => selectLayer('caption')}
            onTap={() => selectLayer('caption')}
            onDragStart={recordFaceEditHistory}
            onDragEnd={(event) => { const point = stageToImagePoint({ x: event.target.x(), y: event.target.y() }, imageRect, viewport); updateCaption({ x: clamp(point.x), y: clamp(point.y) }) }}
            onTransformStart={recordFaceEditHistory}
            onTransformEnd={(event) => {
              const node = event.target
              const point = stageToImagePoint({ x: node.x(), y: node.y() }, imageRect, viewport)
              updateCaption({ x: clamp(point.x), y: clamp(point.y), scale: Math.max(0.2, caption.scale * node.scaleX()), rotation: node.rotation() })
              node.scaleX(1)
              node.scaleY(1)
            }}
          /> : null}
        </Layer>
        <Layer name="guideLayer">
          <Rect x={imageRect.x + viewport.panX} y={imageRect.y + viewport.panY} width={imageRect.width * viewport.zoom} height={imageRect.height * viewport.zoom} stroke="rgba(255,255,255,0.18)" dash={[12, 8]} listening={false} />
          {regionRect ? <Rect {...regionRect} stroke="#ffd166" fill="rgba(255, 209, 102, 0.12)" dash={[8, 5]} listening={false} /> : null}
          {faceEditMode === 'fit' && selectedLayer === 'face' ? <>
            {semanticStagePoints.map(({ id, target, guide }) => guide ? <Line key={`guide-${id}`} points={[guide.x, guide.y, target.x, target.y]} stroke="rgba(90, 220, 255, 0.45)" strokeWidth={1} dash={[4, 4]} listening={false} /> : null)}
            {semanticStagePoints.map(({ id, guide }) => guide ? <Circle key={`target-guide-${id}`} x={guide.x} y={guide.y} radius={5} fill="rgba(90, 220, 255, 0.32)" stroke="#5adcff" strokeWidth={1.5} listening={false} /> : null)}
            {semanticStagePoints.map(({ id, target }) => <Group key={`semantic-${id}`}>
              <Circle x={target.x} y={target.y} radius={8} fill="#ffd166" stroke="#161616" strokeWidth={2} draggable
                onDragStart={recordFaceEditHistory}
                onDragMove={(event) => updateSemanticHandle(id, stageToLayerPoint({ x: event.target.x(), y: event.target.y() }))}
              />
              <Text x={target.x + 10} y={target.y - 8} text={handleLabels[id]} fill="#ffd166" fontSize={11} listening={false} />
            </Group>)}
          </> : null}
          {faceEditMode === 'liquify' && selectedLayer === 'face' && liquifyBrush ? <Circle x={liquifyBrush.x} y={liquifyBrush.y} radius={brushRadius} stroke="#5adcff" strokeWidth={2} dash={[6, 5]} listening={false} /> : null}
          {faceEditMode === 'mask' && selectedLayer === 'face' ? <>
            <Line points={maskLine} closed stroke="#ff8f70" strokeWidth={2} dash={[7, 4]} listening={false} />
            {maskStagePoints.map((point, index) => <Circle key={`mask-${index}`} x={point.x} y={point.y} radius={8} fill="#ff8f70" stroke="#161616" strokeWidth={2} draggable onDragStart={recordFaceEditHistory} onDragMove={(event) => updateMaskPoint(index, stageToLayerPoint({ x: event.target.x(), y: event.target.y() }))} />)}
          </> : null}
        </Layer>
        <Layer name="selectionLayer">
          {selectedLayer === 'caption' && captionNode ? <Transformer nodes={[captionNode]} rotateEnabled keepRatio enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']} anchorSize={12} boundBoxFunc={(oldBox: any, newBox: any) => newBox.width < 40 || newBox.height < 20 ? oldBox : newBox} /> : null}
          {selectedLayer === 'face' && faceEditMode === 'move' && replacementNode ? <Transformer nodes={[replacementNode]} rotateEnabled keepRatio flipEnabled={false} anchorSize={14} anchorCornerRadius={4} anchorStroke="#161616" anchorFill="#ffd166" enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']} boundBoxFunc={(oldBox: any, newBox: any) => newBox.width < 24 || newBox.height < 24 ? oldBox : newBox} /> : null}
        </Layer>
      </Stage>
    </section>
  )
}
