import { NavLink } from 'react-router-dom'
import { FlaskConical, ImagePlus, Microscope, RadioTower } from 'lucide-react'
import type { PropsWithChildren } from 'react'
import { useEditorStore } from '../../stores/editorStore'

const links = [
  { to: '/', label: 'Generator', icon: ImagePlus },
  { to: '/model-lab', label: 'Model Lab', icon: Microscope },
  { to: '/methodology', label: 'Methodology', icon: FlaskConical },
]

const badgeLabels = {
  'backend-disconnected': 'Backend disconnected',
  'mock-data': 'Mock data',
  'external-baseline': 'External baseline',
  'custom-detector': 'Custom detector',
}

export function AppShell({ children }: PropsWithChildren) {
  const modelBadge = useEditorStore((state) => state.modelBadge)
  const reset = useEditorStore((state) => state.reset)
  const hasImage = useEditorStore((state) => Boolean(state.originalUrl))

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
          <span className={`model-pill ${modelBadge}`}>
            <RadioTower size={15} aria-hidden="true" />
            {badgeLabels[modelBadge]}
          </span>
          <button type="button" className="button secondary compact-button" onClick={reset} disabled={!hasImage}>
            Reset
          </button>
          <button type="button" className="button primary compact-button" disabled={!hasImage}>
            Export
          </button>
        </div>
      </header>
      {children}
    </div>
  )
}
