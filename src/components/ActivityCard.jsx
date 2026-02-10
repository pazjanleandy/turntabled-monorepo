import { AlbumCover } from './AlbumCard.jsx'
import { Badge } from './Card.jsx'

export default function ActivityCard({ user, album, artist, rating, time, tone, cover }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-soft bg-white/80 px-3 py-2 shadow-subtle">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
          {user
            .split(' ')
            .map((part) => part[0])
            .join('')}
        </div>
        <div className="space-y-0.5">
          <p className="mb-0 text-sm font-semibold text-text">
            {user} listened to {album}
          </p>
          <p className="mb-0 text-xs text-muted">{artist}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <AlbumCover title={album} tone={tone} cover={cover} size="md" />
        <Badge className="bg-white/80 text-muted">
          {rating} ★ · {time}
        </Badge>
      </div>
    </div>
  )
}
