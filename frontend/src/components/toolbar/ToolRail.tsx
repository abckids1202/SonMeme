import { Hand, MousePointer2, RotateCw, Sparkles, SquareDashedMousePointer } from 'lucide-react'
import { useEffect } from 'react'
import { useEditorStore } from '../../stores/editorStore'
import type { FaceEditMode } from '../../types/editor'
import { ToolButton } from './ToolButton'

const modes: Array<{ mode: FaceEditMode; label: string; shortcut: string; icon: typeof MousePointer2 }> = [
  { mode: 'move', label: 'Move', shortcut: 'V', icon: MousePointer2 },
  { mode: 'resize', label: 'Resize', shortcut: 'S', icon: Sparkles },
  { mode: 'rotate', label: 'Rotate', shortcut: 'O', icon: RotateCw },
  { mode: 'distort', label: 'Distort', shortcut: 'D', icon: Sparkles },
]

function isTypingTarget(target: EventTarget | null) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement
}

export function ToolRail() {
  const faceEditMode = useEditorStore((state) => state.faceEditMode)
  const activeTool = useEditorStore((state) => state.activeTool)
  const setFaceEditMode = useEditorStore((state) => state.setFaceEditMode)
  const setActiveTool = useEditorStore((state) => state.setActiveTool)
  const selectLayer = useEditorStore((state) => state.selectLayer)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return
      if (event.key === 'Escape') { setFaceEditMode('move'); setActiveTool('select'); selectLayer(null); return }
      const key = event.key.toLowerCase()
      const mode = modes.find((item) => item.shortcut.toLowerCase() === key)?.mode
      if (mode) { setFaceEditMode(mode); setActiveTool('select') }
      if (key === 'r') setActiveTool('manual-region')
      if (key === 'h') setActiveTool('pan')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectLayer, setActiveTool, setFaceEditMode])

  return <aside className="tool-rail" aria-label="Face editing tools">
    {modes.map(({ mode, label, shortcut, icon: Icon }) => <button key={mode} type="button" className={faceEditMode === mode ? 'tool-button active' : 'tool-button'} aria-label={`${label} mode, shortcut ${shortcut}`} title={`${label} (${shortcut})`} onClick={() => { setFaceEditMode(mode); setActiveTool('select') }}><Icon size={20} aria-hidden="true" /><span>{shortcut}</span></button>)}
    <ToolButton tool="manual-region" label="Manual target" shortcut="R" icon={SquareDashedMousePointer} activeTool={activeTool} onClick={setActiveTool} />
    <ToolButton tool="pan" label="Pan" shortcut="H" icon={Hand} activeTool={activeTool} onClick={setActiveTool} />
  </aside>
}
