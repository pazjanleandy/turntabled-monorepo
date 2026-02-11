# Turntabled

Album logging UI built with React + Vite + Tailwind + React Router. The app includes a home feed, profile page, and artist profile pages loaded from JSON.

**Version Control**
- Repo uses git. Suggested workflow:
  1. Check status: `git status`
  2. Review changes: `git diff`
  3. Stage: `git add <files>`
  4. Commit: `git commit -m "Describe change"`

**Setup**
1. Install dependencies: `npm install`
2. Start dev server: `npm run dev`
3. Build for production: `npm run build`
4. Preview production build: `npm run preview`

**Routing**
- `/` Home
- `/profile` Profile
- `/explore` Explore
- `/backlog` My Backlog
- `/artists` Artists list
- `/favorites` Favorites
- `/activity` Activity
- `/friends` Friends
- `/artist/:artistId` Artist profile (loaded from JSON in `src/data/artists`)

**Data**
- `src/data/artists/*.json` one file per artist
- `src/data/loadArtists.js` uses `import.meta.glob` to load all artist JSON files (eager) and attach `id` from filename
- `src/data/profileData.js` mock profile data and lists (added Feb 11, 2026)

**Pages**
- `src/pages/Home.jsx` main landing page
- `src/pages/Profile.jsx` profile and activity views
- `src/pages/ArtistProfile.jsx` artist profile detail view
- `src/pages/Explore.jsx` explore filters/search placeholder (added Feb 11, 2026)
- `src/pages/Backlog.jsx` backlog placeholder (added Feb 11, 2026)
- `src/pages/Artists.jsx` artist list page (added Feb 11, 2026)
- `src/pages/Favorites.jsx` favorites placeholder (added Feb 11, 2026)
- `src/pages/Activity.jsx` activity placeholder (added Feb 11, 2026)
- `src/pages/Friends.jsx` friends placeholder (added Feb 11, 2026)

**Core Components**
- `src/components/Navbar.jsx` top navigation
- `src/components/Hero.jsx` hero image carousel
- `src/components/PopularAlbumsSection.jsx` trending albums carousel
- `src/components/RecentlyListenedSection.jsx` recently listened carousel with rating
- `src/components/RecentActivitySection.jsx` friend activity feed
- `src/components/StatsPanel.jsx` user stats and activity
- `src/components/StarRating.jsx` interactive rating component
- `src/components/CoverImage.jsx` image wrapper with fallback
- `src/components/ActivityRow.jsx` reusable activity row
- `src/components/AlbumCard.jsx` album card UI
- `src/components/AlbumDetails.jsx` example form usage for ratings
- `src/components/Card.jsx` base card wrapper
- `src/components/Footer.jsx` footer
- `src/components/profile/ProfileHeader.jsx` profile header layout (added Feb 11, 2026)
- `src/components/profile/StatsSection.jsx` profile stats grid (added Feb 11, 2026)
- `src/components/profile/FavoritesSection.jsx` favorites + recent carousel (added Feb 11, 2026)
- `src/components/profile/LatestLogsSection.jsx` latest logs card (added Feb 11, 2026)
- `src/components/profile/FriendsSection.jsx` friends list card (added Feb 11, 2026)
- `src/components/profile/ProfileCTA.jsx` profile CTA block (added Feb 11, 2026)
- `src/components/profile/EditProfileModal.jsx` edit profile modal (added Feb 11, 2026)
- `src/components/profile/ReplaceFavoriteModal.jsx` replace favorite modal (added Feb 11, 2026)
- `src/components/profile/AlbumRow.jsx` latest logs row (added Feb 11, 2026)
- `src/components/profile/Stat.jsx` stat item (added Feb 11, 2026)
- `src/components/profile/Pill.jsx` badge/pill component (added Feb 11, 2026)

**Hooks**
- `src/hooks/useAlbumCovers.js` fetches album art from iTunes (added Feb 11, 2026)
- `src/hooks/useAlbumRatings.js` rating state helper (added Feb 11, 2026)

**Styling**
- `src/index.css` contains global theme variables, background texture, scrollbar styles, and utility layers.
- Tailwind is configured in `tailwind.config.js`.

**Assets**
- `public/hero/*` hero background images used by `Hero.jsx`
- `public/profile/rainy.jpg` profile avatar used in Navbar and Profile

**Add a new artist**
1. Create a JSON file in `src/data/artists/` named by the artist ID, e.g. `radiohead.json`.
2. Include fields like `name`, `origin`, `genres`, `bio`, `notableAlbums`.
3. Link to `/artist/radiohead` from anywhere using `Link` or `to="/artist/radiohead"`.

**What We Added Today (Feb 11, 2026)**
- Explore, Backlog, Artists, Favorites, Activity, Friends placeholder pages and routes.
- Profile page componentization (profile subcomponents + modals).
- Profile data extracted to `src/data/profileData.js`.
- Album cover + rating hooks (`useAlbumCovers`, `useAlbumRatings`).
- Navbar updates: active state, profile hover menu with access to profile subpages, artists link.

**Notes**
- This project uses React Router. If you deploy to static hosting, configure history fallback to `index.html` so deep links work.
