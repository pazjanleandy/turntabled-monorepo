import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, TrendUp } from 'phosphor-react'
import CoverImage from './CoverImage.jsx'
import { fetchPublishedLists } from '../lib/listsClient.js'

const SUPPORTING_LIMIT = 2
const HERO_COVER_LIMIT = 5
const SUPPORTING_COVER_LIMIT = 4

function statNumber(value) {
  return new Intl.NumberFormat('en-US').format(Math.max(0, Number(value) || 0))
}

function toTimestamp(value) {
  const parsed = Date.parse(value ?? '')
  return Number.isNaN(parsed) ? 0 : parsed
}

function formatRelativeDate(value) {
  const timestamp = toTimestamp(value)
  if (!timestamp) return 'Recently published'

  const now = Date.now()
  const diffMs = Math.max(0, now - timestamp)
  const dayMs = 24 * 60 * 60 * 1000
  const weekMs = 7 * dayMs
  const monthMs = 30 * dayMs

  if (diffMs < dayMs) return 'Today'
  if (diffMs < weekMs) return `${Math.floor(diffMs / dayMs)}d ago`
  if (diffMs < monthMs) return `${Math.floor(diffMs / weekMs)}w ago`
  return new Date(timestamp).toLocaleDateString()
}

function interactionCount(item) {
  const favorites = Number(item?.favoriteCount ?? 0)
  const comments = Number(item?.commentCount ?? 0)
  return Math.max(0, favorites) + Math.max(0, comments)
}

function normalizeLists(payload) {
  const rows = []
  const seen = new Set()
  const featuredRows = Array.isArray(payload?.featured) ? payload.featured : []
  const itemRows = Array.isArray(payload?.items) ? payload.items : []

  for (const entry of [...featuredRows, ...itemRows]) {
    if (!entry?.id) continue
    if (seen.has(entry.id)) continue
    seen.add(entry.id)
    rows.push(entry)
  }

  return rows
}

function rankLists(rows = []) {
  return [...rows].sort((a, b) => {
    const interactionDiff = interactionCount(b) - interactionCount(a)
    if (interactionDiff !== 0) return interactionDiff

    const favoriteDiff = Number(b?.favoriteCount ?? 0) - Number(a?.favoriteCount ?? 0)
    if (favoriteDiff !== 0) return favoriteDiff

    const commentDiff = Number(b?.commentCount ?? 0) - Number(a?.commentCount ?? 0)
    if (commentDiff !== 0) return commentDiff

    const publishedDiff =
      toTimestamp(b?.publishedAt ?? b?.createdAt) - toTimestamp(a?.publishedAt ?? a?.createdAt)
    if (publishedDiff !== 0) return publishedDiff

    return String(a?.title ?? '').localeCompare(String(b?.title ?? ''))
  })
}

function listHref(item) {
  return `/lists?list=${encodeURIComponent(String(item?.id ?? ''))}`
}

function creatorHandle(creator) {
  return typeof creator?.username === 'string' && creator.username.trim()
    ? creator.username.trim()
    : 'unknown'
}

function listConcept(item, moodIndex = 0) {
  const description = typeof item?.description === 'string' ? item.description.trim() : ''
  if (description) return description

  const fallbacks = [
    'A personality-led sequence of records designed to be played as one mood.',
    'Built around a clear tone and listening narrative from start to finish.',
    'A taste map for listeners chasing a specific atmosphere right now.',
  ]

  return fallbacks[moodIndex % fallbacks.length]
}

function clampText(value, maxLength = 120) {
  const text = String(value ?? '').trim()
  if (!text) return ''
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1).trimEnd()}...`
}

function getListCovers(item, count) {
  const albums = Array.isArray(item?.albums) ? item.albums : []
  return albums.slice(0, count).map((album) => album?.cover ?? null)
}

function CreatorIdentity({ creator, muted = false }) {
  const username = creatorHandle(creator)
  const avatarUrl = typeof creator?.avatarUrl === 'string' ? creator.avatarUrl.trim() : ''
  const initials = username.slice(0, 2).toUpperCase() || 'U'

  return (
    <div className="inline-flex min-w-0 items-center gap-2">
      <span className="relative inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-orange-500/20 bg-accent/15 text-[10px] font-bold uppercase text-accent">
        <span aria-hidden="true">{initials}</span>
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={`${username} avatar`}
            className="absolute inset-0 h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.style.display = 'none'
            }}
          />
        ) : null}
      </span>
      <span className={`truncate text-[12px] font-semibold ${muted ? 'text-muted' : 'text-text'}`}>
        @{username}
      </span>
    </div>
  )
}

function ListMeta({ item, compact = false, className = '' }) {
  const albumCount = Math.max(0, Number(item?.albumCount ?? item?.albums?.length ?? 0))
  const favorites = Math.max(0, Number(item?.favoriteCount ?? 0))
  const comments = Math.max(0, Number(item?.commentCount ?? 0))

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${compact ? 'text-[10px]' : 'text-[11px]'} text-muted ${className}`.trim()}
    >
      <span>{statNumber(albumCount)} albums</span>
      <span className="inline-flex h-1 w-1 rounded-full bg-black/25" aria-hidden="true" />
      <span>{statNumber(favorites)} favorites</span>
      <span className="inline-flex h-1 w-1 rounded-full bg-black/25" aria-hidden="true" />
      <span>{statNumber(comments)} comments</span>
    </div>
  )
}

function CollageSlot({ cover, alt, className = '' }) {
  return (
    <div className={`overflow-hidden border border-black/10 bg-black/[0.03] ${className}`}>
      {cover ? (
        <CoverImage src={cover} alt={alt} className="h-full w-full" />
      ) : (
        <div className="h-full w-full border border-dashed border-black/10 bg-black/[0.03]" />
      )}
    </div>
  )
}

function HeroCollage({ item }) {
  const covers = getListCovers(item, HERO_COVER_LIMIT)

  return (
    <div className="relative w-full">
      <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-2">
        <CollageSlot
          cover={covers[0] ?? null}
          alt={`${item?.title ?? 'List'} hero cover`}
          className="h-[11.5rem] shadow-[0_16px_28px_-22px_rgba(15,23,42,0.7)] sm:h-[12.75rem]"
        />

        <div className="grid grid-rows-[1fr_auto] gap-2">
          <CollageSlot
            cover={covers[1] ?? null}
            alt={`${item?.title ?? 'List'} supporting cover`}
            className="h-[6.8rem] translate-y-0.5 sm:h-[7.5rem]"
          />
          <div className="grid grid-cols-2 gap-2.5">
            <CollageSlot
              cover={covers[2] ?? null}
              alt={`${item?.title ?? 'List'} supporting cover`}
              className="h-[3.7rem] sm:h-[4rem]"
            />
            <CollageSlot
              cover={covers[3] ?? null}
              alt={`${item?.title ?? 'List'} supporting cover`}
              className="h-[4rem] translate-y-0.5 sm:h-[4rem]"
            />
          </div>
        </div>
      </div>

      {covers[4] ? (
        <div className="absolute -bottom-2 left-3 h-12 w-12 overflow-hidden border border-black/14 bg-white/90 shadow-[0_14px_24px_-22px_rgba(15,23,42,0.7)] sm:-bottom-3 sm:left-4 sm:h-14 sm:w-14">
          <CoverImage src={covers[4]} alt={`${item?.title ?? 'List'} extra cover`} className="h-full w-full" />
        </div>
      ) : null}
    </div>
  )
}

function SupportingCollage({ item }) {
  const covers = getListCovers(item, SUPPORTING_COVER_LIMIT)
  const offsets = ['translate-y-0', 'translate-y-1', 'translate-y-0', 'translate-y-1']

  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: SUPPORTING_COVER_LIMIT }).map((_, index) => (
        <div
          key={`${item?.id ?? 'list'}-support-cover-${index}`}
          className={`h-10 w-10 overflow-hidden border border-black/10 bg-black/[0.03] sm:h-11 sm:w-11 ${offsets[index]}`}
        >
          {covers[index] ? (
            <CoverImage
              src={covers[index]}
              alt={`${item?.title ?? 'List'} cover ${index + 1}`}
              className="h-full w-full"
            />
          ) : (
            <div className="h-full w-full border border-dashed border-black/10 bg-black/[0.03]" />
          )}
        </div>
      ))}
    </div>
  )
}

function HeroListShowcase({ item }) {
  const concept = clampText(listConcept(item, 0), 190)

  return (
    <article className="relative overflow-hidden border border-black/10 bg-white/60 p-4 shadow-[0_20px_34px_-30px_rgba(15,23,42,0.62)] sm:p-5 lg:p-6">
      <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(247,121,62,0.2),transparent_68%)]" />
      <div className="relative grid gap-5 xl:grid-cols-[minmax(0,1fr)_16rem] xl:items-start">
        <div className="space-y-3.5">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted/90">
              Featured list
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
              {formatRelativeDate(item?.publishedAt ?? item?.createdAt)}
            </span>
          </div>

          <h3 className="mb-0 text-[1.86rem] leading-[0.95] text-text sm:text-[2.15rem]">
            {item?.title || 'Untitled list'}
          </h3>

          <CreatorIdentity creator={item?.creator} />

          <p className="mb-0 max-w-[62ch] text-[14px] leading-7 text-text/88">{concept}</p>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            <ListMeta item={item} className="text-[10.5px]" />
            <Link
              to={listHref(item)}
              className="inline-flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-accent transition hover:text-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
            >
              Open list
              <ArrowRight size={11} weight="bold" />
            </Link>
          </div>
        </div>

        <div className="pt-3 xl:justify-self-end xl:pt-1">
          <HeroCollage item={item} />
        </div>
      </div>
    </article>
  )
}

function SupportingListShowcase({ item, index }) {
  const concept = clampText(listConcept(item, index + 1), 110)

  return (
    <article className="relative overflow-hidden border border-black/10 bg-white/60 p-3.5 sm:p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(130%_88%_at_100%_0%,rgba(247,121,62,0.09),transparent_70%)]" />
      <div className="relative grid gap-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted/90">
            Mood pick
          </span>
          <span className="text-[10px] text-muted">{formatRelativeDate(item?.publishedAt ?? item?.createdAt)}</span>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <div className="min-w-0 space-y-2">
            <h4 className="mb-0 overflow-hidden text-[1.05rem] leading-tight text-text [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
              {item?.title || 'Untitled list'}
            </h4>
            <CreatorIdentity creator={item?.creator} muted />
            <p className="mb-0 overflow-hidden text-[12px] leading-relaxed text-muted [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
              {concept}
            </p>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
              <ListMeta item={item} compact />
              <Link
                to={listHref(item)}
                className="inline-flex w-fit items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-text transition hover:text-accent"
              >
                Open list
                <ArrowRight size={11} weight="bold" />
              </Link>
            </div>
          </div>

          <div className="justify-self-start sm:justify-self-end">
            <SupportingCollage item={item} />
          </div>
        </div>
      </div>
    </article>
  )
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-black/10 bg-card px-5 py-6 text-center">
      <p className="mb-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
        Community-curated picks
      </p>
      <h3 className="mb-0 mt-2 text-[1.45rem] leading-tight text-text">No lists yet</h3>
      <p className="mb-0 mt-2 text-sm leading-relaxed text-muted">
        Publish the first community list and start discovery for everyone.
      </p>
      <Link
        to="/lists"
        className="mt-4 inline-flex items-center gap-1 rounded-lg border border-orange-500/35 bg-accent px-3 py-2 text-[12px] font-semibold text-[#1f130c] transition hover:bg-[#ef6b2f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
      >
        Publish first list
        <ArrowRight size={12} weight="bold" />
      </Link>
    </div>
  )
}

export default function BecauseCommunityLovesSection() {
  const [lists, setLists] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadLists() {
      setIsLoading(true)
      setError('')

      try {
        const payload = await fetchPublishedLists({
          sort: 'trending',
          page: 1,
          limit: 50,
        })
        if (cancelled) return
        setLists(normalizeLists(payload))
      } catch (loadError) {
        if (cancelled) return
        setLists([])
        setError(loadError?.message ?? 'Unable to load community lists.')
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadLists()

    return () => {
      cancelled = true
    }
  }, [])

  const rankedLists = useMemo(() => rankLists(lists), [lists])
  const featured = rankedLists[0] ?? null
  const supporting = rankedLists.slice(1, 1 + SUPPORTING_LIMIT)

  return (
    <section className="space-y-3 sm:space-y-4 lg:space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-0 text-[9px] font-semibold uppercase tracking-[0.2em] text-muted sm:text-[10px]">
            Discovery showcase
          </p>
          <h2 className="mb-0 mt-1 text-[1.34rem] leading-tight text-text sm:text-[1.72rem]">
            Most loved lists right now
          </h2>
          <p className="mb-0 mt-1.5 max-w-2xl text-[12px] leading-relaxed text-muted sm:text-sm">
            Community-made list worlds with distinct moods, sequencing, and perspective.
          </p>
        </div>
        <Link
          to="/lists"
          className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-text transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 sm:text-[11px]"
        >
          View all
        </Link>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-black/10 bg-card px-5 py-6 text-sm text-muted">
          Loading community lists...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-black/10 bg-card px-5 py-6 text-sm text-red-700">
          {error}
        </div>
      ) : !featured ? (
        <EmptyState />
      ) : (
        <>
          <div className="card vinyl-texture !rounded-none p-4 sm:p-5 lg:p-6">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] xl:items-start">
              <HeroListShowcase item={featured} />

              <div className="space-y-3 border-t border-black/8 pt-4 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
                {supporting.map((item, index) => (
                  <SupportingListShowcase key={item.id} item={item} index={index} />
                ))}
                {supporting.length === 0 ? (
                  <div className="border border-black/10 bg-white/60 px-4 py-4 text-sm text-muted">
                    No supporting list picks yet.
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="hidden items-center gap-2 text-[11px] text-muted lg:flex">
            <TrendUp size={12} className="text-accent" />
            Ranked by real favorites and comments from published community lists.
          </div>
        </>
      )}
    </section>
  )
}
