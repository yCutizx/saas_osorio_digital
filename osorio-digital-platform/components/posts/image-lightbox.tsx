'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

interface ImageLightboxProps {
  url: string
  alt: string
  type: 'image' | 'video'
  onClose: () => void
}

export function ImageLightbox({ url, alt, type, onClose }: ImageLightboxProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar"
        className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors"
      >
        <X className="h-5 w-5" />
      </button>

      <div
        className="relative max-w-full max-h-full"
        onClick={(e) => e.stopPropagation()}
      >
        {type === 'image' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={alt}
            className="max-w-[95vw] max-h-[90vh] w-auto h-auto object-contain rounded-lg"
          />
        ) : (
          <video
            src={url}
            controls
            autoPlay
            className="max-w-[95vw] max-h-[90vh] w-auto h-auto rounded-lg bg-black"
          >
            <track kind="captions" />
          </video>
        )}
      </div>
    </div>
  )
}
