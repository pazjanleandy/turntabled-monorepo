import { Camera, TrashSimple } from 'phosphor-react'

function ActionIconButton({ label, onClick, disabled, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/50 bg-black/45 text-white shadow-sm transition hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  )
}

export default function ProfileHeaderUpload({
  isSaving = false,
  bannerInputRef,
  avatarInputRef,
  onBannerChange,
  onAvatarChange,
  onBannerEdit,
  onAvatarEdit,
  onBannerRemove = null,
  onAvatarRemove = null,
  bannerPreviewUrl = '',
  avatarPreviewUrl = '',
  fallbackInitials = 'U',
}) {
  const hasBanner = Boolean(bannerPreviewUrl)
  const hasAvatar = Boolean(avatarPreviewUrl)

  return (
    <section className="rounded-2xl border border-black/10 bg-white/75 p-4">
      <input
        ref={bannerInputRef}
        type="file"
        id="profile-banner-upload"
        accept=".png,.jpg,.jpeg,image/png,image/jpeg"
        onChange={onBannerChange}
        className="sr-only"
      />
      <input
        ref={avatarInputRef}
        type="file"
        id="profile-avatar-upload"
        accept=".png,.jpg,.jpeg,image/png,image/jpeg"
        onChange={onAvatarChange}
        className="sr-only"
      />

      <div className="group/header relative">
        <div className="group/banner relative h-28 overflow-hidden rounded-xl border border-black/10 bg-gradient-to-r from-slate-200 via-white to-orange-100 sm:h-32">
          {hasBanner ? (
            <img src={bannerPreviewUrl} alt="Banner preview" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <p className="mb-0 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                Banner preview
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={onBannerEdit}
            disabled={isSaving}
            aria-label="Edit banner image"
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/10 transition hover:bg-black/35 focus-visible:bg-black/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-black/50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white opacity-100 sm:opacity-0 sm:transition sm:group-hover/banner:opacity-100 sm:group-focus-within/banner:opacity-100">
              <Camera size={14} weight="bold" />
              Edit banner
            </span>
          </button>

          <div className="absolute right-3 top-3 z-20 opacity-100 sm:opacity-0 sm:transition sm:group-hover/banner:opacity-100 sm:group-focus-within/banner:opacity-100">
            {hasBanner && onBannerRemove ? (
              <ActionIconButton
                label="Remove banner image"
                onClick={onBannerRemove}
                disabled={isSaving}
              >
                <TrashSimple size={14} weight="bold" />
              </ActionIconButton>
            ) : null}
          </div>
        </div>

        <div className="absolute -bottom-10 left-1/2 z-30 -translate-x-1/2 sm:left-4 sm:translate-x-0">
          <div className="group/avatar relative h-20 w-20 overflow-hidden rounded-full border-2 border-black/10 bg-accent/20 ring-4 ring-white sm:h-24 sm:w-24">
            {hasAvatar ? (
              <img src={avatarPreviewUrl} alt="Avatar preview" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-accent sm:text-base">
                {fallbackInitials}
              </span>
            )}

            <button
              type="button"
              onClick={onAvatarEdit}
              disabled={isSaving}
              aria-label="Edit profile image"
              className="absolute inset-0 z-10 flex items-center justify-center bg-black/0 text-white transition hover:bg-black/40 focus-visible:bg-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span className="inline-flex items-center gap-1 rounded-full border border-white/40 bg-black/50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] opacity-100 sm:opacity-0 sm:transition sm:group-hover/avatar:opacity-100 sm:group-focus-within/avatar:opacity-100">
                <Camera size={12} weight="bold" />
                Edit photo
              </span>
            </button>

            {hasAvatar && onAvatarRemove ? (
              <div className="absolute -left-0.5 -top-0.5 z-20 opacity-100 sm:opacity-0 sm:transition sm:group-hover/avatar:opacity-100 sm:group-focus-within/avatar:opacity-100">
                <ActionIconButton
                  label="Remove profile image"
                  onClick={onAvatarRemove}
                  disabled={isSaving}
                >
                  <TrashSimple size={13} weight="bold" />
                </ActionIconButton>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="pt-12 sm:pt-14">
        <p className="mb-0 text-xs text-muted">
          PNG or JPEG. Banner up to 5MB, avatar up to 2MB. Crop/resize opens after selection.
        </p>
      </div>
    </section>
  )
}
