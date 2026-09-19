import { ImageDropzone } from '../upload/ImageDropzone'

export function EmptyGeneratorState() {
  return (
    <main className="empty-generator">
      <section className="empty-card">
        <p className="eyebrow">Sonify</p>
        <h1>Make any image a Sonify meme</h1>
        <p className="empty-copy">Drop, browse or paste an image. AI blends the Son face into the scene.</p>
        <ImageDropzone variant="hero" />
      </section>
    </main>
  )
}

