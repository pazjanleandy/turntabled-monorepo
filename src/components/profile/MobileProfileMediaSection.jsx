import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, MusicNotes } from 'phosphor-react'
import CoverImage from '../CoverImage.jsx'

const VIEW_IDS = ['saved', 'logs', 'tracks']
const BACKLOG_STATUS_VALUES = new Set(['backloggd'])

function getMetaText(text = '') {
  const normalized = String(text ?? '').trim()
  return normalized || 'Unknown'
}

function getNormalizedBacklogStatus(item) {
  const rawStatus = String(item?.statusRaw ?? '').trim().toLowerCase()
  if (rawStatus) return rawStatus
  return String(item?.status ?? '').trim().toLowerCase()
}

export default function MobileProfileMediaSection({
  backlogItems = [],
  isBacklogLoading = false,
  latestLogs = [],
  tracks = [],
  isTracksLoading = false,
  tracksError = '',
  hasLastFmConnection = false,
}) {
  const [viewIndex, setViewIndex] = useState(0)
  const activeView = VIEW_IDS[viewIndex] ?? VIEW_IDS[0]
  const backlogStatusItems = useMemo(
    () =>
      (Array.isArray(backlogItems) ? backlogItems : []).filter((item) => {
        const normalizedStatus = getNormalizedBacklogStatus(item)
        return BACKLOG_STATUS_VALUES.has(normalizedStatus)
      }),
    [backlogItems],
  )

  const viewHeader = useMemo(() => {
    if (activeView === 'saved') {
      return {
        title: 'Backlog',
        actionLabel: 'Open',
        actionHref: '/backlog',
        badgeLabel: '',
      }
    }
    if (activeView === 'logs') {
      return {
        title: 'Latest logs',
        actionLabel: 'View all',
        actionHref: '/activity?filter=added-latest',
        badgeLabel: '',
      }
    }

    return {
      title: 'Recent tracks',
      actionLabel: '',
      actionHref: '',
      badgeLabel: isTracksLoading ? 'Loading' : 'Live',
    }
  }, [activeView, isTracksLoading])

  const goToPreviousView = () => {
    setViewIndex((prev) => (prev === 0 ? VIEW_IDS.length - 1 : prev - 1))
  }

  const goToNextView = () => {
    setViewIndex((prev) => (prev === VIEW_IDS.length - 1 ? 0 : prev + 1))
  }

  const renderBacklogRows = () => {
    if (isBacklogLoading) {
      return (
        <li className="px-0 py-3 text-[13px] text-muted">
          Loading backlog...
        </li>
      )
    }

    if (backlogStatusItems.length === 0) {
      return (
        <li className="px-0 py-3 text-[13px] text-muted">
          No backlog albums yet.
        </li>
      )
    }

    return backlogStatusItems.map((item) => (
      <li key={item.id} className="flex items-center gap-2.5 py-2.5">
        <div className="h-10 w-10 shrink-0 overflow-hidden border border-black/10 bg-black/5">
          <CoverImage
            src={item.coverArtUrl || '/album/am.jpg'}
            alt={`${item.albumTitleRaw} by ${item.artistNameRaw} cover`}
            className="h-full w-full"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="mb-0 truncate text-[13px] font-semibold text-text">{item.albumTitleRaw}</p>
          <p className="mb-0 truncate text-[11px] text-muted">{getMetaText(item.artistNameRaw)}</p>
        </div>
      </li>
    ))
  }

  const renderLatestLogRows = () => {
    if (!Array.isArray(latestLogs) || latestLogs.length === 0) {
      return (
        <li className="px-0 py-3 text-[13px] text-muted">
          No recent logs yet.
        </li>
      )
    }

    return latestLogs.map((entry, index) => (
      <li key={`${entry.title}-${entry.artist}-${index}`} className="flex items-center gap-2.5 py-2.5">
        <div className="h-10 w-10 shrink-0 overflow-hidden border border-black/10 bg-black/5">
          <CoverImage
            src={entry.cover || '/album/am.jpg'}
            alt={`${entry.title} by ${entry.artist} cover`}
            className="h-full w-full"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="mb-0 truncate text-[13px] font-semibold text-text">{entry.title}</p>
          <p className="mb-0 truncate text-[11px] text-muted">{getMetaText(entry.artist)}</p>
        </div>
        <div className="ml-2 flex shrink-0 flex-col items-end gap-0.5 text-right">
          <span className="text-[11px] font-semibold text-accent">{entry.rating ?? '0.0'}/5</span>
          <span className="text-[10px] text-muted">{entry.timeAgo ?? ''}</span>
        </div>
      </li>
    ))
  }

  const renderTrackRows = () => {
    if (tracksError) {
      return (
        <li className="px-0 py-3 text-[13px] text-red-700">
          {tracksError}
        </li>
      )
    }

    if (isTracksLoading) {
      return (
        <li className="px-0 py-3 text-[13px] text-muted">
          Fetching recent listens...
        </li>
      )
    }

    if (!hasLastFmConnection) {
      return (
        <li className="px-0 py-3 text-[13px] text-muted">
          Connect Last.fm in Edit profile to view recent tracks.
        </li>
      )
    }

    if (!Array.isArray(tracks) || tracks.length === 0) {
      return (
        <li className="px-0 py-3 text-[13px] text-muted">
          No recent tracks yet.
        </li>
      )
    }

    return tracks.map((track, index) => (
      <li key={`${track.name}-${track.artist}-${index}`} className="flex items-center gap-2.5 py-2.5">
        <div className="h-10 w-10 shrink-0 overflow-hidden border border-black/10 bg-black/5">
          {track.coverArt ? (
            <CoverImage
              src={track.coverArt}
              alt={`${track.name} cover`}
              className="h-full w-full"
            />
          ) : (
            <span className="inline-flex h-full w-full items-center justify-center text-muted">
              <MusicNotes size={14} weight="bold" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="mb-0 truncate text-[13px] font-semibold text-text">{track.name}</p>
          <p className="mb-0 truncate text-[11px] text-muted">
            {getMetaText(track.artist)}
            {track.album ? ` - ${track.album}` : ''}
          </p>
        </div>
        {track.nowPlaying ? (
          <span className="ml-2 shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-accent">
            Now
          </span>
        ) : null}
      </li>
    ))
  }

  const rows = activeView === 'saved'
    ? renderBacklogRows()
    : activeView === 'logs'
      ? renderLatestLogRows()
      : renderTrackRows()

  return (
    <section className="border-y border-black/10 py-2 md:hidden">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="mb-0 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Library</p>
          <div className="mt-0.5 flex items-center gap-2">
            <h3 className="mb-0 truncate text-base text-text">{viewHeader.title}</h3>
            {activeView === 'tracks' ? (
              <span className="px-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">
                {viewHeader.badgeLabel}
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-0.5 flex items-center gap-1">
          {viewHeader.actionHref && viewHeader.actionLabel ? (
            <Link
              to={viewHeader.actionHref}
              className="inline-flex h-7 items-center px-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-text transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
            >
              {viewHeader.actionLabel}
            </Link>
          ) : null}
          <button
            type="button"
            className="!m-0 inline-flex h-7 w-7 items-center justify-center !rounded-none !border-0 !bg-transparent !p-0 !shadow-none text-text !transition-none hover:text-accent hover:!bg-transparent hover:!shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
            onClick={goToPreviousView}
            aria-label="Show previous list"
          >
            <ArrowLeft size={15} weight="bold" className="block" />
          </button>
          <button
            type="button"
            className="!m-0 inline-flex h-7 w-7 items-center justify-center !rounded-none !border-0 !bg-transparent !p-0 !shadow-none text-text !transition-none hover:text-accent hover:!bg-transparent hover:!shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
            onClick={goToNextView}
            aria-label="Show next list"
          >
            <ArrowRight size={15} weight="bold" className="block" />
          </button>
        </div>
      </div>

      <div className="mt-1.5 px-0">
        <ul className="divide-y divide-black/10">
          {rows}
        </ul>
      </div>
    </section>
  )
}
