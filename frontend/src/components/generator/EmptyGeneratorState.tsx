import { ImageDropzone } from '../upload/ImageDropzone'

export function EmptyGeneratorState() {
  return (
    <main className="empty-generator">
      <section className="empty-card">
        <p className="eyebrow">Sonify</p>
        <h1>Turn someone into son 😭</h1>
        <p className="empty-copy">Drop or paste an image, i guess bro</p>
        <ImageDropzone variant="hero" />
      </section>
    </main>
  )
}

