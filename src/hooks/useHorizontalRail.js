import { useEffect, useRef, useState } from 'react'

export default function useHorizontalRail(itemCount = 0) {
  const railRef = useRef(null)
  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)

  useEffect(() => {
    const rail = railRef.current
    if (!rail) return undefined

    const updateScrollState = () => {
      const maxScrollLeft = Math.max(0, rail.scrollWidth - rail.clientWidth)
      setCanScrollPrev(rail.scrollLeft > 8)
      setCanScrollNext(maxScrollLeft - rail.scrollLeft > 8)
    }

    const frameId = window.requestAnimationFrame(updateScrollState)
    rail.addEventListener('scroll', updateScrollState, { passive: true })
    window.addEventListener('resize', updateScrollState)

    return () => {
      window.cancelAnimationFrame(frameId)
      rail.removeEventListener('scroll', updateScrollState)
      window.removeEventListener('resize', updateScrollState)
    }
  }, [itemCount])

  const scrollByPage = (direction) => {
    const rail = railRef.current
    if (!rail) return
    const distance = Math.max(rail.clientWidth * 0.78, 220) * direction
    rail.scrollBy({ left: distance, behavior: 'smooth' })
  }

  return {
    railRef,
    canScrollPrev,
    canScrollNext,
    scrollByPage,
  }
}
