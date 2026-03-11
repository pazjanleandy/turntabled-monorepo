export const THEME_STORAGE_KEY = 'turntabled:theme'
export const THEME_LIGHT = 'light'
export const THEME_DARK = 'dark'

export function normalizeTheme(value) {
  return value === THEME_DARK ? THEME_DARK : THEME_LIGHT
}

export function getThemeFromStorage() {
  if (typeof window === 'undefined') return THEME_LIGHT
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY)
    return normalizeTheme(value)
  } catch {
    return THEME_LIGHT
  }
}

export function getInitialTheme() {
  if (typeof document === 'undefined') return THEME_LIGHT
  const fromDataset = document.documentElement.dataset.theme
  if (fromDataset === THEME_DARK || fromDataset === THEME_LIGHT) {
    return fromDataset
  }
  return getThemeFromStorage()
}

export function applyThemeToDocument(theme) {
  if (typeof document === 'undefined') return
  const normalized = normalizeTheme(theme)
  const root = document.documentElement
  root.dataset.theme = normalized
  root.classList.toggle('dark', normalized === THEME_DARK)
  root.style.colorScheme = normalized === THEME_DARK ? THEME_DARK : THEME_LIGHT
}

export function persistTheme(theme) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, normalizeTheme(theme))
  } catch {
    // Ignore storage write failures (private mode/restricted storage).
  }
}
