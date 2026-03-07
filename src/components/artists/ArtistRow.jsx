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

export default function ArtistRow({ artist, className = '' }) {
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
        'group flex w-full items-center gap-3 rounded-xl border border-black/5 bg-white/75 px-3 py-2.5 shadow-[0_10px_24px_-18px_rgba(15,15,15,0.35)] transition duration-200 hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
        className,
      ].join(' ')}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/10 bg-accent/15 text-xs font-semibold text-accent">
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
        <p className="mb-0.5 truncate text-sm font-semibold text-text">{artist?.name || 'Unknown Artist'}</p>
        <p className="mb-0 truncate text-xs text-muted">{subtitle}</p>
      </div>

      {albumCount > 0 ? (
        <span className="shrink-0 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.18em] text-muted/80">
          {albumCount} logged
        </span>
      ) : null}
    </Link>
  )
}

