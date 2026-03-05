import { ALPHABET_LETTERS } from '../../lib/artistsDirectory.js'

export default function ArtistsAZIndex({
  activeLetter = '',
  availableLetters = [],
  onSelectLetter,
  orientation = 'vertical',
  className = '',
}) {
  const isVertical = orientation === 'vertical'
  const availableSet =
    availableLetters instanceof Set ? availableLetters : new Set(availableLetters ?? [])

  return (
    <nav
      aria-label="Artist alphabetical index"
      className={[
        'border border-black/5 shadow-[0_12px_24px_-20px_rgba(15,15,15,0.3)]',
        isVertical
          ? 'flex flex-col items-center gap-1 rounded-2xl p-2'
          : 'flex items-center gap-1 overflow-x-auto rounded-xl px-2 py-2',
        className,
      ].join(' ')}
    >
      {ALPHABET_LETTERS.map((letter) => {
        const isAvailable = availableSet.has(letter)
        const isActive = activeLetter === letter

        return (
          <button
            key={letter}
            type="button"
            onClick={() => isAvailable && onSelectLetter?.(letter)}
            disabled={!isAvailable}
            aria-current={isActive ? 'true' : undefined}
            aria-label={`Jump to ${letter}`}
            className={[
              'inline-flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-semibold uppercase tracking-[0.12em] transition duration-150',
              isAvailable
                ? isActive
                  ? 'bg-accent text-white'
                  : 'text-text hover:bg-accent/15 hover:text-accent'
                : 'cursor-not-allowed text-muted/35',
            ].join(' ')}
          >
            {letter}
          </button>
        )
      })}
    </nav>
  )
}
