import { UsersThree } from 'phosphor-react'
import ActivityCard from './ActivityCard.jsx'

export default function FriendActivitySection({ activity }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <UsersThree size={18} weight="bold" className="text-accent" />
        <h2 className="mb-0 text-lg">Friend activity</h2>
      </div>
      <div className="grid gap-3">
        {activity.map((item) => (
          <ActivityCard key={`${item.user}-${item.album}`} {...item} />
        ))}
      </div>
    </section>
  )
}
