export default function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-black/5 bg-white/60 px-3 py-1 text-xs font-semibold text-text shadow-[0_6px_14px_-12px_rgba(15,15,15,0.35)]">
      {children}
    </span>
  )
}
