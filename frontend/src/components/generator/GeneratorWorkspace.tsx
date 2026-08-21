import { CompactFileBar } from './CompactFileBar'
import { SonifyStageMesh as SonifyStage } from '../canvas/SonifyStageMesh'
import { ToolRail } from '../toolbar/ToolRail'
import { PropertiesPanel } from '../properties/PropertiesPanel'
import { BottomActionBar } from '../toolbar/BottomActionBar'

export function GeneratorWorkspace() {
  return (
    <main className="canvas-editor">
      <CompactFileBar />
      <div className="editor-body">
        <ToolRail />
        <SonifyStage />
        <PropertiesPanel />
      </div>
      <BottomActionBar />
    </main>
  )
}
