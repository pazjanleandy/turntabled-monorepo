export default function LastFmRecentTracks({
  username,
  tracks,
  isLoading,
  error,
  asCard = true,
}) {
  if (!username) return null

  const sectionClass = asCard
    ? 'card vinyl-texture border border-black/5 shadow-sm'
    : 'space-y-4'

  const rowClass = asCard
    ? 'flex items-center justify-between gap-3 rounded-2xl border border-black/5 bg-white/80 px-3 py-2.5 shadow-none'
    : 'flex items-center justify-between gap-3 rounded-xl border border-black/5 bg-white/35 px-3 py-2.5'

  return (
    <section className={sectionClass}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            Last.fm
          </p>
          <h2 className="mb-0 text-lg text-text">Recent tracks</h2>
        </div>
        <span className="rounded-full border border-black/10 bg-white/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 shadow-sm">
          {isLoading ? 'Loading' : 'Live'}
        </span>
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {!error && isLoading ? (
        <p className="mt-4 text-sm text-slate-600">Fetching recent listens...</p>
      ) : null}

      {!error && !isLoading && tracks.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">No recent tracks yet.</p>
      ) : null}

      <div className="mt-4 space-y-3">
        {tracks.map((track, index) => (
          <div
            key={`${track.name}-${track.artist}-${index}`}
            className={rowClass}
          >
            <div className="min-w-0">
              <p className="mb-0 truncate text-sm font-semibold text-text">
                {track.name}
              </p>
              <p className="mb-0 truncate text-[11px] text-slate-600">
                {track.artist}
                {track.album ? ` - ${track.album}` : ''}
              </p>
            </div>
            {track.nowPlaying ? (
              <span className="rounded-full bg-accent/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
                Now playing
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  )
}
