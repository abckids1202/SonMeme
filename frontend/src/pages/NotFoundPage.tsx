import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="page-stack">
      <section className="panel prose-panel">
        <h2>Page not found</h2>
        <Link className="button primary" to="/">Back to Generator</Link>
      </section>
    </main>
  )
}
