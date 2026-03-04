# Profile API

## Endpoints
- `GET /api/profile`
- `PATCH /api/profile`
- `PATCH /api/profile/favorites/:id`
- `PUT /api/profile/favorites`

## Auth
- Required: `Authorization: Bearer <supabase_access_token>`

## Request Bodies
- `PATCH /api/profile`
```json
{
  "fullName": "Jane Doe",
  "bio": "updated bio",
  "avatarUrl": "https://cdn.example.com/avatar.jpg"
}
```

- `PATCH /api/profile/favorites/:id`
```json
{
  "isFavorite": true
}
```

- `PUT /api/profile/favorites`
```json
{
  "favoriteBacklogIds": ["uuid-1", "uuid-2"]
}
```

## Behavior
- Users can only toggle favorites for backlog rows they own.
- Bulk favorites validates all backlog IDs belong to the authenticated user.
- All successful write endpoints return the full updated profile payload:
  - `user` info (`fullName`, `bio`, `avatarUrl`, etc.)
  - `favorites` list with joined album metadata.
  - `reviews` list sourced from backlog rows where `review_text` is not null, sorted by `reviewed_at` descending.
