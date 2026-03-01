# Explore Backend Module

## Endpoints
- `GET /api/explore?page=1&limit=20`
  - Auth:
    - `Authorization: Bearer <supabase_access_token>`, or
    - `x-user-id: <uuid>`, or
    - `x-username: <username>`, or
    - `x-email: <email>`
  - Returns global album catalog from cached `album` table (`scope: catalog`).
  - This endpoint is read-only discovery and is not tied to user backlog data.
  - Backlog remains a separate module/flow.
- `GET /api/explore/popular?page=1&limit=20`
  - Returns popular albums ranked from `backlog` only (`scope: popular-albums`).
  - Ranking: `logCount DESC`, then `averageRating DESC` (null ratings handled as no rating).
  - Includes aggregated stats plus album/artist metadata for frontend consumption.
- `POST /api/internal/musicbrainz-worker`
  - Auth: `Authorization: Bearer <EXPLORE_WORKER_SECRET>` or `x-worker-secret`.
  - Processes queued MusicBrainz hydration jobs with strict global 1 request/second gate.

## Required Infrastructure (Supabase Native)
- Supabase project with Table Editor enabled.
- Upstash Redis (REST API enabled).
- Vercel Cron targeting `/api/internal/musicbrainz-worker` every minute.

## Supabase Table Setup
Create these tables in Supabase Table Editor:

### `user` (or `users`)
- `id` (uuid, primary key)
- `email` (text, unique, not null)
- `username` (text, unique, not null)
- `full_name` (text, nullable)
- `avatar_url` (text, nullable)
- `provider` (text, nullable)
- `is_verified` (boolean, nullable)
- `contact_num` (text, nullable)
- `created_at` (timestamptz, default `now()`)
- `updated_at` (timestamptz, default `now()`)

### `artist`
- `id` (uuid, primary key)
- `mbid` (uuid, unique, nullable)
- `name` (text, not null)
- `normalized_name` (text, unique, not null)
- `sort_name` (text, nullable)
- `country` (text, nullable)
- `disambiguation` (text, nullable)
- `metadata_source` (text, default `musicbrainz`)
- `last_synced_at` (timestamptz, nullable)
- `created_at` (timestamptz, default `now()`)
- `updated_at` (timestamptz, default `now()`)

### `album`
- `id` (uuid, primary key)
- `mbid` (uuid, unique, nullable)
- `artist_id` (uuid, foreign key -> `artist.id`, not null)
- `title` (text, not null)
- `normalized_title` (text, not null)
- `release_date` (date, nullable)
- `primary_type` (text, nullable)
- `secondary_types` (text[], default empty array)
- `cover_art_url` (text, nullable)
- `metadata_source` (text, default `musicbrainz`)
- `last_synced_at` (timestamptz, nullable)
- `created_at` (timestamptz, default `now()`)
- `updated_at` (timestamptz, default `now()`)
- Unique constraint: (`artist_id`, `normalized_title`)

### `backlog`
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key -> `user.id` or `users.id`, not null)
- `album_id` (uuid, foreign key -> `album.id`, nullable)
- `artist_name_raw` (text, not null)
- `album_title_raw` (text, not null)
- `status` (text, default `pending`)
- `source` (text, default `lastfm`)
- `added_at` (timestamptz, default `now()`)
- `updated_at` (timestamptz, default `now()`)
- Unique constraint: (`user_id`, `artist_name_raw`, `album_title_raw`)

## Required Indexes
- `backlog(user_id, added_at desc)`
- `album(artist_id, normalized_title)`

## RLS Guidance
- Keep RLS enabled for user-facing reads/writes.
- Explore API uses Supabase service role on backend, so it can read/write cache and hydration data safely server-side.
- Add policies so clients can only access their own backlog rows.

## Strict MusicBrainz Limit
- Every MusicBrainz call must acquire Redis key `mb:rate-gate` with `SET NX PX 1000`.
- If gate acquisition fails, the worker requeues and exits.
- This enforces at most one MusicBrainz request/second globally across concurrent instances.
