import { Link } from 'react-router-dom'
import CoverImage from '../CoverImage.jsx'

function splitLeadText(value = '') {
  const text = String(value ?? '').trim()
  if (!text) return { lead: '', rest: '' }
  const [lead = '', ...restParts] = text.split(/\s+/)
  return { lead, rest: restParts.join(' ') }
}

export default function MobileSocialSection({
  friends = [],
  activity = [],
  isActivityLoading = false,
  activityError = '',
  hasFriends = false,
  emptyActivityMessage = 'No friend activity yet.',
}) {
  const friendPreview = Array.isArray(friends) ? friends.slice(0, 3) : []
  const activityRows = Array.isArray(activity) ? activity.slice(0, 8) : []

  return (
    <section className="border-y border-black/10 py-3 md:hidden">
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="mb-0 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Social</p>
          <h2 className="mb-0 mt-0.5 text-base text-text">Connections</h2>
        </div>
      </div>

      <div className="mt-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="mb-0 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">Friends</p>
          <Link
            to="/friends"
            className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
          >
            View all
          </Link>
        </div>

        {friendPreview.length === 0 ? (
          <p className="mb-0 mt-2 text-[12px] text-muted">No friends connected yet.</p>
        ) : (
          <ul className="mt-1.5 divide-y divide-black/10">
            {friendPreview.map((friend) => (
              <li key={friend.handle} className="py-2">
                <Link
                  to={`/friends/${friend.slug}`}
                  className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                >
                  {friend.avatarUrl ? (
                    <img
                      src={friend.avatarUrl}
                      alt={`${friend.name} avatar`}
                      className="h-7 w-7 shrink-0 rounded-full border border-orange-500/20 object-cover"
                    />
                  ) : (
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-orange-500/20 bg-accent/15 text-[9px] font-semibold text-accent">
                      {friend.initials}
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="mb-0 truncate text-[12.5px] font-semibold text-text">{friend.name}</p>
                    <p className="mb-0 truncate text-[10px] text-muted">{friend.handle}</p>
                  </div>

                  <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.09em] text-muted/85">
                    {friend.activity}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-3 border-t border-black/10 pt-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="mb-0 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">Friend activity</p>
          <Link
            to="/activity"
            className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
          >
            View all
          </Link>
        </div>

        {isActivityLoading ? (
          <p className="mb-0 mt-2 text-[12px] text-muted">Loading friend activity...</p>
        ) : activityError ? (
          <p className="mb-0 mt-2 text-[12px] text-red-700">{activityError}</p>
        ) : activityRows.length === 0 ? (
          <p className="mb-0 mt-2 text-[12px] text-muted">
            {hasFriends ? 'No friend activity yet.' : emptyActivityMessage}
          </p>
        ) : (
          <ul className="mt-1.5 divide-y divide-black/10">
            {activityRows.map((item) => {
              const { lead, rest } = splitLeadText(item?.text)
              return (
                <li key={item.id} className="py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center text-accent">
                      {item.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="mb-0 truncate text-[12.5px] text-text">
                        <span className="font-semibold">{lead}</span>
                        {rest ? ` ${rest}` : ''}
                      </p>
                      <p className="mb-0 truncate text-[10px] text-muted">{item?.meta ?? ''}</p>
                    </div>
                    {item?.cover ? (
                      <div className="h-9 w-9 shrink-0 overflow-hidden border border-black/10 bg-black/5">
                        <CoverImage src={item.cover} alt={`${item?.text ?? 'Activity'} cover`} className="h-full w-full" />
                      </div>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
