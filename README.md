# Turntabled

Turntabled is a React + Vite + Tailwind app for album logging, artist discovery, profile management, and social connections.

## Stack

- React 19
- React Router DOM 7
- Tailwind CSS 4
- Vite 7
- Phosphor React icons
- Supabase JS client

## Scripts

- `npm run dev` start frontend dev server
- `npm run build` build production bundle
- `npm run preview` preview production build
- `npm run lint` run ESLint

## Local Setup

1. Install dependencies: `npm install`
2. Start frontend: `npm run dev`
3. Build check: `npm run build`

## Local API Setup (MusicBrainz/Last.fm/Supabase backend)

1. Install Vercel CLI: `npm install -g vercel`
2. Start backend in terminal 1: `vercel dev --listen 3001`
3. Start frontend in terminal 2: `npm run dev`

Why two terminals:
- Backend API runs via `vercel dev` on port `3001`
- Frontend runs via Vite on port `5173`

## Routes (Current)

- `/` landing page
- `/home` signed-in home feed
- `/profile` profile page
- `/explore` explore page
- `/backlog` logged albums page (`Albums` in navbar)
- `/artists` artists listing
- `/activity` activity/logged albums page
- `/friends` friends/connections hub
- `/friends/:friendSlug` friend profile page
- `/album/:releaseId` album detail page
- `/auth/lastfm/callback` Last.fm OAuth callback
- `/artist/:artistId` artist profile page

## Source Map

### Pages (`src/pages`)

- `Activity.jsx` activity feed with filters/search
- `AlbumPage.jsx` album detail + tracklist/logging actions
- `ArtistPage.jsx` alternate artist UI (present in codebase, not wired in router)
- `ArtistProfile.jsx` routed artist profile page (`/artist/:artistId`)
- `Artists.jsx` artist listing page
- `Backlog.jsx` backlog management UI
- `Explore.jsx` explore/discovery page
- `Favorites.jsx` favorites page
- `FriendProfile.jsx` friend profile using the same sectioned structure as `Profile`
- `Friends.jsx` friends social hub UI (search/filter/sort/group/list-grid modes)
- `Home.jsx` signed-in home feed
- `Landing.jsx` guest landing page
- `LastFmCallbackPage.jsx` Last.fm OAuth callback handler
- `Profile.jsx` primary profile page

### Full Components List (`src/components`)

#### Root components

- `ActivityCard.jsx`
- `ActivityRow.jsx`
- `AlbumCard.jsx`
- `AlbumDetails.jsx`
- `BackButton.jsx`
- `Card.jsx`
- `CoverImage.jsx`
- `Footer.jsx`
- `FriendActivitySection.jsx`
- `Hero.jsx`
- `LastFmConnectButton.jsx`
- `Navbar.jsx`
- `NavbarGuest.jsx`
- `PopularAlbumsSection.jsx`
- `RecentActivitySection.jsx`
- `RecentlyListenedSection.jsx`
- `StarRating.jsx`
- `StatsPanel.jsx`
- `TrendingSection.jsx`
- `coverFallback.js` (image fallback helper)

#### Album components (`src/components/album`)

- `LogDatesModal.jsx`
- `ReviewModal.jsx`

#### Auth components (`src/components/auth`)

- `CreateAccountModal.jsx`
- `SignInModal.jsx`
- `SignUpModal.jsx`

#### Profile components (`src/components/profile`)

- `AlbumRow.jsx`
- `EditProfileModal.jsx`
- `FavoritesSection.jsx`
- `FriendsSection.jsx`
- `LastFmRecentTracks.jsx`
- `LatestLogsSection.jsx`
- `Pill.jsx`
- `ProfileCTA.jsx`
- `ProfileHeader.jsx`
- `RecentReviewsSection.jsx`
- `ReplaceFavoriteModal.jsx`
- `ReviewRow.jsx`
- `ReviewsSection.jsx`
- `Stat.jsx`
- `StatsSection.jsx`

### Hooks (`src/hooks`)

- `useAlbumCovers.js`
- `useAlbumRatings.js`
- `useAuthStatus.js`

### Data (`src/data`)

- `albumData.js`
- `loggedAlbums.js`
- `loadArtists.js`
- `profileData.js`
- `artists/*.json` (artist content files)

## Environment Variables

### Frontend (`VITE_*`)

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_LASTFM_API_KEY` (required to connect Last.fm from client)
- `VITE_API_BASE_URL` (optional in production for API base override)

### Backend/API

- `LASTFM_API_KEY`
- `LASTFM_SHARED_SECRET`
- `LASTFM_CALLBACK_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `EXPLORE_WORKER_SECRET`
- `MUSICBRAINZ_BASE_URL`
- `MUSICBRAINZ_USER_AGENT`

Use `.env.example` as the template.

## Recent Changes We Made

### Mar 5, 2026

- Profile media flow overhaul:
  - added avatar and banner resize/crop modals
  - wired uploads through backend profile media endpoints
  - unified preview + save behavior in edit profile
- Profile header and edit UX polish:
  - improved avatar/banner overlap and header hierarchy
  - removed profile location line
  - renamed `About` label to `Bio`
  - removed banner hover-edit overlay from profile header
- Favorites and profile updates:
  - favorites now reflected from logged/favorite actions
  - `Manage` now opens drag-and-drop reorder modal
  - removed standalone `/favorites` page
  - removed star row from `Top albums` favorites strip
- Logged page redesign:
  - transformed backlog UI into cover-first `Logged` layout
  - added toolbar filtering/sorting and overflow actions per tile
  - updated header with identity/count layout refinements
  - switched toolbar filter label from `Source` to `Status`
  - status model aligned to: `listened`, `listening`, `unfinished`, `backloggd`
- Artists directory refactor:
  - rebuilt as dense A-Z directory with grouped letter sections
  - sticky A-Z rail (desktop + mobile variants) with active/disabled letters
  - search/sort improvements, skeleton loading, and empty states
- Explore page refactor:
  - moved to cover-browser style auto-fill square grid
  - aligned tile format with logged cover cards (cover-first)
  - added decade + genre dropdowns below search (plus existing sort dropdown)
  - exposed release/genre metadata in explore API payload for filtering
- Album page enhancements:
  - added `Favorite` action in album log card
  - added `Community reviews` section under tracklist
  - each review now shows reviewer avatar, username, rating, and review text
  - backend now resolves album-level reviews and reviewer profile media
- Navbar/branding adjustments:
  - reverted brand mark to Phosphor icon
  - switched `Albums` nav icon to `Disc`
  - removed temporary `public/logo` assets

### Mar 3, 2026

- Redesigned `Friends` page into a full social hub:
  - search by name/handle/location
  - toggleable filters (now spinning, recently active, same city)
  - sort controls (recent, logs, rating, streak)
  - list/grid view toggle with persistence
  - grouped list sections (`Now spinning`, `Recently active`, `All friends`)
  - richer row/card designs, presence pills, accessible focus states
  - overflow action menu placeholders and empty/no-result states
- Updated friend profile page to match current profile page structure:
  - single panel surface with section dividers
  - embedded `ProfileHeader`
  - same rhythm/layout style as `/profile`
- Updated connections data:
  - `friends` export now shows only **Ari Santos**
- Refined profile header:
  - avatar-overlap spacing fixes
  - cleaner identity stack spacing/alignment
  - improved `About` + stats rhythm
  - action buttons now use Phosphor icons and uniform button sizing

### Earlier tracked updates

- Last.fm callback flow and connect button added
- Profile subcomponents and modals extracted
- Activity and album detail pages added

## Notes

- This app uses React Router. Configure SPA fallback (`index.html`) for deep-link hosting.
- Some legacy/experimental components remain in the repo even if not currently routed.
