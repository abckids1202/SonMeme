import { useEffect, useState } from 'react'
import { useEditorStore } from '../../stores/editorStore'

export function useKonvaImage(url: string | null, reportState = false) {
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
        if (reportState) setImageLoadState('ready')
      }
    }
    nextImage.onerror = () => {
      if (!cancelled) {
        setImage(null)
        if (reportState) {
          setImageLoadState('error')
          setError('The uploaded image could not be rendered.')
        }
      }
    }
    if (reportState) setImageLoadState('decoding')
    nextImage.src = url

    return () => {
      cancelled = true
    }
  }, [reportState, setError, setImageLoadState, url])

  return image
}
