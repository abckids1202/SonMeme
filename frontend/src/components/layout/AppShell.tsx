import { NavLink } from 'react-router-dom'
import { ImagePlus, Lightbulb } from 'lucide-react'
import type { PropsWithChildren } from 'react'
import { useEditorStore } from '../../stores/editorStore'
import { ExportModal } from '../export/ExportModal'

const links = [
  { to: '/', label: 'Generator', icon: ImagePlus },
  { to: '/ideal', label: 'Ideal', icon: Lightbulb },
]

export function AppShell({ children }: PropsWithChildren) {
  const reset = useEditorStore((state) => state.reset)
  const hasImage = useEditorStore((state) => Boolean(state.originalUrl))
  const setExportModalOpen = useEditorStore((state) => state.setExportModalOpen)

  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink to="/" className="wordmark" aria-label="Sonify Generator">
          Sonify
        </NavLink>
        <nav className="nav-links" aria-label="Main navigation">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              <Icon size={17} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="topbar-actions">
          <button type="button" className="button secondary compact-button" onClick={reset} disabled={!hasImage}>
            Reset
          </button>
          <button type="button" className="button primary compact-button" disabled={!hasImage} onClick={() => setExportModalOpen(true)}>
            Export
          </button>
        </div>
      </header>
      {children}
      <ExportModal />
    </div>
  )
}
