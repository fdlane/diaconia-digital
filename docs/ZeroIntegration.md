# Zero Integration Notes

Zero is the selected sync layer for the foundation slice. The app keeps a local queue for field-session writes and routes replay through the API while the Zero schema and permissions are finalized.

## Phase 1 Tables

- `users`
- `groups`
- `attendees`
- `sessions`
- `attendance_records`
- `media_assets`

Binary files are not synced through Zero. Profile photos and meeting images are uploaded to S3; PostgreSQL stores media metadata and object keys.

## Runtime Environment

- `ZERO_CACHE_URL`
- `ZERO_UPSTREAM_DB`
- `ZERO_QUERY_URL`
- `ZERO_MUTATE_URL`
- `EXPO_PUBLIC_ZERO_CACHE_URL`

## Permissions

Facilitators should only sync groups assigned to them, attendees within those groups, and sessions/media they created. Admin users can read all foundation-session data in phase 1.
