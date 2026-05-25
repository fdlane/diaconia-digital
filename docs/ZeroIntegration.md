# Zero Integration Notes

Zero is the mobile sync layer for the foundation slice. Admin uses the standard REST API. Mobile uses the same API service through `/zero/query` and `/zero/mutate` for synced field data, plus REST for server-owned workflows such as meeting submission, invite acceptance, and media upload signing.

## Phase 1 Tables

- `users`
- `groups`
- `group_memberships`
- `meetings`
- `meeting_attendance`
- `prayer_requests`
- `media_assets`

Binary files are not synced through Zero. Profile photos and meeting images are uploaded to S3; PostgreSQL stores media metadata and object keys.

## Runtime Environment

- `ZERO_CACHE_URL`
- `ZERO_UPSTREAM_DB`
- `ZERO_APP_ID=diaconia_digital`
- `ZERO_QUERY_URL`
- `ZERO_MUTATE_URL`
- `EXPO_PUBLIC_ZERO_CACHE_URL`

## Permissions

Legacy Zero queries are disabled. Mobile sync must use named, membership-scoped queries:

- `mobile.groups`
- `mobile.groupMemberships`
- `mobile.users`
- `mobile.meetings`
- `mobile.meetingAttendance`
- `mobile.prayerRequests`
- `mobile.mediaAssets`

The API resolves the bearer token to an invited, active internal `users.id` before either REST or Zero logic runs. Meeting writes, attendance, prayer requests, media upload registration, and map pin submission continue through REST until the corresponding Zero mutators are intentionally promoted.
