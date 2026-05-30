# Vessel Tender Offline-First Review Notes

These notes come from using Vessel Tender as a working reference model while implementing the Paraguay Diaconia offline-first mobile flow. They are intentionally recommendations only; this repo does not copy Vessel Tender implementation details.

## Recommendations

1. **Replay data rows before uploading related binaries.**
   - If media rows carry foreign keys to newly-created users, meetings, vessels, jobs, or inspections, replay the authoritative data mutation first.
   - Upload binaries afterward, then replay a small metadata/link mutation if the upload returns a media id.
   - This avoids FK failures when a record and its photos were both created offline.

2. **Never synthesize non-UUID ids from composite strings.**
   - For join/attendance-style rows, either generate a real UUID at capture time or upsert by the natural unique key.
   - Composite strings such as `${parentId}-${childId}` are convenient locally but will fail UUID columns and can poison the sync queue.

3. **Keep partial media failures from blocking unrelated data.**
   - A failed photo upload should leave only that photo-bearing mutation pending/failed.
   - Other queued data mutations should still replay so offline users are not forced into all-or-nothing sync.

4. **Restrict self-service replay fields.**
   - Offline replay endpoints should not trust client-provided role/status/auth fields for self updates.
   - Non-admin self updates should be limited to safe profile fields such as display name, email, phone, and approved media ids.

5. **Acknowledge only the replayed batch.**
   - When a sync run sends a subset of the local queue, mark only that subset as synced.
   - Leaving filtered/failed/draft mutations pending prevents quiet data loss.

6. **Preserve draft vs pending semantics explicitly.**
   - Draft records should remain local and excluded from replay until the user promotes/submits them.
   - The UI should expose that promotion path clearly.

## What worked well as a model

- Durable local capture before network work.
- Explicit pending/synced/failed status in the local model.
- Separate treatment of binary media upload from structured data replay.
- Retry-oriented queue design instead of one-shot REST calls.
