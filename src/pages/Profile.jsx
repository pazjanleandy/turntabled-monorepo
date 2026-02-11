import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import EditProfileModal from "../components/profile/EditProfileModal.jsx";
import FavoritesSection from "../components/profile/FavoritesSection.jsx";
import FriendsSection from "../components/profile/FriendsSection.jsx";
import LatestLogsSection from "../components/profile/LatestLogsSection.jsx";
import ProfileCTA from "../components/profile/ProfileCTA.jsx";
import ProfileHeader from "../components/profile/ProfileHeader.jsx";
import ReplaceFavoriteModal from "../components/profile/ReplaceFavoriteModal.jsx";
import StatsSection from "../components/profile/StatsSection.jsx";
import {
  favoriteAlbums,
  friends,
  profileUser,
  recentCarouselAlbums,
  recentLogs,
} from "../data/profileData.js";
import useAlbumCovers from "../hooks/useAlbumCovers.js";
import useAlbumRatings from "../hooks/useAlbumRatings.js";

export default function Profile() {
  const user = profileUser;
  const favorites = favoriteAlbums;
  const recentCarousel = recentCarouselAlbums;
  const recent = recentLogs;
  const friendsList = friends;

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [replaceFavoriteIndex, setReplaceFavoriteIndex] = useState(null);

  const favoriteCovers = useAlbumCovers(favorites);

  const { ratings: favoriteRatings, updateRating: handleFavoriteRatingChange } =
    useAlbumRatings(
      useMemo(
        () =>
          favorites.map((album) => ({
            artist: album.artist,
            title: album.title,
          })),
        [favorites]
      )
    );

  const { ratings: recentRatings, updateRating: handleRecentRatingChange } =
    useAlbumRatings(
      useMemo(
        () =>
          recentCarousel.map((album) => ({
            artist: album.artist,
            title: album.title,
          })),
        [recentCarousel]
      )
    );

  useEffect(() => {
    if (!isEditOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isEditOpen]);

  const closeEditModal = () => {
    setIsEditOpen(false);
    setReplaceFavoriteIndex(null);
  };

  return (
    <div className="min-h-screen px-5 pb-12 pt-0 md:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <Navbar className="mx-auto mt-6 w-[min(100%,900px)]" />

        <ProfileHeader user={user} onEdit={() => setIsEditOpen(true)} />

        <StatsSection />

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
          </aside>

          <aside className="flex flex-col gap-6 lg:col-span-4">
            <LatestLogsSection recent={recent} />
            <FriendsSection friends={friendsList} />
          </aside>
        </div>

        <ProfileCTA />
      </div>

      <EditProfileModal
        isOpen={isEditOpen}
        user={user}
        favorites={favorites}
        favoriteCovers={favoriteCovers}
        onClose={closeEditModal}
        onReplaceFavorite={setReplaceFavoriteIndex}
      />

      <ReplaceFavoriteModal
        index={replaceFavoriteIndex}
        onClose={() => setReplaceFavoriteIndex(null)}
      />
    </div>
  );
}
