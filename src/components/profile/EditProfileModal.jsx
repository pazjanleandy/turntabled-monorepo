import { useEffect, useMemo, useState } from 'react'
import { X } from 'phosphor-react'
import CoverImage from '../CoverImage.jsx'
import { buildApiAuthHeaders } from '../../lib/apiAuth.js'
import {
  emitProfileUpdated,
  fetchCurrentProfile,
  uploadAvatarAndPersistPath,
  validateAvatarFile,
} from '../../lib/profileClient.js'

export default function EditProfileModal({
  isOpen,
  user,
  favorites,
  favoriteCovers,
  onClose,
  onReplaceFavorite,
  onSaved,
}) {
  const [name, setName] = useState(user?.name ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [selectedFile, setSelectedFile] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setName(user?.name ?? '')
    setBio(user?.bio ?? '')
    setSelectedFile(null)
    setErrorMessage('')
    setSuccessMessage('')
  }, [isOpen, user?.name, user?.bio])

  const hasPendingChanges = useMemo(() => {
    return name.trim() !== (user?.name ?? '') || bio.trim() !== (user?.bio ?? '') || Boolean(selectedFile)
  }, [name, bio, selectedFile, user?.name, user?.bio])

  const handleFileChange = (event) => {
    setErrorMessage('')
    setSuccessMessage('')

    const nextFile = event.target.files?.[0] ?? null
    if (!nextFile) {
      setSelectedFile(null)
      return
    }

    const validation = validateAvatarFile(nextFile)
    if (!validation.valid) {
      setSelectedFile(null)
      setErrorMessage(validation.message)
      return
    }

    setSelectedFile(nextFile)
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
      let latestAvatarProfile = null
      if (selectedFile) {
        latestAvatarProfile = await uploadAvatarAndPersistPath(selectedFile)
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

      // Always sync avatar/profile snapshot after save so text-only updates
      // never overwrite the currently uploaded avatar in UI state.
      const syncedProfile = latestAvatarProfile ?? (await fetchCurrentProfile().catch(() => null))
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

          <label className="space-y-2 text-sm font-semibold text-text">
            Change image
            <input
              type="file"
              accept=".png,.jpg,.jpeg,image/png,image/jpeg"
              onChange={handleFileChange}
              className="w-full rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium text-text shadow-[0_10px_20px_-18px_rgba(15,15,15,0.35)] outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
            />
            {selectedFile ? (
              <p className="mb-0 text-xs text-slate-600">Selected: {selectedFile.name}</p>
            ) : (
              <p className="mb-0 text-xs text-slate-500">Supported formats: PNG or JPEG, up to 2MB.</p>
            )}
          </label>

          {errorMessage ? (
            <p className="mb-0 text-xs font-semibold text-red-600">{errorMessage}</p>
          ) : null}
          {successMessage ? (
            <p className="mb-0 text-xs font-semibold text-emerald-700">{successMessage}</p>
          ) : null}

          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="mb-0 text-sm font-semibold text-text">
                Favorite albums (replace)
              </p>
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                {favorites.length} slots
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {favorites.map((album, index) => {
                const key = `${album.artist} - ${album.title}`
                return (
                  <div
                    key={key}
                    className="flex flex-col items-center gap-2 rounded-2xl border border-black/5 bg-white/70 p-3 text-center"
                  >
                    <CoverImage
                      src={favoriteCovers[key] ?? album.cover}
                      alt={`${album.title} cover`}
                      className="h-20 w-20 object-cover"
                    />
                    <div className="min-w-0">
                      <p className="mb-0 truncate text-xs font-semibold text-text">
                        {album.title}
                      </p>
                      <p className="mb-0 truncate text-[11px] text-muted">
                        {album.artist}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="rounded-full border border-black/10 bg-white px-3 py-1 text-[11px] font-semibold text-text shadow-[0_10px_20px_-18px_rgba(15,15,15,0.35)] transition hover:-translate-y-0.5 hover:bg-white"
                      onClick={() => onReplaceFavorite(index)}
                    >
                      Replace
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
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
  )
}
