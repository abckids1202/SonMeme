const statusRows = [
  ['Frontend shell', 'Implemented'],
  ['Canvas-first redesign', 'In progress'],
  ['Face detector data preparation', 'In training'],
  ['Custom detector checkpoint', 'Unavailable'],
  ['Landmark model', 'Planned'],
  ['Classical replacement', 'Planned'],
  ['Neural transformer', 'Planned'],
  ['High-resolution export', 'Planned'],
]

export function MethodologyPage() {
  const showStatus = import.meta.env.VITE_SHOW_PROJECT_STATUS === 'true'

  return (
    <main className="page-stack">
      <section className="panel prose-panel">
        <h2>Methodology</h2>
        <p>Sonify is staged around a simple editor experience and a custom computer-vision pipeline. The current user-facing redesign keeps direct canvas editing useful while the face detector is being trained.</p>
        <div className="method-grid">
          <article><strong>Detector</strong><span>Custom face boxes from WIDER FACE-style training data.</span></article>
          <article><strong>Landmarks</strong><span>Five-point alignment for realistic replacement.</span></article>
          <article><strong>Classical warp</strong><span>First production replacement path before neural generation.</span></article>
          <article><strong>Cutout mode</strong><span>Deliberately flexible meme sticker workflow.</span></article>
        </div>
      </section>
      {showStatus ? (
        <section className="panel prose-panel">
          <h2>Project status</h2>
          <div className="status-table">
            {statusRows.map(([name, status]) => (
              <div key={name}><span>{name}</span><strong>{status}</strong></div>
            ))}
          </div>
        </section>
      ) : null}
      <section className="panel prose-panel">
        <h2>Privacy</h2>
        <p>This is a still-image parody editor. It does not include voice cloning, realtime video replacement, permanent photo storage, or user face embedding retention.</p>
      </section>
    </main>
  )
}
