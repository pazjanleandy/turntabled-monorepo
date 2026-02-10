import { useEffect, useMemo, useState } from 'react'
import { Eye, Heart, Star, TrendUp, MagnifyingGlass } from 'phosphor-react'
import CoverImage from './CoverImage.jsx'

function AlbumTile({ album, artist, cover, listens, saves, ratings }) {
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
      </div>
    </div>
  )
}

export default function PopularAlbumsSection({ albums, search, onSearchChange }) {
  const [covers, setCovers] = useState({})

  const albumKeys = useMemo(
    () => albums.map((item) => `${item.artist} - ${item.album}`),
    [albums],
  )
  const visibleAlbums = useMemo(() => albums.slice(0, 6), [albums])

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
          <TrendUp size={18} weight="bold" className="text-accent" />
          <h2 className="mb-0 text-lg uppercase tracking-[0.2em] text-muted">
            Popular albums this week
          </h2>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted">
          <div className="hidden items-center gap-2 rounded-full bg-white/80 px-3 py-1 shadow-subtle md:flex">
            <MagnifyingGlass size={12} />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Artist or album"
              className="w-28 bg-transparent text-xs text-text placeholder:text-muted focus:outline-none"
            />
          </div>
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-text">More</span>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs text-muted shadow-subtle md:hidden">
        <MagnifyingGlass size={12} />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Artist or album"
          className="w-full bg-transparent text-xs text-text placeholder:text-muted focus:outline-none"
        />
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
              />
            )
          })}
        </div>
      </div>
    </section>
  )
}
