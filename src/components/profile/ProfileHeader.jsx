import { Clock, Flame, Heart } from 'phosphor-react'
import Pill from './Pill.jsx'

export default function ProfileHeader({ user, onEdit }) {
  return (
    <section className="card vinyl-texture">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <img
            src="/profile/rainy.jpg"
            alt="user1 avatar"
            className="h-16 w-16 rounded-full object-cover"
          />

          <div className="min-w-0">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
              Profile
            </p>
            <h1 className="mb-0 truncate text-2xl">{user.name}</h1>
            <p className="mb-0 mt-1 text-sm text-muted">
              <span className="font-semibold text-text">{user.handle}</span>
              <span className="mx-2">-</span>
              {user.location}
              <span className="mx-2">-</span>
              {user.joined}
            </p>

            <p className="mb-0 mt-3 max-w-2xl text-sm text-muted">{user.bio}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Pill>
                <Flame className="mr-2 h-4 w-4 text-accent" />
                7-day streak
              </Pill>
              <Pill>
                <Clock className="mr-2 h-4 w-4 text-accent" />
                128 hrs listened
              </Pill>
              <Pill>
                <Heart className="mr-2 h-4 w-4 text-accent" />
                32 favorites
              </Pill>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:items-end">
          <button className="btn-primary px-4 py-2 text-sm" onClick={onEdit}>
            Edit profile
          </button>
          <button className="rounded-xl border border-black/5 bg-white/70 px-4 py-2 text-sm font-semibold text-text shadow-[0_10px_20px_-16px_rgba(15,15,15,0.35)] transition hover:-translate-y-0.5 hover:bg-white">
            Share profile
          </button>
        </div>
      </div>
    </section>
  )
}
