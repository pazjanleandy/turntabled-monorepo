export default function Pill({ children }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white/40 px-3 py-1.5 text-xs text-black/70">
      {children}
    </span>
  )
}
