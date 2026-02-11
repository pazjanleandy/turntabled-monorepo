import { useEffect, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import EditProfileModal from "../components/profile/EditProfileModal.jsx";
import FavoritesSection from "../components/profile/FavoritesSection.jsx";
import FriendsSection from "../components/profile/FriendsSection.jsx";
import LatestLogsSection from "../components/profile/LatestLogsSection.jsx";
import LastFmRecentTracks from "../components/profile/LastFmRecentTracks.jsx";
import ProfileCTA from "../components/profile/ProfileCTA.jsx";
import ProfileHeader from "../components/profile/ProfileHeader.jsx";
import ReplaceFavoriteModal from "../components/profile/ReplaceFavoriteModal.jsx";
import StatsSection from "../components/profile/StatsSection.jsx";
import LastFmConnectButton from "../components/LastFmConnectButton.jsx";
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
  const [lastfmUsername, setLastfmUsername] = useState(
    () => localStorage.getItem("lastfmUsername") ?? ""
  );
  const [recentTracks, setRecentTracks] = useState([]);
  const [tracksStatus, setTracksStatus] = useState({
    loading: false,
    error: "",
  });

  const favoriteCovers = useAlbumCovers(favorites);

  const { ratings: favoriteRatings, updateRating: handleFavoriteRatingChange } =
    useAlbumRatings(favorites);

  const { ratings: recentRatings, updateRating: handleRecentRatingChange } =
    useAlbumRatings(recentCarousel);

  useEffect(() => {
    if (!isEditOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isEditOpen]);

  useEffect(() => {
    if (!lastfmUsername) {
      setRecentTracks([]);
      setTracksStatus({ loading: false, error: "" });
      return;
    }

    const apiKey = import.meta.env.VITE_LASTFM_API_KEY;
    if (!apiKey) {
      setTracksStatus({
        loading: false,
        error: "Missing VITE_LASTFM_API_KEY.",
      });
      return;
    }

    let cancelled = false;
    async function loadRecentTracks() {
      setTracksStatus({ loading: true, error: "" });
      try {
        const params = new URLSearchParams({
          method: "user.getRecentTracks",
          user: lastfmUsername,
          api_key: apiKey,
          format: "json",
          limit: "10",
        });
        const response = await fetch(`https://ws.audioscrobbler.com/2.0/?${params}`);
        if (!response.ok) {
          throw new Error("Failed to fetch recent tracks.");
        }
        const data = await response.json();
        if (data?.error) {
          throw new Error(data.message || "Last.fm error.");
        }

        const items = data?.recenttracks?.track ?? [];
        const mapped = items.map((track) => ({
          name: track?.name ?? "Unknown track",
          artist: track?.artist?.["#text"] ?? "Unknown artist",
          album: track?.album?.["#text"] ?? "",
          nowPlaying: track?.["@attr"]?.nowplaying === "true",
        }));

        if (!cancelled) {
          setRecentTracks(mapped);
          setTracksStatus({ loading: false, error: "" });
        }
      } catch (err) {
        if (cancelled) return;
        setTracksStatus({
          loading: false,
          error: err?.message || "Unexpected error.",
        });
      }
    }

    loadRecentTracks();
    return () => {
      cancelled = true;
    };
  }, [lastfmUsername]);

  const closeEditModal = () => {
    setIsEditOpen(false);
    setReplaceFavoriteIndex(null);
  };

  const handleDisconnectLastFm = () => {
    localStorage.removeItem("lastfmUsername");
    localStorage.removeItem("lastfmSessionKey");
    setLastfmUsername("");
  };

  return (
    <div className="min-h-screen px-5 pb-12 pt-0 md:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <Navbar className="mx-auto mt-6 w-[min(100%,900px)]" />

        <ProfileHeader user={user} onEdit={() => setIsEditOpen(true)} />

        <section className="card vinyl-texture">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
                Last.fm
              </p>
              <h2 className="mb-0 text-xl">Connect your account</h2>
              <p className="mb-0 mt-2 text-sm text-muted">
                Link Last.fm to pull your recent listening history.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {lastfmUsername ? (
                <>
                  <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
                    Connected as {lastfmUsername}
                  </span>
                  <button
                    className="rounded-xl border border-black/5 bg-white/70 px-4 py-2 text-sm font-semibold text-text shadow-[0_10px_20px_-16px_rgba(15,15,15,0.35)] transition hover:-translate-y-0.5 hover:bg-white"
                    onClick={handleDisconnectLastFm}
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <LastFmConnectButton />
              )}
            </div>
          </div>
        </section>

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
            <LastFmRecentTracks
              username={lastfmUsername}
              tracks={recentTracks}
              isLoading={tracksStatus.loading}
              error={tracksStatus.error}
            />
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
