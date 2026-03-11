import CoverImage from './CoverImage.jsx'

function getInitials(value = '') {
  const parts = String(value ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) return '?'
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export default function ActivityRow({
  icon,
  text,
  meta,
  cover,
  compact = false,
  compactMobile = false,
  desktopFeed = false,
  avatarUrl = '',
  username = '',
  action = '',
  albumTitle = '',
  artistName = '',
  time = '',
  ratingValue = null,
  sidebarMinimal = false,
}) {
  if (desktopFeed && !compact && !compactMobile) {
    return (
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 transition-colors duration-200 hover:bg-black/5">
        <div className="relative shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`${username || 'User'} avatar`}
              className="h-10 w-10 rounded-full border border-black/10 object-cover shadow-[0_10px_22px_-18px_rgba(15,23,42,0.7)]"
            />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-accent/12 text-[11px] font-semibold text-accent shadow-[0_10px_22px_-18px_rgba(15,23,42,0.7)]">
              {getInitials(username)}
            </span>
          )}
          <span className="absolute -bottom-1 -right-1 flex h-[18px] w-[18px] items-center justify-center rounded-full border border-[var(--surface-3)] bg-white/95 text-accent shadow-sm [&_svg]:h-2.5 [&_svg]:w-2.5">
            {icon}
          </span>
        </div>

        <div className="min-w-0">
          <div className="flex min-w-0 items-baseline gap-1.5 text-[0.95rem] leading-tight">
            <span className="shrink-0 font-semibold text-text">{username || 'Unknown user'}</span>
            <span className="shrink-0 font-medium text-black/50">{action}</span>
            <span className="min-w-0 truncate font-semibold italic text-text">
              {albumTitle || 'Unknown album'}
            </span>
            {typeof ratingValue === 'number' ? (
              <span className="shrink-0 rounded-full bg-accent/12 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-accent">
                {ratingValue}/5
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex min-w-0 items-center gap-2 text-[11px] leading-none text-muted">
            <span className="truncate">{artistName || meta}</span>
            {time ? <span className="h-1 w-1 shrink-0 rounded-full bg-black/15" /> : null}
            {time ? <span className="shrink-0">{time}</span> : null}
          </div>
        </div>

        {cover ? (
          <div className="shrink-0 pl-1">
            <CoverImage
              src={cover}
              alt={`${albumTitle || text} cover`}
              rounded="rounded-[14px]"
              className="h-11 w-11 border border-black/10 bg-black/5 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.8)]"
            />
          </div>
        ) : null}
      </div>
    )
  }

  const rowClasses = compact
    ? 'gap-3 px-3 py-2'
    : compactMobile
      ? 'gap-2.5 px-2.5 py-2 md:gap-4 md:px-4 md:py-3'
      : 'gap-4 px-4 py-3'
  const iconClasses = compact ? 'h-8 w-8' : compactMobile ? 'h-7 w-7 md:h-9 md:w-9' : 'h-9 w-9'
  const coverClasses = compact ? 'h-10 w-10' : compactMobile ? 'h-9 w-9 md:h-12 md:w-12' : 'h-12 w-12'
  const metaSpacing = compact || compactMobile ? 'space-y-0.5' : 'space-y-1'
  const compactRowShell = sidebarMinimal
    ? 'bg-transparent rounded-none shadow-none px-0 py-1.5 border-0'
    : `rounded-soft bg-white/85 shadow-subtle ${rowClasses}`
  const iconShellClasses = sidebarMinimal
    ? `${iconClasses} bg-black/4`
    : `rounded-full bg-accent/12 ${iconClasses}`
  const textClasses = compactMobile ? 'mb-0 text-[13px] font-semibold text-text md:text-sm' : 'mb-0 text-sm font-semibold text-text'
  const metaClasses = compactMobile ? 'mb-0 text-[10px] text-muted md:text-xs' : 'mb-0 text-xs text-muted'

  return (
    <div className={`vinyl-texture flex items-center justify-between ${compactMobile ? 'border border-black/8 md:border-0' : ''} ${compactRowShell}`}>
      <div className="flex items-center gap-3">
        <span className={`flex items-center justify-center text-accent ${iconShellClasses}`}>
          {icon}
        </span>
        <div className={metaSpacing}>
          <p className={textClasses}>{text}</p>
          <p className={metaClasses}>{meta}</p>
        </div>
      </div>
      {cover ? (
        <CoverImage
          src={cover}
          alt={`${text} cover`}
          rounded={sidebarMinimal ? 'rounded-[10px]' : 'rounded-none'}
          className={`${sidebarMinimal ? '' : 'shadow-subtle'} ${coverClasses}`}
        />
      ) : null}
    </div>
  )
}
