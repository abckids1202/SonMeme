import { useEffect, useState } from 'react'
import { useEditorStore } from '../../stores/editorStore'

export function useKonvaImage(url: string | null) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const setImageLoadState = useEditorStore((state) => state.setImageLoadState)
  const setError = useEditorStore((state) => state.setError)

  useEffect(() => {
    if (!url) {
      setImage(null)
      return
    }

    let cancelled = false
    const nextImage = new Image()
    nextImage.decoding = 'async'
    nextImage.onload = () => {
      if (!cancelled) {
        setImage(nextImage)
        setImageLoadState('ready')
      }
    }
    nextImage.onerror = () => {
      if (!cancelled) {
        setImage(null)
        setImageLoadState('error')
        setError('The uploaded image could not be rendered.')
      }
    }
    setImageLoadState('decoding')
    nextImage.src = url

    return () => {
      cancelled = true
    }
  }, [setError, setImageLoadState, url])

  return image
}
