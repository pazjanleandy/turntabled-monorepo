# Turntabled

Album logging UI built with React + Vite + Tailwind + React Router. The app includes a home feed, profile page, and artist profile pages loaded from JSON.

**Setup**
1. Install dependencies: `npm install`
2. Start dev server: `npm run dev`
3. Build for production: `npm run build`
4. Preview production build: `npm run preview`

**Routing**
- `/` Home
- `/profile` Profile
- `/artist/:artistId` Artist profile (loaded from JSON in `src/data/artists`)

**Data**
- `src/data/artists/*.json` one file per artist
- `src/data/loadArtists.js` uses `import.meta.glob` to load all artist JSON files (eager) and attach `id` from filename

**Pages**
- `src/pages/Home.jsx` main landing page
- `src/pages/Profile.jsx` profile and activity views
- `src/pages/ArtistProfile.jsx` artist profile detail view

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

**Notes**
- This project uses React Router. If you deploy to static hosting, configure history fallback to `index.html` so deep links work.
