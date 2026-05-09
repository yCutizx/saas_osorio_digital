import { useRef, useCallback, useState } from 'react'

export function useDragToScroll() {
  const containerRef     = useRef<HTMLDivElement>(null)
  const isScrolling      = useRef(false)
  const startX           = useRef(0)
  const startScrollLeft  = useRef(0)
  const [grabbing, setGrabbing] = useState(false)

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const el = e.target as HTMLElement
    if (
      el.closest('button, a, input, textarea, select, [data-no-scroll-drag]') ||
      el.closest('[aria-roledescription="sortable"]')
    ) return
    isScrolling.current   = true
    setGrabbing(true)
    startX.current        = e.clientX
    startScrollLeft.current = containerRef.current?.scrollLeft ?? 0
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isScrolling.current || !containerRef.current) return
    e.preventDefault()
    containerRef.current.scrollLeft = startScrollLeft.current - (e.clientX - startX.current)
  }, [])

  const stop = useCallback(() => {
    isScrolling.current = false
    setGrabbing(false)
  }, [])

  return {
    containerRef,
    grabbing,
    stop,
    scrollHandlers: {
      onMouseDown,
      onMouseMove,
      onMouseUp:    stop,
      onMouseLeave: stop,
    },
  }
}
