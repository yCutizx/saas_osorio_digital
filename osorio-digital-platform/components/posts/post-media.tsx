'use client'

import { useState } from 'react'
import { Maximize2, ExternalLink } from 'lucide-react'
import { ImageLightbox } from './image-lightbox'

interface PostMediaProps {
  url: string
  alt: string
}

export function PostMedia({ url, alt }: PostMediaProps) {
  const [open, setOpen] = useState(false)

  const isImg = /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url)
  const isVid = /\.(mp4|mov|webm|ogg)(\?|$)/i.test(url)

  if (!isImg && !isVid) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm text-[#EACE00] hover:text-[#EACE00]/80 transition-colors"
      >
        <ExternalLink className="h-4 w-4" />
        Ver arquivo de mídia
      </a>
    )
  }

  const mediaType: 'image' | 'video' = isImg ? 'image' : 'video'

  if (isVid) {
    return (
      <video
        src={url}
        controls
        className="w-full h-auto max-h-[70vh] rounded-xl border border-[#222] bg-black"
      >
        <track kind="captions" />
      </video>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative w-full rounded-xl border border-[#222] overflow-hidden bg-[#0A0A0A] cursor-zoom-in flex items-center justify-center"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={alt}
          className="w-full h-auto max-h-[70vh] object-contain"
        />
        <div className="absolute top-3 right-3 h-9 w-9 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Maximize2 className="h-4 w-4 text-white" />
        </div>
      </button>

      {open && (
        <ImageLightbox
          url={url}
          alt={alt}
          type={mediaType}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
