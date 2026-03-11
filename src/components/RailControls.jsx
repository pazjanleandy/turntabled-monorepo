import { CaretLeft, CaretRight } from 'phosphor-react'

export default function RailControls({
  countLabel = '',
  onPrev,
  onNext,
  canScrollPrev = false,
  canScrollNext = false,
}) {
  return (
    <div className="hidden lg:inline-flex items-center gap-2">
      {countLabel ? (
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
          {countLabel}
        </span>
      ) : null}
      <div className="inline-flex items-center border border-black/8 bg-white/62">
        <button
          type="button"
          onClick={onPrev}
          disabled={!canScrollPrev}
          aria-label="Scroll rail backward"
          className="!m-0 inline-flex h-7 w-7 items-center justify-center !rounded-none !border-0 !bg-transparent !p-0 text-text !shadow-none transition hover:text-accent hover:!bg-black/5 hover:!shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-default disabled:opacity-35 disabled:hover:text-text disabled:hover:!bg-transparent"
        >
          <CaretLeft size={14} weight="bold" />
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canScrollNext}
          aria-label="Scroll rail forward"
          className="!m-0 inline-flex h-7 w-7 items-center justify-center border-l border-black/8 !rounded-none !border-y-0 !border-r-0 !bg-transparent !p-0 text-text !shadow-none transition hover:text-accent hover:!bg-black/5 hover:!shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-default disabled:opacity-35 disabled:hover:text-text disabled:hover:!bg-transparent"
        >
          <CaretRight size={14} weight="bold" />
        </button>
      </div>
    </div>
  )
}
