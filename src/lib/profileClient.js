import { supabase } from '../supabase.js'
import { buildApiAuthHeaders } from './apiAuth.js'

export const PROFILE_EVENT_NAME = 'turntabled-profile-updated'
export const PROFILE_CACHE_KEY = 'turntabled:profile-cache'

const AVATAR_BUCKET = 'avatars'
const MAX_AVATAR_BYTES = 2 * 1024 * 1024
const MAX_COVER_BYTES = 5 * 1024 * 1024
const DEFAULT_AVATAR_SIZE = 512
const MIN_AVATAR_SIZE = 128
const MAX_AVATAR_SIZE = 1024
const DEFAULT_COVER_WIDTH = 1500
const DEFAULT_COVER_HEIGHT = 500
const MIN_COVER_WIDTH = 600
const MAX_COVER_WIDTH = 2400
const MIN_COVER_HEIGHT = 200
const MAX_COVER_HEIGHT = 1200
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

function getFilenameStem(filename = 'avatar') {
  const normalized = String(filename).trim()
  const index = normalized.lastIndexOf('.')
  if (index <= 0) return sanitizeFilename(normalized || 'avatar')
  return sanitizeFilename(normalized.slice(0, index) || 'avatar')
}

function ensureLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function clampNumber(value, min, max, fallback) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return fallback
  return Math.min(max, Math.max(min, numericValue))
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      const value = reader.result
      if (typeof value !== 'string' || !value.startsWith('data:')) {
        reject(new Error('Image upload failed: invalid image payload.'))
        return
      }
      resolve(value)
    }

    reader.onerror = () => {
      reject(new Error('Image upload failed: could not read selected file.'))
    }

    reader.readAsDataURL(file)
  })
}

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Image upload failed: unable to decode image.'))
    }

    image.src = objectUrl
  })
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

export async function resizeAvatarFile(file, options = {}) {
  const validation = validateAvatarFile(file)
  if (!validation.valid) {
    throw new Error(validation.message)
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('Image resizing is only available in the browser.')
  }

  const requestedType = options?.mimeType === 'image/png' ? 'image/png' : 'image/jpeg'
  const size = clampNumber(options?.size, MIN_AVATAR_SIZE, MAX_AVATAR_SIZE, DEFAULT_AVATAR_SIZE)
  const quality = clampNumber(options?.quality, 0.6, 0.95, 0.9)
  const image = await loadImageElement(file)
  const sourceWidth = image.naturalWidth || image.width
  const sourceHeight = image.naturalHeight || image.height
  if (!sourceWidth || !sourceHeight) {
    throw new Error('Image upload failed: unsupported image dimensions.')
  }

  let sourceSquare = Math.min(sourceWidth, sourceHeight)
  let sourceX = Math.max(0, (sourceWidth - sourceSquare) / 2)
  let sourceY = Math.max(0, (sourceHeight - sourceSquare) / 2)

  const crop = options?.crop
  if (crop && typeof crop === 'object') {
    const cropX = Number(crop.x)
    const cropY = Number(crop.y)
    const cropWidth = Number(crop.width)
    const cropHeight = Number(crop.height)

    if (
      Number.isFinite(cropX) &&
      Number.isFinite(cropY) &&
      Number.isFinite(cropWidth) &&
      Number.isFinite(cropHeight) &&
      cropWidth > 0 &&
      cropHeight > 0
    ) {
      const cropSquare = Math.min(cropWidth, cropHeight)
      const normalizedSquare = Math.min(Math.max(cropSquare, 1), Math.min(sourceWidth, sourceHeight))
      const maxX = Math.max(0, sourceWidth - normalizedSquare)
      const maxY = Math.max(0, sourceHeight - normalizedSquare)
      sourceSquare = normalizedSquare
      sourceX = clampNumber(cropX, 0, maxX, 0)
      sourceY = clampNumber(cropY, 0, maxY, 0)
    }
  }

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Image upload failed: browser does not support image canvas.')
  }

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceSquare,
    sourceSquare,
    0,
    0,
    size,
    size
  )

  const resizedBlob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Image upload failed: could not generate resized avatar.'))
          return
        }
        resolve(blob)
      },
      requestedType,
      requestedType === 'image/jpeg' ? quality : undefined
    )
  })

  const extension = requestedType === 'image/png' ? 'png' : 'jpg'
  const outputFilename = `${getFilenameStem(file.name)}-avatar-${size}.${extension}`
  return new File([resizedBlob], outputFilename, {
    type: requestedType,
    lastModified: Date.now(),
  })
}

export async function resizeCoverFile(file, options = {}) {
  const validation = validateCoverFile(file)
  if (!validation.valid) {
    throw new Error(validation.message)
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('Image resizing is only available in the browser.')
  }

  const requestedType = options?.mimeType === 'image/png' ? 'image/png' : 'image/jpeg'
  const width = Math.round(
    clampNumber(options?.width, MIN_COVER_WIDTH, MAX_COVER_WIDTH, DEFAULT_COVER_WIDTH)
  )
  const height = Math.round(
    clampNumber(options?.height, MIN_COVER_HEIGHT, MAX_COVER_HEIGHT, DEFAULT_COVER_HEIGHT)
  )
  const quality = clampNumber(options?.quality, 0.6, 0.95, 0.9)
  const targetRatio = width / height
  const image = await loadImageElement(file)
  const sourceWidth = image.naturalWidth || image.width
  const sourceHeight = image.naturalHeight || image.height
  if (!sourceWidth || !sourceHeight) {
    throw new Error('Cover upload failed: unsupported image dimensions.')
  }

  const sourceRatio = sourceWidth / sourceHeight
  let sourceCropWidth = sourceWidth
  let sourceCropHeight = sourceHeight
  let sourceX = 0
  let sourceY = 0

  if (sourceRatio > targetRatio) {
    sourceCropWidth = sourceHeight * targetRatio
    sourceX = Math.max(0, (sourceWidth - sourceCropWidth) / 2)
  } else {
    sourceCropHeight = sourceWidth / targetRatio
    sourceY = Math.max(0, (sourceHeight - sourceCropHeight) / 2)
  }

  const crop = options?.crop
  if (crop && typeof crop === 'object') {
    const cropX = Number(crop.x)
    const cropY = Number(crop.y)
    const cropWidth = Number(crop.width)
    const cropHeight = Number(crop.height)

    if (
      Number.isFinite(cropX) &&
      Number.isFinite(cropY) &&
      Number.isFinite(cropWidth) &&
      Number.isFinite(cropHeight) &&
      cropWidth > 0 &&
      cropHeight > 0
    ) {
      const normalizedCropWidth = Math.min(Math.max(cropWidth, 1), sourceWidth)
      const normalizedCropHeight = Math.min(Math.max(cropHeight, 1), sourceHeight)
      const maxX = Math.max(0, sourceWidth - normalizedCropWidth)
      const maxY = Math.max(0, sourceHeight - normalizedCropHeight)
      sourceCropWidth = normalizedCropWidth
      sourceCropHeight = normalizedCropHeight
      sourceX = clampNumber(cropX, 0, maxX, 0)
      sourceY = clampNumber(cropY, 0, maxY, 0)
    }
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Cover upload failed: browser does not support image canvas.')
  }

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceCropWidth,
    sourceCropHeight,
    0,
    0,
    width,
    height
  )

  const resizedBlob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Cover upload failed: could not generate resized cover image.'))
          return
        }
        resolve(blob)
      },
      requestedType,
      requestedType === 'image/jpeg' ? quality : undefined
    )
  })

  const extension = requestedType === 'image/png' ? 'png' : 'jpg'
  const outputFilename = `${getFilenameStem(file.name)}-cover-${width}x${height}.${extension}`
  return new File([resizedBlob], outputFilename, {
    type: requestedType,
    lastModified: Date.now(),
  })
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

  await getCurrentUserOrThrow()
  const dataUrl = await fileToDataUrl(file)
  const apiBase = import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE_URL ?? ''
  const authHeaders = await buildApiAuthHeaders()
  const response = await fetch(`${apiBase}/api/profile/avatar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify({
      filename: sanitizeFilename(file.name),
      mimeType: file.type,
      dataUrl,
    }),
  })
  const result = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(result?.error?.message ?? 'Image upload failed.')
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

  await getCurrentUserOrThrow()
  const dataUrl = await fileToDataUrl(file)
  const apiBase = import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE_URL ?? ''
  const authHeaders = await buildApiAuthHeaders()
  const response = await fetch(`${apiBase}/api/profile/cover`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify({
      filename: sanitizeFilename(file.name),
      mimeType: file.type,
      dataUrl,
    }),
  })
  const result = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(result?.error?.message ?? 'Cover upload failed.')
  }

  const profile = await fetchCurrentProfile()
  emitProfileUpdated(profile)
  return profile
}
