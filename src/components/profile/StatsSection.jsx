import { Calendar, ListBullets, MusicNotes, Star } from 'phosphor-react'
import Stat from './Stat.jsx'

export default function StatsSection() {
  return (
    <section className="card vinyl-texture">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={<MusicNotes className="h-5 w-5" />}
          label="Albums logged"
          value="214"
          hint="Last 30 days: 18"
        />
        <Stat
          icon={<Star className="h-5 w-5" />}
          label="Avg rating"
          value="3.9"
          hint="Most common: 4.0"
        />
        <Stat
          icon={<Calendar className="h-5 w-5" />}
          label="This year"
          value="46"
          hint="Goal: 120 albums"
        />
        <Stat
          icon={<ListBullets className="h-5 w-5" />}
          label="Backlog"
          value="83"
          hint="Up next: 12 saved"
        />
      </div>
    </section>
  )
}
