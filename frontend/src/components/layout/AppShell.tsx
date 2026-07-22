import { NavLink } from 'react-router-dom'
import { FlaskConical, ImagePlus, Microscope } from 'lucide-react'
import type { PropsWithChildren } from 'react'

const links = [
  { to: '/', label: 'Generator', icon: ImagePlus },
  { to: '/model-lab', label: 'Model Lab', icon: Microscope },
  { to: '/methodology', label: 'Methodology', icon: FlaskConical },
]

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">still-image parody lab</p>
          <h1>Sonify</h1>
        </div>
        <nav className="nav-links" aria-label="Main navigation">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </header>
      {children}
    </div>
  )
}
