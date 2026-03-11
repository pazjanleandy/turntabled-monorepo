# Turntabled

Turntabled is a React + Vite + Tailwind app for album logging, artist discovery, profile management, and social connections.

Last updated: March 11, 2026.

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
4. Apply DB migrations (when schema changes): `npx supabase db push --include-all`

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

### Mar 11, 2026

- Homepage discovery section now uses real community lists (no placeholder genres):
  - replaced hardcoded genre/scene content in `BecauseCommunityLovesSection` with live list data from `/api/lists`
  - featured item now comes from the highest real interaction list, with supporting items from the next ranked lists
  - ranking now uses real engagement (`favoriteCount + commentCount`) with sensible tie-breaks
  - section copy/labels updated for list discovery (`Most loved lists right now`, `Open list`)
  - real metadata now shown: title, description, creator, album preview, albums/favorites/comments, publish recency
  - added no-data empty state that encourages publishing the first list (no fake backfill)
- Friends page mobile stability fixes:
  - fixed broken/clipped mobile friend rows by introducing dedicated mobile row components
  - removed leftover visual fragments and decorative artifacts from mobile friend entries
  - restored clean mobile container/padding/overflow behavior for friend and search rows
  - kept desktop/tablet list/grid behavior intact
- Friend profile mobile parity:
  - aligned `/friends/:friendSlug` mobile structure with the main profile mobile layout
  - added mobile header/sidebar shell consistency and section rhythm parity
  - ensured social/media sections render with the same mobile hierarchy as `/profile`

### Mar 10, 2026

- Lists page major desktop polish pass:
  - refined hierarchy and spacing for page header, controls, featured area, and published feed
  - replaced clunky chip-heavy controls with cleaner sort/filter/search composition
  - improved featured + spotlight composition and internal alignment
  - reworked published list rows for better editorial balance and scanability
  - improved album collage treatment and removed awkward strip-like crop behavior
- Lists page color/state cleanup (light and dark mode):
  - normalized selected/unselected filter behavior (orange selected state only)
  - fixed inconsistent dark-mode text/icon color issues in lists surfaces and controls
  - removed unnecessary outlines/containers and reduced visual clutter
- Engagement/action presentation updates:
  - replaced boxed favorite/comment actions with cleaner icon-first treatment
  - removed awkward `0 favorites` / `0 comments` metadata where it hurt scanability
  - increased icon legibility and integrated counters more naturally into rows
- List detail modal (desktop) refactor:
  - strengthened hero/header structure with clearer list identity and metadata
  - improved ranked album rows to feel curated instead of admin-table-like
  - refined discussion/composer section and close control treatment
  - moved primary actions to more natural positions
  - added owner-only edit/delete actions for own lists
- List editing/publishing workflow improvements:
  - added add-albums and reorder support during edit mode
  - improved modal state consistency across view/edit/add/reorder/publish flows
  - mobile-only publish modal and list flow were refactored for touch-first hierarchy, spacing, and action bars
- Social integration hardening for lists:
  - fixed list favorite/comment failures and ensured both mobile and desktop integration paths work
  - heart icon now renders orange when a list is favorited
  - ensured profile avatars display consistently in comments and list surfaces on both mobile and desktop

### Mar 9, 2026

- Global theming + dark mode rollout:
  - added app-wide dark mode styling across layouts, cards, forms, nav, dropdowns, and detail views
  - dark mode toggle moved into profile hover/dropdown menu
  - theme preference now persists via client storage and restores on reload
- Home/feed improvements:
  - mobile home redesigned with compact header/sidebar patterns and stronger section hierarchy
  - recently listened no longer shows consecutive duplicate album entries
  - fixed long album-title overflow so card titles do not overlap neighboring cards
- Navigation + sidebar refinements:
  - mobile nav/header and drawer hierarchy/padding simplified for cleaner phone UX
  - menu icon treatments and selected/unselected color states tuned for light/dark consistency
- Mobile-only page refactors (desktop preserved where requested):
  - Explore / album catalog controls, filters, and grid rhythm tightened for phone browsing
  - Logged albums, Artists directory, Album detail, Artist detail, and Auth/login mobile layouts polished
  - back button treatments and heavy stacked-card patterns reduced across mobile flows
- Landing/desktop polish:
  - refined hero-to-content flow and atmospheric fade transition to remove hard visual seams
  - adjusted card/surface balance to keep hero dominance and improve compositional continuity

### Mar 6, 2026

- Album log UX improvements:
  - log modal now pre-fills existing status/rating/review/date when reopening
  - editing an existing log now persists updates to status/rating/date/review
  - rating in `Log album` now supports half-star increments (0.5 steps)
- Favorites toggle update:
  - clicking `Favorited` on album page now removes the album from favorites
  - favorite button now acts as add/remove toggle with matching notices
- Explore pagination:
  - added page-based pagination with 48 albums per page
  - page state now reads/writes via query param (`?page=`) with next/previous controls
- Logged page polish:
  - album cover hover now shows title + artist tooltip (same behavior as Explore tiles)
  - rating metadata now includes a status color dot (`listened`, `listening`, `unfinished`, `backloggd`)
- Album page rating sync:
  - `Log this album` star row now reflects the user’s current logged rating instead of always showing empty stars
- Review interactions (new):
  - added review likes + comments persistence with migration `db/migrations/20260306_review_interactions.sql`
  - new review interaction endpoints:
    - `PATCH /api/backlog/reviews-likes`
    - `POST /api/backlog/reviews-comments`
    - `PATCH /api/backlog/reviews-comments`
    - `DELETE /api/backlog/reviews-comments?id=<commentId>`
  - `/api/explore/album` review payload now includes:
    - `likeCount`
    - `viewerHasLiked`
    - `commentCount`
    - `comments[]` with commenter profile metadata
- Album review thread UX refresh:
  - like/comment actions now support optimistic updates and ownership-aware comment editing/deletion
  - own-comment actions moved into a `...` overflow menu
  - comments UI refactored to a denser, cleaner threaded layout with integrated composer
  - commenter profile photos are shown inside comment rows
  - heart/comment actions are icon + count controls (no pill chrome)
  - action icons are larger and liked hearts render orange
- Local environment cleanup:
  - standardized local API base to `http://localhost:3001`
  - removed duplicate `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` entries from `.env`

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
