import { useState } from 'react'
import ReviewRow from './ReviewRow.jsx'

const TABS = [
  { id: 'all', label: 'All reviews' },
  { id: 'drafts', label: 'Drafts' },
]

export default function ReviewsSection({ reviews = [], drafts = [], asCard = true }) {
  const [activeTab, setActiveTab] = useState('all')
  const items = activeTab === 'all' ? reviews : drafts
  const sectionClass = asCard
    ? 'card vinyl-texture border border-black/5 shadow-sm'
    : 'space-y-4'

  return (
    <section className={sectionClass}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            Reviews
          </p>
          <h2 className="mb-0 text-lg text-text">Your write-ups</h2>
        </div>
        <div className="flex items-center gap-2">
          {TABS.map((tab) => {
            const isActive = tab.id === activeTab
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={[
                  'rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2',
                  isActive
                    ? 'border-accent/40 bg-accent/15 text-accent'
                    : 'border-black/10 bg-white/60 text-slate-600 hover:text-text',
                ].join(' ')}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {items.length ? (
          items.map((review) => (
            <ReviewRow key={`${review.title}-${review.artist}`} {...review} elevated={asCard} />
          ))
        ) : (
          <p className="mb-0 text-sm text-slate-600">
            No reviews to show yet. Start writing to build your collection.
          </p>
        )}
      </div>
    </section>
  )
}
