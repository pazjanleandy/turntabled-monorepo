import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import CoverImage from "../components/CoverImage.jsx";
import StarRating from "../components/StarRating.jsx";
import {
  Star,
  MusicNotes,
  Calendar,
  Flame,
  Clock,
  Heart,
  ListBullets,
} from "phosphor-react";

function Stat({ icon, label, value, hint }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="mb-0 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
          {label}
        </p>
        <p className="mb-0 text-xl font-semibold text-text">{value}</p>
        {hint ? <p className="mb-0 mt-1 text-xs text-muted">{hint}</p> : null}
      </div>
    </div>
  );
}

function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-black/5 bg-white/60 px-3 py-1 text-xs font-semibold text-text shadow-[0_6px_14px_-12px_rgba(15,15,15,0.35)]">
      {children}
    </span>
  );
}

function AlbumRow({ title, artist, year, rating, note, timeAgo }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-black/5 bg-white/55 p-3 shadow-[0_10px_24px_-20px_rgba(15,15,15,0.35)]">
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-black/5 bg-black/5" />
      <div className="min-w-0 flex-1">
        <p className="mb-0 truncate text-sm font-semibold text-text">{title}</p>
        <p className="mb-0 truncate text-xs text-muted">
          {artist} - {year}
        </p>
        {note ? <p className="mb-0 mt-1 line-clamp-1 text-xs text-muted">{note}</p> : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="flex items-center gap-1 text-accent">
          <Star className="h-4 w-4 fill-current" />
          <span className="text-sm font-semibold text-text">{rating}</span>
        </div>
        <span className="text-[11px] text-muted">{timeAgo}</span>
      </div>
    </div>
  );
}

export default function Profile() {
  const user = {
    name: "user1",
    handle: "@user1",
    initials: "JD",
    bio: "Logging albums I spin - mostly alternative, R&B, and whatever's on repeat this week.",
    location: "Makati, PH",
    joined: "Joined Feb 2026",
  };

  const favorites = useMemo(
    () => [
      {
        title: "Hakuchumuha Shiisainonai",
        artist: "chouchou merged syrups.",
        artistId: "chouchou",
        year: "2014",
        cover: "https://f4.bcbits.com/img/a0787078428_10.jpg",
        rating: 4.5,
      },
      {
        title: "Love Is Here",
        artist: "Starsailor",
        artistId: "starsailor",
        year: "2001",
        cover:
          "https://upload.wikimedia.org/wikipedia/en/thumb/8/84/Love_is_Here_Starsailor.jpg/250px-Love_is_Here_Starsailor.jpg",
        rating: 4,
      },
      {
        title: "The French Operation",
        artist: "GIRLS BE",
        artistId: "girlsbe",
        year: "1997",
        cover: "https://media.senscritique.com/media/000022618518/300/the_french_operation.jpg",
        rating: 4,
      },
      {
        title: "The New Abnormal",
        artist: "The Strokes",
        artistId: "strokes",
        year: "2020",
        cover:
          "https://upload.wikimedia.org/wikipedia/en/thumb/f/f8/The_Strokes_-_The_New_Abnormal.png/250px-The_Strokes_-_The_New_Abnormal.png",
        rating: 4.5,
      },
      {
        title: "0",
        artist: "Low Roar",
        artistId: "lowroar",
        year: "2014",
        cover:
          "https://upload.wikimedia.org/wikipedia/en/thumb/a/a8/Low_Roar_%270%27_album_cover_art.jpg/250px-Low_Roar_%270%27_album_cover_art.jpg",
        rating: 4,
      },
    ],
    []
  );

  const [favoriteRatings, setFavoriteRatings] = useState(() =>
    Object.fromEntries(
      favorites.map((album) => [
        `${album.artist} - ${album.title}`,
        album.rating ?? 0,
      ])
    )
  );

  const [favoriteCovers, setFavoriteCovers] = useState({});

  useEffect(() => {
    let cancelled = false;
    async function loadCovers() {
      const entries = await Promise.all(
        favorites.map(async (album) => {
          const key = `${album.artist} - ${album.title}`;
          const term = encodeURIComponent(`${album.artist} ${album.title}`);
          try {
            const response = await fetch(
              `https://itunes.apple.com/search?term=${term}&entity=album&limit=1`
            );
            if (!response.ok) return null;
            const data = await response.json();
            const artwork = data?.results?.[0]?.artworkUrl100;
            if (!artwork) return null;
            return [key, artwork.replace("100x100bb", "600x600bb")];
          } catch {
            return null;
          }
        })
      );

      if (!cancelled) {
        setFavoriteCovers(Object.fromEntries(entries.filter(Boolean)));
      }
    }

    loadCovers();
    return () => {
      cancelled = true;
    };
  }, [favorites]);

  const recentCarousel = useMemo(
    () => [
      {
        title: "Norman F. Rockwell!",
        artist: "Lana Del Rey",
        cover:
          "https://upload.wikimedia.org/wikipedia/en/thumb/8/8a/Lana_Del_Rey_-_Norman_Fucking_Rockwell.png/250px-Lana_Del_Rey_-_Norman_Fucking_Rockwell.png",
        rating: 4.5,
      },
      {
        title: "MOTOMAMI",
        artist: "Rosalia",
        cover:
          "https://upload.wikimedia.org/wikipedia/en/thumb/9/9c/Rosal%C3%ADa_-_Motomami.png/250px-Rosal%C3%ADa_-_Motomami.png",
        rating: 4,
      },
      {
        title: "Mama's Gun",
        artist: "Erykah Badu",
        cover: "https://upload.wikimedia.org/wikipedia/en/thumb/a/ab/Mama%27s_Gun.png/250px-Mama%27s_Gun.png",
        rating: 4.5,
      },
      {
        title: "AM",
        artist: "Arctic Monkeys",
        cover: "https://upload.wikimedia.org/wikipedia/en/c/cd/Arctic_Monkeys_-_AM.png",
        rating: 4,
      },
      {
        title: "Jubilee",
        artist: "Japanese Breakfast",
        cover: "https://upload.wikimedia.org/wikipedia/en/5/5d/Japanese_Breakfast_-_Jubilee.png",
        rating: 3.5,
      },
    ],
    []
  );

  const [recentRatings, setRecentRatings] = useState(() =>
    Object.fromEntries(
      recentCarousel.map((album) => [
        `${album.artist} - ${album.title}`,
        album.rating ?? 0,
      ])
    )
  );

  const recent = useMemo(
    () => [
      {
        title: "Hounds of Love",
        artist: "Kate Bush",
        year: "1985",
        rating: "4.5",
        note: "That run from track 1-5 is unreal.",
        timeAgo: "2h ago",
      },
      {
        title: "Currents",
        artist: "Tame Impala",
        year: "2015",
        rating: "4.0",
        note: "Perfect late-night commute album.",
        timeAgo: "1d ago",
      },
      {
        title: "SOS",
        artist: "SZA",
        year: "2022",
        rating: "3.5",
        note: "Some skips, but the highs are HIGH.",
        timeAgo: "3d ago",
      },
    ],
    []
  );

  return (
    <div className="min-h-screen px-5 pb-12 pt-0 md:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <Navbar className="mx-auto mt-6 w-[min(100%,900px)]" />

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
              <button className="btn-primary px-4 py-2 text-sm">Edit profile</button>
              <button className="rounded-xl border border-black/5 bg-white/70 px-4 py-2 text-sm font-semibold text-text shadow-[0_10px_20px_-16px_rgba(15,15,15,0.35)] transition hover:-translate-y-0.5 hover:bg-white">
                Share profile
              </button>
            </div>
          </div>
        </section>

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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <aside className="flex flex-col gap-6 lg:col-span-8">
            <section className="card vinyl-texture">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
                    Favorites
                  </p>
                  <h2 className="mb-0 text-xl">Top albums</h2>
                </div>
                <Link
                  to="/favorites"
                  className="rounded-xl border border-black/5 bg-white/60 px-3 py-2 text-xs font-semibold text-text shadow-[0_10px_20px_-16px_rgba(15,15,15,0.35)] transition hover:-translate-y-0.5 hover:bg-white"
                >
                  Manage
                </Link>
              </div>

              <div className="mt-5 overflow-hidden">
                <div className="scrollbar-sleek grid auto-cols-[160px] grid-flow-col gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2">
                  {favorites.slice(0, 5).map((a) => {
                    const key = `${a.artist} - ${a.title}`;
                    return (
                      <div key={a.title} className="snap-start space-y-2">
                        <CoverImage
                          src={favoriteCovers[key] ?? a.cover}
                          alt={`${a.title} cover`}
                          className="h-40 w-40 object-cover"
                        />
                        <div>
                          <p className="mb-0 text-xs font-semibold text-text">{a.title}</p>
                          {a.artistId ? (
                            <Link
                              to={`/artist/${a.artistId}`}
                              className="mb-0 block text-[11px] text-muted transition hover:text-accent"
                            >
                              {a.artist}
                            </Link>
                          ) : (
                            <p className="mb-0 text-[11px] text-muted">{a.artist}</p>
                          )}
                          <StarRating
                            value={favoriteRatings[key] ?? 0}
                            onChange={(next) =>
                              setFavoriteRatings((prev) => ({
                                ...prev,
                                [key]: next,
                              }))
                            }
                            step={0.5}
                            size={14}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
                    Recent activity
                  </p>
                  <h2 className="mb-0 text-xl">Recently listened</h2>
                </div>
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-text">
                  Today
                </span>
              </div>

              <div className="mt-4 overflow-hidden">
                <div className="scrollbar-sleek grid auto-cols-[150px] grid-flow-col gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2">
                  {recentCarousel.map((item) => (
                    <div key={item.title} className="snap-start space-y-2">
                      <CoverImage
                        src={item.cover}
                        alt={`${item.title} cover`}
                        className="h-37.5 w-37.5 object-cover"
                      />
                      <div>
                        <p className="mb-0 text-xs font-semibold text-text">{item.title}</p>
                        {item.artistId ? (
                          <Link
                            to={`/artist/${item.artistId}`}
                            className="mb-0 block text-[11px] text-muted transition hover:text-accent"
                          >
                            {item.artist}
                          </Link>
                        ) : (
                          <p className="mb-0 text-[11px] text-muted">{item.artist}</p>
                        )}
                        <StarRating
                          value={
                            recentRatings[`${item.artist} - ${item.title}`] ?? 0
                          }
                          onChange={(next) => {
                            const ratingKey = `${item.artist} - ${item.title}`;
                            setRecentRatings((prev) => ({
                              ...prev,
                              [ratingKey]: next,
                            }));
                          }}
                          step={0.5}
                          size={14}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </aside>

          <section className="card vinyl-texture lg:col-span-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
                  Recent activity
                </p>
                <h2 className="mb-0 text-xl">Latest logs</h2>
              </div>
              <Link
                to="/activity"
                className="rounded-xl border border-black/5 bg-white/60 px-3 py-2 text-xs font-semibold text-text shadow-[0_10px_20px_-16px_rgba(15,15,15,0.35)] transition hover:-translate-y-0.5 hover:bg-white"
              >
                View all
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {recent.map((r, idx) => (
                <AlbumRow key={idx} {...r} />
              ))}
            </div>
          </section>
        </div>

        <section className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-black/5 bg-white/55 p-4 shadow-[0_16px_30px_-22px_rgba(15,15,15,0.35)] sm:flex-row sm:items-center">
          <p className="mb-0 text-sm text-muted">
            Want this to feel more "music"? Add a{" "}
            <span className="font-semibold text-text">Now Spinning</span> module + friends feed next.
          </p>
          <div className="flex gap-3">
            <Link
              to="/backlog"
              className="rounded-xl border border-black/5 bg-white/70 px-4 py-2 text-sm font-semibold text-text shadow-[0_10px_20px_-16px_rgba(15,15,15,0.35)] transition hover:-translate-y-0.5 hover:bg-white"
            >
              Open backlog
            </Link>
            <Link to="/" className="btn-primary px-4 py-2 text-sm">
              Log an album
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
