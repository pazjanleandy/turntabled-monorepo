import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import PopularAlbumsSection from '../components/PopularAlbumsSection.jsx'
import StatsPanel from '../components/StatsPanel.jsx'
import RecentlyListenedSection from '../components/RecentlyListenedSection.jsx'
import RecentActivitySection from '../components/RecentActivitySection.jsx'
import Footer from '../components/Footer.jsx'
import { ChatCircle, Headphones, Heart, PlusCircle, UserPlus } from 'phosphor-react'

const trendingAlbums = [
  {
    artist: 'Daft Punk',
    album: 'Random Access Memories',
    year: 2013,
    tone: '28 70% 60%',
    cover: '/album/ram.jpg',
    listens: '1.3M',
    saves: '312K',
    ratings: '4.7',
  },
  {
    artist: 'Tame Impala',
    album: 'Currents',
    year: 2015,
    tone: '265 55% 60%',
    cover: '/album/currents.jpg',
    listens: '988K',
    saves: '221K',
    ratings: '4.6',
  },
  {
    artist: 'Kendrick Lamar',
    album: 'To Pimp a Butterfly',
    year: 2015,
    tone: '210 35% 52%',
    cover: '/album/tpab.jpg',
    listens: '1.1M',
    saves: '289K',
    ratings: '4.8',
  },
  {
    artist: 'Frank Ocean',
    album: 'Blonde',
    year: 2016,
    tone: '30 65% 70%',
    cover: '/album/blond.jpg',
    listens: '1.6M',
    saves: '410K',
    ratings: '4.9',
  },
]

const stats = [
  { label: 'Listened', value: '32' },
  { label: 'Backlog', value: '7' },
  { label: 'Logs', value: '18' },
]

const recentlyListenedAlbums = [
  {
    artist: 'Lana Del Rey',
    album: 'Norman F. Rockwell!',
    year: 2019,
    cover: '/album/ram.jpg',
    listens: '412K',
    saves: '88K',
    ratings: '4.6',
    rating: 4.5,
  },
  {
    artist: 'Tyler, The Creator',
    album: 'IGOR',
    year: 2019,
    cover: '/album/igor.jpg',
    listens: '519K',
    saves: '120K',
    ratings: '4.7',
    rating: 4.0,
  },
  {
    artist: 'Erykah Badu',
    album: "Mama's Gun",
    year: 2000,
    cover: '/album/tpab.jpg',
    listens: '210K',
    saves: '52K',
    ratings: '4.4',
    rating: 4.5,
  },
  {
    artist: 'Arctic Monkeys',
    album: 'AM',
    year: 2013,
    cover: '/album/am.jpg',
    listens: '622K',
    saves: '158K',
    ratings: '4.5',
    rating: 3.5,
  },
  {
    artist: 'Rosalia',
    album: 'MOTOMAMI',
    year: 2022,
    cover: '/album/blond.jpg',
    listens: '288K',
    saves: '71K',
    ratings: '4.2',
    rating: 4.0,
  },
  {
    artist: 'Bon Iver',
    album: 'i,i',
    year: 2019,
    cover: '/album/i,i.jpg',
    listens: '205K',
    saves: '49K',
    ratings: '4.3',
    rating: 3.5,
  },
]

const recentActivity = [
  {
    id: 'friend-1',
    icon: <Headphones size={16} weight="bold" />,
    text: 'Ari listened to In Rainbows',
    meta: 'Radiohead - 45 min ago',
    cover: '/album/currents.jpg',
  },
  {
    id: 'friend-2',
    icon: <Heart size={16} weight="bold" />,
    text: 'Maya liked your review',
    meta: 'Phoebe Bridgers - 1h ago',
    cover: '/album/igor.jpg',
  },
  {
    id: 'friend-3',
    icon: <ChatCircle size={16} weight="bold" />,
    text: 'Nico commented on your log',
    meta: 'Frank Ocean - 3h ago',
    cover: '/album/blond.jpg',
  },
  {
    id: 'friend-4',
    icon: <PlusCircle size={16} weight="bold" />,
    text: 'June added Renaissance to backlog',
    meta: 'Beyonce - Yesterday',
    cover: '/album/ram.jpg',
  },
  {
    id: 'friend-5',
    icon: <UserPlus size={16} weight="bold" />,
    text: 'Sam followed you',
    meta: 'Indie + Jazz playlists',
  },
]

const userActivity = [
  {
    id: 'you-1',
    icon: <Headphones size={16} weight="bold" />,
    text: 'You listened to Currents',
    meta: 'Tame Impala - 20 min ago',
    cover: '/album/currents.jpg',
  },
  {
    id: 'you-2',
    icon: <ChatCircle size={16} weight="bold" />,
    text: 'You logged a review',
    meta: 'Jubilee - 1h ago',
    cover: '/album/i,i.jpg',
  },
  {
    id: 'you-3',
    icon: <UserPlus size={16} weight="bold" />,
    text: 'You followed Alex M.',
    meta: 'Alt + R&B picks',
  },
]

export default function Home() {
  const [search, setSearch] = useState('')

  const filteredTrending = useMemo(() => {
    if (!search.trim()) return trendingAlbums
    const term = search.toLowerCase()
    return trendingAlbums.filter(
      (item) =>
        item.artist.toLowerCase().includes(term) ||
        item.album.toLowerCase().includes(term),
    )
  }, [search])

  return (
    <div className="min-h-screen px-5 pb-12 pt-0 md:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <div className="relative">
          <Navbar className="mx-auto mt-6 w-[min(100%,900px)]" />
        </div>
        <main className="grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
          <div className="min-w-0 space-y-8">
            <PopularAlbumsSection
              albums={filteredTrending}
              search={search}
              onSearchChange={setSearch}
            />
            <RecentlyListenedSection albums={recentlyListenedAlbums} />
          </div>
          <StatsPanel stats={stats} userActivity={userActivity} />
        </main>
        <RecentActivitySection activity={recentActivity} />
        <section className="card vinyl-texture">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
                Featured artists
              </p>
              <h2 className="mb-0 text-xl">Explore artist pages</h2>
            </div>
            <Link
              to="/artist/chouchou"
              className="rounded-xl border border-black/5 bg-white/70 px-3 py-2 text-xs font-semibold text-text shadow-[0_10px_20px_-16px_rgba(15,15,15,0.35)] transition hover:-translate-y-0.5 hover:bg-white"
            >
              View example
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link className="btn-primary px-3 py-2 text-xs" to="/artist/chouchou">
              chouchou merged syrups.
            </Link>
            <Link
              className="rounded-xl border border-black/5 bg-white/70 px-3 py-2 text-xs font-semibold text-text shadow-[0_10px_20px_-16px_rgba(15,15,15,0.35)] transition hover:-translate-y-0.5 hover:bg-white"
              to="/artist/starsailor"
            >
              Starsailor
            </Link>
            <Link
              className="rounded-xl border border-black/5 bg-white/70 px-3 py-2 text-xs font-semibold text-text shadow-[0_10px_20px_-16px_rgba(15,15,15,0.35)] transition hover:-translate-y-0.5 hover:bg-white"
              to="/artist/strokes"
            >
              The Strokes
            </Link>
          </div>
        </section>
        <Footer />
      </div>
    </div>
  )
}
