import { useEffect, useMemo, useState } from 'react'

const heroImages = ['/hero/hero1.jpg', '/hero/hero2.jpg', '/hero/hero3.jpg']

export default function Hero() {
  const [activeIndex, setActiveIndex] = useState(
    () => Math.floor(Math.random() * heroImages.length),
  )

  const orderedImages = useMemo(() => heroImages, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % orderedImages.length)
    }, 5200)
    return () => clearInterval(interval)
  }, [orderedImages.length])

  return (
    <header className="space-y-6">
      <div className="relative">
        <div className="hero-fade pointer-events-none absolute inset-0 z-5 bg-black/45"></div>
        <div className="hero-bleed pointer-events-none absolute inset-0 z-10"></div>
        <div className="hero-fade relative h-[300px] md:h-[400px]">
          {orderedImages.map((src, index) => (
            <img
              key={src}
              src={src}
              alt="Turntabled hero"
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
                index === activeIndex ? 'opacity-100' : 'opacity-0'
              }`}
              loading={index === activeIndex ? 'eager' : 'lazy'}
            />
          ))}
        </div>
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-end px-6 pb-10 text-center text-white md:pb-14">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/80">
            Track your music journey
          </p>
          <h1 className="mb-3 max-w-3xl text-3xl text-white md:text-5xl">
            Log albums, share moments, build a backlog.
          </h1>
          <p className="mx-auto mb-5 max-w-2xl text-sm text-white/80 md:text-base">
            Keep a personal record of every album you spin, surface favorites, and follow
            what your friends are listening to.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button className="btn-primary">Start logging</button>
            <button className="rounded-soft bg-white/80 px-4 py-2 text-sm font-semibold text-text shadow-subtle transition hover:-translate-y-0.5 hover:bg-white">
              Browse trending
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
