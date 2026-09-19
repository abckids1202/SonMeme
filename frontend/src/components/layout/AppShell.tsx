import { NavLink } from 'react-router-dom'
import { Download, ImagePlus } from 'lucide-react'
import type { PropsWithChildren } from 'react'
import { useEditorStore } from '../../stores/editorStore'
import { downloadComposition } from '../../utils/exportCompositionV2'

const links = [
  { to: '/', label: 'Generator', icon: ImagePlus },
]

export function AppShell({ children }: PropsWithChildren) {
  const reset = useEditorStore((state) => state.reset)
  const hasImage = useEditorStore((state) => Boolean(state.originalUrl))
  const canExport = useEditorStore((state) => state.generation.status === 'complete' && Boolean(state.generation.resultUrl))
  const exportFormat = useEditorStore((state) => state.exportFormat)

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
          <button type="button" className="button primary compact-button" disabled={!canExport} onClick={() => { const state = useEditorStore.getState(); void downloadComposition(state, { format: exportFormat, width: state.imageWidth, height: state.imageHeight, quality: 92 }) }}>
            <Download size={16} aria-hidden="true" /> Export {exportFormat === 'jpeg' ? 'JPG' : 'PNG'}
          </button>
        </div>
      </header>
      {children}
    </div>
  )
}
