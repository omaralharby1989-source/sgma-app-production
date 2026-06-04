---
name: News module visibility
description: How news visibility is decided and how status/isPublished relate.
---

# News module visibility

News visibility is driven by the `status` enum column (DRAFT/PUBLISHED/ARCHIVED) on the `news` table. Only `status = 'PUBLISHED'` rows are returned by the public read endpoints (`GET /api/news`, `GET /api/news/:id`).

The older `is_published` boolean still exists and is kept in sync (`isPublished = status === 'PUBLISHED'`) on every write, but it is NOT the source of truth.

**Why:** The table predated the status enum; rather than a destructive migration we added `status` additively and demoted `is_published` to a synced legacy column. Filtering on both would risk contradictions.

**How to apply:** When building the future admin dashboard or any new write path, set `status` and let it drive `isPublished` + `publishedAt`; never filter reads on `is_published`. The API response exposes the DB `coverImageUrl` as `imageUrl`.
