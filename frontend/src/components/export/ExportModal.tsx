import { Clipboard, Download, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useEditorStore } from '../../stores/editorStore'
import { downloadComposition, renderComposition, type ExportFormat, type ExportOptions } from '../../utils/exportCompositionV2'

type Resolution = 'original' | 'square' | 'portrait' | 'story' | 'custom'

export function ExportModal() {
  const open = useEditorStore((state) => state.exportModalOpen)
  const setOpen = useEditorStore((state) => state.setExportModalOpen)
  const imageWidth = useEditorStore((state) => state.imageWidth)
  const imageHeight = useEditorStore((state) => state.imageHeight)
  const [format, setFormat] = useState<ExportFormat>('png')
  const [resolution, setResolution] = useState<Resolution>('original')
  const [customWidth, setCustomWidth] = useState(1080)
  const [customHeight, setCustomHeight] = useState(1080)
  const [quality, setQuality] = useState(92)
  const [message, setMessage] = useState('')

  const options = useMemo<ExportOptions>(() => {
    const dimensions = resolution === 'original' ? [imageWidth, imageHeight] : resolution === 'square' ? [1080, 1080] : resolution === 'portrait' ? [1080, 1350] : resolution === 'story' ? [1080, 1920] : [customWidth, customHeight]
    return { format, width: Math.max(2, dimensions[0]), height: Math.max(2, dimensions[1]), quality }
  }, [customHeight, customWidth, format, imageHeight, imageWidth, quality, resolution])

  if (!open) return null
  const runDownload = async () => {
    try {
      await downloadComposition(useEditorStore.getState(), options)
      setMessage('Downloaded')
    } catch {
      setMessage('Could not create this export')
    }
  }
  const copyImage = async () => {
    try {
      const blob = await renderComposition(useEditorStore.getState(), options)
      if (!navigator.clipboard || typeof ClipboardItem === 'undefined') { setMessage('Copy is not supported in this browser'); return }
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
      setMessage('Copied')
    } catch {
      setMessage('Could not copy this export')
    }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}>
    <section className="export-modal" role="dialog" aria-modal="true" aria-labelledby="export-title">
      <div className="modal-heading"><div><p className="eyebrow">Export</p><h2 id="export-title">Download your Sonify</h2></div><button type="button" className="icon-button" aria-label="Close export dialog" onClick={() => setOpen(false)}><X size={18} /></button></div>
      <div className="export-form">
        <label className="field"><span>Format</span><select value={format} onChange={(event) => setFormat(event.target.value as ExportFormat)}><option value="png">PNG</option><option value="jpeg">JPEG</option><option value="webp">WebP</option></select></label>
        <label className="field"><span>Resolution</span><select value={resolution} onChange={(event) => setResolution(event.target.value as Resolution)}><option value="original">Original resolution</option><option value="square">1080 × 1080</option><option value="portrait">1080 × 1350</option><option value="story">1080 × 1920</option><option value="custom">Custom</option></select></label>
        {resolution === 'custom' ? <div className="custom-size"><label className="field"><span>Width</span><input type="number" min="2" max="4096" value={customWidth} onChange={(event) => setCustomWidth(Number(event.target.value))} /></label><label className="field"><span>Height</span><input type="number" min="2" max="4096" value={customHeight} onChange={(event) => setCustomHeight(Number(event.target.value))} /></label></div> : null}
        {format !== 'png' ? <label className="field"><span>Quality: {quality}</span><input type="range" min="70" max="100" value={quality} onChange={(event) => setQuality(Number(event.target.value))} /></label> : null}
      </div>
      {message ? <p className="export-message" role="status">{message}</p> : null}
      <div className="modal-actions"><button type="button" className="button secondary" onClick={() => void copyImage()}><Clipboard size={16} /> Copy image</button><button type="button" className="button primary" onClick={() => void runDownload()}><Download size={16} /> Download</button></div>
    </section>
  </div>
}
