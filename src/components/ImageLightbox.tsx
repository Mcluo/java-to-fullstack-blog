'use client'

import { useState, useEffect, useCallback } from 'react'

/**
 * 全局图片预览组件：监听 article 内所有 img 的点击事件，弹出 lightbox。
 * 不侵入 ReactMarkdown 渲染，避免 hydration mismatch。
 */
export default function ImageLightbox() {
  const [src, setSrc] = useState<string | null>(null)
  const [alt, setAlt] = useState('')

  const close = useCallback(() => setSrc(null), [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'IMG' && target.closest('#article-content')) {
        const img = target as HTMLImageElement
        if (img.src) {
          setSrc(img.src)
          setAlt(img.alt || '')
        }
      }
    }

    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  useEffect(() => {
    if (!src) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [src, close])

  // Add zoom-in cursor to all article images
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = '#article-content img { cursor: zoom-in; }'
    document.head.appendChild(style)
    return () => { document.head.removeChild(style) }
  }, [])

  if (!src) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={close}
    >
      <button
        onClick={close}
        className="absolute top-4 right-4 text-white/80 hover:text-white transition z-10"
        aria-label="Close"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      {alt && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm max-w-lg text-center">
          {alt}
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}
