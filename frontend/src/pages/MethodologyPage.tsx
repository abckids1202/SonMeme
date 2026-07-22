export function MethodologyPage() {
  return (
    <main className="page-stack">
      <section className="panel prose-panel">
        <h2>Methodology</h2>
        <p>Sonify is staged so the app becomes usable before the neural transformer is complete. Milestone 1 provides the repository foundation. Later milestones add temporary upload storage, a labeled detector baseline, custom detector and landmark training, classical geometric warping, cutout mode, and only then the identity-conditioned neural model.</p>
        <p>The production UI must report exactly which model produced an image. Missing custom checkpoints are shown as missing rather than being quietly replaced with a face-swap package.</p>
      </section>
      <section className="panel prose-panel">
        <h2>Responsible use</h2>
        <p>This is a still-image parody editor. It does not include voice cloning, realtime video replacement, permanent photo storage, or user face embedding retention.</p>
      </section>
    </main>
  )
}
