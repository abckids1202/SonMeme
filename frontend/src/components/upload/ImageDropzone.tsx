import { useCallback, useEffect, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { Clipboard, ImageUp } from 'lucide-react'
import { uploadFileSchema } from '../../schemas/upload'
import { useEditorStore } from '../../stores/editorStore'
import { createMockFaces } from '../../utils/mockDetection'
import { detectImage } from '../../api/detection'

type ImageDropzoneProps = {
  variant?: 'hero' | 'compact'
}

let activeObjectUrl: string | null = null

async function readImageDimensions(url: string): Promise<{ width: number; height: number }> {
  const image = new Image()
  image.decoding = 'async'
  image.src = url
  await image.decode()
  return { width: image.naturalWidth, height: image.naturalHeight }
}

export function ImageDropzone({ variant = 'compact' }: ImageDropzoneProps) {
  const uploadSequenceRef = useRef(0)
  const abortControllerRef = useRef<AbortController | null>(null)
  const setUploadedImage = useEditorStore((state) => state.setUploadedImage)
  const setImageDimensions = useEditorStore((state) => state.setImageDimensions)
  const setImageLoadState = useEditorStore((state) => state.setImageLoadState)
  const setFaces = useEditorStore((state) => state.setFaces)
  const setStatus = useEditorStore((state) => state.setStatus)
  const setError = useEditorStore((state) => state.setError)

  const clearObjectUrl = useCallback(() => {
    if (activeObjectUrl) {
      URL.revokeObjectURL(activeObjectUrl)
      activeObjectUrl = null
    }
  }, [])

  const acceptFile = useCallback(
    async (file: File) => {
      const sequence = ++uploadSequenceRef.current
      abortControllerRef.current?.abort()
      const controller = new AbortController()
      abortControllerRef.current = controller
      const parsed = uploadFileSchema.safeParse(file)
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? 'Unsupported file.')
        return
      }

      clearObjectUrl()
      setImageLoadState('reading')
      const url = URL.createObjectURL(file)
      activeObjectUrl = url

      try {
        setImageLoadState('decoding')
        const { width, height } = await readImageDimensions(url)
        if (sequence !== uploadSequenceRef.current || controller.signal.aborted) return
        setUploadedImage({
          url,
          width,
          height,
          file: {
            name: file.name,
            size: file.size,
            type: file.type,
            orientation: 'browser-corrected',
          },
        })

        if (import.meta.env.VITE_USE_MOCK_BACKEND === 'true') {
          setFaces(createMockFaces(width, height), 'mock-data')
        } else {
          setImageLoadState('ready')
          setFaces([], 'backend-disconnected')
          setStatus('DETECTING')
          try {
            const detection = await detectImage(file, controller.signal)
            if (sequence !== uploadSequenceRef.current || controller.signal.aborted) return
            setImageDimensions(detection.imageWidth, detection.imageHeight)
            const source = detection.model.production ? 'external-baseline' as const : 'custom-detector' as const
            setFaces(detection.faces.map((face) => ({
              ...face,
              landmarks: Object.fromEntries(Object.entries(face.landmarks ?? {}).map(([key, point]) => [key, { x: point[0], y: point[1] }])),
              source,
            })), detection.model.production ? 'production-detector' : 'custom-detector')
          } catch (error) {
            if (controller.signal.aborted || sequence !== uploadSequenceRef.current) return
            setError(error instanceof Error ? error.message : 'Face detection failed. Is the backend running?')
          }
        }
      } catch {
        clearObjectUrl()
        setError('The image could not be decoded. Try another JPEG, PNG, or WebP file.')
      }
    },
    [clearObjectUrl, setError, setFaces, setImageDimensions, setImageLoadState, setStatus, setUploadedImage],
  )

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const file = Array.from(event.clipboardData?.files ?? []).find((item) => item.type.startsWith('image/'))
      if (file) void acceptFile(file)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [acceptFile])

  const onDrop = useCallback((files: File[]) => {
    if (files[0]) void acceptFile(files[0])
  }, [acceptFile])

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
    maxFiles: 1,
    noClick: true,
    noKeyboard: true,
  })

  return (
    <section {...getRootProps()} className={isDragActive ? `image-dropzone ${variant} active` : `image-dropzone ${variant}`}>
      {(() => {
        const inputProps = getInputProps()
        return <input {...inputProps} onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void acceptFile(file); event.currentTarget.value = '' }} aria-label="Upload source image" />
      })()}
      <ImageUp size={variant === 'hero' ? 34 : 20} aria-hidden="true" />
      <div>
        <h2>{variant === 'hero' ? 'Drop an image here' : 'Replace source image'}</h2>
        <p>JPEG, PNG, or WebP · Maximum 15 MB</p>
      </div>
      <button type="button" className="button primary" onClick={open}>
        Browse files
      </button>
      {variant === 'hero' ? (
        <span className="paste-hint"><Clipboard size={16} /> Paste from clipboard</span>
      ) : null}
    </section>
  )
}
