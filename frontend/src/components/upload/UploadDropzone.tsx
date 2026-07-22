import { useCallback, useEffect, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { ImageUp, RefreshCcw, Trash2 } from 'lucide-react'
import { uploadFileSchema } from '../../schemas/upload'
import { useEditorStore } from '../../stores/editorStore'

function formatBytes(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

async function readImageDimensions(url: string): Promise<{ width: number; height: number }> {
  const image = new Image()
  image.src = url
  await image.decode()
  return { width: image.naturalWidth, height: image.naturalHeight }
}

export function UploadDropzone() {
  const objectUrlRef = useRef<string | null>(null)
  const originalUrl = useEditorStore((state) => state.originalUrl)
  const imageWidth = useEditorStore((state) => state.imageWidth)
  const imageHeight = useEditorStore((state) => state.imageHeight)
  const setUploadedImage = useEditorStore((state) => state.setUploadedImage)
  const setStatus = useEditorStore((state) => state.setStatus)
  const setError = useEditorStore((state) => state.setError)
  const reset = useEditorStore((state) => state.reset)

  const clearObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }, [])

  useEffect(() => clearObjectUrl, [clearObjectUrl])

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0]
      if (!file) return
      const parsed = uploadFileSchema.safeParse(file)
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? 'Unsupported file.')
        return
      }

      clearObjectUrl()
      setStatus('UPLOADING')
      const url = URL.createObjectURL(file)
      objectUrlRef.current = url

      try {
        const { width, height } = await readImageDimensions(url)
        setUploadedImage({ url, width, height })
      } catch {
        clearObjectUrl()
        setError('The image could not be decoded. Try another JPEG, PNG, or WebP file.')
      }
    },
    [clearObjectUrl, setError, setStatus, setUploadedImage],
  )

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
    maxFiles: 1,
    noClick: true,
    noKeyboard: true,
  })

  return (
    <section className="panel upload-panel">
      <div {...getRootProps()} className={isDragActive ? 'dropzone active' : 'dropzone'}>
        <input {...getInputProps()} aria-label="Upload source image" />
        <ImageUp size={28} aria-hidden="true" />
        <div>
          <h2>{originalUrl ? 'Image loaded' : 'Upload a source image'}</h2>
          <p>JPEG, PNG, or WebP. Maximum 15 MB. EXIF orientation correction arrives with the backend upload milestone.</p>
        </div>
        <button type="button" className="button primary" onClick={open}>
          <ImageUp size={17} aria-hidden="true" />
          Browse
        </button>
      </div>
      {originalUrl ? (
        <div className="file-meta">
          <span>{imageWidth} x {imageHeight}px</span>
          <span>Local preview only</span>
          <button type="button" className="icon-button" aria-label="Replace image" onClick={open}>
            <RefreshCcw size={17} />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Remove image"
            onClick={() => {
              clearObjectUrl()
              reset()
            }}
          >
            <Trash2 size={17} />
          </button>
        </div>
      ) : (
        <div className="file-meta">
          <span>No file selected</span>
          <span>Limit {formatBytes(15 * 1024 * 1024)}</span>
        </div>
      )}
    </section>
  )
}
