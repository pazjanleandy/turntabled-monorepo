import { MagnifyingGlass, TrendUp } from 'phosphor-react'
import { AlbumCard } from './AlbumCard.jsx'

export default function TrendingSection({ albums, search, onSearchChange }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendUp size={18} weight="bold" className="text-accent" />
          <h2 className="mb-0 text-lg">Trending albums</h2>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs text-muted shadow-subtle">
          <MagnifyingGlass size={14} />
          <span>Search</span>
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Artist or album"
            className="w-28 bg-transparent text-xs text-text placeholder:text-muted focus:outline-none"
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {albums.map((album) => (
          <AlbumCard key={`${album.artist}-${album.album}`} {...album} />
        ))}
      </div>
    </section>
  )
}
