import { Circle, Group, Image as KonvaImage, Label, Layer, Line, Rect, Stage, Tag, Text, Transformer } from 'react-konva'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useEditorStore } from '../../stores/editorStore'
import { bboxToStageRect, fitImageToStage, imageToStagePoint, stageToImagePoint, zoomAtPoint } from '../../utils/coordinates'
import { renderFaceLayer } from '../../utils/faceCompositor'
import { useKonvaImage } from './useKonvaImage'

const stageSize = { width: 960, height: 620 }
type Point = { x: number; y: number }
type ManualRegion = { start: Point; current: Point }

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
  const sourceCrop = useEditorStore((state) => state.sourceCrop)
  const sourceMask = useEditorStore((state) => state.sourceMask)
  const sourceConfirmed = useEditorStore((state) => state.sourceConfirmed)
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
  const updateDistortCorner = useEditorStore((state) => state.updateDistortCorner)
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
  const renderSequenceRef = useRef(0)

  const image = useKonvaImage(originalUrl, true)
  const renderedFaceImage = useKonvaImage(sonFace.warpedPreviewUrl)
  const imageRect = useMemo(() => fitImageToStage({ width: imageWidth, height: imageHeight }, stageSize, 34), [imageHeight, imageWidth])
  const layerRect = sonFace.width > 0 && sonFace.height > 0
    ? bboxToStageRect({ x: sonFace.x, y: sonFace.y, width: sonFace.width, height: sonFace.height }, imageRect, viewport)
    : null
  const captionPoint = imageToStagePoint({ x: caption.x, y: caption.y }, imageRect, viewport)
  const cornersKey = JSON.stringify(sonFace.distortCorners)
  const layerReady = sonFace.width > 0 && sonFace.height > 0

  useEffect(() => {
    if (!sourceFaceUrl || !sourceConfirmed || !layerReady || imageWidth <= 0 || imageHeight <= 0) return
    const sequence = ++renderSequenceRef.current
    const width = Math.max(64, Math.min(1024, Math.round(sonFace.width * imageWidth)))
    const height = Math.max(64, Math.min(1024, Math.round(sonFace.height * imageHeight)))
    void renderFaceLayer(sourceFaceUrl, sourceCrop, sourceMask, sonFace.distortCorners, width, height)
      .then((url) => { if (sequence === renderSequenceRef.current) setWarpedPreview(url, sonFace.warpRevision) })
      .catch(() => undefined)
  }, [cornersKey, imageHeight, imageWidth, layerReady, setWarpedPreview, sourceConfirmed, sourceCrop, sourceFaceUrl, sourceMask, sonFace.distortCorners, sonFace.height, sonFace.warpRevision, sonFace.width])

  useEffect(() => {
    if (activeTool !== 'manual-region') setManualRegion(null)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === ' ' && !isTypingTarget(event.target)) { event.preventDefault(); setCompareHidden(true) }
      if (event.key === 'Escape') { setManualRegion(null); setActiveTool('select') }
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
    return { x: clamp((imagePoint.x - sonFace.x) / Math.max(0.001, sonFace.width), -0.35, 1.35), y: clamp((imagePoint.y - sonFace.y) / Math.max(0.001, sonFace.height), -0.35, 1.35) }
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
  const cornerStagePoints = sonFace.distortCorners.map((point) => imageToStagePoint({ x: sonFace.x + point.x * sonFace.width, y: sonFace.y + point.y * sonFace.height }, imageRect, viewport))
  const cornerLine = cornerStagePoints.flatMap((point) => [point.x, point.y])
  const effectiveOpacity = compareHidden ? 0 : sonFace.opacity

  return <section className="canvas-panel" aria-label="Sonify canvas editor">
    {imageLoadState === 'error' ? <div className="canvas-error" role="alert"><strong>Image could not be rendered</strong><span>Try replacing it with a JPEG, PNG, or WebP image.</span></div> : null}
    <Stage width={stageSize.width} height={stageSize.height} className="sonify-stage"
      onMouseDown={(event) => {
        const point = pointerPosition(event)
        if (activeTool === 'manual-region' && point && imageRect.width > 0) { setManualRegion({ start: point, current: point }); return }
        if (event.target === event.target.getStage()) selectLayer(null)
      }}
      onMouseMove={(event) => { const point = pointerPosition(event); if (manualRegion && point) setManualRegion((current) => current ? { ...current, current: point } : current) }}
      onMouseUp={(event) => { if (manualRegion) { const point = pointerPosition(event); commitManualRegion(point ? { ...manualRegion, current: point } : manualRegion) } }}
      onWheel={(event) => { event.evt.preventDefault(); const pointer = event.target.getStage()?.getPointerPosition(); if (!pointer) return; const direction = event.evt.deltaY > 0 ? -1 : 1; setViewport(zoomAtPoint(viewport, pointer, viewport.zoom * (direction > 0 ? 1.08 : 0.92))) }}>
      <Layer name="imageLayer"><Rect x={0} y={0} width={stageSize.width} height={stageSize.height} fill="#101116" />{image ? <KonvaImage image={image} x={imageRect.x + viewport.panX} y={imageRect.y + viewport.panY} width={imageRect.width * viewport.zoom} height={imageRect.height * viewport.zoom} listening={false} /> : null}</Layer>
      <Layer name="detectionLayer">{faces.map((face, index) => { const rect = bboxToStageRect(face.bbox, imageRect, viewport); const selected = selectedFaceId === face.id; return <Group key={face.id} onClick={() => selectFace(face.id)} onTap={() => selectFace(face.id)}><Rect {...rect} stroke={selected ? '#ffd166' : '#f8fafc'} fill={selected ? 'rgba(255, 209, 102, 0.12)' : 'rgba(248, 250, 252, 0.04)'} strokeWidth={selected ? 3 : 1.5} dash={selected ? [] : [7, 5]} cornerRadius={4} /><Label x={rect.x} y={rect.y - 24}><Tag fill={selected ? '#ffd166' : '#1f2027'} cornerRadius={4} /><Text text={`${index + 1}`} fill={selected ? '#161616' : '#f8fafc'} fontStyle="bold" padding={6} fontSize={13} /></Label></Group> })}</Layer>
      <Layer name="replacementLayer">{renderedFaceImage && layerRect ? <KonvaImage ref={(node) => { if (node && node !== replacementNode) setReplacementNode(node) }} image={renderedFaceImage} x={layerRect.x} y={layerRect.y} width={layerRect.width} height={layerRect.height} rotation={sonFace.rotation} opacity={effectiveOpacity} draggable={faceEditMode === 'move' && selectedLayer === 'face'} onClick={() => selectLayer('face')} onTap={() => selectLayer('face')} onDragStart={recordFaceEditHistory} onDragEnd={(event) => { const next = stageToImagePoint({ x: event.target.x(), y: event.target.y() }, imageRect, viewport); updateSonFace({ x: clamp(next.x), y: clamp(next.y) }) }} onTransformStart={recordFaceEditHistory} onTransformEnd={(event) => { const node = event.target; const nextWidth = Math.max(0.02, (node.width() * node.scaleX()) / Math.max(1, imageRect.width * viewport.zoom)); const nextHeight = Math.max(0.02, (node.height() * node.scaleY()) / Math.max(1, imageRect.height * viewport.zoom)); const nextPosition = stageToImagePoint({ x: node.x(), y: node.y() }, imageRect, viewport); updateSonFace({ x: clamp(nextPosition.x), y: clamp(nextPosition.y), width: nextWidth, height: nextHeight, rotation: node.rotation() }); node.scaleX(1); node.scaleY(1) }} /> : null}</Layer>
      <Layer name="textLayer">{caption.visible && caption.text ? <Text ref={(node) => { if (node && node !== captionNode) setCaptionNode(node) }} text={caption.text} x={captionPoint.x} y={captionPoint.y} width={caption.width * imageRect.width * viewport.zoom} fontSize={64 * viewport.zoom} fontStyle="bold" fontFamily="Impact, Arial Black, system-ui" fill="#ffffff" stroke="#050505" strokeWidth={7 * viewport.zoom} lineJoin="round" scaleX={caption.scale} scaleY={caption.scale} rotation={caption.rotation} draggable onClick={() => selectLayer('caption')} onTap={() => selectLayer('caption')} onDragStart={recordFaceEditHistory} onDragEnd={(event) => { const point = stageToImagePoint({ x: event.target.x(), y: event.target.y() }, imageRect, viewport); updateCaption({ x: clamp(point.x), y: clamp(point.y) }) }} onTransformStart={recordFaceEditHistory} onTransformEnd={(event) => { const node = event.target; const point = stageToImagePoint({ x: node.x(), y: node.y() }, imageRect, viewport); updateCaption({ x: clamp(point.x), y: clamp(point.y), scale: Math.max(0.2, caption.scale * node.scaleX()), rotation: node.rotation() }); node.scaleX(1); node.scaleY(1) }} /> : null}</Layer>
      <Layer name="guideLayer"><Rect x={imageRect.x + viewport.panX} y={imageRect.y + viewport.panY} width={imageRect.width * viewport.zoom} height={imageRect.height * viewport.zoom} stroke="rgba(255,255,255,0.18)" dash={[12, 8]} listening={false} />{regionRect ? <Rect {...regionRect} stroke="#ffd166" fill="rgba(255, 209, 102, 0.12)" dash={[8, 5]} listening={false} /> : null}{faceEditMode === 'distort' && selectedLayer === 'face' && layerRect ? <><Line points={[...cornerLine, cornerLine[0], cornerLine[1]]} closed stroke="#ffd166" strokeWidth={2} dash={[6, 4]} listening={false} />{cornerStagePoints.map((point, index) => <Circle key={`corner-${index}`} x={point.x} y={point.y} radius={9} fill="#ffd166" stroke="#161616" strokeWidth={2} draggable onDragStart={recordFaceEditHistory} onDragMove={(event) => updateDistortCorner(index, stageToLayerPoint({ x: event.target.x(), y: event.target.y() }))} />)}</> : null}</Layer>
      <Layer name="selectionLayer">{selectedLayer === 'caption' && captionNode ? <Transformer nodes={[captionNode]} rotateEnabled keepRatio enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']} anchorSize={12} boundBoxFunc={(oldBox: any, newBox: any) => newBox.width < 40 || newBox.height < 20 ? oldBox : newBox} /> : null}{selectedLayer === 'face' && (faceEditMode === 'resize' || faceEditMode === 'rotate') && replacementNode ? <Transformer nodes={[replacementNode]} rotateEnabled={faceEditMode === 'rotate'} keepRatio={faceEditMode === 'resize'} enabledAnchors={faceEditMode === 'resize' ? ['top-left', 'top-right', 'bottom-left', 'bottom-right'] : []} anchorSize={14} anchorCornerRadius={4} anchorStroke="#161616" anchorFill="#ffd166" boundBoxFunc={(oldBox: any, newBox: any) => newBox.width < 24 || newBox.height < 24 ? oldBox : newBox} /> : null}</Layer>
    </Stage>
  </section>
}
