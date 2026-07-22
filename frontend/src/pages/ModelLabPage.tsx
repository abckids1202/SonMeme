import { Cpu, LoaderCircle } from 'lucide-react'
import { useHealth } from '../hooks/useHealth'

export function ModelLabPage() {
  const health = useHealth()

  return (
    <main className="page-stack">
      <section className="panel">
        <div className="panel-heading">
          <Cpu size={18} aria-hidden="true" />
          <h2>Pipeline status</h2>
        </div>
        {health.isLoading ? (
          <p className="muted-row"><LoaderCircle size={16} aria-hidden="true" /> Checking backend...</p>
        ) : health.data ? (
          <div className="lab-grid">
            <span>Runtime</span><strong>{health.data.runtime}</strong>
            <span>Device</span><strong>{health.data.device}</strong>
            <span>Detector</span><strong>{health.data.metadata.detector}</strong>
            <span>Landmarks</span><strong>{health.data.metadata.landmarks}</strong>
            <span>Generator</span><strong>{health.data.metadata.generator}</strong>
          </div>
        ) : (
          <p>The backend is not reachable yet. Start FastAPI on port 8000 to inspect model status.</p>
        )}
      </section>
      <section className="panel model-flow">
        <h2>Milestone pipeline</h2>
        <div>Upload validation</div>
        <div>Detector raw outputs</div>
        <div>NMS boxes</div>
        <div>Selected crop</div>
        <div>Five-point landmarks</div>
        <div>Warp and blend stages</div>
        <div>Final meme export</div>
      </section>
    </main>
  )
}
