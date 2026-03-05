import { Link } from 'react-router-dom'
import AlbumCover from '../album/AlbumCover.jsx'

export default function ExploreAlbumTile({ album }) {
  const albumId = album?.id
  const title = album?.title ?? 'Unknown Album'
  const artist = album?.artist ?? 'Unknown Artist'

  return (
    <article className="space-y-1.5">
      <div className="group relative">
        <Link
          to={`/album/${albumId}`}
          aria-label={`${title} by ${artist}`}
          title={`${title} by ${artist}`}
          className="block overflow-hidden border border-black/10 bg-black/5 shadow-subtle transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_-22px_rgba(15,15,15,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
        >
          <AlbumCover
            src={album?.cover}
            alt={`${title} by ${artist} cover`}
            className="w-full transition duration-300 group-hover:scale-[1.02] group-focus-visible:scale-[1.02]"
          />
        </Link>
      </div>
    </article>
  )
}
