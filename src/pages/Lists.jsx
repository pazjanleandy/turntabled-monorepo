
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowDown,
  ArrowUp,
  ChatCircle,
  Compass,
  Heart,
  ListBullets,
  MagnifyingGlass,
  MusicNotes,
  PencilSimple,
  Plus,
  Trash,
  UserCircle,
  X,
} from 'phosphor-react'
import Navbar from '../components/Navbar.jsx'
import NavbarGuest from '../components/NavbarGuest.jsx'
import CoverImage from '../components/CoverImage.jsx'
import HomeMobileSidebar from '../components/home/HomeMobileSidebar.jsx'
import useAuthStatus from '../hooks/useAuthStatus.js'
import {
  PROFILE_EVENT_NAME,
  emitProfileUpdated,
  fetchCurrentProfile,
  readCachedProfile,
} from '../lib/profileClient.js'
import {
  addCommunityListComment,
  deleteCommunityList,
  fetchListDetail,
  fetchPublishedLists,
  publishCommunityList,
  searchAlbumsForListBuilder,
  toggleCommunityListFavorite,
  updateCommunityList,
} from '../lib/listsClient.js'

const SORT_OPTIONS = [
  { key: 'trending', label: 'Trending' },
  { key: 'recent', label: 'Recent' },
  { key: 'most-favorited', label: 'Most favorited' },
  { key: 'most-reviewed', label: 'Most reviewed' },
]

const ALBUM_PICKER_PAGE_SIZE = 24

function getInitials(value = '') {
  const parts = String(value ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) return 'U'
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function formatRelativeDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Just published'
  const nowMs = Date.now()
  const diffMs = Math.max(0, nowMs - date.getTime())
  const dayMs = 24 * 60 * 60 * 1000
  const weekMs = 7 * dayMs
  const monthMs = 30 * dayMs
  if (diffMs < dayMs) return 'Today'
  if (diffMs < weekMs) return `${Math.floor(diffMs / dayMs)}d ago`
  if (diffMs < monthMs) return `${Math.floor(diffMs / weekMs)}w ago`
  return date.toLocaleDateString()
}

function patchListCollections(payload, listId, updater) {
  const patchArray = (rows = []) =>
    rows.map((item) => (item.id === listId ? updater(item) : item))

  return {
    ...payload,
    items: patchArray(payload.items),
    featured: patchArray(payload.featured),
  }
}

function removeListFromCollections(payload, listId) {
  const currentItems = Array.isArray(payload?.items) ? payload.items : []
  const currentFeatured = Array.isArray(payload?.featured) ? payload.featured : []
  const currentTags = Array.isArray(payload?.tags) ? payload.tags : []
  const currentTotal = Number(payload?.total ?? 0)

  return {
    ...payload,
    items: currentItems.filter((item) => item?.id !== listId),
    featured: currentFeatured.filter((item) => item?.id !== listId),
    tags: currentTags,
    total: Math.max(0, currentTotal - 1),
  }
}

function findListInPayload(payload, listId) {
  const fromItems = (payload?.items || []).find((item) => item.id === listId)
  if (fromItems) return fromItems
  return (payload?.featured || []).find((item) => item.id === listId) ?? null
}

function AlbumStrip({ albums = [], className = '' }) {
  const covers = albums.slice(0, 4)
  return (
    <div className={`grid grid-cols-4 gap-1 overflow-hidden rounded-md ${className}`}>
      {covers.map((album, index) => (
        <CoverImage
          key={`${album.id}-${index}`}
          src={album.cover}
          alt={`${album.title} by ${album.artist} cover`}
          className="h-full w-full border border-black/8"
        />
      ))}
    </div>
  )
}

function AlbumMosaic({ albums = [], className = '', tileClassName = '' }) {
  const covers = albums.slice(0, 4)
  const emptySlots = Math.max(0, 4 - covers.length)

  return (
    <div className={`grid grid-cols-2 grid-rows-2 gap-1 overflow-hidden rounded-lg bg-black/5 p-1 ${className}`}>
      {covers.map((album, index) => (
        <CoverImage
          key={`${album.id}-${index}`}
          src={album.cover}
          alt={`${album.title} by ${album.artist} cover`}
          className={`h-full w-full border border-black/10 ${tileClassName}`}
        />
      ))}
      {Array.from({ length: emptySlots }).map((_, index) => (
        <div
          key={`empty-slot-${index}`}
          className={`h-full w-full border border-dashed border-black/10 bg-black/4 ${tileClassName}`}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

function CreatorBadge({ creator }) {
  const username = creator?.username || 'Unknown'
  const rawAvatarUrl =
    creator?.avatarUrl || creator?.avatar_url || creator?.avatarPath || creator?.avatar_path || ''
  const avatarUrl = typeof rawAvatarUrl === 'string' ? rawAvatarUrl.trim() : ''
  return (
    <div className="inline-flex min-w-0 items-center gap-2">
      <span className="relative inline-flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-accent/15 text-[10px] font-bold uppercase text-accent">
        <span aria-hidden="true">
          {getInitials(username)}
        </span>
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

function PublishListModal({ isOpen, onClose, onPublish, isPublishing, isSignedIn }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchPage, setSearchPage] = useState(1)
  const [searchTotal, setSearchTotal] = useState(0)
  const [searchRows, setSearchRows] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [selectedAlbums, setSelectedAlbums] = useState([])
  const [formError, setFormError] = useState('')
  const requestSequenceRef = useRef(0)

  const selectedIds = useMemo(
    () => new Set(selectedAlbums.map((item) => item.id)),
    [selectedAlbums],
  )

  const visibleSearchRows = useMemo(
    () => searchRows.filter((item) => !selectedIds.has(item.id)),
    [searchRows, selectedIds],
  )

  const canLoadMore = searchPage * ALBUM_PICKER_PAGE_SIZE < searchTotal

  const loadSearchResults = useCallback(
    async ({ page = 1, append = false } = {}) => {
      const requestSequence = requestSequenceRef.current + 1
      requestSequenceRef.current = requestSequence
      setIsSearching(true)
      if (!append) setSearchError('')

      try {
        const payload = await searchAlbumsForListBuilder({
          query: searchQuery,
          page,
          limit: ALBUM_PICKER_PAGE_SIZE,
        })

        if (requestSequence !== requestSequenceRef.current) return

        const rows = Array.isArray(payload?.items) ? payload.items : []
        setSearchRows((prev) => {
          if (!append) return rows
          const nextById = new Map(prev.map((row) => [row.id, row]))
          for (const row of rows) {
            nextById.set(row.id, row)
          }
          return Array.from(nextById.values())
        })
        setSearchPage(Number(payload?.page ?? page))
        setSearchTotal(Number(payload?.total ?? 0))
      } catch (error) {
        if (requestSequence !== requestSequenceRef.current) return
        setSearchError(error?.message ?? 'Unable to load albums.')
        if (!append) {
          setSearchRows([])
          setSearchPage(1)
          setSearchTotal(0)
        }
      } finally {
        if (requestSequence === requestSequenceRef.current) {
          setIsSearching(false)
        }
      }
    },
    [searchQuery],
  )

  useEffect(() => {
    if (!isOpen) return
    setTitle('')
    setDescription('')
    setTagInput('')
    setSearchQuery('')
    setSearchPage(1)
    setSearchTotal(0)
    setSearchRows([])
    setSelectedAlbums([])
    setSearchError('')
    setFormError('')
    requestSequenceRef.current = 0
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return undefined
    const timeoutId = window.setTimeout(() => {
      loadSearchResults({ page: 1, append: false })
    }, 220)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [isOpen, searchQuery, loadSearchResults])

  if (!isOpen) return null

  const addAlbum = (album) => {
    if (!album?.id || selectedIds.has(album.id)) return
    setSelectedAlbums((prev) => [...prev, album])
  }

  const moveAlbum = (index, direction) => {
    setSelectedAlbums((prev) => {
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= prev.length) return prev
      const copy = [...prev]
      const [moved] = copy.splice(index, 1)
      copy.splice(nextIndex, 0, moved)
      return copy
    })
  }

  const removeAlbum = (id) => {
    setSelectedAlbums((prev) => prev.filter((item) => item.id !== id))
  }

  const handlePublish = async () => {
    if (!isSignedIn) {
      setFormError('Sign in to publish a list.')
      return
    }

    const cleanTitle = title.trim()
    if (!cleanTitle) {
      setFormError('Title is required.')
      return
    }

    if (selectedAlbums.length < 2) {
      setFormError('Add at least two albums.')
      return
    }

    const tags = tagInput
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 8)

    setFormError('')

    try {
      await onPublish({
        title: cleanTitle,
        description: description.trim(),
        tags,
        albumIds: selectedAlbums.map((album) => album.id),
      })
    } catch (error) {
      setFormError(error?.message ?? 'Failed to publish list.')
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end bg-slate-950/55 p-0 md:items-center md:justify-center md:p-6">
      <div className="flex h-[100dvh] w-full max-w-none flex-col overflow-hidden border-x-0 border-b-0 border-t border-black/10 bg-white/95 shadow-2xl backdrop-blur-xl md:h-auto md:max-w-3xl md:rounded-2xl md:border">
        <div className="flex items-start justify-between gap-4 border-b border-black/8 px-4 py-2.5 md:px-5 md:py-3">
          <div>
            <p className="mb-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Create</p>
            <h3 className="mb-0 mt-1 text-xl text-text">Publish list</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-black/10 bg-white text-muted transition hover:text-text md:h-8 md:w-8 md:rounded-full"
            aria-label="Close publish list modal"
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        <div className="scrollbar-sleek flex-1 overflow-y-auto px-4 py-3 md:max-h-[78vh] md:px-5 md:py-4">
          <div className="grid gap-5 md:grid-cols-[1.15fr_0.85fr] md:gap-4">
            <div className="space-y-4 md:space-y-3">
              <div className="space-y-2.5">
                <p className="mb-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted md:hidden">
                  Basic info
                </p>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                    List title
                  </span>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Late night headphones only"
                    className="h-11 w-full rounded-lg border border-black/10 bg-white px-3 text-sm text-text outline-none transition focus:border-accent/55 focus:ring-2 focus:ring-accent/20"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                    Description
                  </span>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={3}
                    placeholder="A short note about the mood, context, or sequencing."
                    className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-text outline-none transition focus:border-accent/55 focus:ring-2 focus:ring-accent/20"
                  />
                </label>
              </div>

              <div className="space-y-2">
                <p className="mb-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted md:hidden">
                  Tags
                </p>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted md:hidden">
                    Add tags
                  </span>
                  <input
                    value={tagInput}
                    onChange={(event) => setTagInput(event.target.value)}
                    placeholder="Dream pop, Starter, Night drive"
                    className="h-11 w-full rounded-lg border border-black/10 bg-white px-3 text-sm text-text outline-none transition focus:border-accent/55 focus:ring-2 focus:ring-accent/20"
                  />
                </label>
              </div>
            </div>

            <div className="space-y-4 md:space-y-3">
              <div className="rounded-lg bg-transparent p-0 md:rounded-lg md:border md:border-black/10 md:bg-white/72 md:p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="mb-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                    Add albums
                  </p>
                  <span className="text-[11px] text-muted">{searchTotal} in catalog</span>
                </div>
                <label className="mb-2 block">
                  <span className="sr-only">Search albums</span>
                  <div className="flex h-10 items-center gap-2 rounded-lg border border-black/10 bg-white px-2.5">
                    <MagnifyingGlass size={13} className="text-muted" />
                    <input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search albums"
                      className="h-full w-full border-0 bg-transparent p-0 text-sm text-text outline-none"
                    />
                  </div>
                </label>

                <div className="scrollbar-sleek max-h-64 overflow-y-auto rounded-lg border border-black/8 bg-white/90 md:max-h-52">
                  {isSearching && searchRows.length === 0 ? (
                    <p className="mb-0 px-3 py-3 text-sm text-muted">Loading albums...</p>
                  ) : visibleSearchRows.length === 0 ? (
                    <p className="mb-0 px-3 py-3 text-sm text-muted">
                      {searchQuery.trim() ? 'No matching albums found.' : 'No albums available in catalog yet.'}
                    </p>
                  ) : (
                    <div className="divide-y divide-black/8">
                      {visibleSearchRows.map((album) => (
                        <div key={album.id} className="flex items-center gap-2.5 px-2 py-1.5 md:px-2.5 md:py-2">
                          <CoverImage
                            src={album.cover}
                            alt={`${album.title} cover`}
                            className="h-10 w-10 border border-black/10"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="mb-0 truncate text-[13px] font-semibold text-text md:text-sm">{album.title}</p>
                            <p className="mb-0 truncate text-[11px] text-muted md:text-xs">{album.artist}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => addAlbum(album)}
                            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-black/10 bg-white px-2.5 text-[11px] font-semibold text-text md:px-2 md:text-xs"
                          >
                            <Plus size={11} weight="bold" />
                            Add
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {searchError ? <p className="mb-0 mt-2 text-xs text-red-700">{searchError}</p> : null}

                {canLoadMore ? (
                  <div className="mt-2 flex justify-center md:justify-start">
                    <button
                      type="button"
                      onClick={() => loadSearchResults({ page: searchPage + 1, append: true })}
                      disabled={isSearching}
                      className="inline-flex h-8 items-center rounded-md border border-black/10 bg-white px-3 text-xs font-semibold text-text disabled:opacity-50"
                    >
                      Load more
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="space-y-2 rounded-lg bg-transparent p-0 md:rounded-lg md:border md:border-black/10 md:bg-white/72 md:p-3">
                <p className="mb-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Cover preview
                </p>
                {selectedAlbums.length === 0 ? (
                  <p className="mb-0 text-xs text-muted">Add albums to generate a collage preview.</p>
                ) : (
                  <AlbumStrip albums={selectedAlbums} className="h-18 md:h-20" />
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2 rounded-lg bg-transparent p-0 md:rounded-lg md:border md:border-black/10 md:bg-white/72 md:p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="mb-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                Tracklist order
              </p>
              <p className="mb-0 text-xs text-muted">{selectedAlbums.length} albums</p>
            </div>
            {selectedAlbums.length === 0 ? (
              <p className="mb-0 text-sm text-muted">No albums added yet.</p>
            ) : (
              <div className="scrollbar-sleek max-h-56 space-y-1.5 overflow-y-auto pr-0.5 md:max-h-none md:overflow-visible md:pr-0">
                {selectedAlbums.map((album, index) => (
                  <div
                    key={album.id}
                    className="flex items-center gap-2 rounded-md border border-black/8 bg-white px-2 py-1.5"
                  >
                    <CoverImage
                      src={album.cover}
                      alt={`${album.title} cover`}
                      className="h-9 w-9 border border-black/10"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="mb-0 truncate text-sm font-semibold text-text">{album.title}</p>
                      <p className="mb-0 truncate text-xs text-muted">{album.artist}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveAlbum(index, -1)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-black/10 bg-white p-0 text-muted"
                        aria-label="Move album up"
                      >
                        <ArrowUp size={12} weight="bold" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveAlbum(index, 1)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-black/10 bg-white p-0 text-muted"
                        aria-label="Move album down"
                      >
                        <ArrowDown size={12} weight="bold" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAlbum(album.id)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-black/10 bg-white p-0 text-muted"
                        aria-label="Remove album"
                      >
                        <X size={12} weight="bold" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {formError ? <p className="mb-0 mt-3 text-sm text-red-700">{formError}</p> : null}
        </div>

        <div className="border-t border-black/8 bg-white/90 px-4 py-2.5 pb-[calc(env(safe-area-inset-bottom)+0.55rem)] backdrop-blur md:flex md:items-center md:justify-end md:gap-2 md:bg-transparent md:px-5 md:py-3 md:pb-3 md:backdrop-blur-0">
          <div className="grid grid-cols-2 gap-2.5 md:flex md:justify-end md:gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold text-text md:w-auto"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={isPublishing}
              className="inline-flex h-10 items-center justify-center gap-1 rounded-lg bg-accent px-3 text-sm font-semibold text-[#1f130c] disabled:opacity-60 md:w-auto"
            >
              <Plus size={14} weight="bold" />
              {isPublishing ? 'Publishing...' : 'Publish list'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ListDetailModal({
  list,
  viewerUserId,
  isOpen,
  isLoading,
  loadError,
  onClose,
  onToggleFavorite,
  onAddComment,
  onUpdateList,
  onDeleteList,
  commentDraft,
  setCommentDraft,
  isFavoriteUpdating = false,
  isCommentSubmitting = false,
  shouldFocusCommentComposer = false,
  onCommentComposerFocused = null,
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [descriptionDraft, setDescriptionDraft] = useState('')
  const [tagsDraft, setTagsDraft] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [actionError, setActionError] = useState('')
  const [editSearchQuery, setEditSearchQuery] = useState('')
  const [editSearchPage, setEditSearchPage] = useState(1)
  const [editSearchTotal, setEditSearchTotal] = useState(0)
  const [editSearchRows, setEditSearchRows] = useState([])
  const [isEditSearching, setIsEditSearching] = useState(false)
  const [editSearchError, setEditSearchError] = useState('')
  const [editAlbums, setEditAlbums] = useState([])
  const editSearchRequestRef = useRef(0)
  const commentInputRef = useRef(null)
  const listTagsString = useMemo(
    () => (Array.isArray(list?.tags) ? list.tags.join(', ') : ''),
    [list?.tags],
  )
  const mappedListAlbums = useMemo(
    () =>
      (list?.albums || []).map((album) => ({
        id: album?.id ?? null,
        title: album?.title ?? 'Unknown Album',
        artist: album?.artist ?? 'Unknown Artist',
        cover: album?.cover ?? null,
        releaseDate: album?.releaseDate ?? null,
      })),
    [list?.albums],
  )
  const editSelectedIds = useMemo(
    () => new Set(editAlbums.map((album) => album?.id).filter(Boolean)),
    [editAlbums],
  )
  const visibleEditSearchRows = useMemo(
    () => editSearchRows.filter((album) => !editSelectedIds.has(album?.id)),
    [editSearchRows, editSelectedIds],
  )
  const canLoadMoreEditSearch = editSearchPage * ALBUM_PICKER_PAGE_SIZE < editSearchTotal
  const displayedAlbums = isEditing ? editAlbums : list?.albums || []
  const canPostComment = commentDraft.trim().length > 0 && !isCommentSubmitting

  useEffect(() => {
    if (!isOpen || !shouldFocusCommentComposer || !commentInputRef.current) return
    const rafId = window.requestAnimationFrame(() => {
      commentInputRef.current?.focus()
      onCommentComposerFocused?.()
    })
    return () => window.cancelAnimationFrame(rafId)
  }, [isOpen, shouldFocusCommentComposer, list?.id, onCommentComposerFocused])

  const loadEditSearchResults = useCallback(
    async ({ page = 1, append = false } = {}) => {
      const requestSequence = editSearchRequestRef.current + 1
      editSearchRequestRef.current = requestSequence
      setIsEditSearching(true)
      if (!append) setEditSearchError('')

      try {
        const payload = await searchAlbumsForListBuilder({
          query: editSearchQuery,
          page,
          limit: ALBUM_PICKER_PAGE_SIZE,
        })

        if (requestSequence !== editSearchRequestRef.current) return

        const rows = Array.isArray(payload?.items) ? payload.items : []
        setEditSearchRows((prev) => {
          if (!append) return rows
          const byId = new Map(prev.map((row) => [row.id, row]))
          for (const row of rows) byId.set(row.id, row)
          return Array.from(byId.values())
        })
        setEditSearchPage(Number(payload?.page ?? page))
        setEditSearchTotal(Number(payload?.total ?? 0))
      } catch (error) {
        if (requestSequence !== editSearchRequestRef.current) return
        setEditSearchError(error?.message ?? 'Unable to load albums.')
        if (!append) {
          setEditSearchRows([])
          setEditSearchPage(1)
          setEditSearchTotal(0)
        }
      } finally {
        if (requestSequence === editSearchRequestRef.current) {
          setIsEditSearching(false)
        }
      }
    },
    [editSearchQuery],
  )

  useEffect(() => {
    if (!isOpen || !list?.id) {
      setIsEditing(false)
      setActionError('')
      return
    }
    setIsEditing(false)
    setTitleDraft(list?.title || '')
    setDescriptionDraft(list?.description || '')
    setTagsDraft(listTagsString)
    setEditAlbums(mappedListAlbums)
    setEditSearchQuery('')
    setEditSearchPage(1)
    setEditSearchTotal(0)
    setEditSearchRows([])
    setEditSearchError('')
    editSearchRequestRef.current = 0
    setActionError('')
  }, [isOpen, list?.id, list?.title, list?.description, listTagsString, mappedListAlbums])

  useEffect(() => {
    if (!isOpen || !isEditing) return undefined
    const timeoutId = window.setTimeout(() => {
      loadEditSearchResults({ page: 1, append: false })
    }, 220)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [isOpen, isEditing, editSearchQuery, loadEditSearchResults])

  const canManageList = Boolean(
    list?.isOwnedByViewer ||
      (viewerUserId &&
        list?.creator?.id &&
        String(list.creator.id) === String(viewerUserId)),
  )

  const startEditing = () => {
    if (!list) return
    setTitleDraft(list?.title || '')
    setDescriptionDraft(list?.description || '')
    setTagsDraft(listTagsString)
    setEditAlbums(mappedListAlbums)
    setEditSearchQuery('')
    setEditSearchPage(1)
    setEditSearchTotal(0)
    setEditSearchRows([])
    setEditSearchError('')
    editSearchRequestRef.current = 0
    setActionError('')
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setActionError('')
    if (!list) return
    setTitleDraft(list?.title || '')
    setDescriptionDraft(list?.description || '')
    setTagsDraft(listTagsString)
    setEditAlbums(mappedListAlbums)
    setEditSearchQuery('')
    setEditSearchPage(1)
    setEditSearchTotal(0)
    setEditSearchRows([])
    setEditSearchError('')
    editSearchRequestRef.current = 0
  }

  const addEditAlbum = (album) => {
    if (!album?.id || editSelectedIds.has(album.id)) return
    setEditAlbums((prev) => [...prev, album])
  }

  const moveEditAlbum = (index, direction) => {
    setEditAlbums((prev) => {
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= prev.length) return prev
      const copy = [...prev]
      const [moved] = copy.splice(index, 1)
      copy.splice(nextIndex, 0, moved)
      return copy
    })
  }

  const removeEditAlbum = (albumId) => {
    setEditAlbums((prev) => prev.filter((album) => album?.id !== albumId))
  }

  const submitEdit = async () => {
    if (!list?.id || !onUpdateList) return
    const cleanTitle = titleDraft.trim()
    if (!cleanTitle) {
      setActionError('Title is required.')
      return
    }

    const normalizedTags = tagsDraft
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 8)

    if (editAlbums.length < 2) {
      setActionError('Add at least two albums.')
      return
    }

    setIsSaving(true)
    setActionError('')

    try {
      await onUpdateList(list.id, {
        title: cleanTitle,
        description: descriptionDraft,
        tags: normalizedTags,
        albumIds: editAlbums.map((album) => album.id).filter(Boolean),
      })
      setIsEditing(false)
    } catch (error) {
      setActionError(error?.message ?? 'Failed to update list.')
    } finally {
      setIsSaving(false)
    }
  }

  const submitDelete = async () => {
    if (!list?.id || !onDeleteList) return
    const shouldDelete = window.confirm(
      'Delete this list? This action cannot be undone.',
    )
    if (!shouldDelete) return

    setIsDeleting(true)
    setActionError('')

    try {
      await onDeleteList(list.id)
    } catch (error) {
      setActionError(error?.message ?? 'Failed to delete list.')
    } finally {
      setIsDeleting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[85] flex items-end bg-slate-950/55 p-0 md:items-center md:justify-center md:p-6">
      <div className="flex h-[100dvh] w-full max-w-none flex-col overflow-hidden border-x-0 border-b-0 border-t border-black/12 bg-white/95 shadow-2xl backdrop-blur-xl md:h-auto md:max-w-4xl md:rounded-3xl md:border">
        <div className="flex items-center justify-between gap-3 border-b border-black/8 px-4 py-2.5 md:px-6 md:py-3">
          <p className="mb-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
            {isEditing ? 'Edit list' : 'List viewer'}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-black/12 bg-white p-0 text-xs font-semibold text-text transition hover:border-black/20 md:h-8 md:w-auto md:gap-1.5 md:px-2.5"
            aria-label="Close list details"
          >
            <span className="text-[13px] font-bold leading-none md:hidden">X</span>
            <X size={13} weight="bold" className="hidden md:inline" />
            <span className="hidden md:inline">Close</span>
          </button>
        </div>

        <div className="scrollbar-sleek flex-1 overflow-y-auto px-4 py-3 md:max-h-[82vh] md:px-6 md:py-5">
          {isLoading && !list ? <p className="mb-0 text-sm text-muted">Loading list details...</p> : null}
          {loadError ? <p className="mb-3 text-sm text-red-700">{loadError}</p> : null}
          {actionError ? <p className="mb-3 text-sm text-red-700">{actionError}</p> : null}
          {!list && !isLoading ? <p className="mb-0 text-sm text-muted">List not found.</p> : null}

          {list ? (
            <div className="space-y-4 md:space-y-6">
              <section className="vinyl-texture overflow-hidden rounded-lg border border-black/8 bg-white/70 p-3.5 md:rounded-2xl md:border-black/10 md:bg-white/75 md:p-5">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px] md:gap-6 lg:grid-cols-[minmax(0,1fr)_236px]">
                  <div className="min-w-0 space-y-2.5 md:space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2.5">
                      <div className="min-w-0">
                        <p className="mb-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">Community list</p>
                        <h3 className="mb-0 mt-1 text-[1.42rem] leading-[1.06] text-text md:text-[2rem]">
                          {list?.title || 'List details'}
                        </h3>
                      </div>
                      {canManageList ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {!isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={startEditing}
                                className="inline-flex h-9 items-center gap-1 rounded-md border border-black/12 bg-white px-2.5 text-xs font-semibold text-text transition hover:border-black/20 md:h-8"
                              >
                                <PencilSimple size={13} />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={submitDelete}
                                disabled={isDeleting}
                                className="inline-flex h-9 items-center gap-1 rounded-md border border-red-300/70 bg-white px-2.5 text-xs font-semibold text-red-700 transition hover:border-red-400 disabled:opacity-60 md:h-8"
                              >
                                <Trash size={13} />
                                {isDeleting ? 'Deleting...' : 'Delete'}
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={cancelEditing}
                                disabled={isSaving}
                                className="hidden h-8 items-center rounded-md border border-black/12 bg-white px-2.5 text-xs font-semibold text-text disabled:opacity-60 md:inline-flex"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={submitEdit}
                                disabled={isSaving}
                                className="hidden h-8 items-center rounded-md bg-accent px-2.5 text-xs font-semibold text-[#1f130c] disabled:opacity-60 md:inline-flex"
                              >
                                {isSaving ? 'Saving...' : 'Save'}
                              </button>
                            </>
                          )}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted md:text-xs">
                      <CreatorBadge creator={list.creator} />
                      <span className="inline-flex h-1 w-1 rounded-full bg-black/18" aria-hidden="true" />
                      <span>{formatRelativeDate(list.publishedAt)}</span>
                    </div>

                    {isEditing ? (
                      <div className="space-y-2 rounded-lg bg-transparent p-0 md:border md:border-black/10 md:bg-white/75 md:p-3">
                        <label className="block">
                          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                            Title
                          </span>
                          <input
                            value={titleDraft}
                            onChange={(event) => setTitleDraft(event.target.value)}
                            className="h-10 w-full rounded-md border border-black/10 bg-white px-3 text-sm text-text outline-none transition focus:border-accent/55 focus:ring-2 focus:ring-accent/20"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                            Description
                          </span>
                          <textarea
                            value={descriptionDraft}
                            onChange={(event) => setDescriptionDraft(event.target.value)}
                            rows={3}
                            className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-text outline-none transition focus:border-accent/55 focus:ring-2 focus:ring-accent/20"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                            Tags
                          </span>
                          <input
                            value={tagsDraft}
                            onChange={(event) => setTagsDraft(event.target.value)}
                            placeholder="Dream pop, Night drive"
                            className="h-10 w-full rounded-md border border-black/10 bg-white px-3 text-sm text-text outline-none transition focus:border-accent/55 focus:ring-2 focus:ring-accent/20"
                          />
                        </label>
                      </div>
                    ) : (
                      <>
                        <p className="mb-0 text-[13px] leading-relaxed text-text md:text-[14px]">
                          {list.description || 'No description provided yet.'}
                        </p>
                        {(list.tags || []).length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {(list.tags || []).map((tag) => (
                              <span
                                key={`${list.id}-tag-${tag}`}
                                className="rounded-sm bg-black/6 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-black/8 pt-2">
                      <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-semibold text-muted">
                        <span>{isEditing ? displayedAlbums.length : list.albumCount ?? list.albums?.length ?? 0} albums</span>
                        <span className="inline-flex h-1 w-1 rounded-full bg-black/20" aria-hidden="true" />
                        <span>{list.favoriteCount ?? 0} favorites</span>
                        <span className="inline-flex h-1 w-1 rounded-full bg-black/20" aria-hidden="true" />
                        <span>{list.commentCount ?? 0} comments</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onToggleFavorite(list.id)}
                        disabled={isFavoriteUpdating}
                        className={[
                          'hidden h-9 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 md:inline-flex md:h-8',
                          list.isFavoritedByViewer
                            ? 'border-accent/45 bg-accent/12 text-accent'
                            : 'border-black/12 bg-white text-text hover:border-black/20',
                        ].join(' ')}
                      >
                        <Heart
                          size={14}
                          weight={list.isFavoritedByViewer ? 'fill' : 'bold'}
                          className={list.isFavoritedByViewer ? 'text-accent' : 'text-text'}
                        />
                        {list.isFavoritedByViewer ? 'Favorited' : 'Favorite'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 md:space-y-2 md:block">
                    <AlbumMosaic
                      albums={displayedAlbums}
                      className="mx-auto h-[156px] w-[156px] gap-1.5 rounded-xl bg-card p-1.5 md:h-[220px] md:w-[220px] lg:h-[236px] lg:w-[236px]"
                      tileClassName="rounded-[4px] border-black/12"
                    />
                    <button
                      type="button"
                      onClick={() => onToggleFavorite(list.id)}
                      disabled={isFavoriteUpdating}
                      className={[
                        'mx-auto inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 md:hidden',
                        list.isFavoritedByViewer
                          ? 'border-accent/45 bg-accent/12 text-accent'
                          : 'border-black/12 bg-white text-text hover:border-black/20',
                      ].join(' ')}
                    >
                      <Heart
                        size={14}
                        weight={list.isFavoritedByViewer ? 'fill' : 'bold'}
                        className={list.isFavoritedByViewer ? 'text-accent' : 'text-text'}
                      />
                      {list.isFavoritedByViewer ? 'Favorited' : 'Favorite'}
                    </button>
                    <p className="mb-0 hidden text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-muted md:block">
                      List collage preview
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-2.5">
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <p className="mb-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Tracklist</p>
                    <h4 className="mb-0 mt-0.5 text-lg text-text">Albums in this list</h4>
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
                    {displayedAlbums.length} ranked picks
                  </span>
                </div>

                {isEditing ? (
                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-3">
                    <div className="rounded-lg bg-transparent p-0 md:border md:border-black/10 md:bg-white/72 md:p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="mb-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                          Add albums
                        </p>
                        <span className="text-[11px] text-muted">{editSearchTotal} in catalog</span>
                      </div>
                      <label className="mb-2 block">
                        <span className="sr-only">Search albums</span>
                        <div className="flex h-10 items-center gap-2 rounded-lg border border-black/10 bg-white px-2.5">
                          <MagnifyingGlass size={13} className="text-muted" />
                          <input
                            value={editSearchQuery}
                            onChange={(event) => setEditSearchQuery(event.target.value)}
                            placeholder="Search albums"
                            className="h-full w-full border-0 bg-transparent p-0 text-sm text-text outline-none"
                          />
                        </div>
                      </label>

                      <div className="scrollbar-sleek max-h-60 overflow-y-auto rounded-lg border border-black/8 bg-white/90 md:max-h-56">
                        {isEditSearching && editSearchRows.length === 0 ? (
                          <p className="mb-0 px-3 py-3 text-sm text-muted">Loading albums...</p>
                        ) : visibleEditSearchRows.length === 0 ? (
                          <p className="mb-0 px-3 py-3 text-sm text-muted">
                            {editSearchQuery.trim() ? 'No matching albums found.' : 'No albums available in catalog yet.'}
                          </p>
                        ) : (
                          <div className="divide-y divide-black/8">
                            {visibleEditSearchRows.map((album) => (
                              <div key={album.id} className="flex items-center gap-2.5 px-2 py-1.5 md:px-2.5 md:py-2">
                                <CoverImage
                                  src={album.cover}
                                  alt={`${album.title} cover`}
                                  className="h-10 w-10 border border-black/10"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="mb-0 truncate text-[13px] font-semibold text-text md:text-sm">{album.title}</p>
                                  <p className="mb-0 truncate text-[11px] text-muted md:text-xs">{album.artist}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => addEditAlbum(album)}
                                  className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-black/10 bg-white px-2.5 text-[11px] font-semibold text-text md:px-2 md:text-xs"
                                >
                                  <Plus size={11} weight="bold" />
                                  Add
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {editSearchError ? <p className="mb-0 mt-2 text-xs text-red-700">{editSearchError}</p> : null}

                      {canLoadMoreEditSearch ? (
                        <div className="mt-2 flex justify-center md:justify-start">
                          <button
                            type="button"
                            onClick={() => loadEditSearchResults({ page: editSearchPage + 1, append: true })}
                            disabled={isEditSearching}
                            className="inline-flex h-8 items-center rounded-md border border-black/10 bg-white px-3 text-xs font-semibold text-text disabled:opacity-50"
                          >
                            Load more
                          </button>
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-lg bg-transparent p-0 md:border md:border-black/10 md:bg-white/72 md:p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="mb-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                          Tracklist order
                        </p>
                        <p className="mb-0 text-xs text-muted">{editAlbums.length} albums</p>
                      </div>
                      {editAlbums.length === 0 ? (
                        <p className="mb-0 text-sm text-muted">No albums added yet.</p>
                      ) : (
                        <div className="scrollbar-sleek max-h-60 space-y-1.5 overflow-y-auto pr-0.5 md:max-h-56">
                          {editAlbums.map((album, index) => (
                            <div
                              key={`${album.id}-${index}`}
                              className="flex items-center gap-2 rounded-md border border-black/8 bg-white px-2 py-1.5"
                            >
                              <span className="w-6 text-center text-[11px] font-semibold text-muted">
                                {String(index + 1).padStart(2, '0')}
                              </span>
                              <CoverImage
                                src={album.cover}
                                alt={`${album.title} cover`}
                                className="h-9 w-9 border border-black/10"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="mb-0 truncate text-sm font-semibold text-text">{album.title}</p>
                                <p className="mb-0 truncate text-xs text-muted">{album.artist}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => moveEditAlbum(index, -1)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-black/10 bg-white p-0 text-muted md:h-7 md:w-7"
                                  aria-label="Move album up"
                                >
                                  <ArrowUp size={12} weight="bold" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveEditAlbum(index, 1)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-black/10 bg-white p-0 text-muted md:h-7 md:w-7"
                                  aria-label="Move album down"
                                >
                                  <ArrowDown size={12} weight="bold" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeEditAlbum(album.id)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-black/10 bg-white p-0 text-muted md:h-7 md:w-7"
                                  aria-label="Remove album"
                                >
                                  <X size={12} weight="bold" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : displayedAlbums.length === 0 ? (
                  <div className="rounded-lg border border-black/10 bg-white/72 px-3 py-3">
                    <p className="mb-0 text-sm text-muted">No albums have been added to this list yet.</p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-black/8 bg-white/68 md:rounded-xl md:border-black/10 md:bg-white/75">
                    {displayedAlbums.map((album, index) => (
                      <div
                        key={`${list.id}-${album.id}-${index}`}
                        className="grid grid-cols-[auto_42px_minmax(0,1fr)] items-center gap-2 border-b border-black/8 px-2.5 py-2 last:border-b-0 md:grid-cols-[auto_52px_minmax(0,1fr)] md:gap-3 md:px-4 md:py-3"
                      >
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/6 text-[10px] font-semibold text-muted md:h-8 md:w-8 md:text-[11px]">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <CoverImage
                          src={album.cover}
                          alt={`${album.title} cover`}
                          className="h-10 w-10 border border-black/10 md:h-[52px] md:w-[52px]"
                        />
                        <div className="min-w-0">
                          <p className="mb-0 truncate text-sm font-semibold text-text md:text-[15px]">{album.title}</p>
                          <p className="mb-0 truncate text-xs text-muted">{album.artist}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-2.5">
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <p className="mb-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Community</p>
                    <h4 className="mb-0 mt-0.5 text-lg text-text">Discussion</h4>
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
                    {list.commentCount ?? 0} comments
                  </span>
                </div>

                <div className="overflow-hidden rounded-lg border border-black/8 bg-white/65 md:rounded-xl md:border-black/10 md:bg-white/72">
                  <div className="scrollbar-sleek max-h-[220px] overflow-y-auto md:max-h-[240px]">
                    {(list.comments || []).length === 0 ? (
                      <div className="px-3 py-4 md:px-4 md:py-5">
                        <p className="mb-0 text-sm text-muted">
                          No discussion yet. Share context for how this list is meant to be heard.
                        </p>
                      </div>
                    ) : (
                      (list.comments || []).map((comment) => (
                        <div key={comment.id} className="border-b border-black/8 px-3 py-2.5 last:border-b-0 md:px-4 md:py-3">
                          <div className="flex items-start gap-2.5">
                            <span className="relative mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent/15 text-[10px] font-bold uppercase text-accent">
                              <span aria-hidden="true">
                                {getInitials(comment?.author?.username || 'unknown')}
                              </span>
                              {comment?.author?.avatarUrl ? (
                                <img
                                  src={comment.author.avatarUrl}
                                  alt={`${comment?.author?.username || 'unknown'} avatar`}
                                  className="absolute inset-0 h-full w-full object-cover"
                                  onError={(event) => {
                                    event.currentTarget.style.display = 'none'
                                  }}
                                />
                              ) : null}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="mb-0 truncate text-xs font-semibold text-text">
                                  @{comment?.author?.username || 'unknown'}
                                </p>
                                <span className="text-[10px] uppercase tracking-[0.08em] text-muted">
                                  {formatRelativeDate(comment.createdAt)}
                                </span>
                              </div>
                              <p className="mb-0 mt-1 text-sm leading-relaxed text-text">{comment.comment}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="border-t border-black/8 p-3 md:p-4">
                    <div className="flex gap-2">
                      <input
                        ref={commentInputRef}
                        value={commentDraft}
                        onChange={(event) => setCommentDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault()
                            if (canPostComment) onAddComment(list.id)
                          }
                        }}
                        placeholder="Write a comment..."
                        disabled={isCommentSubmitting}
                        className="h-10 flex-1 rounded-lg border border-black/10 bg-white px-3 text-sm text-text outline-none transition focus:border-accent/55 focus:ring-2 focus:ring-accent/20"
                      />
                      <button
                        type="button"
                        onClick={() => onAddComment(list.id)}
                        disabled={!canPostComment}
                        className="inline-flex h-10 items-center justify-center rounded-lg bg-accent px-3 text-sm font-semibold text-[#1f130c] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isCommentSubmitting ? 'Posting...' : 'Post'}
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          ) : null}
        </div>
        {isEditing ? (
          <div className="border-t border-black/8 bg-white/90 px-4 py-2.5 pb-[calc(env(safe-area-inset-bottom)+0.55rem)] backdrop-blur md:hidden">
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={cancelEditing}
                disabled={isSaving}
                className="h-10 rounded-lg border border-black/12 bg-white px-3 text-sm font-semibold text-text disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitEdit}
                disabled={isSaving}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-accent px-3 text-sm font-semibold text-[#1f130c] disabled:opacity-60"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function FeedRow({
  item,
  onOpen,
  onToggleFavorite,
  onFocusComments,
  isFavoriteUpdating = false,
}) {
  const albumCount = item.albumCount ?? item.albums.length
  const favoriteCount = Number(item.favoriteCount ?? 0)
  const commentCount = Number(item.commentCount ?? 0)

  return (
    <article
      className="group cursor-pointer border-t border-black/8 py-3 transition hover:bg-black/3 first:border-t-0 md:px-1.5 md:py-4"
      onClick={() => onOpen(item.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen(item.id)
        }
      }}
    >
      <div className="space-y-2.5 md:hidden">
        <div className="grid grid-cols-[94px_minmax(0,1fr)] items-start gap-3">
          <AlbumMosaic
            albums={item.albums}
            className="h-[94px] w-[94px] gap-1 rounded-md bg-card p-1"
            tileClassName="rounded-[2px] border-black/10"
          />
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <CreatorBadge creator={item.creator} />
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
                {formatRelativeDate(item.publishedAt)}
              </span>
            </div>
            <h3 className="mb-0 text-[1.1rem] leading-tight text-text">{item.title}</h3>
            <p className="mb-0 overflow-hidden text-[13px] leading-relaxed text-muted [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
              {item.description || 'No description yet.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
          <span>{albumCount} albums</span>
          {favoriteCount > 0 ? (
            <>
              <span className="inline-flex h-1 w-1 rounded-full bg-black/20" aria-hidden="true" />
              <span>{favoriteCount} favorites</span>
            </>
          ) : null}
          {commentCount > 0 ? (
            <>
              <span className="inline-flex h-1 w-1 rounded-full bg-black/20" aria-hidden="true" />
              <span>{commentCount} comments</span>
            </>
          ) : null}
        </div>

        <div className="flex items-center gap-3 pt-0.5 text-[11px] font-semibold">
          <button
            type="button"
            className={[
              'inline-flex items-center gap-1.5 !rounded-none !border-0 !bg-transparent !p-0 !shadow-none transition hover:!bg-transparent hover:!shadow-none hover:!translate-y-0',
              'text-text hover:text-text',
            ].join(' ')}
            disabled={isFavoriteUpdating}
            onClick={(event) => {
              event.stopPropagation()
              onToggleFavorite(item.id)
            }}
            aria-label={item.isFavoritedByViewer ? 'Unfavorite list' : 'Favorite list'}
          >
            <Heart
              size={14}
              weight={item.isFavoritedByViewer ? 'fill' : 'bold'}
              className={item.isFavoritedByViewer ? 'text-accent' : 'text-text'}
            />
            {favoriteCount > 0 ? <span>{favoriteCount}</span> : null}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 !rounded-none !border-0 !bg-transparent !p-0 text-text !shadow-none transition hover:!bg-transparent hover:text-text hover:!shadow-none hover:!translate-y-0"
            onClick={(event) => {
              event.stopPropagation()
              onFocusComments(item.id)
            }}
            aria-label="Open comments"
          >
            <ChatCircle size={14} weight="bold" />
            {commentCount > 0 ? <span>{commentCount}</span> : null}
          </button>
        </div>
      </div>

      <div className="hidden grid-cols-[132px_minmax(0,1fr)] items-start gap-5 md:grid lg:grid-cols-[140px_minmax(0,1fr)] lg:gap-6">
        <AlbumMosaic
          albums={item.albums}
          className="h-[132px] w-[132px] gap-1.5 rounded-xl bg-card p-1.5 shadow-[0_20px_28px_-24px_rgba(15,23,42,0.52)] lg:h-[140px] lg:w-[140px]"
          tileClassName="rounded-[3px] border-black/12"
        />
        <div className="min-w-0 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <CreatorBadge creator={item.creator} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              {formatRelativeDate(item.publishedAt)}
            </span>
            <span className="inline-flex h-1 w-1 rounded-full bg-black/20" aria-hidden="true" />
            <span className="text-[11px] font-medium text-muted">{albumCount} albums</span>
          </div>

          <h3 className="mb-0 text-[1.32rem] leading-[1.05] text-text">{item.title}</h3>

          <p className="mb-0 overflow-hidden text-[13px] leading-relaxed text-muted [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
            {item.description || 'No description yet.'}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-3 text-[11px] font-semibold">
          <button
            type="button"
            className={[
              'inline-flex items-center gap-2 rounded-none border-0 bg-transparent p-0 shadow-none transition hover:bg-transparent hover:shadow-none hover:translate-y-0',
              'text-text hover:text-accent',
            ].join(' ')}
            disabled={isFavoriteUpdating}
            onClick={(event) => {
              event.stopPropagation()
              onToggleFavorite(item.id)
            }}
            aria-label={item.isFavoritedByViewer ? 'Unfavorite list' : 'Favorite list'}
              >
                <Heart
                  size={16}
                  weight={item.isFavoritedByViewer ? 'fill' : 'bold'}
                  className={item.isFavoritedByViewer ? 'text-accent' : 'text-text'}
                />
                <span className="text-[12px]">{item.favoriteCount}</span>
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-none border-0 bg-transparent p-0 text-text shadow-none transition hover:bg-transparent hover:text-accent hover:shadow-none hover:translate-y-0"
                onClick={(event) => {
                  event.stopPropagation()
                  onFocusComments(item.id)
                }}
                aria-label="Open comments"
              >
                <ChatCircle size={16} weight="bold" />
                <span className="text-[12px]">{item.commentCount}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

function DesktopFeaturedSpotlight({ mainFeatured, supportingFeatured, openList, total }) {
  return (
    <div className="hidden md:grid md:grid-cols-[minmax(0,1.38fr)_minmax(0,1fr)] md:gap-5 lg:grid-cols-[minmax(0,1.42fr)_minmax(0,1fr)]">
      <article
        className="group relative cursor-pointer overflow-hidden rounded-2xl border border-black/10 bg-card/88 p-5 shadow-[0_24px_34px_-30px_rgba(15,23,42,0.52)] transition hover:shadow-[0_28px_40px_-30px_rgba(15,23,42,0.58)]"
        role="button"
        tabIndex={0}
        onClick={() => openList(mainFeatured.id)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            openList(mainFeatured.id)
          }
        }}
      >
        <div className="pointer-events-none absolute -right-10 -top-12 h-52 w-52 rounded-full bg-[radial-gradient(circle,rgba(247,121,62,0.18),transparent_64%)]" />
        <div className="relative grid grid-cols-[minmax(0,1fr)_212px] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_228px]">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="mb-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
                Featured list
              </p>
              <span className="inline-flex h-1 w-1 rounded-full bg-black/20" aria-hidden="true" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                {formatRelativeDate(mainFeatured.publishedAt)}
              </span>
            </div>
            <h2 className="mb-0 text-[2.05rem] leading-[1.01] text-text lg:text-[2.2rem]">{mainFeatured.title}</h2>
            <p className="mb-0 max-w-[66ch] text-[14px] leading-relaxed text-muted">
              {mainFeatured.description || 'No description yet.'}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] text-muted">
              <CreatorBadge creator={mainFeatured.creator} />
              <span className="inline-flex h-1 w-1 rounded-full bg-black/20" aria-hidden="true" />
              <span>{mainFeatured.albumCount ?? mainFeatured.albums.length} albums</span>
              <span className="inline-flex h-1 w-1 rounded-full bg-black/20" aria-hidden="true" />
              <span>{mainFeatured.favoriteCount} favorites</span>
              <span className="inline-flex h-1 w-1 rounded-full bg-black/20" aria-hidden="true" />
              <span>{mainFeatured.commentCount} comments</span>
            </div>
          </div>

          <div className="space-y-2.5">
            <AlbumMosaic
              albums={mainFeatured.albums}
              className="h-[212px] w-[212px] gap-1.5 rounded-xl bg-card p-1.5 shadow-[0_24px_34px_-26px_rgba(15,23,42,0.56)] lg:h-[228px] lg:w-[228px]"
              tileClassName="rounded-[4px] border-black/12"
            />
          </div>
        </div>
      </article>

      <aside className="rounded-2xl border border-black/10 bg-card/82 px-4 py-4">
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="mb-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Spotlight</p>
            <h3 className="mb-0 mt-1 text-[1.05rem] leading-tight text-text">More lists to explore</h3>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            {supportingFeatured.length} picks
          </span>
        </div>

        <div className="mt-3 divide-y divide-black/10">
          {supportingFeatured.map((item) => (
            <button
              key={item.id}
              type="button"
              className="grid w-full grid-cols-[62px_minmax(0,1fr)] items-start gap-3 rounded-lg border-0 bg-transparent p-0 py-3 text-left shadow-none transition first:pt-0 last:pb-0 hover:bg-black/[0.015] hover:shadow-none hover:translate-y-0"
              onClick={() => openList(item.id)}
            >
              <AlbumMosaic albums={item.albums} className="h-[62px] w-[62px] gap-1 rounded-md bg-card p-1" tileClassName="rounded-[2px] border-black/8" />
              <span className="min-w-0">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                  {formatRelativeDate(item.publishedAt)}
                </span>
                <span className="mt-1 block truncate text-[1.02rem] font-semibold leading-tight text-text">
                  {item.title}
                </span>
                <span className="mt-1 block overflow-hidden text-[12px] text-muted [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:1]">
                  {item.description || 'No description yet.'}
                </span>
                <span className="mt-1.5 flex items-center gap-2 text-[11px] text-muted">
                  <span>{item.albumCount ?? item.albums.length} albums</span>
                  <span className="inline-flex h-1 w-1 rounded-full bg-black/20" aria-hidden="true" />
                  <span>{item.favoriteCount} favorites</span>
                </span>
              </span>
            </button>
          ))}
        </div>

        <div className="mt-3 border-t border-black/10 pt-3">
          <p className="mb-0 text-[11px] text-muted">
            {total} published lists in the community feed.
          </p>
        </div>
      </aside>
    </div>
  )
}

function MobileFeaturedStack({ mainFeatured, supportingFeatured, openList, total }) {
  const featuredAlbumCount = mainFeatured?.albumCount ?? mainFeatured?.albums?.length ?? 0
  const featuredFavorites = Number(mainFeatured?.favoriteCount ?? 0)
  const featuredComments = Number(mainFeatured?.commentCount ?? 0)

  return (
    <div className="space-y-4 md:hidden">
      <article
        className="cursor-pointer rounded-xl bg-card/82 p-3.5"
        role="button"
        tabIndex={0}
        onClick={() => openList(mainFeatured.id)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            openList(mainFeatured.id)
          }
        }}
      >
        <p className="mb-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
          Featured list · {formatRelativeDate(mainFeatured.publishedAt)}
        </p>
        <h2 className="mb-0 mt-2 text-[1.56rem] leading-[1.04] text-text">{mainFeatured.title}</h2>
        <p className="mb-0 mt-1.5 overflow-hidden text-[13px] leading-relaxed text-muted [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]">
          {mainFeatured.description || 'No description yet.'}
        </p>
        <div className="mt-2.5">
          <CreatorBadge creator={mainFeatured.creator} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">
          <span>{featuredAlbumCount} albums</span>
          {featuredFavorites > 0 ? (
            <>
              <span className="inline-flex h-1 w-1 rounded-full bg-black/20" aria-hidden="true" />
              <span>{featuredFavorites} favorites</span>
            </>
          ) : null}
          {featuredComments > 0 ? (
            <>
              <span className="inline-flex h-1 w-1 rounded-full bg-black/20" aria-hidden="true" />
              <span>{featuredComments} comments</span>
            </>
          ) : null}
        </div>
        <AlbumMosaic
          albums={mainFeatured.albums}
          className="mt-3 h-[214px] w-[min(100%,214px)] gap-1.5 rounded-lg bg-card p-1.5"
          tileClassName="rounded-[4px] border-black/12"
        />
      </article>

      {supportingFeatured.length > 0 ? (
        <section className="space-y-2.5">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="mb-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Spotlight</p>
              <h3 className="mb-0 mt-1 text-[1.08rem] leading-tight text-text">More lists to explore</h3>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              {supportingFeatured.length} picks
            </span>
          </div>
          <div className="space-y-2">
            {supportingFeatured.map((item) => {
              const itemFavorites = Number(item.favoriteCount ?? 0)
              return (
                <article
                  key={item.id}
                  className="grid w-full cursor-pointer grid-cols-[58px_minmax(0,1fr)] items-start gap-3 rounded-lg border-0 bg-card px-2.5 py-2.5 text-left shadow-none transition hover:bg-card hover:shadow-none"
                  onClick={() => openList(item.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      openList(item.id)
                    }
                  }}
                >
                  <AlbumMosaic
                    albums={item.albums}
                    className="h-[58px] w-[58px] gap-1 rounded-md bg-card p-1"
                    tileClassName="rounded-[2px] border-black/10"
                  />
                  <span className="min-w-0">
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                      {formatRelativeDate(item.publishedAt)}
                    </span>
                    <span className="mt-1 block truncate text-[1.01rem] font-semibold leading-tight text-text">
                      {item.title}
                    </span>
                    <span className="mt-1 block overflow-hidden text-[12px] text-muted [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:1]">
                      {item.description || 'No description yet.'}
                    </span>
                    <span className="mt-1.5 flex items-center gap-2 text-[11px] text-muted">
                      <span>{item.albumCount ?? item.albums.length} albums</span>
                      {itemFavorites > 0 ? (
                        <>
                          <span className="inline-flex h-1 w-1 rounded-full bg-black/20" aria-hidden="true" />
                          <span>{itemFavorites} favorites</span>
                        </>
                      ) : null}
                    </span>
                  </span>
                </article>
              )
            })}
          </div>
          <p className="mb-0 pt-0.5 text-[11px] text-muted">{total} published lists in the community feed.</p>
        </section>
      ) : null}
    </div>
  )
}

export default function Lists() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isSignedIn, signOut } = useAuthStatus()
  const handledListQueryRef = useRef('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [navUser, setNavUser] = useState(() => {
    const cached = readCachedProfile()
    return {
      userId: cached?.userId || '',
      username: cached?.username || '',
      avatarUrl: cached?.avatarUrl || '',
    }
  })

  const [listsPayload, setListsPayload] = useState({
    items: [],
    featured: [],
    tags: [],
    total: 0,
  })
  const [isLoadingLists, setIsLoadingLists] = useState(false)
  const [listsError, setListsError] = useState('')
  const [refreshToken, setRefreshToken] = useState(0)
  const [sortBy, setSortBy] = useState('trending')
  const [activeTag, setActiveTag] = useState('All')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  const [isPublishOpen, setIsPublishOpen] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)

  const [activeListId, setActiveListId] = useState('')
  const [activeList, setActiveList] = useState(null)
  const [isActiveListLoading, setIsActiveListLoading] = useState(false)
  const [activeListError, setActiveListError] = useState('')
  const [commentDraft, setCommentDraft] = useState('')
  const [favoritePendingByList, setFavoritePendingByList] = useState({})
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false)
  const [shouldFocusCommentComposer, setShouldFocusCommentComposer] = useState(false)
  const listIdFromQuery = String(searchParams.get('listId') ?? '').trim()
  const focusFromQuery = String(searchParams.get('focus') ?? '').trim().toLowerCase() === 'comments'

  useEffect(() => {
    if (!isSignedIn) {
      setNavUser({ userId: '', username: '', avatarUrl: '' })
      return
    }

    let cancelled = false

    async function loadNavUser() {
      try {
        const profile = await fetchCurrentProfile()
        if (!cancelled) {
          emitProfileUpdated(profile)
          setNavUser({
            userId: profile.userId || '',
            username: profile.username || '',
            avatarUrl: profile.avatarUrl || '',
          })
        }
      } catch {
        // keep cache if request fails
      }
    }

    const handleProfileUpdate = (event) => {
      const profile = event?.detail
      if (!profile) return
      setNavUser({
        userId: profile.userId || '',
        username: profile.username || '',
        avatarUrl: profile.avatarUrl || '',
      })
    }

    window.addEventListener(PROFILE_EVENT_NAME, handleProfileUpdate)
    loadNavUser()

    return () => {
      cancelled = true
      window.removeEventListener(PROFILE_EVENT_NAME, handleProfileUpdate)
    }
  }, [isSignedIn])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(query.trim())
    }, 220)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [query])

  useEffect(() => {
    let cancelled = false

    const loadLists = async () => {
      setIsLoadingLists(true)
      setListsError('')

      try {
        const payload = await fetchPublishedLists({
          sort: sortBy,
          tag: activeTag,
          query: debouncedQuery,
          page: 1,
          limit: 50,
        })

        if (cancelled) return

        const tagsFromApi = Array.isArray(payload?.tags) ? payload.tags : []
        setListsPayload({
          items: Array.isArray(payload?.items) ? payload.items : [],
          featured: Array.isArray(payload?.featured) ? payload.featured : [],
          tags: tagsFromApi,
          total: Number(payload?.total ?? 0),
        })

        if (activeTag !== 'All' && !tagsFromApi.includes(activeTag)) {
          setActiveTag('All')
        }
      } catch (error) {
        if (cancelled) return
        setListsPayload({ items: [], featured: [], tags: [], total: 0 })
        setListsError(error?.message ?? 'Unable to load lists.')
      } finally {
        if (!cancelled) setIsLoadingLists(false)
      }
    }

    loadLists()

    return () => {
      cancelled = true
    }
  }, [sortBy, activeTag, debouncedQuery, refreshToken])

  useEffect(() => {
    if (!activeListId) {
      setActiveList(null)
      setIsActiveListLoading(false)
      setActiveListError('')
      return
    }

    let cancelled = false

    const loadListDetail = async () => {
      setIsActiveListLoading(true)
      setActiveListError('')

      try {
        const item = await fetchListDetail(activeListId)
        if (cancelled) return

        if (item) {
          setActiveList(item)
          setListsPayload((prev) => patchListCollections(prev, item.id, () => item))
        }
      } catch (error) {
        if (cancelled) return
        setActiveListError(error?.message ?? 'Unable to load list details.')
      } finally {
        if (!cancelled) setIsActiveListLoading(false)
      }
    }

    loadListDetail()

    return () => {
      cancelled = true
    }
  }, [activeListId])

  useEffect(() => {
    if (!isSidebarOpen && !isPublishOpen && !activeListId) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isSidebarOpen, isPublishOpen, activeListId])

  const handleMobileSignOut = () => {
    signOut()
    setNavUser({ userId: '', username: '', avatarUrl: '' })
    navigate('/')
  }

  const openList = useCallback(
    (listId, options = {}) => {
      const seed = findListInPayload(listsPayload, listId)
      if (seed) setActiveList(seed)
      setActiveListId(listId)
      setShouldFocusCommentComposer(Boolean(options?.focusComments))
      setCommentDraft('')
      setActiveListError('')

      const nextSearchParams = new URLSearchParams(searchParams)
      nextSearchParams.set('listId', listId)
      if (options?.focusComments) {
        nextSearchParams.set('focus', 'comments')
      } else {
        nextSearchParams.delete('focus')
      }
      setSearchParams(nextSearchParams, { replace: true })
    },
    [listsPayload, searchParams, setSearchParams],
  )

  const focusCommentsForList = useCallback(
    (listId) => {
      openList(listId, { focusComments: true })
    },
    [openList],
  )

  useEffect(() => {
    if (!listIdFromQuery) {
      handledListQueryRef.current = ''
      return
    }

    const token = `${listIdFromQuery}:${focusFromQuery ? 'comments' : 'view'}`
    if (handledListQueryRef.current === token) return
    handledListQueryRef.current = token
    openList(listIdFromQuery, { focusComments: focusFromQuery })
  }, [focusFromQuery, listIdFromQuery, openList])

  const toggleFavorite = async (listId) => {
    if (!isSignedIn) {
      navigate('/')
      return
    }

    const current =
      (activeList?.id === listId ? activeList : null) ||
      findListInPayload(listsPayload, listId)
    const targetFavorited = !current?.isFavoritedByViewer

    if (favoritePendingByList[listId]) return

    setFavoritePendingByList((prev) => ({ ...prev, [listId]: true }))

    try {
      const payload = await toggleCommunityListFavorite(listId, targetFavorited)
      const favoriteCount = Number(payload?.favoriteCount ?? 0)
      const favorited = Boolean(payload?.favorited)

      setListsPayload((prev) =>
        patchListCollections(prev, listId, (item) => ({
          ...item,
          favoriteCount,
          isFavoritedByViewer: favorited,
        })),
      )

      setActiveList((prev) => {
        if (!prev || prev.id !== listId) return prev
        return {
          ...prev,
          favoriteCount,
          isFavoritedByViewer: favorited,
        }
      })
    } catch (error) {
      setActiveListError(error?.message ?? 'Failed to update favorite.')
    } finally {
      setFavoritePendingByList((prev) => {
        const next = { ...prev }
        delete next[listId]
        return next
      })
    }
  }

  const addComment = async (listId) => {
    if (!isSignedIn) {
      navigate('/')
      return
    }

    const cleanComment = commentDraft.trim()
    if (!cleanComment) return

    if (isCommentSubmitting) return
    setIsCommentSubmitting(true)

    try {
      const payload = await addCommunityListComment(listId, cleanComment)
      const nextCount = Number(payload?.commentCount ?? 0)
      const nextComment = payload?.comment ?? null

      setListsPayload((prev) =>
        patchListCollections(prev, listId, (item) => ({ ...item, commentCount: nextCount })),
      )
      setActiveList((prev) => {
        if (!prev || prev.id !== listId) return prev
        return {
          ...prev,
          commentCount: nextCount,
          comments: nextComment ? [nextComment, ...(prev.comments || [])] : prev.comments || [],
        }
      })
      setCommentDraft('')
    } catch (error) {
      setActiveListError(error?.message ?? 'Failed to add comment.')
    } finally {
      setIsCommentSubmitting(false)
    }
  }

  const updateOwnList = async (listId, { title, description, tags, albumIds }) => {
    if (!isSignedIn) {
      navigate('/')
      throw new Error('Sign in to edit your list.')
    }

    setActiveListError('')
    try {
      const updated = await updateCommunityList(listId, {
        title,
        description,
        tags,
        albumIds,
      })
      if (!updated?.id) {
        throw new Error('Unable to update list.')
      }

      setListsPayload((prev) => patchListCollections(prev, listId, () => updated))
      setActiveList(updated)
      return updated
    } catch (error) {
      setActiveListError(error?.message ?? 'Failed to update list.')
      throw error
    }
  }

  const deleteOwnList = async (listId) => {
    if (!isSignedIn) {
      navigate('/')
      throw new Error('Sign in to delete your list.')
    }

    setActiveListError('')
    try {
      const payload = await deleteCommunityList(listId)
      if (!payload?.deleted) {
        throw new Error('Unable to delete list.')
      }

      setListsPayload((prev) => removeListFromCollections(prev, listId))
      setActiveListId('')
      setActiveList(null)
      setCommentDraft('')
      setRefreshToken((prev) => prev + 1)
      return payload
    } catch (error) {
      setActiveListError(error?.message ?? 'Failed to delete list.')
      throw error
    }
  }

  const publishList = async ({ title, description, tags, albumIds }) => {
    if (!isSignedIn) {
      throw new Error('Sign in to publish a list.')
    }

    setIsPublishing(true)

    try {
      const created = await publishCommunityList({ title, description, tags, albumIds })
      if (!created?.id) {
        throw new Error('Unable to publish list.')
      }

      setIsPublishOpen(false)
      setSortBy('recent')
      setActiveTag('All')
      setQuery('')
      setDebouncedQuery('')
      setRefreshToken((prev) => prev + 1)
      setActiveList(created)
      setActiveListId(created.id)
    } finally {
      setIsPublishing(false)
    }
  }

  const username = navUser?.username || ''
  const avatarUrl = navUser?.avatarUrl || ''
  const initials = (username || 'U').slice(0, 2).toUpperCase()
  const allTags = useMemo(
    () => ['All', ...(listsPayload.tags || [])],
    [listsPayload.tags],
  )

  const mainFeatured = listsPayload.featured?.[0] ?? null
  const supportingFeatured = (listsPayload.featured || []).slice(1, 3)
  const hasNoListsAtAll = !isLoadingLists && !listsError && listsPayload.total === 0

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-black/10 bg-white/82 backdrop-blur-xl md:hidden">
        <div className="mx-auto flex h-11 max-w-6xl items-center justify-between px-4 sm:px-6">
          {isSignedIn ? (
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setIsSidebarOpen(true)}
              className="inline-flex h-8 w-8 items-center justify-center border-0 bg-transparent p-0 text-slate-700 shadow-none transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
            >
              <ListBullets size={16} weight="bold" />
            </button>
          ) : (
            <span className="inline-flex h-8 w-8" aria-hidden="true" />
          )}

          <Link
            to={isSignedIn ? '/home' : '/'}
            className="inline-flex items-center gap-2 text-[13px] font-semibold text-text transition hover:text-accent"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-accent/15 text-accent">
              <MusicNotes size={13} weight="bold" />
            </span>
            Turntabled
          </Link>

          {isSignedIn ? (
            <Link
              to="/profile"
              aria-label="Open profile"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-black/10 bg-white/70 p-0 text-text transition hover:bg-white"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={`${username || 'User'} avatar`} className="h-6 w-6 rounded-md object-cover" />
              ) : username ? (
                <span className="text-[10px] font-bold uppercase text-accent">{initials}</span>
              ) : (
                <UserCircle size={16} weight="duotone" />
              )}
            </Link>
          ) : (
            <Link
              to="/"
              className="inline-flex h-8 items-center rounded-full border border-black/10 bg-white/70 px-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-text transition hover:bg-white"
            >
              Sign in
            </Link>
          )}
        </div>
      </header>

      {isSignedIn ? (
        <div className="md:hidden">
          <HomeMobileSidebar
            isOpen={isSidebarOpen}
            navUser={navUser}
            isSignedIn={isSignedIn}
            onClose={() => setIsSidebarOpen(false)}
            onSignOut={handleMobileSignOut}
          />
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="hidden pt-6 md:block">
          {isSignedIn ? (
            <Navbar className="mx-auto w-[min(100%,1020px)]" />
          ) : (
            <NavbarGuest className="mx-auto w-[min(100%,1020px)]" />
          )}
        </div>

        <main className="space-y-6 pt-5 md:space-y-8 md:pt-8">
          <section className="space-y-4">
            <div className="space-y-3 md:hidden">
              <div className="min-w-0">
                <p className="mb-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
                  Community desk
                </p>
                <h1 className="mb-0 mt-1 text-[1.72rem] leading-[1.03] text-text">
                  Lists
                </h1>
                <p className="mb-0 mt-1.5 max-w-xl text-[13px] text-muted">
                  Discover and publish album lists shaped by taste, scenes, and listening habits.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPublishOpen(true)}
                disabled={!isSignedIn}
                className="inline-flex h-9 items-center gap-1 rounded-lg bg-accent px-3 text-[13px] font-semibold text-[#1f130c] transition disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Plus size={13} weight="bold" />
                Publish list
              </button>
            </div>

            <div className="hidden flex-wrap items-end justify-between gap-4 md:flex">
              <div className="min-w-0">
                <p className="mb-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
                  Community desk
                </p>
                <h1 className="mb-0 mt-1 text-[1.8rem] leading-[1.02] text-text md:text-[2.3rem]">
                  Lists
                </h1>
                <p className="mb-0 mt-2 max-w-2xl text-[13px] text-muted md:text-sm">
                  Discover and publish album lists shaped by taste, scenes, and listening habits.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPublishOpen(true)}
                disabled={!isSignedIn}
                className="inline-flex h-10 items-center gap-1 rounded-lg bg-accent px-3 text-sm font-semibold text-[#1f130c] transition disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Plus size={14} weight="bold" />
                Publish list
              </button>
            </div>

            <div className="space-y-2.5 md:hidden">
              <div className="-mx-1 overflow-x-auto pb-0.5 scrollbar-sleek">
                <div className="inline-flex min-w-full items-center gap-4 border-b border-black/10 px-1">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setSortBy(option.key)}
                      className={[
                        'whitespace-nowrap !rounded-none !border-x-0 !border-t-0 border-b-2 !bg-transparent !px-0 !pb-1.5 !pt-0 text-[12px] font-semibold !shadow-none transition hover:!bg-transparent hover:!shadow-none hover:!translate-y-0',
                        sortBy === option.key
                          ? 'border-accent text-accent'
                          : 'border-transparent text-muted hover:text-text',
                      ].join(' ')}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                <label className="block">
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                    Filter
                  </span>
                  <div className="flex h-9 items-center gap-2 rounded-md border border-black/10 bg-card/74 px-2.5">
                    <select
                      value={activeTag}
                      onChange={(event) => setActiveTag(event.target.value)}
                      className="h-full w-full border-0 bg-transparent p-0 text-sm text-text outline-none"
                    >
                      {allTags.map((tag) => (
                        <option key={`mobile-tag-${tag}`} value={tag}>
                          {tag}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                    Search
                  </span>
                  <div className="flex h-9 items-center gap-2 rounded-md border border-black/10 bg-card/74 px-2.5">
                    <Compass size={12} className="text-muted" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Title, album, creator, or mood"
                      className="h-full w-full border-0 bg-transparent p-0 text-sm text-text outline-none"
                    />
                  </div>
                </label>
              </div>
            </div>

            <div className="hidden items-end gap-5 rounded-2xl bg-card/85 px-4 py-3 md:flex">
              <div className="min-w-0">
                <p className="mb-0 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Sort</p>
                <div className="mt-1 inline-flex flex-wrap items-center gap-3">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setSortBy(option.key)}
                      className={[
                        'inline-flex h-7 items-center rounded-md border px-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] shadow-none transition hover:shadow-none hover:translate-y-0',
                        sortBy === option.key
                          ? 'border-accent bg-accent text-[#1f130c] hover:bg-accent'
                          : 'border-transparent bg-transparent text-muted hover:bg-transparent hover:text-text',
                      ].join(' ')}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="hidden h-9 w-px bg-black/10 lg:block" aria-hidden="true" />

              <div className="flex flex-1 items-end justify-end gap-4">
                <label className="inline-flex min-w-[170px] flex-col">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Filter</span>
                  <select
                    value={activeTag}
                    onChange={(event) => setActiveTag(event.target.value)}
                    className="mt-1 h-8 min-w-[170px] border-0 border-b border-black/15 bg-transparent px-0 text-sm text-text outline-none transition focus:border-accent/45"
                  >
                    {allTags.map((tag) => (
                      <option key={`desktop-tag-${tag}`} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="min-w-[300px] max-w-[440px] flex-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Search</span>
                  <div className="mt-1 flex h-8 items-center gap-2 border-b border-black/15 px-0.5">
                    <Compass size={13} className="text-muted" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Title, album, creator, or mood"
                      className="h-full w-full border-0 bg-transparent p-0 text-sm text-text outline-none"
                    />
                  </div>
                </label>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-black/10 bg-card px-4 py-4 md:px-5 md:py-5">
            {listsError ? <p className="mb-0 text-sm text-red-700">{listsError}</p> : null}
            {isLoadingLists ? <p className="mb-0 text-sm text-muted">Loading community lists...</p> : null}
            {!isLoadingLists && !listsError && mainFeatured ? (
              <>
                <MobileFeaturedStack
                  mainFeatured={mainFeatured}
                  supportingFeatured={supportingFeatured}
                  openList={openList}
                  total={listsPayload.total}
                />

                <DesktopFeaturedSpotlight
                  mainFeatured={mainFeatured}
                  supportingFeatured={supportingFeatured}
                  openList={openList}
                  total={listsPayload.total}
                />
              </>
            ) : null}
            {!isLoadingLists && !listsError && !mainFeatured ? (
              <div className="py-3">
                <p className="mb-0 text-sm text-muted">No featured lists yet. Publish one to get things started.</p>
              </div>
            ) : null}
          </section>

          <section className="space-y-3 md:space-y-4">
            <div className="flex items-end justify-between gap-2">
              <div>
                <p className="mb-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Feed</p>
                <h2 className="mb-0 mt-1 text-[1.35rem] leading-tight text-text">Published lists</h2>
                <p className="mb-0 mt-1 text-[12px] text-muted">
                  Freshly published community lists, updated with favorites and discussion.
                </p>
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                {listsPayload.total} shown
              </span>
            </div>
            <div className="overflow-hidden border-t border-black/8 md:rounded-2xl md:bg-card/74 md:px-4 lg:px-5">
              {isLoadingLists ? (
                <p className="mb-0 py-6 text-sm text-muted">Loading lists...</p>
              ) : null}

              {!isLoadingLists && listsPayload.items.length === 0 ? (
                <div className="py-6">
                  {hasNoListsAtAll ? (
                    <div className="rounded-xl border border-black/10 bg-white/72 p-4">
                      <p className="mb-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">No lists yet</p>
                      <h3 className="mb-0 mt-1 text-xl text-text">Start the community archive</h3>
                      <p className="mb-0 mt-2 text-sm text-muted">
                        Publish your first list using real albums from your catalog and set the tone for discovery.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsPublishOpen(true)}
                        disabled={!isSignedIn}
                        className="mt-3 inline-flex h-10 items-center gap-1 rounded-lg bg-accent px-3 text-sm font-semibold text-[#1f130c] disabled:opacity-45"
                      >
                        <Plus size={14} weight="bold" />
                        Publish your first list
                      </button>
                    </div>
                  ) : (
                    <p className="mb-0 text-sm text-muted">No lists match your filters.</p>
                  )}
                </div>
              ) : null}

              {!isLoadingLists && listsPayload.items.length > 0
                ? listsPayload.items.map((item) => (
                    <FeedRow
                      key={item.id}
                      item={item}
                      onOpen={openList}
                      onToggleFavorite={toggleFavorite}
                      onFocusComments={focusCommentsForList}
                      isFavoriteUpdating={Boolean(favoritePendingByList[item.id])}
                    />
                  ))
                : null}
            </div>
          </section>
        </main>
      </div>

      <PublishListModal
        isOpen={isPublishOpen}
        onClose={() => setIsPublishOpen(false)}
        onPublish={publishList}
        isPublishing={isPublishing}
        isSignedIn={isSignedIn}
      />

      <ListDetailModal
        list={activeList}
        viewerUserId={navUser?.userId || ''}
        isOpen={Boolean(activeListId)}
        isLoading={isActiveListLoading}
        loadError={activeListError}
        onClose={() => {
          setActiveListId('')
          setActiveList(null)
          setShouldFocusCommentComposer(false)
          setCommentDraft('')
          const nextSearchParams = new URLSearchParams(searchParams)
          nextSearchParams.delete('listId')
          nextSearchParams.delete('focus')
          setSearchParams(nextSearchParams, { replace: true })
        }}
        onToggleFavorite={toggleFavorite}
        onAddComment={addComment}
        onUpdateList={updateOwnList}
        onDeleteList={deleteOwnList}
        commentDraft={commentDraft}
        setCommentDraft={setCommentDraft}
        isFavoriteUpdating={Boolean(activeList?.id && favoritePendingByList[activeList.id])}
        isCommentSubmitting={isCommentSubmitting}
        shouldFocusCommentComposer={shouldFocusCommentComposer}
        onCommentComposerFocused={() => setShouldFocusCommentComposer(false)}
      />
    </div>
  )
}
