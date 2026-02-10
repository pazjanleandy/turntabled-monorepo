import { useState } from 'react'
import StarRating from './StarRating.jsx'

export default function AlbumDetails() {
  const [rating, setRating] = useState(0)
  const [note, setNote] = useState('')

  const handleSave = () => {
    // Placeholder save action for routing later.
    console.log('Saved rating', rating, 'note', note)
  }

  return (
    <section className="card space-y-4">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
          Album log
        </p>
        <h2 className="mb-0 text-xl">Album details</h2>
      </div>
      <div className="space-y-2">
        <p className="mb-0 text-sm font-semibold text-text">Rate this album</p>
        <StarRating value={rating} onChange={setRating} step={0.5} size={22} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-text" htmlFor="album-note">
          Quick note
        </label>
        <textarea
          id="album-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          placeholder="Add a quick thought..."
          className="w-full rounded-soft border-0 bg-white/80 px-3 py-2 text-sm text-text shadow-subtle placeholder:text-muted focus:outline-none"
        />
      </div>
      <button className="btn-primary w-full" onClick={handleSave}>
        Save log
      </button>
    </section>
  )
}
