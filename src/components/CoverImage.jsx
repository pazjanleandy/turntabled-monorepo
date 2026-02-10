import { fallbackCover } from './coverFallback.js'

export default function CoverImage({ src, alt, className = '', style }) {
  return (
    <img
      src={src || fallbackCover}
      alt={alt}
      className={className}
      style={style}
      loading="lazy"
      onError={(event) => {
        event.currentTarget.src = fallbackCover
      }}
    />
  )
}
