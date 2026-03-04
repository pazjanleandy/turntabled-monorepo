import { supabase } from '../supabase.js'

export const PROFILE_EVENT_NAME = 'turntabled-profile-updated'
export const PROFILE_CACHE_KEY = 'turntabled:profile-cache'

const AVATAR_BUCKET = 'avatars'
const MAX_AVATAR_BYTES = 2 * 1024 * 1024
const MAX_COVER_BYTES = 5 * 1024 * 1024
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg'])
const ALLOWED_EXTENSIONS = new Set(['png', 'jpg', 'jpeg'])

function getFileExtension(filename = '') {
  const normalized = String(filename).trim().toLowerCase()
  const index = normalized.lastIndexOf('.')
  if (index < 0) return ''
  return normalized.slice(index + 1)
}

function sanitizeFilename(filename = 'avatar.jpg') {
  return String(filename).replace(/[^a-zA-Z0-9._-]/g, '_')
}

function ensureLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function buildAvatarUrl(avatarPath) {
  if (typeof avatarPath !== 'string' || !avatarPath.trim()) return ''
  const normalized = avatarPath.trim()
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return normalized
  }
  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(normalized)
  return data?.publicUrl || ''
}

function buildCoverUrl(coverUrl) {
  if (typeof coverUrl !== 'string' || !coverUrl.trim()) return '/hero/hero1.jpg'
  return coverUrl.trim()
}

function normalizeUsername(user, dbUser) {
  if (typeof dbUser?.username === 'string' && dbUser.username.trim()) return dbUser.username.trim()
  if (typeof user?.user_metadata?.username === 'string' && user.user_metadata.username.trim()) {
    return user.user_metadata.username.trim()
  }
  if (typeof user?.email === 'string' && user.email.includes('@')) return user.email.split('@')[0]
  return ''
}

export function readCachedProfile() {
  if (!ensureLocalStorage()) return null
  try {
    const raw = window.localStorage.getItem(PROFILE_CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function writeCachedProfile(profile) {
  if (!ensureLocalStorage()) return
  window.localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile))
}

export function emitProfileUpdated(profile) {
  if (typeof window === 'undefined') return
  writeCachedProfile(profile)
  window.dispatchEvent(new CustomEvent(PROFILE_EVENT_NAME, { detail: profile }))
}

export function validateAvatarFile(file) {
  if (!file) {
    return { valid: false, message: 'Please select an image file.' }
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { valid: false, message: 'Image upload failed: maximum size is 2MB.' }
  }

  const extension = getFileExtension(file.name)
  if (!ALLOWED_EXTENSIONS.has(extension) || !ALLOWED_MIME_TYPES.has(file.type)) {
    return { valid: false, message: 'Image upload failed: only PNG or JPEG files are supported.' }
  }

  return { valid: true, message: '' }
}

async function getCurrentUserOrThrow() {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user?.id) {
    throw new Error('You must be signed in to update avatar.')
  }
  return data.user
}

async function findProfileRow(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,avatar_path,cover_url')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message || 'Failed to fetch profile.')
  }
  return data
}

export async function fetchCurrentProfile() {
  const user = await getCurrentUserOrThrow()

  const [{ data: dbUser, error: dbUserError }, profileRow] = await Promise.all([
    supabase.from('users').select('id,username,full_name,bio').eq('id', user.id).maybeSingle(),
    findProfileRow(user.id),
  ])

  if (dbUserError) {
    throw new Error(dbUserError.message || 'Failed to load user profile.')
  }

  const username = normalizeUsername(user, dbUser)
  const profile = {
    userId: user.id,
    username,
    fullName: dbUser?.full_name || username,
    bio: dbUser?.bio || '',
    avatarPath: profileRow?.avatar_path || '',
    coverUrl: profileRow?.cover_url || '',
  }

  return {
    ...profile,
    avatarUrl: buildAvatarUrl(profile.avatarPath),
    coverUrl: buildCoverUrl(profile.coverUrl),
  }
}

export async function uploadAvatarAndPersistPath(file) {
  const validation = validateAvatarFile(file)
  if (!validation.valid) {
    throw new Error(validation.message)
  }

  const user = await getCurrentUserOrThrow()
  const extension = getFileExtension(file.name) || 'jpg'
  const avatarPath = `${user.id}/${Date.now()}-${sanitizeFilename(file.name)}`
  const contentType = extension === 'png' ? 'image/png' : 'image/jpeg'

  const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(avatarPath, file, {
    cacheControl: '3600',
    upsert: true,
    contentType,
  })

  if (uploadError) {
    throw new Error(`Image upload failed: ${uploadError.message}`)
  }

  const { error: upsertProfileError } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      avatar_path: avatarPath,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  )

  if (upsertProfileError) {
    throw new Error(`Failed to save avatar path: ${upsertProfileError.message}`)
  }

  const profile = await fetchCurrentProfile()
  emitProfileUpdated(profile)
  return profile
}

export function validateCoverFile(file) {
  if (!file) {
    return { valid: false, message: 'Please select a cover image file.' }
  }
  if (file.size > MAX_COVER_BYTES) {
    return { valid: false, message: 'Cover upload failed: maximum size is 5MB.' }
  }

  const extension = getFileExtension(file.name)
  if (!ALLOWED_EXTENSIONS.has(extension) || !ALLOWED_MIME_TYPES.has(file.type)) {
    return { valid: false, message: 'Cover upload failed: only PNG or JPEG files are supported.' }
  }

  return { valid: true, message: '' }
}

export async function uploadCoverAndPersistUrl(file) {
  const validation = validateCoverFile(file)
  if (!validation.valid) {
    throw new Error(validation.message)
  }

  const user = await getCurrentUserOrThrow()
  const extension = getFileExtension(file.name) || 'jpg'
  const coverPath = `${user.id}/cover`
  const contentType = extension === 'png' ? 'image/png' : 'image/jpeg'

  const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(coverPath, file, {
    cacheControl: '3600',
    upsert: true,
    contentType,
  })

  if (uploadError) {
    throw new Error(`Cover upload failed: ${uploadError.message}`)
  }

  const { data: urlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(coverPath)
  const publicUrl = urlData?.publicUrl ?? ''
  if (!publicUrl) {
    throw new Error('Cover upload failed: could not retrieve public URL.')
  }

  const { error: upsertProfileError } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      cover_url: publicUrl,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  )

  if (upsertProfileError) {
    throw new Error(`Failed to save cover URL: ${upsertProfileError.message}`)
  }

  const profile = await fetchCurrentProfile()
  emitProfileUpdated(profile)
  return profile
}
