import CoverImage from '../CoverImage.jsx'

export default function AlbumCover({ src, alt, className = '', imageClassName = '' }) {
  return (
    <CoverImage
      src={src}
      alt={alt}
      className={`w-full ${className}`}
      imageClassName={imageClassName}
    />
  )
}
