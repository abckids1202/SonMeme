import type { LucideIcon } from 'lucide-react'
import type { ActiveTool } from '../../types/editor'

type ToolButtonProps = {
  tool: ActiveTool
  activeTool: ActiveTool
  label: string
  shortcut: string
  icon: LucideIcon
  onClick: (tool: ActiveTool) => void
}

export function ToolButton({ tool, activeTool, label, shortcut, icon: Icon, onClick }: ToolButtonProps) {
  return (
    <button
      type="button"
      className={activeTool === tool ? 'tool-button active' : 'tool-button'}
      aria-label={`${label} tool, shortcut ${shortcut}`}
      title={`${label} (${shortcut})`}
      onClick={() => onClick(tool)}
    >
      <Icon size={20} aria-hidden="true" />
      <span>{shortcut}</span>
    </button>
  )
}
