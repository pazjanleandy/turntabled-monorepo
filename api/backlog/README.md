# Backlog API

## Endpoints
- `GET /api/backlog?page=1&limit=20`
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
  "status": "pending",
  "listenedOn": "2026-02-24",
  "rating": 4
}
```

- `PATCH /api/backlog/:id`
```json
{
  "rating": 5
}
```

## Validation
- `rating` must be an integer in `[1,5]`.
- `status` must be one of `completed|listening|unfinished|pending|favorite`.
- `listenedOn` (optional) must be `YYYY-MM-DD`.
- Duplicate album per user is rejected.
- Users can only read/update/delete their own backlog entries.

## Database Notes
If your `backlog` table does not yet include rating, run:

```sql
alter table public.backlog
add column if not exists rating smallint;

alter table public.backlog
add constraint backlog_rating_range
check (rating between 1 and 5);

create unique index if not exists backlog_user_album_unique
on public.backlog(user_id, album_id)
where album_id is not null;
```
