import { ArrowRight, ImagePlus, ScanFace, Shapes, WandSparkles } from 'lucide-react'
import heroImage from '../assets/hero.png'
import sourceFace from '../assets/anthony-mackie-face.png'

const examples = [
  { title: 'Portrait', detail: 'Auto Fit', image: sourceFace },
  { title: 'Side face', detail: 'Auto Fit + Fit', image: heroImage },
  { title: 'Anime or drawing', detail: 'Manual Target', image: heroImage },
  { title: 'Object or food', detail: 'Manual Target + Warp', image: heroImage },
]

export function IdealPage() {
  return (
    <main className="ideal-page">
      <section className="ideal-hero">
        <div>
          <p className="eyebrow">Ideal inputs</p>
          <h1>Fit the Son face into anything.</h1>
          <p className="ideal-lede">Clear eyes, nose, and mouth with good contrast are easiest. When the target gets strange, Manual Target, Warp, and Mask give you the control.</p>
        </div>
        <img src={heroImage} alt="Sonify face fitting preview" />
      </section>
      <section className="ideal-section">
        <div className="ideal-section-heading"><h2>Good starting points</h2><p>Medium or large subjects with a visible face usually fit automatically.</p></div>
        <div className="ideal-grid">{examples.slice(0, 2).map((example) => <article className="ideal-example" key={example.title}><img src={example.image} alt="" /><div><strong>{example.title}</strong><span>{example.detail}</span></div></article>)}</div>
      </section>
      <section className="ideal-section">
        <div className="ideal-section-heading"><h2>Still works with manual targeting</h2><p>Anime, drawings, statues, food, objects, and intentionally cursed shapes do not need a new detector.</p></div>
        <div className="ideal-grid">{examples.slice(2).map((example) => <article className="ideal-example" key={example.title}><img src={example.image} alt="" /><div><strong>{example.title}</strong><span>{example.detail}</span></div></article>)}</div>
      </section>
      <section className="ideal-section how-to-fit">
        <div className="ideal-section-heading"><h2>How to fit the Son face</h2><p>Use the smallest tool that solves the problem.</p></div>
        <div className="ideal-steps">
          <article><ScanFace size={22} /><strong>Move</strong><span>Place, resize, and rotate the face.</span></article>
          <article><ScanFace size={22} /><strong>Fit</strong><span>Move semantic forehead, eye, nose, mouth, and jaw handles onto the target guides.</span></article>
          <article><WandSparkles size={22} /><strong>Liquify</strong><span>Paint small local pushes directly on the fitted face without changing its size or position.</span></article>
          <article><Shapes size={22} /><strong>Mask</strong><span>Adjust the silhouette when the target has an unusual outline.</span></article>
        </div>
        <p className="ideal-tip"><ImagePlus size={17} /> The stranger the target, the more useful Manual Target and Liquify become. <ArrowRight size={17} /> Export when the canvas looks right.</p>
      </section>
    </main>
  )
}
