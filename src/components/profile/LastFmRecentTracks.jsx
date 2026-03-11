export default function LastFmRecentTracks({
  username,
  tracks,
  isLoading,
  error,
  asCard = true,
  compactMobile = false,
}) {
  if (!username) return null

  const sectionClass = asCard
    ? 'card vinyl-texture border border-black/5 shadow-sm'
    : compactMobile
      ? 'space-y-3 md:space-y-4'
      : 'space-y-4'

  const rowClass = asCard
    ? 'flex items-center justify-between gap-3 rounded-2xl border border-black/5 bg-white/80 px-3 py-2.5 shadow-none'
    : compactMobile
      ? 'flex items-center justify-between gap-2.5 rounded-lg border border-black/8 bg-white/28 px-2.5 py-2 md:gap-3 md:rounded-xl md:border-[var(--border)] md:bg-[var(--surface-2)] md:px-3 md:py-2.5'
      : 'flex items-center justify-between gap-3 rounded-xl border border-black/5 bg-white/35 px-3 py-2.5'

  return (
    <section className={sectionClass}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={compactMobile ? 'mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted md:text-[11px] md:tracking-[0.18em]' : 'mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted'}>
            Last.fm
          </p>
          <h2 className={compactMobile ? 'mb-0 text-base text-text md:text-lg' : 'mb-0 text-lg text-text'}>
            Recent tracks
          </h2>
        </div>
        <span className={compactMobile ? 'rounded-full border border-black/10 bg-white/70 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-600 shadow-none md:border-[var(--border)] md:bg-[var(--surface-3)] md:px-2 md:py-1 md:text-[10px] md:tracking-[0.12em] md:shadow-sm' : 'rounded-full border border-black/10 bg-white/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 shadow-sm'}>
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

      <div className={compactMobile ? 'mt-3 space-y-2 md:mt-4 md:space-y-3' : 'mt-4 space-y-3'}>
        {tracks.map((track, index) => (
          <div
            key={`${track.name}-${track.artist}-${index}`}
            className={rowClass}
          >
            <div className="min-w-0">
              <p className={compactMobile ? 'mb-0 truncate text-[13px] font-semibold text-text md:text-sm' : 'mb-0 truncate text-sm font-semibold text-text'}>
                {track.name}
              </p>
              <p className={compactMobile ? 'mb-0 truncate text-[10px] text-slate-600 md:text-[11px]' : 'mb-0 truncate text-[11px] text-slate-600'}>
                {track.artist}
                {track.album ? ` - ${track.album}` : ''}
              </p>
            </div>
            {track.nowPlaying ? (
              <span className={compactMobile ? 'rounded-full bg-accent/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-accent md:px-2 md:py-1 md:text-[10px] md:tracking-[0.18em]' : 'rounded-full bg-accent/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent'}>
                Now playing
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  )
}
