import { useRef, useState } from 'react'
import { Camera, Clock, Flame, Heart, PencilSimpleLine, ShareNetwork } from 'phosphor-react'
import { validateCoverFile } from '../../lib/profileClient.js'

export default function ProfileHeader({
  user,
  onEdit = () => {},
  onCoverUpload = async () => {},
  allowProfileEditing = true,
  primaryActionLabel = 'Edit profile',
  avatarSrc = '',
  avatarAlt,
  bannerSrc = '/hero/hero1.jpg',
  bannerAlt = 'Profile banner',
  embedded = false,
}) {
  const resolvedAvatarAlt = avatarAlt ?? `${user?.name ?? 'User'} avatar`
  const [failedAvatarSrc, setFailedAvatarSrc] = useState('')
  const [failedBannerSrc, setFailedBannerSrc] = useState('')
  const [coverUploadState, setCoverUploadState] = useState({
    loading: false,
    error: '',
  })
  const coverFileInputRef = useRef(null)

  const avatarFailed = failedAvatarSrc === avatarSrc
  const bannerFailed = failedBannerSrc === bannerSrc

  let fallbackInitials = 'U'
  if (user?.initials) {
    fallbackInitials = user.initials
  } else {
    const name = user?.name?.trim() ?? ''
    if (name) {
      fallbackInitials = name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('')
    }
  }

  const containerClass = embedded
    ? ''
    : 'card vinyl-texture border border-black/5 shadow-md'

  const coverWrapClass = embedded
    ? 'relative h-48 overflow-visible sm:h-52'
    : 'relative -mx-[1.1rem] -mt-[1.1rem] mb-0 h-44 overflow-visible rounded-t-[14px] border-b border-black/5 sm:h-48'

  const bodyClass = embedded
    ? 'border-t border-black/5 px-6 pb-6 pt-4 sm:px-8 sm:pt-6'
    : 'pb-2 pt-4 sm:pt-6'

  const displayName = user.name
  const username = (user.handle ?? '').replace(/^@/, '')
  const location = user.location
  const joinedDate = (user.joined ?? '').replace(/^Joined\s+/i, '')
  const bio = user.bio

  const handleCoverEditClick = () => {
    if (!allowProfileEditing) return
    if (coverUploadState.loading) return
    coverFileInputRef.current?.click()
  }

  const handleCoverFileChange = async (event) => {
    const file = event.target.files?.[0] ?? null
    event.target.value = ''
    if (!file) return

    const validation = validateCoverFile(file)
    if (!validation.valid) {
      setCoverUploadState({
        loading: false,
        error: validation.message,
      })
      return
    }

    setCoverUploadState({
      loading: true,
      error: '',
    })

    try {
      await onCoverUpload(file)
      setCoverUploadState({
        loading: false,
        error: '',
      })
    } catch (error) {
      setCoverUploadState({
        loading: false,
        error: error?.message ?? 'Failed to upload cover photo.',
      })
    }
  }

  return (
    <section className={containerClass}>
      <div className={`${coverWrapClass} group/cover`}>
        {!bannerFailed ? (
          <img
            src={bannerSrc}
            alt={bannerAlt}
            className="h-full w-full rounded-t-3xl object-cover transition duration-300 group-hover/cover:brightness-75"
            onError={() => setFailedBannerSrc(bannerSrc)}
          />
        ) : (
          <div className="h-full w-full rounded-t-3xl bg-gradient-to-r from-slate-200 via-white to-orange-100" />
        )}
        <div className="pointer-events-none absolute inset-0 rounded-t-3xl bg-gradient-to-b from-black/0 via-black/0 to-black/20 transition duration-300 group-hover/cover:bg-black/25" />

        {allowProfileEditing ? (
          <>
            <input
              ref={coverFileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,image/png,image/jpeg"
              className="hidden"
              onChange={handleCoverFileChange}
            />

            <button
              type="button"
              onClick={handleCoverEditClick}
              disabled={coverUploadState.loading}
              className="absolute inset-0 z-20 flex items-center justify-center rounded-t-3xl bg-black/0 transition duration-300 hover:bg-black/35 focus-visible:bg-black/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-70"
              aria-label="Upload cover photo"
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-black/45 px-3 py-2 text-xs font-semibold text-white opacity-0 backdrop-blur-sm transition duration-300 group-hover/cover:opacity-100 focus-visible:opacity-100">
                <Camera size={14} weight="bold" />
                {coverUploadState.loading ? 'Uploading...' : 'Edit cover'}
              </span>
            </button>
          </>
        ) : null}

        <div className="absolute bottom-0 left-4 z-20 translate-y-1/2 sm:left-8">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-accent/20 text-base font-semibold text-accent ring-4 ring-white shadow-md sm:h-24 sm:w-24 sm:text-lg">
            {!avatarFailed ? (
              <img
                src={avatarSrc}
                alt={resolvedAvatarAlt}
                className="h-full w-full object-cover"
                onError={() => setFailedAvatarSrc(avatarSrc)}
              />
            ) : (
              <span>{fallbackInitials}</span>
            )}
          </div>
        </div>
      </div>

      {coverUploadState.error ? (
        <p className="mb-0 mt-2 px-6 text-xs font-semibold text-red-600 sm:px-8">
          {coverUploadState.error}
        </p>
      ) : null}

      <div className={bodyClass}>
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:gap-x-6">
          <div className="min-w-0">
            <div className="w-full max-w-2xl -mt-2 pl-24 sm:-mt-4 sm:pl-28">
              <h1 className="mt-0 text-3xl md:text-4xl font-semibold tracking-tight leading-none text-black/90">
                {displayName}
              </h1>

              <div className="mt-1 text-sm text-black/55 truncate">
                <span className="font-medium text-black/75">@{username}</span>
                <span className="mx-2 text-black/30">&middot;</span>
                <span>{location}</span>
                <span className="mx-2 text-black/30">&middot;</span>
                <span>Joined {joinedDate}</span>
              </div>

              <div className="mt-3 rounded-xl border border-black/5 bg-white/50 px-4 py-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-black/45">
                  About
                </p>
                <p className="text-[15px] md:text-base text-black/70 leading-relaxed">
                  {bio}
                </p>
              </div>

              <div className="mt-3 border-t border-black/5 pt-3">
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-black/60">
                  <span className="inline-flex items-center gap-1.5">
                    <Flame className="h-3.5 w-3.5 text-black/40" />
                    <span className="font-medium text-black/75">7-day</span>
                    <span>streak</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-black/40" />
                    <span className="font-medium text-black/75">128 hrs</span>
                    <span>listened</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Heart className="h-3.5 w-3.5 text-black/40" />
                    <span className="font-medium text-black/75">32</span>
                    <span>favorites</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end md:w-auto md:flex-col md:items-end md:justify-start md:self-start">
            {allowProfileEditing ? (
              <button
                type="button"
                className="inline-flex w-40 h-9 items-center justify-center gap-2 rounded-xl border border-orange-500/35 bg-accent px-4 text-[15px] font-semibold tracking-tight text-[#1f130c] shadow-sm transition hover:bg-[#ef6b2f] active:bg-[#e86124] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                onClick={onEdit}
              >
                <PencilSimpleLine className="h-4 w-4" weight="bold" />
                {primaryActionLabel}
              </button>
            ) : null}
            <button
              type="button"
              className="inline-flex w-40 h-9 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white/60 px-4 text-[15px] font-semibold tracking-tight text-black/80 shadow-none transition hover:bg-white active:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
            >
              <ShareNetwork className="h-4 w-4" weight="bold" />
              Share profile
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
