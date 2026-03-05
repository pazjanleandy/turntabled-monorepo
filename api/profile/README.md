# Profile API

## Endpoints
- `GET /api/profile`
- `GET /api/profile/search?q=<partial-username>&limit=<1-50>`
- `GET /api/profile/view?userId=<uuid>`
- `GET /api/profile/view?username=<username>`
- `PATCH /api/profile`
- `POST /api/profile/avatar`
- `POST /api/profile/cover`
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

- `POST /api/profile/avatar`
```json
{
  "mimeType": "image/jpeg",
  "dataUrl": "data:image/jpeg;base64,..."
}
```

- `POST /api/profile/cover`
```json
{
  "mimeType": "image/jpeg",
  "dataUrl": "data:image/jpeg;base64,..."
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
- Bulk favorites preserve order using the `favoriteBacklogIds` array order.
- Avatar uploads must be PNG or JPEG and at most 2MB after base64 decode.
- Cover uploads must be PNG or JPEG and at most 5MB after base64 decode.
- `GET /api/profile/search` performs a case-insensitive partial username match and excludes the authenticated user.
- `GET /api/profile/view` returns a public profile for another user (never the authenticated profile payload).
- `GET /api/profile/view` returns `404 NOT_FOUND` when the target user does not exist.
- All successful write endpoints return the full updated profile payload:
  - `user` info (`fullName`, `bio`, `avatarUrl`, etc.)
  - `favorites` list with joined album metadata.
  - `reviews` list sourced from backlog rows where `review_text` is not null, sorted by `reviewed_at` descending.

## Read Models
- `GET /api/profile/search` response shape:
```json
{
  "query": "tim",
  "results": [
    {
      "id": "uuid",
      "username": "timo",
      "avatarUrl": "https://..."
    }
  ]
}
```

- `GET /api/profile/view` response shape (read-only):
```json
{
  "user": {
    "id": "uuid",
    "username": "timo",
    "bio": "public bio",
    "avatarUrl": "https://...",
    "coverUrl": "https://..."
  },
  "favorites": [],
  "completed": [],
  "reviews": []
}
```
