# Backlog API

## Endpoints
- `GET /api/backlog?page=1&limit=20`
- `GET /api/backlog?albumId=<uuid>`
- `POST /api/backlog`
- `PATCH /api/backlog/:id`
- `DELETE /api/backlog/:id`

## Auth
- Required: `Authorization: Bearer <supabase_access_token>`
- Requests without a valid bearer token are rejected with `401`.

## Request Bodies
- `POST /api/backlog`
```json
{
  "albumId": "uuid",
  "artistNameRaw": "Artist Name",
  "albumTitleRaw": "Album Title",
  "status": "backloggd",
  "isFavorite": false,
  "listenedOn": "2026-02-24",
  "rating": 4,
  "reviewText": "Great album front to back."
}
```

Behavior:
- If no row exists for `(user_id, album_id)`: creates backlog row.
- If row exists and `reviewText` is provided: updates `review_text` and `reviewed_at` on that row.
- If row exists and `isFavorite: true` is provided: marks row as favorite.

- `PATCH /api/backlog/:id`
```json
{
  "rating": 5,
  "reviewText": "Updated thoughts after relisten."
}
```

## Validation
- `rating` must be an integer in `[1,5]` when provided.
- `status` must be one of `listened|listening|unfinished|backloggd`.
- `isFavorite` (optional) must be boolean when provided.
- `listenedOn` (optional) must be `YYYY-MM-DD`.
- `reviewText` (optional in payload) cannot be empty or whitespace-only.
- Users can only read/update/delete their own backlog entries from API endpoints.

## Database Notes
Run migration:

```sql
-- see db/migrations/20260304_backlog_reviews.sql
```
