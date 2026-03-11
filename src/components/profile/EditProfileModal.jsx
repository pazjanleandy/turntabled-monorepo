import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'phosphor-react'
import LastFmConnectButton from '../LastFmConnectButton.jsx'
import AvatarResizeModal from './AvatarResizeModal.jsx'
import BannerResizeModal from './BannerResizeModal.jsx'
import ProfileHeaderUpload from './ProfileHeaderUpload.jsx'
import { buildApiAuthHeaders } from '../../lib/apiAuth.js'
import {
  emitProfileUpdated,
  fetchCurrentProfile,
  uploadAvatarAndPersistPath,
  uploadCoverAndPersistUrl,
  validateAvatarFile,
  validateCoverFile,
} from '../../lib/profileClient.js'

export default function EditProfileModal({
  isOpen,
  user,
  avatarSrc = '',
  bannerSrc = '/hero/hero1.jpg',
  lastfmUsername = '',
  onDisconnectLastFm = null,
  onClose,
  onSaved,
}) {
  const [name, setName] = useState(user?.name ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [selectedFile, setSelectedFile] = useState(null)
  const [selectedBannerFile, setSelectedBannerFile] = useState(null)
  const [avatarResizeSourceFile, setAvatarResizeSourceFile] = useState(null)
  const [isAvatarResizeOpen, setIsAvatarResizeOpen] = useState(false)
  const [bannerResizeSourceFile, setBannerResizeSourceFile] = useState(null)
  const [isBannerResizeOpen, setIsBannerResizeOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const fileInputRef = useRef(null)
  const bannerFileInputRef = useRef(null)
  const avatarPreviewFile = avatarResizeSourceFile ?? selectedFile
  const bannerPreviewFile = bannerResizeSourceFile ?? selectedBannerFile

  const avatarPreviewUrl = useMemo(() => {
    if (!avatarPreviewFile) return ''
    return URL.createObjectURL(avatarPreviewFile)
  }, [avatarPreviewFile])

  const bannerPreviewUrl = useMemo(() => {
    if (!bannerPreviewFile) return ''
    return URL.createObjectURL(bannerPreviewFile)
  }, [bannerPreviewFile])
  const resolvedAvatarPreviewUrl = avatarPreviewUrl || avatarSrc || ''
  const resolvedBannerPreviewUrl = bannerPreviewUrl || bannerSrc || ''

  useEffect(() => {
    if (!avatarPreviewUrl) return undefined
    return () => URL.revokeObjectURL(avatarPreviewUrl)
  }, [avatarPreviewUrl])

  useEffect(() => {
    if (!bannerPreviewUrl) return undefined
    return () => URL.revokeObjectURL(bannerPreviewUrl)
  }, [bannerPreviewUrl])

  const fallbackInitials = useMemo(() => {
    const nameValue = (name || user?.name || '').trim()
    if (!nameValue) return 'U'
    return nameValue
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'U'
  }, [name, user?.name])

  const resetFileInput = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const resetBannerInput = useCallback(() => {
    if (bannerFileInputRef.current) {
      bannerFileInputRef.current.value = ''
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return
    setName(user?.name ?? '')
    setBio(user?.bio ?? '')
    setSelectedFile(null)
    setSelectedBannerFile(null)
    setAvatarResizeSourceFile(null)
    setIsAvatarResizeOpen(false)
    setBannerResizeSourceFile(null)
    setIsBannerResizeOpen(false)
    setErrorMessage('')
    setSuccessMessage('')
    resetFileInput()
    resetBannerInput()
  }, [isOpen, user?.name, user?.bio, resetFileInput, resetBannerInput])

  const hasPendingChanges = useMemo(() => {
    return (
      name.trim() !== (user?.name ?? '') ||
      bio.trim() !== (user?.bio ?? '') ||
      Boolean(selectedFile) ||
      Boolean(selectedBannerFile)
    )
  }, [name, bio, selectedFile, selectedBannerFile, user?.name, user?.bio])

  const handleFileChange = (event) => {
    setErrorMessage('')
    setSuccessMessage('')

    const nextFile = event.target.files?.[0] ?? null
    if (!nextFile) {
      return
    }

    const validation = validateAvatarFile(nextFile)
    if (!validation.valid) {
      setErrorMessage(validation.message)
      resetFileInput()
      return
    }

    setAvatarResizeSourceFile(nextFile)
    setIsAvatarResizeOpen(true)
  }

  const handleBannerFileChange = (event) => {
    setErrorMessage('')
    setSuccessMessage('')

    const nextFile = event.target.files?.[0] ?? null
    if (!nextFile) {
      return
    }

    const validation = validateCoverFile(nextFile)
    if (!validation.valid) {
      setErrorMessage(validation.message)
      resetBannerInput()
      return
    }

    setBannerResizeSourceFile(nextFile)
    setIsBannerResizeOpen(true)
  }

  const handleChooseImageClick = () => {
    if (isSaving) return
    fileInputRef.current?.click()
  }

  const handleChooseBannerClick = () => {
    if (isSaving) return
    bannerFileInputRef.current?.click()
  }

  const handleRemoveAvatarSelection = () => {
    if (isSaving) return
    setSelectedFile(null)
    setAvatarResizeSourceFile(null)
    setIsAvatarResizeOpen(false)
    setErrorMessage('')
    setSuccessMessage('')
    resetFileInput()
  }

  const handleRemoveBannerSelection = () => {
    if (isSaving) return
    setSelectedBannerFile(null)
    setBannerResizeSourceFile(null)
    setIsBannerResizeOpen(false)
    setErrorMessage('')
    setSuccessMessage('')
    resetBannerInput()
  }

  const handleAvatarResizeClose = () => {
    setAvatarResizeSourceFile(null)
    setIsAvatarResizeOpen(false)
    resetFileInput()
  }

  const handleBannerResizeClose = () => {
    setBannerResizeSourceFile(null)
    setIsBannerResizeOpen(false)
    resetBannerInput()
  }

  const handleAvatarResizeConfirm = async (resizedFile) => {
    const validation = validateAvatarFile(resizedFile)
    if (!validation.valid) {
      throw new Error(validation.message)
    }

    setSelectedFile(resizedFile)
    setAvatarResizeSourceFile(null)
    setIsAvatarResizeOpen(false)
    setErrorMessage('')
    setSuccessMessage('')
    resetFileInput()
  }

  const handleBannerResizeConfirm = async (resizedFile) => {
    const validation = validateCoverFile(resizedFile)
    if (!validation.valid) {
      throw new Error(validation.message)
    }

    setSelectedBannerFile(resizedFile)
    setBannerResizeSourceFile(null)
    setIsBannerResizeOpen(false)
    setErrorMessage('')
    setSuccessMessage('')
    resetBannerInput()
  }

  const handleSaveChanges = async () => {
    setErrorMessage('')
    setSuccessMessage('')

    if (!hasPendingChanges) {
      setErrorMessage('No changes to save.')
      return
    }

    setIsSaving(true)
    try {
      let latestMediaProfile = null
      if (selectedFile) {
        latestMediaProfile = await uploadAvatarAndPersistPath(selectedFile)
      }
      if (selectedBannerFile) {
        latestMediaProfile = await uploadCoverAndPersistUrl(selectedBannerFile)
      }

      const shouldPatchProfileText = name.trim() !== (user?.name ?? '') || bio.trim() !== (user?.bio ?? '')
      let result = null

      if (shouldPatchProfileText) {
        const apiBase = import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE_URL ?? ''
        const authHeaders = await buildApiAuthHeaders()
        const response = await fetch(`${apiBase}/api/profile`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({
            fullName: name.trim(),
            bio: bio.trim(),
          }),
        })

        result = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(result?.error?.message ?? 'Failed to save profile changes.')
        }
      }

      const syncedProfile = latestMediaProfile ?? (await fetchCurrentProfile().catch(() => null))
      if (syncedProfile) {
        emitProfileUpdated(syncedProfile)
      }

      if (result || syncedProfile) {
        const payload = result ?? { user: {} }
        payload.user = payload.user ?? {}
        if (syncedProfile) {
          payload.user.username = payload.user.username || syncedProfile.username
          payload.user.fullName = payload.user.fullName || syncedProfile.fullName
          payload.user.bio = payload.user.bio ?? syncedProfile.bio
          payload.user.avatarUrl = syncedProfile.avatarUrl
          payload.user.coverUrl = syncedProfile.coverUrl
        }
        onSaved?.(payload)
      }

      setSuccessMessage('Profile updated successfully.')
      onClose?.()
    } catch (error) {
      setErrorMessage(error?.message ?? 'Unexpected error while saving changes.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8"
        role="dialog"
        aria-modal="true"
        onClick={onClose}
      >
        <div
          className="scrollbar-sleek w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-black/5 bg-white p-6 shadow-[0_28px_60px_-34px_rgba(15,15,15,0.55)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
                Edit profile
              </p>
              <h2 className="mb-0 text-xl text-text">Update your details</h2>
            </div>
            <button
              className="rounded-full border border-black/10 p-2 text-muted transition hover:text-text"
              onClick={onClose}
              aria-label="Close edit profile"
            >
              <X size={16} weight="bold" />
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4">
            <ProfileHeaderUpload
              isSaving={isSaving}
              bannerInputRef={bannerFileInputRef}
              avatarInputRef={fileInputRef}
              onBannerChange={handleBannerFileChange}
              onAvatarChange={handleFileChange}
              onBannerEdit={handleChooseBannerClick}
              onAvatarEdit={handleChooseImageClick}
              onBannerRemove={bannerPreviewFile ? handleRemoveBannerSelection : null}
              onAvatarRemove={avatarPreviewFile ? handleRemoveAvatarSelection : null}
              bannerPreviewUrl={resolvedBannerPreviewUrl}
              avatarPreviewUrl={resolvedAvatarPreviewUrl}
              fallbackInitials={fallbackInitials}
            />

            <label className="space-y-2 text-sm font-semibold text-text">
              Change name
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium text-text shadow-[0_10px_20px_-18px_rgba(15,15,15,0.35)] outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
              />
            </label>

            <label className="space-y-2 text-sm font-semibold text-text">
              Change bio
              <textarea
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                rows={3}
                className="w-full resize-none rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium text-text shadow-[0_10px_20px_-18px_rgba(15,15,15,0.35)] outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
              />
            </label>

            <section className="rounded-xl border border-black/10 bg-white/75 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center">
                    <img
                      src="/lastfm/lastfm.png"
                      alt="Last.fm"
                      className="h-5 w-5 object-contain"
                    />
                  </span>
                  <div>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                      Integrations
                    </p>
                    <h3 className="mb-0 text-base text-text">Last.fm connection</h3>
                    <p className="mb-0 mt-1 text-xs text-slate-600">
                      Link Last.fm to pull your recent listening history into your profile.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-2">
                {lastfmUsername ? (
                  <>
                    <span className="inline-flex items-center self-start rounded-full border border-orange-500/25 bg-accent/15 px-2.5 py-1 text-[11px] font-semibold text-accent">
                      Connected as {lastfmUsername}
                    </span>
                    <button
                      type="button"
                      className="h-9 rounded-lg border border-red-200 bg-white/90 px-3 text-xs font-semibold text-slate-700 shadow-none transition hover:-translate-y-0.5 hover:border-red-300 hover:text-red-700 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                      onClick={() => {
                        if (typeof onDisconnectLastFm === 'function') onDisconnectLastFm()
                      }}
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <LastFmConnectButton className="w-full shadow-none text-sm" />
                )}
              </div>
            </section>

            {errorMessage ? (
              <p className="mb-0 text-xs font-semibold text-red-600">{errorMessage}</p>
            ) : null}
            {successMessage ? (
              <p className="mb-0 text-xs font-semibold text-emerald-700">{successMessage}</p>
            ) : null}
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button
              className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-text shadow-[0_10px_20px_-16px_rgba(15,15,15,0.35)] transition hover:-translate-y-0.5 hover:bg-white"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleSaveChanges}
              disabled={isSaving}
            >
              {isSaving ? 'Saving changes...' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>

      <AvatarResizeModal
        isOpen={isAvatarResizeOpen}
        file={avatarResizeSourceFile}
        onClose={handleAvatarResizeClose}
        onConfirm={handleAvatarResizeConfirm}
      />
      <BannerResizeModal
        isOpen={isBannerResizeOpen}
        file={bannerResizeSourceFile}
        onClose={handleBannerResizeClose}
        onConfirm={handleBannerResizeConfirm}
      />
    </>
  )
}
