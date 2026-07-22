import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { GeneratorPage } from './pages/GeneratorPage'
import { MethodologyPage } from './pages/MethodologyPage'
import { ModelLabPage } from './pages/ModelLabPage'
import { NotFoundPage } from './pages/NotFoundPage'
import './App.css'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<GeneratorPage />} />
      <Route path="/model-lab" element={<ModelLabPage />} />
      <Route path="/methodology" element={<MethodologyPage />} />
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
