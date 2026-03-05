import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MagnifyingGlassMinus, MagnifyingGlassPlus, X } from 'phosphor-react'
import { resizeAvatarFile } from '../../lib/profileClient.js'

const MIN_ZOOM_PERCENT = 100
const MAX_ZOOM_PERCENT = 320
const AVATAR_OUTPUT_SIZE = 512
const JPEG_QUALITY = 0.9
const CROP_MARGIN_PX = 24

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function getPanBounds(imageSize, cropSize, zoom) {
  const width = Number(imageSize?.width) || 0
  const height = Number(imageSize?.height) || 0
  const view = Number(cropSize) || 0

  if (!width || !height || !view) {
    return {
      maxX: 0,
      maxY: 0,
      scale: 1,
      renderWidth: view,
      renderHeight: view,
    }
  }

  const baseScale = Math.max(view / width, view / height)
  const scale = baseScale * zoom
  const renderWidth = width * scale
  const renderHeight = height * scale

  return {
    maxX: Math.max(0, (renderWidth - view) / 2),
    maxY: Math.max(0, (renderHeight - view) / 2),
    scale,
    renderWidth,
    renderHeight,
  }
}

export default function AvatarResizeModal({ isOpen, file, onClose, onConfirm }) {
  const [zoomPercent, setZoomPercent] = useState(MIN_ZOOM_PERCENT)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [stageSize, setStageSize] = useState(320)
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })

  const previewUrl = useMemo(() => {
    if (!file) return ''
    return URL.createObjectURL(file)
  }, [file])

  const cropStageRef = useRef(null)
  const dragStateRef = useRef(null)

  const zoom = zoomPercent / 100
  const cropSize = useMemo(() => {
    if (!stageSize) return 0
    const target = stageSize - CROP_MARGIN_PX * 2
    const minSize = Math.min(160, stageSize)
    return clampNumber(target, minSize, stageSize)
  }, [stageSize])

  const panBounds = useMemo(
    () => getPanBounds(imageSize, cropSize, zoom),
    [imageSize, cropSize, zoom]
  )

  const clampPan = useCallback(
    (nextPan) => ({
      x: clampNumber(Number(nextPan?.x) || 0, -panBounds.maxX, panBounds.maxX),
      y: clampNumber(Number(nextPan?.y) || 0, -panBounds.maxY, panBounds.maxY),
    }),
    [panBounds.maxX, panBounds.maxY]
  )

  useEffect(() => {
    if (!previewUrl) return undefined
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  useEffect(() => {
    if (!isOpen || !file) return
    setZoomPercent(MIN_ZOOM_PERCENT)
    setPan({ x: 0, y: 0 })
    setIsDragging(false)
    setIsResizing(false)
    setErrorMessage('')
    setImageSize({ width: 0, height: 0 })
    dragStateRef.current = null
  }, [isOpen, file])

  useEffect(() => {
    if (!isOpen) return undefined

    const syncStageSize = () => {
      const next = cropStageRef.current?.getBoundingClientRect()?.width ?? 0
      if (next > 0) setStageSize(next)
    }

    syncStageSize()
    window.addEventListener('resize', syncStageSize)
    return () => window.removeEventListener('resize', syncStageSize)
  }, [isOpen])

  useEffect(() => {
    setPan((current) => {
      const next = clampPan(current)
      if (next.x === current.x && next.y === current.y) {
        return current
      }
      return next
    })
  }, [clampPan])

  const handleClose = () => {
    if (isResizing) return
    setErrorMessage('')
    setIsDragging(false)
    dragStateRef.current = null
    onClose?.()
  }

  const handlePointerDown = (event) => {
    if (isResizing || !imageSize.width || !imageSize.height) return
    event.preventDefault()

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPan: { ...pan },
    }
    setIsDragging(true)
    if (event.currentTarget.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId)
    }
  }

  const handlePointerMove = (event) => {
    const dragState = dragStateRef.current
    if (!dragState || dragState.pointerId !== event.pointerId) return

    const nextPan = clampPan({
      x: dragState.startPan.x + (event.clientX - dragState.startX),
      y: dragState.startPan.y + (event.clientY - dragState.startY),
    })
    setPan(nextPan)
  }

  const releaseDrag = (event) => {
    const dragState = dragStateRef.current
    if (!dragState || dragState.pointerId !== event.pointerId) return
    dragStateRef.current = null
    setIsDragging(false)
    if (event.currentTarget.releasePointerCapture) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId)
      } catch {
        // ignore release errors for browsers without active capture
      }
    }
  }

  const handleConfirm = async () => {
    if (!file || isResizing) return
    if (!imageSize.width || !imageSize.height || !stageSize || !cropSize || !panBounds.scale) {
      setErrorMessage('Could not read image dimensions for cropping.')
      return
    }

    setIsResizing(true)
    setErrorMessage('')

    try {
      const cropLeft = (stageSize - cropSize) / 2
      const cropTop = (stageSize - cropSize) / 2
      const imageLeft = (stageSize - panBounds.renderWidth) / 2 + pan.x
      const imageTop = (stageSize - panBounds.renderHeight) / 2 + pan.y
      const sourceX = (cropLeft - imageLeft) / panBounds.scale
      const sourceY = (cropTop - imageTop) / panBounds.scale
      const sourceSize = cropSize / panBounds.scale
      const resizedFile = await resizeAvatarFile(file, {
        size: AVATAR_OUTPUT_SIZE,
        mimeType: 'image/jpeg',
        quality: JPEG_QUALITY,
        crop: {
          x: sourceX,
          y: sourceY,
          width: sourceSize,
          height: sourceSize,
        },
      })

      await onConfirm?.(resizedFile)
    } catch (error) {
      setErrorMessage(error?.message ?? 'Failed to resize avatar image.')
    } finally {
      setIsResizing(false)
    }
  }

  if (!isOpen || !file) return null

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-label="Resize avatar image"
      onClick={handleClose}
    >
      <div
        className="scrollbar-sleek w-full max-w-2xl rounded-2xl border border-black/5 bg-white p-6 shadow-[0_28px_60px_-34px_rgba(15,15,15,0.55)] vinyl-texture"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
              Edit media
            </p>
            <h2 className="mb-0 text-xl text-text">Resize avatar</h2>
          </div>
          <button
            type="button"
            className="rounded-full border border-black/10 p-2 text-muted transition hover:text-text disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleClose}
            aria-label="Close avatar resize modal"
            disabled={isResizing}
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        <div className="mt-5 rounded-2xl bg-slate-900 p-4">
          <div className="flex items-center justify-center">
            <div
              ref={cropStageRef}
              className={`relative aspect-square w-full max-w-[36rem] overflow-hidden rounded-xl bg-black/95 touch-none ${
                isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={releaseDrag}
              onPointerCancel={releaseDrag}
            >
              <img
                src={previewUrl}
                alt="Avatar crop preview"
                onLoad={(event) => {
                  const target = event.currentTarget
                  const width = target.naturalWidth || 0
                  const height = target.naturalHeight || 0
                  if (width && height) {
                    setImageSize({ width, height })
                  }
                }}
                draggable={false}
                className="pointer-events-none absolute left-1/2 top-1/2 select-none max-w-none"
                style={{
                  width: `${panBounds.renderWidth || stageSize}px`,
                  height: `${panBounds.renderHeight || stageSize}px`,
                  transform: `translate(-50%, -50%) translate3d(${pan.x}px, ${pan.y}px, 0)`,
                  willChange: 'transform',
                }}
              />
              <div
                className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-2 border-accent"
                style={{
                  width: `${cropSize}px`,
                  height: `${cropSize}px`,
                  boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.56)',
                }}
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 text-white/80">
            <MagnifyingGlassMinus size={18} />
            <input
              type="range"
              min={MIN_ZOOM_PERCENT}
              max={MAX_ZOOM_PERCENT}
              value={zoomPercent}
              onChange={(event) =>
                setZoomPercent(
                  clampNumber(Number(event.target.value) || MIN_ZOOM_PERCENT, MIN_ZOOM_PERCENT, MAX_ZOOM_PERCENT)
                )
              }
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/25 accent-[#f7793e]"
              disabled={isResizing}
            />
            <MagnifyingGlassPlus size={18} />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs font-semibold text-white/60">
            <span>Zoom: {zoomPercent}%</span>
            <button
              type="button"
              className="rounded-full border border-white/25 px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-white/75 transition hover:border-white/45 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => {
                setZoomPercent(MIN_ZOOM_PERCENT)
                setPan({ x: 0, y: 0 })
              }}
              disabled={isResizing}
            >
              Reset
            </button>
          </div>
          <p className="mb-0 mt-3 text-xs text-white/55">Drag image to reposition inside the orange crop box.</p>
          <p className="mb-0 mt-1 text-xs text-white/45">
            Export is fixed at 512 x 512 as JPEG.
          </p>
        </div>

        {errorMessage ? <p className="mb-0 mt-4 text-sm font-semibold text-red-600">{errorMessage}</p> : null}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-text shadow-[0_10px_20px_-16px_rgba(15,15,15,0.35)] transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleClose}
            disabled={isResizing}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleConfirm}
            disabled={isResizing}
          >
            {isResizing ? 'Applying...' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  )
}
