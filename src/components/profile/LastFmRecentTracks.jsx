export default function LastFmRecentTracks({
  username,
  tracks,
  isLoading,
  error,
}) {
  if (!username) return null;

  return (
    <section className="card vinyl-texture">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
            Last.fm
          </p>
          <h2 className="mb-0 text-xl">Recent tracks</h2>
        </div>
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-text">
          {isLoading ? "Loading" : "Live"}
        </span>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      ) : null}

      {!error && isLoading ? (
        <p className="mt-4 text-sm text-muted">Fetching recent listens...</p>
      ) : null}

      {!error && !isLoading && tracks.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No recent tracks yet.</p>
      ) : null}

      <div className="mt-4 space-y-3">
        {tracks.map((track, index) => (
          <div
            key={`${track.name}-${track.artist}-${index}`}
            className="flex items-center justify-between gap-3 rounded-2xl border border-black/5 bg-white/60 px-3 py-2 shadow-[0_10px_20px_-18px_rgba(15,15,15,0.35)]"
          >
            <div className="min-w-0">
              <p className="mb-0 truncate text-sm font-semibold text-text">
                {track.name}
              </p>
              <p className="mb-0 truncate text-[11px] text-muted">
                {track.artist}
                {track.album ? ` - ${track.album}` : ""}
              </p>
            </div>
            {track.nowPlaying ? (
              <span className="rounded-full bg-accent/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
                Now playing
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
