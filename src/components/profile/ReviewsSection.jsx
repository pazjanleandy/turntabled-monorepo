import { useState } from 'react'
import ReviewRow from './ReviewRow.jsx'

const TABS = [
  { id: 'all', label: 'All reviews' },
  { id: 'drafts', label: 'Drafts' },
]

export default function ReviewsSection({ reviews = [], drafts = [] }) {
  const [activeTab, setActiveTab] = useState('all')
  const items = activeTab === 'all' ? reviews : drafts

  return (
    <section className="border-t border-black/10 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
            Reviews
          </p>
          <h2 className="mb-0 text-xl">Your write-ups</h2>
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
                  'rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] transition',
                  isActive
                    ? 'border-accent/40 bg-accent/15 text-accent'
                    : 'border-black/10 bg-white/70 text-muted hover:text-text',
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
            <ReviewRow key={`${review.title}-${review.artist}`} {...review} />
          ))
        ) : (
          <p className="mb-0 text-sm text-muted">
            No reviews to show yet. Start writing to build your collection.
          </p>
        )}
      </div>
    </section>
  )
}
