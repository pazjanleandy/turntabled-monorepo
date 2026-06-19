function cx(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function SkeletonBlock({ className = '', rounded = 'rounded-xl', ...props }) {
  return <div aria-hidden="true" className={cx('skeleton-block', rounded, className)} {...props} />
}

export function SkeletonText({ rows = 3, className = '', widths = ['100%', '92%', '68%'] }) {
  return (
    <div className={cx('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <SkeletonBlock
          key={`skeleton-text-${index}`}
          className="h-3"
          rounded="rounded-full"
          style={{ width: widths[index % widths.length] }}
        />
      ))}
    </div>
  )
}

export function AlbumGridSkeleton({ count = 8, className = '' }) {
  return (
    <div
      className={cx('grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] md:gap-4', className)}
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, index) => (
        <article key={`album-grid-skeleton-${index}`} className="min-w-0">
          <SkeletonBlock className="aspect-square w-full" rounded="rounded-none" />
          <div className="mt-3 space-y-2 px-0.5">
            <SkeletonBlock className="h-3 w-[82%]" rounded="rounded-full" />
            <SkeletonBlock className="h-3 w-[58%]" rounded="rounded-full" />
            <SkeletonBlock className="h-2.5 w-[68%]" rounded="rounded-full" />
          </div>
        </article>
      ))}
    </div>
  )
}

export function RowListSkeleton({ count = 4, image = true, className = '' }) {
  return (
    <div className={cx('divide-y divide-black/8 dark:divide-white/10', className)} aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`row-list-skeleton-${index}`}
          className={cx('grid gap-3 py-4 first:pt-0', image ? 'grid-cols-[54px_minmax(0,1fr)]' : 'grid-cols-1')}
        >
          {image ? <SkeletonBlock className="h-[54px] w-[54px]" rounded="rounded-lg" /> : null}
          <div className="min-w-0 space-y-2">
            <SkeletonBlock className="h-3.5 w-[64%]" rounded="rounded-full" />
            <SkeletonBlock className="h-3 w-[42%]" rounded="rounded-full" />
            <SkeletonBlock className="h-3 w-[86%]" rounded="rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ReviewSkeleton({ compact = false, className = '' }) {
  return (
    <div className={cx('space-y-4', className)} aria-hidden="true">
      <div className={cx('grid gap-4', compact ? 'grid-cols-[76px_minmax(0,1fr)]' : 'md:grid-cols-[124px_minmax(0,1fr)]')}>
        <SkeletonBlock className={cx('aspect-square w-full', compact ? 'max-w-[76px]' : 'max-w-[124px]')} rounded="rounded-none" />
        <div className="min-w-0 space-y-3">
          <div className="flex items-center gap-2">
            <SkeletonBlock className="h-8 w-8" rounded="rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <SkeletonBlock className="h-3 w-[42%]" rounded="rounded-full" />
              <SkeletonBlock className="h-2.5 w-[28%]" rounded="rounded-full" />
            </div>
          </div>
          <SkeletonBlock className="h-5 w-[78%]" rounded="rounded-full" />
          <SkeletonText rows={compact ? 2 : 3} widths={['96%', '88%', '62%']} />
        </div>
      </div>
    </div>
  )
}

export function ContextPageSkeleton({ variant = 'album', className = '' }) {
  const isProfile = variant === 'profile'
  const isArtist = variant === 'artist'

  return (
    <section
      className={cx(
        'context-skeleton-shell overflow-hidden bg-transparent p-0',
        className,
      )}
      aria-label="Loading page content"
      aria-busy="true"
    >
      <div className="space-y-5">
        <div className="flex items-start gap-4 md:gap-6">
          <SkeletonBlock
            className={cx(
              'shrink-0',
              isProfile ? 'h-20 w-20 md:h-28 md:w-28' : isArtist ? 'h-24 w-24 md:h-36 md:w-36' : 'h-28 w-28 md:h-44 md:w-44',
            )}
            rounded={isProfile || isArtist ? 'rounded-full' : 'rounded-none'}
          />
          <div className="min-w-0 flex-1 pt-1">
            <SkeletonBlock className="h-3 w-24" rounded="rounded-full" />
            <SkeletonBlock className="mt-3 h-8 w-[78%] max-w-xl md:h-10" rounded="rounded-md" />
            <SkeletonBlock className="mt-3 h-3.5 w-[44%]" rounded="rounded-full" />
            <div className="mt-5 hidden gap-2 md:flex">
              <SkeletonBlock className="h-9 w-28" rounded="rounded-full" />
              <SkeletonBlock className="h-9 w-24" rounded="rounded-full" />
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-4">
            <SkeletonText rows={4} widths={['100%', '94%', '88%', '58%']} />
            {variant === 'album' ? (
              <RowListSkeleton count={5} image={false} />
            ) : (
              <AlbumGridSkeleton count={isProfile ? 4 : 6} />
            )}
          </div>
          <div className="space-y-3 border-t border-black/8 pt-5 md:border-l md:border-t-0 md:pl-5 md:pt-0">
            <SkeletonBlock className="h-3 w-28" rounded="rounded-full" />
            <RowListSkeleton count={3} image={!isProfile} />
          </div>
        </div>
      </div>
    </section>
  )
}
