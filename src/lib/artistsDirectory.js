export const ALPHABET_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

function normalizeLetter(value = '') {
  const first = String(value).trim().charAt(0).toUpperCase()
  return /^[A-Z]$/.test(first) ? first : '#'
}

export function groupArtistsByLetter(artists = []) {
  const groups = {}

  for (const artist of artists) {
    const letter = normalizeLetter(artist?.name)
    if (!groups[letter]) {
      groups[letter] = []
    }
    groups[letter].push(artist)
  }

  return groups
}

export function getAvailableLetters(groups = {}) {
  const available = new Set()

  for (const letter of Object.keys(groups)) {
    if (Array.isArray(groups[letter]) && groups[letter].length > 0) {
      available.add(letter)
    }
  }

  return available
}

export function sortLetters(left, right) {
  if (left === '#') return 1
  if (right === '#') return -1
  return left.localeCompare(right)
}

export function toTimestamp(value) {
  if (!value) return 0
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}

