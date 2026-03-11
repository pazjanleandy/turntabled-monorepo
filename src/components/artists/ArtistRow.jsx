import { Link } from 'react-router-dom'

function getArtistInitials(name = '') {
  const tokens = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)

  if (!tokens.length) return '?'

  return tokens
    .map((token) => token[0])
    .join('')
    .toUpperCase()
}

function getImageUrl(value = '') {
  const normalized = String(value ?? '').trim()
  if (!normalized) return ''
  return normalized
}

function getArtistSubtitle(artist) {
  if (artist?.disambiguation) return artist.disambiguation
  if (artist?.country) return artist.country
  if (artist?.origin) return artist.origin
  return 'Artist'
}

export default function ArtistRow({ artist, className = '', compact = false }) {
  const albumCount = Number.isFinite(artist?.albumsLogged)
    ? artist.albumsLogged
    : Array.isArray(artist?.notableAlbums)
      ? artist.notableAlbums.length
      : 0
  const subtitle = getArtistSubtitle(artist)
  const imageUrl = getImageUrl(artist?.image_url)

  return (
    <Link
      to={`/artist/${artist.normalized_name ?? artist.id}`}
      className={[
        compact
          ? 'group flex w-full items-center gap-2.5 border-b border-black/10 bg-transparent px-0 py-2.5 shadow-none transition duration-200 hover:bg-black/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 md:gap-3 md:rounded-xl md:border md:border-[var(--border)] md:bg-card md:px-3 md:py-2.5 md:shadow-[0_10px_24px_-18px_rgba(15,15,15,0.35)] md:hover:-translate-y-0.5 md:hover:bg-[var(--surface-3)]'
          : 'group flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-card px-3 py-2.5 shadow-[0_10px_24px_-18px_rgba(15,15,15,0.35)] transition duration-200 hover:-translate-y-0.5 hover:bg-[var(--surface-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
        className,
      ].join(' ')}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/10 bg-accent/15 text-[11px] font-semibold text-accent md:h-10 md:w-10 md:text-xs">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`${artist?.name || 'Artist'} portrait`}
            className="h-full w-full rounded-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          getArtistInitials(artist?.name)
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="mb-0 truncate text-[13px] font-semibold text-text md:mb-0.5 md:text-sm">
          {artist?.name || 'Unknown Artist'}
        </p>
        <p className="mb-0 truncate text-[11px] text-muted md:text-xs">{subtitle}</p>
      </div>

      {albumCount > 0 ? (
        <span className="shrink-0 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.13em] text-muted/80 md:text-[11px] md:tracking-[0.18em]">
          {albumCount} logged
        </span>
      ) : null}
    </Link>
  )
}

