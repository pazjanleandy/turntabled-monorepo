import { fallbackCover } from './coverFallback.js'

function resolveRoundedClass(rounded) {
  if (rounded === false || rounded == null) return ''
  if (rounded === true) return 'rounded-xl'
  if (typeof rounded === 'string') return rounded
  return ''
}

export default function CoverImage({
  src,
  alt = 'Album cover',
  size,
  className = '',
  rounded = 'rounded-none',
  loading = 'lazy',
  priority = false,
  style,
  imageClassName = '',
  imageStyle,
}) {
  const normalizedSrc = typeof src === 'string' && src.trim() ? src.trim() : fallbackCover
  const roundedClass = resolveRoundedClass(rounded)
  const sizeClass = typeof size === 'string' ? size : ''
  const sizeStyle =
    typeof size === 'number'
      ? {
          width: `${size}px`,
          height: `${size}px`,
        }
      : {}

  return (
    <div
      className={`${roundedClass} ${sizeClass} bg-black/5 overflow-hidden ${className} aspect-square`}
      style={{ ...sizeStyle, ...style }}
    >
      <img
        src={normalizedSrc}
        alt={alt}
        className={`h-full w-full object-cover object-center ${imageClassName}`}
        style={imageStyle}
        loading={priority ? 'eager' : loading}
        onError={(event) => {
          if (event.currentTarget.src !== fallbackCover) {
            event.currentTarget.src = fallbackCover
          }
        }}
      />
    </div>
  )
}
