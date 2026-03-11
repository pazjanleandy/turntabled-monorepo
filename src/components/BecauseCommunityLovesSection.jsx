import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, TrendUp } from 'phosphor-react'
import CoverImage from './CoverImage.jsx'
import { fetchPublishedLists } from '../lib/listsClient.js'

const DESKTOP_SUPPORTING_LIMIT = 4

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

function getListCovers(item, count) {
  const albums = Array.isArray(item?.albums) ? item.albums : []
  return albums.slice(0, count).map((album) => album?.cover ?? null)
}

function listHref(item) {
  return `/lists?list=${encodeURIComponent(String(item?.id ?? ''))}`
}

function CreatorRow({ creator }) {
  const username = typeof creator?.username === 'string' && creator.username.trim()
    ? creator.username.trim()
    : 'unknown'
  const avatarUrl = typeof creator?.avatarUrl === 'string' ? creator.avatarUrl.trim() : ''
  const initials = username.slice(0, 2).toUpperCase() || 'U'

  return (
    <div className="inline-flex min-w-0 items-center gap-2">
      <span className="relative inline-flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-orange-500/20 bg-accent/15 text-[10px] font-bold uppercase text-accent">
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
      <span className="truncate text-[12px] font-semibold text-text">@{username}</span>
    </div>
  )
}

function ListMeta({ item, className = '' }) {
  const albumCount = Math.max(0, Number(item?.albumCount ?? item?.albums?.length ?? 0))
  const favorites = Math.max(0, Number(item?.favoriteCount ?? 0))
  const comments = Math.max(0, Number(item?.commentCount ?? 0))

  return (
    <div className={`flex flex-wrap items-center gap-2 text-[11px] text-muted ${className}`.trim()}>
      <span>{statNumber(albumCount)} albums</span>
      {favorites > 0 ? (
        <>
          <span className="inline-flex h-1 w-1 rounded-full bg-black/25" aria-hidden="true" />
          <span>{statNumber(favorites)} favorites</span>
        </>
      ) : null}
      {comments > 0 ? (
        <>
          <span className="inline-flex h-1 w-1 rounded-full bg-black/25" aria-hidden="true" />
          <span>{statNumber(comments)} comments</span>
        </>
      ) : null}
    </div>
  )
}

function FeaturedCollage({ item }) {
  const covers = getListCovers(item, 4)
  const emptySlots = Math.max(0, 4 - covers.length)
  const offsets = ['translate-y-0.5', 'translate-y-1.5', 'translate-y-1', 'translate-y-2']

  return (
    <div className="grid grid-cols-2 gap-2.5 border border-black/10 bg-black/[0.03] p-2.5">
      {covers.map((src, index) => (
        <div
          key={`featured-cover-${item?.id}-${index}`}
          className={`h-[4.5rem] w-[4.5rem] overflow-hidden border border-black/10 bg-black/5 shadow-subtle xl:h-[4.75rem] xl:w-[4.75rem] ${offsets[index % offsets.length]}`}
        >
          <CoverImage src={src} alt={`${item?.title ?? 'List'} album cover`} className="h-full w-full" />
        </div>
      ))}
      {Array.from({ length: emptySlots }).map((_, index) => (
        <div
          key={`featured-empty-${item?.id}-${index}`}
          className="h-[4.5rem] w-[4.5rem] border border-dashed border-black/10 bg-black/[0.03] xl:h-[4.75rem] xl:w-[4.75rem]"
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

function SupportingCollage({ item }) {
  const covers = getListCovers(item, 2)
  const emptySlots = Math.max(0, 2 - covers.length)

  return (
    <div className="hidden items-center gap-2 lg:flex">
      {covers.map((src, index) => (
        <div
          key={`support-cover-${item?.id}-${index}`}
          className="h-11 w-11 overflow-hidden border border-black/10 bg-black/5 xl:h-12 xl:w-12"
        >
          <CoverImage src={src} alt={`${item?.title ?? 'List'} album cover`} className="h-full w-full" />
        </div>
      ))}
      {Array.from({ length: emptySlots }).map((_, index) => (
        <div
          key={`support-empty-${item?.id}-${index}`}
          className="h-11 w-11 border border-dashed border-black/10 bg-black/[0.03] xl:h-12 xl:w-12"
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

function MobileListCard({ item, featured = false }) {
  const primaryCover = getListCovers(item, 1)[0]
  const secondaryCover = getListCovers(item, 2)[1]

  return (
    <article className={`w-full shrink-0 snap-center rounded-lg border border-black/5 bg-white/45 p-3 ${featured ? '' : ''}`}>
      <div className="relative overflow-hidden rounded-md border border-black/5 bg-black/5">
        <div className="aspect-[4/3] w-full">
          {primaryCover ? (
            <CoverImage src={primaryCover} alt={`${item.title} cover`} className="h-full w-full" />
          ) : (
            <div className="h-full w-full border border-dashed border-black/10 bg-black/[0.03]" />
          )}
        </div>
        {secondaryCover ? (
          <div className="absolute bottom-2 right-2 h-12 w-12 overflow-hidden rounded border border-black/10 bg-black/5 shadow-sm">
            <CoverImage src={secondaryCover} alt={`${item.title} extra cover`} className="h-full w-full" />
          </div>
        ) : null}
      </div>
      <div className="mt-2 space-y-1.5">
        <span className="text-[9px] font-medium uppercase tracking-[0.12em] text-muted">
          {formatRelativeDate(item.publishedAt ?? item.createdAt)}
        </span>
        <h4 className="mb-0 text-[16px] leading-tight text-text">{item.title}</h4>
        <p className="mb-0 overflow-hidden text-[12px] leading-relaxed text-muted [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
          {item.description || 'No description yet.'}
        </p>
        <CreatorRow creator={item.creator} />
        <div className="flex items-center justify-between gap-3">
          <ListMeta item={item} />
          <Link
            to={listHref(item)}
            className="inline-flex items-center gap-1 text-[10.5px] font-semibold tracking-[0.08em] text-accent transition hover:text-[#ef6b2f]"
          >
            Open list
            <ArrowRight size={11} weight="bold" />
          </Link>
        </div>
      </div>
    </article>
  )
}

function DesktopFeaturedList({ item }) {
  return (
    <article className="relative h-full border-r border-black/10 pr-6 xl:pr-7">
      <div className="pointer-events-none absolute -right-5 -top-5 h-52 w-52 rounded-full bg-[radial-gradient(circle,rgba(247,121,62,0.2),transparent_62%)]" />
      <div className="relative grid h-full grid-cols-[minmax(0,1fr)_11.5rem] items-start gap-6 xl:grid-cols-[minmax(0,1fr)_12.5rem]">
        <div className="flex h-full min-h-[16rem] flex-col justify-between gap-3.5">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex rounded-[3px] border border-black/10 bg-black/[0.03] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.08em] text-muted">
                Featured list
              </span>
              <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-accent">
                {formatRelativeDate(item.publishedAt ?? item.createdAt)}
              </span>
            </div>
            <h3 className="mb-0 text-[2.05rem] leading-[0.97] text-text">{item.title}</h3>
            <p className="mb-0 max-w-[66ch] text-[15px] leading-relaxed text-text">
              {item.description || 'No description yet.'}
            </p>
            <CreatorRow creator={item.creator} />
          </div>
          <div className="space-y-1.5 pt-2">
            <ListMeta item={item} className="text-[11.5px]" />
            <Link
              to={listHref(item)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold tracking-[0.08em] text-accent transition hover:text-[#ef6b2f]"
            >
              Open list
              <ArrowRight size={12} weight="bold" />
            </Link>
          </div>
        </div>

        <div className="hidden lg:flex lg:self-start lg:justify-self-end">
          <FeaturedCollage item={item} />
        </div>
      </div>
    </article>
  )
}

function DesktopSupportingList({ item }) {
  return (
    <article className="grid grid-cols-[1fr_auto] items-start gap-4 py-1.5">
      <div className="min-w-0 space-y-1.5">
        <div className="flex items-center gap-2">
          <h4 className="mb-0 truncate text-[16px] font-semibold leading-tight text-text">{item.title}</h4>
          <span className="inline-flex rounded-[3px] border border-black/10 bg-black/[0.03] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.08em] text-muted">
            {formatRelativeDate(item.publishedAt ?? item.createdAt)}
          </span>
        </div>
        <p className="mb-0 overflow-hidden text-[12px] leading-relaxed text-muted [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
          {item.description || 'No description yet.'}
        </p>
        <CreatorRow creator={item.creator} />
        <div className="flex items-center justify-between gap-2">
          <ListMeta item={item} />
          <Link
            to={listHref(item)}
            className="inline-flex items-center gap-1 text-[10.5px] font-semibold tracking-[0.08em] text-accent transition hover:text-[#ef6b2f]"
          >
            Open list
            <ArrowRight size={11} weight="bold" />
          </Link>
        </div>
      </div>

      <SupportingCollage item={item} />
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
  const supporting = rankedLists.slice(1)
  const desktopSupporting = supporting.slice(0, DESKTOP_SUPPORTING_LIMIT)

  return (
    <section className="space-y-2.5 sm:space-y-4">
      <div className="flex items-center justify-between gap-2 sm:items-end sm:gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-4">
        <div className="min-w-0 lg:pr-4">
          <p className="mb-0 text-[9px] font-semibold uppercase tracking-[0.2em] text-muted sm:text-[10px]">
            Discovery
          </p>
          <h2 className="mb-0 mt-1 text-[1.35rem] leading-tight text-text sm:text-[1.65rem]">
            Most loved lists right now
          </h2>
          <p className="mb-0 mt-1 max-w-2xl text-[12px] leading-relaxed text-muted sm:mt-1.5 sm:text-sm">
            Real community lists ranked by favorites and comments from published list activity.
          </p>
        </div>
        <Link
          to="/lists"
          className="shrink-0 pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-text transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 sm:text-[11px] lg:self-end lg:pb-1 lg:pt-0"
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
          <div className="overflow-hidden lg:hidden">
            <div className="flex snap-x snap-mandatory gap-0 overflow-x-auto px-4 pb-1 pt-1 scrollbar-sleek sm:px-6">
              <MobileListCard item={featured} featured />
              {supporting.map((item) => (
                <MobileListCard key={item.id} item={item} />
              ))}
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="rounded-2xl border border-black/10 bg-card px-5 py-4 xl:px-6">
              <div className="grid grid-cols-[1.62fr_1.08fr] items-stretch gap-6 xl:grid-cols-[1.66fr_1.14fr]">
                <DesktopFeaturedList item={featured} />
                <div className="flex h-full flex-col justify-center divide-y divide-black/10">
                  {desktopSupporting.map((item) => (
                    <DesktopSupportingList key={item.id} item={item} />
                  ))}
                  {desktopSupporting.length === 0 ? (
                    <div className="py-4 text-sm text-muted">No supporting lists yet.</div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex lg:items-center lg:gap-2 lg:text-[11px] lg:text-muted">
            <TrendUp size={12} className="text-accent" />
            Ranking uses real favorites and comments from published community lists.
          </div>
        </>
      )}
    </section>
  )
}
