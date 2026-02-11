import { ArrowLeft } from 'phosphor-react'
import { useNavigate } from 'react-router-dom'

export default function BackButton({ className = '' }) {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className={`inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-text shadow-[0_10px_20px_-16px_rgba(15,15,15,0.35)] transition hover:-translate-y-0.5 hover:bg-white ${className}`}
      aria-label="Go back"
    >
      <ArrowLeft size={14} weight="bold" />
      Back
    </button>
  )
}
