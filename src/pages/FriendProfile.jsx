import { Link, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import CoverImage from '../components/CoverImage.jsx'
import FavoritesSection from '../components/profile/FavoritesSection.jsx'
import FriendsSection from '../components/profile/FriendsSection.jsx'
import LatestLogsSection from '../components/profile/LatestLogsSection.jsx'
import ProfileCTA from '../components/profile/ProfileCTA.jsx'
import ProfileHeader from '../components/profile/ProfileHeader.jsx'
import ReviewsSection from '../components/profile/ReviewsSection.jsx'
import StatsSection from '../components/profile/StatsSection.jsx'
import useAlbumCovers from '../hooks/useAlbumCovers.js'
import useAlbumRatings from '../hooks/useAlbumRatings.js'
import { findFriendBySlug, friends, reviews } from '../data/profileData.js'

export default function FriendProfile() {
  const { friendSlug } = useParams()
  const friend = findFriendBySlug(friendSlug)
  const safeFriend = friend ?? {
    slug: 'unknown',
    name: 'Unknown User',
    handle: '@unknown',
    bio: '',
    location: '',
    joined: '',
    note: '',
    activity: '',
    avatarSrc: '/profile/rainy.jpg',
    bannerSrc: '/hero/hero1.jpg',
    lastfmUsername: '',
    favoriteAlbums: [],
    recentLogs: [],
  }

  const user = {
    name: safeFriend.name,
    handle: safeFriend.handle,
    bio: safeFriend.bio,
    location: safeFriend.location,
    joined: safeFriend.joined,
  }

  const favorites = safeFriend.favoriteAlbums.map((album, index) => ({
    ...album,
    cover: album.cover || '/album/am.jpg',
    rating:
      typeof album.rating === 'number'
        ? album.rating
        : Math.max(3.5, 4.5 - index * 0.5),
  }))

  const recentCarousel = safeFriend.favoriteAlbums.slice(0, 5).map((album, index) => ({
    ...album,
    cover: album.cover || '/album/am.jpg',
    rating:
      typeof album.rating === 'number'
        ? album.rating
        : Math.max(3.0, 4.5 - index * 0.5),
  }))

  const recent = safeFriend.recentLogs.map((entry) => ({
    ...entry,
    year: entry.year || '',
    note: safeFriend.note,
    rating:
      typeof entry.rating === 'number'
        ? entry.rating.toFixed(1)
        : entry.rating ?? '4.0',
  }))

  const friendsList = friends.filter((item) => item.slug !== safeFriend.slug).slice(0, 5)
  const reviewList = reviews

  const favoriteCovers = useAlbumCovers(favorites)
  const { ratings: favoriteRatings, updateRating: handleFavoriteRatingChange } =
    useAlbumRatings(favorites)
  const { ratings: recentRatings, updateRating: handleRecentRatingChange } =
    useAlbumRatings(recentCarousel)

  const backlogPreview = safeFriend.favoriteAlbums.slice(0, 5).map((album, index) => ({
    id: `${safeFriend.slug}-${index}`,
    albumTitleRaw: album.title,
    artistNameRaw: album.artist,
    coverArtUrl: album.cover || '/album/am.jpg',
    rating:
      typeof album.rating === 'number'
        ? album.rating
        : Math.max(3.5, 4.5 - index * 0.5),
  }))

  if (!friend) {
    return (
      <div className="min-h-screen">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <Navbar className="w-full" />
            <section className="card vinyl-texture border border-black/5 shadow-sm">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                Friends
              </p>
              <h1 className="mb-2 text-2xl text-text">Profile not found</h1>
              <p className="mb-4 text-sm text-slate-600">
                This friend profile does not exist in the mock data.
              </p>
              <Link
                to="/friends"
                className="inline-flex rounded-xl border border-black/10 bg-white/85 px-4 py-2 text-sm font-semibold text-text shadow-sm transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
              >
                Back to friends
              </Link>
            </section>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <Navbar className="w-full" />
          <main className="overflow-hidden rounded-3xl border border-black/5 bg-white/60 backdrop-blur-md shadow-sm">
            <div className="divide-y divide-black/5">
              <section className="py-0">
                <ProfileHeader
                  embedded
                  user={user}
                  avatarSrc={friend.avatarSrc}
                  bannerSrc={friend.bannerSrc}
                  primaryActionLabel="Unfollow"
                  onEdit={() => {}}
                />
              </section>

              <section className="px-6 py-6 sm:px-8">
                <StatsSection />
              </section>

              <section className="px-6 py-6 sm:px-8">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                  <aside className="flex flex-col gap-6 lg:col-span-8">
                    <FavoritesSection
                      favorites={favorites}
                      favoriteCovers={favoriteCovers}
                      favoriteRatings={favoriteRatings}
                      onFavoriteRatingChange={handleFavoriteRatingChange}
                      recentCarousel={recentCarousel}
                      recentRatings={recentRatings}
                      onRecentRatingChange={handleRecentRatingChange}
                    />
                    <ReviewsSection reviews={reviewList} asCard={false} />
                  </aside>

                  <aside className="flex flex-col gap-6 lg:col-span-4">
                    <section className="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-md">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                            Backlog
                          </p>
                          <h3 className="mb-0 text-lg text-text">Saved albums</h3>
                        </div>
                      </div>
                      {backlogPreview.length === 0 ? (
                        <p className="mb-0 text-sm text-slate-600">No backlog items yet.</p>
                      ) : (
                        <ul className="divide-y divide-black/5">
                          {backlogPreview.map((item) => (
                            <li key={item.id} className="flex items-center gap-3 py-2.5">
                              <div className="h-12 w-12 overflow-hidden rounded-xl border border-black/10 bg-black/5">
                                <CoverImage
                                  src={item.coverArtUrl || '/album/am.jpg'}
                                  alt={`${item.albumTitleRaw} cover`}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="mb-0 truncate text-sm font-semibold text-text">
                                  {item.albumTitleRaw}
                                </p>
                                <p className="mb-0 truncate text-xs text-slate-600">
                                  {item.artistNameRaw}
                                </p>
                              </div>
                              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700">
                                {item.rating}/5
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>

                    <LatestLogsSection recent={recent} asCard={false} />
                    <FriendsSection friends={friendsList} asCard={false} />
                  </aside>
                </div>
              </section>

              <section className="px-6 py-6 sm:px-8">
                <ProfileCTA asCard={false} />
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
