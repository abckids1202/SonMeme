import { ImagePlus } from 'lucide-react'
import { ImageDropzone } from '../upload/ImageDropzone'

export function EmptyGeneratorState() {
  return (
    <main className="empty-generator">
      <section className="empty-card">
        <p className="eyebrow">Sonify</p>
        <h1>Turn someone into “son 😭”</h1>
        <p className="empty-copy">Drop, browse or paste an image i guess</p>
        <ImageDropzone variant="hero" />
        <div className="example-strip" aria-label="Example image placeholders">
          <button type="button"><ImagePlus size={18} /> Portrait</button>
          <button type="button"><ImagePlus size={18} /> Group</button>
          <button type="button"><ImagePlus size={18} /> Meme</button>
        </div>
      </section>
    </main>
  )
}

