import { EditorCanvas } from '../components/editor/EditorCanvas'
import { GenerationControls } from '../components/controls/GenerationControls'
import { FaceSelectionPanel } from '../components/face-selection/FaceSelectionPanel'
import { StatusBar } from '../components/diagnostics/StatusBar'
import { UploadDropzone } from '../components/upload/UploadDropzone'

export function GeneratorPage() {
  return (
    <main className="generator-layout">
      <div className="workspace">
        <UploadDropzone />
        <EditorCanvas />
      </div>
      <aside className="side-rail">
        <FaceSelectionPanel />
        <GenerationControls />
      </aside>
      <StatusBar />
    </main>
  )
}
