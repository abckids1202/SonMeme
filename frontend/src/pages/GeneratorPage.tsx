import { EmptyGeneratorState } from '../components/generator/EmptyGeneratorState'
import { GeneratorWorkspace } from '../components/generator/GeneratorWorkspace'
import { useEditorStore } from '../stores/editorStore'

export function GeneratorPage() {
  const hasImage = useEditorStore((state) => Boolean(state.originalUrl))

  return hasImage ? <GeneratorWorkspace /> : <EmptyGeneratorState />
}
