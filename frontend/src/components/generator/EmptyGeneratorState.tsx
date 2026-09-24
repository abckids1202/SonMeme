import { ImageDropzone } from '../upload/ImageDropzone'
import { SourceFacePicker } from './SourceFacePicker'

export function EmptyGeneratorState() {
  return (
    <main className="empty-generator">
      <section className="empty-card">
        <p className="eyebrow">Sonify</p>
        <h1>Turn someone into son 😭</h1>
        <p className="empty-copy">Drop or paste an image, i guess bro</p>
        <SourceFacePicker />
        <ImageDropzone variant="hero" />
      </section>
    </main>
  )
}

