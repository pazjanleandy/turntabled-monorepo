import { useEffect, useState } from 'react'
import { PencilSimpleLine, ShareNetwork } from 'phosphor-react'

export default function ProfileHeader({
  user,
  onEdit = () => {},
  allowProfileEditing = true,
  primaryActionLabel = 'Edit profile',
  avatarSrc = '',
  avatarAlt,
  bannerSrc = '/hero/hero1.jpg',
  bannerAlt = 'Profile banner',
  embedded = false,
  showSecondaryAction = true,
  secondaryActionLabel = 'Share profile',
  secondaryActionIcon = null,
  onSecondaryAction,
  secondaryActionDisabled = false,
  secondaryActionClassName = '',
  onSecondaryActionMouseEnter,
  onSecondaryActionMouseLeave,
  onSecondaryActionFocus,
  onSecondaryActionBlur,
  followerCount = 0,
  followingCount = 0,
  showFollowMetadata = true,
  compactMobile = false,
}) {
  const resolvedAvatarAlt = avatarAlt ?? `${user?.name ?? 'User'} avatar`
  const [failedAvatarSrc, setFailedAvatarSrc] = useState('')
  const [failedBannerSrc, setFailedBannerSrc] = useState('')
  const [isMobileActionSheetOpen, setIsMobileActionSheetOpen] = useState(false)

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
    ? compactMobile
      ? 'relative -mx-4 h-32 overflow-visible sm:-mx-5 md:mx-0 md:h-48'
      : 'relative h-48 overflow-visible sm:h-52'
    : 'relative -mx-[1.1rem] -mt-[1.1rem] mb-0 h-44 overflow-visible rounded-t-[14px] border-b border-black/5 sm:h-48'

  const bodyClass = embedded
    ? compactMobile
      ? 'px-3 pb-3.5 pt-2.5 md:border-t md:border-black/5 md:px-6 md:pb-6 md:pt-4'
      : 'border-t border-black/5 px-6 pb-6 pt-4 sm:px-8 sm:pt-6'
    : 'pb-2 pt-4 sm:pt-6'

  const displayName = user.name
  const username = (user.handle ?? '').replace(/^@/, '')
  const joinedDate = (user.joined ?? '').replace(/^Joined\s+/i, '')
  const bio = user.bio
  const numericFollowerCount = Number.isFinite(Number(followerCount)) ? Math.max(0, Number(followerCount)) : 0
  const numericFollowingCount = Number.isFinite(Number(followingCount)) ? Math.max(0, Number(followingCount)) : 0
  const shouldShowFollowMetadata = showFollowMetadata
  const resolvedSecondaryIcon = secondaryActionIcon ?? <ShareNetwork className="h-4 w-4" weight="bold" />
  const hasMobileActions = (allowProfileEditing || showSecondaryAction) && compactMobile
  const resolvedSecondaryClassName = secondaryActionClassName || (
    compactMobile
      ? 'inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-black/10 bg-white/55 px-2.5 text-[11px] font-semibold tracking-tight text-text shadow-none transition hover:bg-white active:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 md:h-9 md:w-40 md:flex-none md:rounded-xl md:px-4 md:text-[15px]'
      : 'inline-flex w-40 h-9 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white/60 px-4 text-[15px] font-semibold tracking-tight text-text shadow-none transition hover:bg-white active:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2'
  )

  useEffect(() => {
    if (!isMobileActionSheetOpen) return undefined
    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMobileActionSheetOpen(false)
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMobileActionSheetOpen])

  const openMobileActionSheet = () => setIsMobileActionSheetOpen(true)
  const closeMobileActionSheet = () => setIsMobileActionSheetOpen(false)

  const handleMobileShare = async () => {
    if (typeof onSecondaryAction === 'function') {
      onSecondaryAction()
      closeMobileActionSheet()
      return
    }

    if (typeof window === 'undefined') {
      closeMobileActionSheet()
      return
    }

    const shareUrl = window.location.href
    const shareTitle = displayName || 'Profile'

    try {
      if (navigator?.share) {
        await navigator.share({ title: shareTitle, url: shareUrl })
        closeMobileActionSheet()
        return
      }
    } catch {
      // Ignore aborted shares and fall back to clipboard where possible.
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl)
      }
    } catch {
      // Clipboard can fail in unsupported or restricted contexts.
    }

    closeMobileActionSheet()
  }

  const handleMobileEdit = () => {
    onEdit()
    closeMobileActionSheet()
  }

  return (
    <section className={containerClass}>
      <div className={coverWrapClass}>
        {!bannerFailed ? (
          <img
            src={bannerSrc}
            alt={bannerAlt}
            className={`h-full w-full object-cover ${compactMobile ? 'rounded-none md:rounded-t-3xl' : 'rounded-t-3xl'}`}
            onError={() => setFailedBannerSrc(bannerSrc)}
          />
        ) : (
          <div className={`h-full w-full bg-gradient-to-r from-slate-200 via-white to-orange-100 ${compactMobile ? 'rounded-none md:rounded-t-3xl' : 'rounded-t-3xl'}`} />
        )}
        <div className={`pointer-events-none absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/20 ${compactMobile ? 'rounded-none md:rounded-t-3xl' : 'rounded-t-3xl'}`} />

        <div className={compactMobile ? 'absolute -bottom-7 left-4 z-20 md:bottom-0 md:left-4 md:translate-y-1/2' : 'absolute bottom-0 left-4 z-20 translate-y-1/2 sm:left-8'}>
          <div className={compactMobile ? 'flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-accent/20 text-sm font-semibold text-accent ring-2 ring-white shadow-md md:h-20 md:w-20 md:text-base md:ring-4' : 'flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-accent/20 text-base font-semibold text-accent ring-4 ring-white shadow-md sm:h-24 sm:w-24 sm:text-lg'}>
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

      <div className={bodyClass}>
        {compactMobile ? (
          <div className="relative space-y-2.5 pt-8 md:hidden">
            {hasMobileActions ? (
              <button
                type="button"
                className="absolute right-0 top-0 inline-flex h-8 w-8 items-center justify-center border-0 bg-transparent p-0 text-text shadow-none transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                onClick={openMobileActionSheet}
                aria-label="Open profile actions"
                aria-haspopup="dialog"
                aria-expanded={isMobileActionSheetOpen}
              >
                <svg
                  aria-hidden="true"
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="currentColor"
                  className="block"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="9" cy="3.5" r="1.6" />
                  <circle cx="9" cy="9" r="1.6" />
                  <circle cx="9" cy="14.5" r="1.6" />
                </svg>
              </button>
            ) : null}

            <div className="min-w-0 pr-10">
              <h1 className="mb-0 text-[1.5rem] font-semibold leading-[1.02] tracking-tight text-text">
                {displayName}
              </h1>
              <p className="mb-0 mt-0.5 truncate text-[12px] text-muted">
                <span className="font-medium text-text">@{username}</span>
                <span className="mx-2 text-muted/80">&middot;</span>
                <span>Joined {joinedDate}</span>
              </p>
            </div>

            {shouldShowFollowMetadata ? (
              <div className="flex items-center gap-2 text-[11px] text-muted">
                <span className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white/40 px-2 py-0.5">
                  <span className="font-semibold text-text">{numericFollowerCount.toLocaleString()}</span> followers
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white/40 px-2 py-0.5">
                  <span className="font-semibold text-text">{numericFollowingCount.toLocaleString()}</span> following
                </span>
              </div>
            ) : null}

            <p className="mb-0 max-w-[38ch] text-[13px] leading-snug text-text">
              {bio}
            </p>
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:gap-x-6 md:gap-y-4">
          <div className={`min-w-0 ${compactMobile ? 'hidden md:block' : ''}`}>
            <div className={compactMobile ? 'w-full max-w-2xl -mt-1 pl-[4.15rem] md:-mt-2 md:pl-24' : 'w-full max-w-2xl -mt-2 pl-24 sm:-mt-4 sm:pl-28'}>
              <h1 className={compactMobile ? 'mt-0 text-[1.7rem] font-semibold tracking-tight leading-[0.98] text-text md:text-3xl' : 'mt-0 text-3xl md:text-4xl font-semibold tracking-tight leading-none text-text'}>
                {displayName}
              </h1>

              <div className={compactMobile ? 'mt-0.5 truncate text-[12px] text-muted md:mt-1 md:text-sm' : 'mt-1 text-sm text-muted truncate'}>
                <span className="font-medium text-text">@{username}</span>
                <span className="mx-2 text-muted/80">&middot;</span>
                <span>Joined {joinedDate}</span>
              </div>

              {shouldShowFollowMetadata ? (
                <div className={compactMobile ? 'mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted md:text-sm' : 'mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted'}>
                  <span className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white/40 px-2 py-0.5">
                    <span className="font-semibold text-text">{numericFollowerCount.toLocaleString()}</span> followers
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white/40 px-2 py-0.5">
                    <span className="font-semibold text-text">{numericFollowingCount.toLocaleString()}</span> following
                  </span>
                </div>
              ) : null}

              <div className={compactMobile ? 'mt-2.5 max-w-[580px] md:mt-3.5' : 'mt-3.5 max-w-[580px]'}>
                <p className={compactMobile ? 'mb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted/85 md:text-[10px] md:tracking-[0.18em]' : 'mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted/85'}>
                  Bio
                </p>
                <p className={compactMobile ? 'mb-0 text-[13px] leading-snug text-text md:text-[15px]' : 'mb-0 text-[15px] leading-snug text-text md:text-base'}>
                  {bio}
                </p>
              </div>
            </div>
          </div>

          <div className={compactMobile ? 'hidden w-full items-center gap-2 md:flex md:w-auto md:flex-col md:items-end md:justify-start md:self-start md:pt-10' : 'flex w-full flex-col gap-2 sm:flex-row sm:justify-end md:w-auto md:flex-col md:items-end md:justify-start md:self-start md:pt-10'}>
            {allowProfileEditing ? (
              <button
                type="button"
                className={compactMobile ? 'inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-orange-500/35 bg-accent px-2.5 text-[11px] font-semibold tracking-tight text-[#1f130c] shadow-sm transition hover:bg-[#ef6b2f] active:bg-[#e86124] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 md:h-9 md:w-40 md:flex-none md:rounded-xl md:gap-2 md:px-4 md:text-[15px]' : 'inline-flex w-40 h-9 items-center justify-center gap-2 rounded-xl border border-orange-500/35 bg-accent px-4 text-[15px] font-semibold tracking-tight text-[#1f130c] shadow-sm transition hover:bg-[#ef6b2f] active:bg-[#e86124] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2'}
                onClick={onEdit}
              >
                <PencilSimpleLine className={compactMobile ? 'h-3.5 w-3.5 md:h-4 md:w-4' : 'h-4 w-4'} weight="bold" />
                {primaryActionLabel}
              </button>
            ) : null}
            {showSecondaryAction ? (
              <button
                type="button"
                className={resolvedSecondaryClassName}
                onClick={onSecondaryAction}
                disabled={secondaryActionDisabled}
                onMouseEnter={onSecondaryActionMouseEnter}
                onMouseLeave={onSecondaryActionMouseLeave}
                onFocus={onSecondaryActionFocus}
                onBlur={onSecondaryActionBlur}
              >
                {resolvedSecondaryIcon}
                {secondaryActionLabel}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {compactMobile && hasMobileActions && isMobileActionSheetOpen ? (
        <div className="fixed inset-0 z-[80] md:hidden" role="dialog" aria-modal="true" aria-label="Profile actions">
          <button
            type="button"
            aria-label="Close profile actions"
            className="absolute inset-0 bg-black/45"
            onClick={closeMobileActionSheet}
          />
          <div className="absolute inset-x-3 bottom-3 rounded-2xl border border-black/10 bg-[var(--surface-elevated)] p-3 shadow-lg backdrop-blur-md">
            <div className="mb-2 px-1">
              <p className="mb-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Profile actions</p>
            </div>
            <div className="space-y-1.5">
              {allowProfileEditing ? (
                <button
                  type="button"
                  className="inline-flex w-full items-center gap-2 rounded-xl border border-black/10 bg-[var(--surface-3)] px-3 py-2.5 text-left text-sm font-semibold text-text shadow-none transition hover:bg-[var(--surface-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                  onClick={handleMobileEdit}
                >
                  <PencilSimpleLine className="h-4 w-4 text-accent" weight="bold" />
                  {primaryActionLabel}
                </button>
              ) : null}
              {showSecondaryAction ? (
                <button
                  type="button"
                  className="inline-flex w-full items-center gap-2 rounded-xl border border-black/10 bg-[var(--surface-3)] px-3 py-2.5 text-left text-sm font-semibold text-text shadow-none transition hover:bg-[var(--surface-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                  onClick={() => {
                    void handleMobileShare()
                  }}
                  disabled={secondaryActionDisabled}
                >
                  {resolvedSecondaryIcon}
                  {secondaryActionLabel}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
