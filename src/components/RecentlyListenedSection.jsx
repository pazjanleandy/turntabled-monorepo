import { useEffect, useMemo, useState } from 'react'
import { Eye, Heart, Star, Headphones } from 'phosphor-react'
import StarRating from './StarRating.jsx'
import CoverImage from './CoverImage.jsx'

function AlbumTile({ album, artist, cover, listens, saves, ratings, onRate, ratingValue }) {
  return (
    <div className="group w-full snap-start space-y-3">
      <div className="overflow-hidden rounded-soft bg-white/85 shadow-subtle transition group-hover:-translate-y-1 group-hover:shadow-lg">
        <CoverImage
          src={cover}
          alt={`${album} cover`}
          className="h-[160px] w-[160px] object-cover md:h-[176px] md:w-[176px]"
        />
      </div>
      <div className="space-y-1">
        <p className="mb-0 text-sm font-semibold text-text">{album}</p>
        <p className="mb-0 text-xs text-muted">{artist}</p>
        <div className="flex items-center gap-3 text-[0.65rem] text-muted">
          <span className="flex items-center gap-1">
            <Eye size={12} />
            {listens}
          </span>
          <span className="flex items-center gap-1">
            <Heart size={12} />
            {saves}
          </span>
          <span className="flex items-center gap-1">
            <Star size={12} />
            {ratings}
          </span>
        </div>
        <StarRating
          value={ratingValue ?? 0}
          onChange={onRate}
          step={0.5}
          size={16}
          className="pt-1"
        />
      </div>
    </div>
  )
}

export default function RecentlyListenedSection({ albums }) {
  const [covers, setCovers] = useState({})
  const [ratingMap, setRatingMap] = useState(() =>
    Object.fromEntries(
      albums.map((item) => [`${item.artist} - ${item.album}`, item.rating ?? 0]),
    ),
  )
  const visibleAlbums = useMemo(() => albums.slice(0, 6), [albums])

  const albumKeys = useMemo(
    () => albums.map((item) => `${item.artist} - ${item.album}`),
    [albums],
  )

  useEffect(() => {
    let cancelled = false
    async function loadArtwork() {
      const entries = await Promise.all(
        albums.map(async (item) => {
          const key = `${item.artist} - ${item.album}`
          const term = encodeURIComponent(`${item.artist} ${item.album}`)
          try {
            const response = await fetch(
              `https://itunes.apple.com/search?term=${term}&entity=album&limit=1`,
            )
            if (!response.ok) return null
            const data = await response.json()
            const artwork = data?.results?.[0]?.artworkUrl100
            if (!artwork) return null
            const highRes = artwork.replace('100x100bb', '600x600bb')
            return [key, highRes]
          } catch {
            return null
          }
        }),
      )

      if (!cancelled) {
        const next = Object.fromEntries(entries.filter(Boolean))
        setCovers(next)
      }
    }

    loadArtwork()
    return () => {
      cancelled = true
    }
  }, [albumKeys, albums])

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Headphones size={18} weight="bold" className="text-accent" />
          <h2 className="mb-0 text-lg uppercase tracking-[0.2em] text-muted">
            Recently listened
          </h2>
        </div>
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-text">
          Today
        </span>
      </div>

      <div className="overflow-hidden">
        <div className="scrollbar-sleek grid auto-cols-[160px] grid-flow-col gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 md:auto-cols-[176px]">
          {visibleAlbums.map((album) => {
            const key = `${album.artist} - ${album.album}`
            return (
              <AlbumTile
                key={key}
                {...album}
                cover={covers[key] ?? album.cover}
                ratingValue={ratingMap[key]}
                onRate={(next) =>
                  setRatingMap((prev) => ({
                    ...prev,
                    [key]: next,
                  }))
                }
              />
            )
          })}
        </div>
      </div>
    </section>
  )
}
