import { useEditorStore } from '../../stores/editorStore'
import type { SourceFaceVariant } from '../../types/editor'

const options: Array<{ value: SourceFaceVariant; label: string; detail: string; image: string }> = [
  { value: 'classic', label: 'Original Son', detail: 'Classic reference', image: '/source-faces/anthony-front.png' },
  { value: 'chubby', label: 'Chubby Son', detail: 'Chubby reference', image: '/source-faces/anthony-chubby.png' },
]

export function SourceFacePicker() {
  const selected = useEditorStore((state) => state.sourceFaceVariant)
  const setSourceFaceVariant = useEditorStore((state) => state.setSourceFaceVariant)

  return <section className="source-face-picker" aria-label="Choose Son face">
    <div className="source-face-picker-heading"><strong>Choose Son face</strong><span>Pick the reference to integrate</span></div>
    <div className="source-face-options" role="radiogroup" aria-label="Son face style">
      {options.map((option) => <button key={option.value} type="button" role="radio" aria-checked={selected === option.value} className={selected === option.value ? 'source-face-option active' : 'source-face-option'} onClick={() => setSourceFaceVariant(option.value)}>
        <img src={option.image} alt="" />
        <span><strong>{option.label}</strong><small>{option.detail}</small></span>
      </button>)}
    </div>
  </section>
}
