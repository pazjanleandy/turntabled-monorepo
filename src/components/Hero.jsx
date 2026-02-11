import { useEffect, useMemo, useState } from 'react'

const heroImages = ['/hero/hero1.jpg', '/hero/hero2.jpg', '/hero/hero3.jpg']

export default function Hero() {
  const [activeIndex, setActiveIndex] = useState(
    () => Math.floor(Math.random() * heroImages.length),
  )
  const [isLoggingOpen, setIsLoggingOpen] = useState(false)

  const orderedImages = useMemo(() => heroImages, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % orderedImages.length)
    }, 5200)
    return () => clearInterval(interval)
  }, [orderedImages.length])

  useEffect(() => {
    if (!isLoggingOpen) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isLoggingOpen])

  return (
    <>
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
              Keep a personal record of every album you spin, surface favorites, and
              follow what your friends are listening to.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <button className="btn-primary" onClick={() => setIsLoggingOpen(true)}>
                Start logging
              </button>
              <button className="rounded-soft bg-white/80 px-4 py-2 text-sm font-semibold text-text shadow-subtle transition hover:-translate-y-0.5 hover:bg-white">
                Browse trending
              </button>
            </div>
          </div>
        </div>
      </header>

      {isLoggingOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setIsLoggingOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-black/5 bg-white p-5 shadow-[0_24px_50px_-30px_rgba(15,15,15,0.55)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
                  Start logging
                </p>
                <h2 className="mb-0 text-lg text-text">Find an album</h2>
              </div>
              <button
                className="rounded-full border border-black/10 px-2 py-1 text-xs font-semibold text-muted transition hover:text-text"
                onClick={() => setIsLoggingOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="mt-4">
              <input
                type="text"
                placeholder="Search by album or artist"
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-2 text-sm text-text shadow-[0_10px_20px_-18px_rgba(15,15,15,0.35)] outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
              />
              <p className="mt-2 text-xs text-muted">
                Mini search placeholder. Results will show here.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
