import { X } from 'phosphor-react'
import CoverImage from '../CoverImage.jsx'

export default function EditProfileModal({
  isOpen,
  user,
  favorites,
  favoriteCovers,
  onClose,
  onReplaceFavorite,
}) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-black/5 bg-white p-6 shadow-[0_28px_60px_-34px_rgba(15,15,15,0.55)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
              Edit profile
            </p>
            <h2 className="mb-0 text-xl text-text">Update your details</h2>
          </div>
          <button
            className="rounded-full border border-black/10 p-2 text-muted transition hover:text-text"
            onClick={onClose}
            aria-label="Close edit profile"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4">
          <label className="space-y-2 text-sm font-semibold text-text">
            Change name
            <input
              type="text"
              defaultValue={user.name}
              className="w-full rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium text-text shadow-[0_10px_20px_-18px_rgba(15,15,15,0.35)] outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
            />
          </label>

          <label className="space-y-2 text-sm font-semibold text-text">
            Change bio
            <textarea
              defaultValue={user.bio}
              rows={3}
              className="w-full resize-none rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium text-text shadow-[0_10px_20px_-18px_rgba(15,15,15,0.35)] outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
            />
          </label>

          <label className="space-y-2 text-sm font-semibold text-text">
            Change image
            <input
              type="file"
              accept="image/*"
              className="w-full rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium text-text shadow-[0_10px_20px_-18px_rgba(15,15,15,0.35)] outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
            />
          </label>

          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="mb-0 text-sm font-semibold text-text">
                Favorite albums (replace)
              </p>
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                {favorites.length} slots
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {favorites.map((album, index) => {
                const key = `${album.artist} - ${album.title}`
                return (
                  <div
                    key={key}
                    className="flex flex-col items-center gap-2 rounded-2xl border border-black/5 bg-white/70 p-3 text-center"
                  >
                    <CoverImage
                      src={favoriteCovers[key] ?? album.cover}
                      alt={`${album.title} cover`}
                      className="h-20 w-20 object-cover"
                    />
                    <div className="min-w-0">
                      <p className="mb-0 truncate text-xs font-semibold text-text">
                        {album.title}
                      </p>
                      <p className="mb-0 truncate text-[11px] text-muted">
                        {album.artist}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="rounded-full border border-black/10 bg-white px-3 py-1 text-[11px] font-semibold text-text shadow-[0_10px_20px_-18px_rgba(15,15,15,0.35)] transition hover:-translate-y-0.5 hover:bg-white"
                      onClick={() => onReplaceFavorite(index)}
                    >
                      Replace
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-text shadow-[0_10px_20px_-16px_rgba(15,15,15,0.35)] transition hover:-translate-y-0.5 hover:bg-white"
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="btn-primary px-4 py-2 text-sm">Save changes</button>
        </div>
      </div>
    </div>
  )
}
