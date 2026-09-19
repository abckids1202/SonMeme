import { useRef, type PointerEvent } from 'react'
import { ImageUp, LoaderCircle, Sparkles } from 'lucide-react'
import { useEditorStore } from '../../stores/editorStore'

function clamp(value: number, minimum: number, maximum: number) { return Math.max(minimum, Math.min(maximum, value)) }

export function GeneratedStage() {
  const originalUrl = useEditorStore((state) => state.originalUrl)
  const generation = useEditorStore((state) => state.generation)
  const caption = useEditorStore((state) => state.caption)
  const updateCaption = useEditorStore((state) => state.updateCaption)
  const stageRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const imageUrl = generation.resultUrl ?? originalUrl
  const isWorking = generation.status === 'running'

  const moveCaption = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || !stageRef.current) return
    const bounds = stageRef.current.getBoundingClientRect()
    updateCaption({ x: clamp((event.clientX - bounds.left) / bounds.width - 0.02, 0.01, 0.82), y: clamp((event.clientY - bounds.top) / bounds.height - 0.03, 0.01, 0.88) })
  }

  return <section className="generated-stage-panel" aria-label="Sonify preview">
    <div className="stage-heading"><div><p className="eyebrow">Preview</p><h1>{generation.resultUrl ? 'Your Sonify image' : 'Preparing your image'}</h1></div>{generation.resultUrl ? <span className="ready-pill"><Sparkles size={14} /> Ready</span> : null}</div>
    <div ref={stageRef} className="generated-stage" onPointerMove={moveCaption} onPointerUp={() => { draggingRef.current = false }} onPointerLeave={() => { draggingRef.current = false }}>
      {imageUrl ? <img src={imageUrl} alt="Sonify generated preview" className="generated-image" /> : <div className="stage-empty"><ImageUp size={34} /><span>Upload an image to begin</span></div>}
      {isWorking ? <div className="generation-overlay"><LoaderCircle className="spin" size={30} /><strong>AI is blending the scene</strong><span>It may take a moment.</span></div> : null}
      {caption.visible && caption.text ? <div className="caption-layer" style={{ left: `${caption.x * 100}%`, top: `${caption.y * 100}%`, transform: `rotate(${caption.rotation}deg) scale(${caption.scale})` }} onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); draggingRef.current = true }} role="button" tabIndex={0} aria-label="Drag caption">{caption.text}</div> : null}
    </div>
    <p className="stage-note">Drag the caption directly on the image.</p>
  </section>
}
