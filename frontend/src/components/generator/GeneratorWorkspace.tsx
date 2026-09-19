import { Download, RotateCcw, Sparkles } from 'lucide-react'
import { ImageDropzone } from '../upload/ImageDropzone'
import { GeneratedStage } from './GeneratedStage'
import { CaptionPanel } from './CaptionPanel'
import { useEditorStore } from '../../stores/editorStore'
import { downloadComposition } from '../../utils/exportCompositionV2'

export function GeneratorWorkspace() {
  const reset = useEditorStore((state) => state.reset)
  const imageFile = useEditorStore((state) => state.imageFile)
  const generation = useEditorStore((state) => state.generation)
  const status = useEditorStore((state) => state.status)
  const error = useEditorStore((state) => state.error)
  const isWorking = generation.status === 'running' || status === 'GENERATING_PREVIEW'
  const canExport = generation.status === 'complete' && Boolean(generation.resultUrl)

  return (
    <main className="sonify-workspace">
      <section className="workspace-filebar">
        <div className="file-summary">
          <span className="file-icon"><Sparkles size={17} aria-hidden="true" /></span>
          <div><strong>{imageFile?.name ?? 'Source image'}</strong><span>{isWorking ? 'Creating your Sonify image…' : generation.targetType === 'object' ? 'Scene integration ready' : 'AI-integrated face ready'}</span></div>
        </div>
        <div className="workspace-file-actions">
          <ImageDropzone variant="compact" />
          <button type="button" className="button secondary compact-button" onClick={reset}><RotateCcw size={16} aria-hidden="true" /> Start over</button>
        </div>
      </section>
      {error ? <div className="generation-error" role="alert"><strong>Generation could not finish</strong><span>{error}</span><button type="button" className="button secondary" onClick={reset}>Try another image</button></div> : null}
      <div className="focused-editor">
        <GeneratedStage />
        <aside className="caption-sidebar" aria-label="Caption controls">
          <CaptionPanel />
          <div className="sidebar-export"><button type="button" className="button primary full-width" disabled={!canExport || isWorking} onClick={() => void downloadComposition(useEditorStore.getState())}><Download size={17} aria-hidden="true" /> Download PNG</button><p>Generated images are returned without text so your caption stays crisp and editable.</p></div>
        </aside>
      </div>
    </main>
  )
}
