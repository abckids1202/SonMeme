import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { GeneratorPage } from './pages/GeneratorPage'
import { NotFoundPage } from './pages/NotFoundPage'
import './App.css'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<GeneratorPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <AppRoutes />
      </AppShell>
    </BrowserRouter>
  )
}
