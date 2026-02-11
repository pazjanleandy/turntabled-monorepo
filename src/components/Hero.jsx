import { useEffect, useMemo, useState } from "react";

const heroImages = ["/hero/hero1.jpg", "/hero/hero2.jpg", "/hero/hero3.jpg"];

export default function Hero({
  showActions = true,
  className = "",
  actions = null,
}) {
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.floor(Math.random() * heroImages.length)
  );
  const [isLoggingOpen, setIsLoggingOpen] = useState(false);

  const orderedImages = useMemo(() => heroImages, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % orderedImages.length);
    }, 5200);
    return () => clearInterval(interval);
  }, [orderedImages.length]);

  useEffect(() => {
    if (!isLoggingOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isLoggingOpen]);

  return (
    <>
      <header className={`relative ${className}`}>
        {/* Background stack */}
        <div className="absolute inset-0 overflow-hidden">
          {orderedImages.map((src, index) => (
            <img
              key={src}
              src={src}
              alt="Turntabled hero"
              className={`absolute inset-0 h-full w-full object-cover object-[center_78%] transition-opacity duration-1000 ${
                index === activeIndex ? "opacity-100" : "opacity-0"
              }`}
              loading={index === activeIndex ? "eager" : "lazy"}
            />
          ))}

          {/* darken for text */}
          <div className="absolute inset-0 bg-black/45" />

          {/* your existing “bleed” layer if you’re using it in CSS */}
          <div className="hero-bleed pointer-events-none absolute inset-0" />

          {/* smooth fade to page background at bottom */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[var(--bg)]" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex h-full flex-col items-center justify-end px-6 pb-12 text-center text-white md:pb-16">
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

          {actions ? (
            <div className="flex flex-wrap justify-center gap-2">{actions}</div>
          ) : showActions ? (
            <div className="flex flex-wrap justify-center gap-2">
              <button className="btn-primary" onClick={() => setIsLoggingOpen(true)}>
                Start logging
              </button>
              <button className="rounded-soft bg-white/80 px-4 py-2 text-sm font-semibold text-text shadow-subtle transition hover:-translate-y-0.5 hover:bg-white">
                Browse trending
              </button>
            </div>
          ) : null}
        </div>
      </header>

      {/* Modal */}
      {showActions && !actions && isLoggingOpen ? (
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
  );
}
