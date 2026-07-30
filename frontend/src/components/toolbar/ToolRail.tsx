import { Hand, Image, Lasso, MousePointer2, ScanFace, SmilePlus, Type } from 'lucide-react'
import { useEffect } from 'react'
import { useEditorStore } from '../../stores/editorStore'
import type { ActiveTool } from '../../types/editor'
import { ToolButton } from './ToolButton'

const tools = [
  { tool: 'select', label: 'Select', shortcut: 'V', icon: MousePointer2 },
  { tool: 'face', label: 'Face Target', shortcut: 'F', icon: ScanFace },
  { tool: 'manual-region', label: 'Lasso mask', shortcut: 'R', icon: Lasso },
  { tool: 'text', label: 'Text', shortcut: 'T', icon: Type },
  { tool: 'emoji', label: 'Emoji', shortcut: 'E', icon: SmilePlus },
  { tool: 'cutout', label: 'Cutout', shortcut: 'C', icon: Image },
  { tool: 'pan', label: 'Pan', shortcut: 'H', icon: Hand },
] as const

const keyToTool: Record<string, ActiveTool> = {
  v: 'select',
  f: 'face',
  r: 'manual-region',
  t: 'text',
  e: 'emoji',
  c: 'cutout',
  h: 'pan',
}

function isTypingTarget(target: EventTarget | null) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement
}

export function ToolRail() {
  const activeTool = useEditorStore((state) => state.activeTool)
  const setActiveTool = useEditorStore((state) => state.setActiveTool)
  const selectLayer = useEditorStore((state) => state.selectLayer)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return
      if (event.key === 'Escape') {
        selectLayer(null)
        return
      }
      const tool = keyToTool[event.key.toLowerCase()]
      if (tool) setActiveTool(tool)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectLayer, setActiveTool])

  return (
    <aside className="tool-rail" aria-label="Editor tools">
      {tools.map((item) => (
        <ToolButton key={item.tool} {...item} activeTool={activeTool} onClick={setActiveTool} />
      ))}
    </aside>
  )
}
