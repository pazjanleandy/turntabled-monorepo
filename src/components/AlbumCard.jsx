import { Badge } from './Card.jsx'
import CoverImage from './CoverImage.jsx'

export function AlbumCover({ title, tone, cover, size = 'md' }) {
  const sizeClass = size === 'sm' ? 'h-14 w-14' : 'h-24 w-24'
  const tileStyles =
    size === 'tile' ? 'w-full' : sizeClass
  const tileRatio = size === 'tile' ? { aspectRatio: '1 / 1' } : undefined
  if (cover) {
    return (
      <CoverImage
        src={cover}
        alt={`${title} cover`}
        className={`shrink-0 rounded-soft object-cover shadow-subtle ${tileStyles}`}
        style={tileRatio}
      />
    )
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-soft ${tileStyles}`}
      style={{
        ...tileRatio,
        background: `linear-gradient(135deg, hsl(${tone} / 0.25), hsl(${tone} / 0.75))`,
        color: 'rgba(15, 23, 42, 0.82)',
        fontWeight: 600,
      }}
    >
      {title
        .split(' ')
        .slice(0, 2)
        .map((word) => word[0])
        .join('')}
    </div>
  )
}

export function AlbumCard({ album, artist, year, tone, cover }) {
  return (
    <article className="rounded-soft bg-white/85 p-3 shadow-subtle transition hover:-translate-y-0.5 hover:bg-white">
      <div className="space-y-3">
        <AlbumCover title={album} tone={tone} cover={cover} size="tile" />
        <div>
          <p className="mb-0 text-sm font-semibold text-text">{album}</p>
          <p className="mb-0 text-xs text-muted">{artist}</p>
          <p className="mb-0 text-xs text-muted">{year}</p>
        </div>
      </div>
    </article>
  )
}

export function CompactAlbumRow({ album, artist, tone, meta, cover }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-soft bg-white/80 px-3 py-2 shadow-subtle">
      <div className="flex items-center gap-3">
        <AlbumCover title={album} tone={tone} cover={cover} size="md" />
        <div>
          <p className="mb-0 text-sm font-semibold text-text">{album}</p>
          <p className="mb-0 text-xs text-muted">{artist}</p>
        </div>
      </div>
      <Badge className="text-muted">{meta}</Badge>
    </div>
  )
}
