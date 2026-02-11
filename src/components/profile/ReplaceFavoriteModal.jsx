export default function ReplaceFavoriteModal({ index, onClose }) {
  if (index === null || index === undefined) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-black/5 bg-white p-5 shadow-[0_24px_50px_-30px_rgba(15,15,15,0.55)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
              Replace favorite
            </p>
            <h2 className="mb-0 text-lg text-text">Search for an album</h2>
          </div>
          <button
            className="rounded-full border border-black/10 px-2 py-1 text-xs font-semibold text-muted transition hover:text-text"
            onClick={onClose}
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
            Mini search placeholder. Choose a result to replace favorite #{index + 1}.
          </p>
        </div>
      </div>
    </div>
  )
}
