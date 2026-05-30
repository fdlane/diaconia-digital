# Offline-First Zero Mobile Implementation Plan

> **For Hermes:** Implement in one branch/PR with multiple commits. Vessel Tender is a reference model only; do not copy its implementation.

**Goal:** Make the Paraguay Diaconia mobile app offline-first from the start across iOS, Android, and web using the stabilized admin entities.

**Architecture:** Zero is the authoritative data/mutation abstraction for users, groups, memberships, meetings, attendance, prayer requests, and media metadata. Binary photos stay outside Zero in durable local device storage and upload through existing media REST endpoints, while Zero/local metadata keeps the UI usable offline. Admin REST remains stable; mobile no longer depends on seed-only data or REST replay as the primary model.

**Tech Stack:** Expo React Native, AsyncStorage durable offline queues, @rocicorp/zero schema/mutators/server bridge, existing Hono API media endpoints, Vitest/TypeScript.

---

## Phase 1: Shared offline domain model

- Add a mobile offline store that persists all stabilized entities: users, groups, memberships, meetings, attendance, prayer requests, media assets, and queued photos.
- Add selectors that denormalize groups + active members from the same entity shapes used by the admin app.
- Preserve local demo bootstrap only as a fallback snapshot when Zero data has not arrived yet.

## Phase 2: Zero mutators and permissions

- Add typed Zero mutators for create/update/delete/disable of mobile/admin-shared entities.
- Keep binary media out of Zero; media metadata rows can be created/attached through Zero after upload.
- Define conflict behavior as last-write-wins with updatedAt timestamps for Greenfield launch; audit events remain server-side.

## Phase 3: Mobile app integration

- Replace seed-only groups/members with offline store selectors.
- Route person creation, facilitator toggles, profile edits, meeting drafts/submission, attendance, prayer requests, and media metadata through the offline-first repository.
- Keep the UI fully usable before network availability; show local/pending/synced/failed state.

## Phase 4: Photo capture/upload queue

- Persist captured/picked photo descriptors immediately.
- Upload binaries only when sync runs and keep metadata/pending rows available offline.
- Retry failed uploads without blocking meeting/person/profile changes.

## Phase 5: Tests, pristine pass, recommendations

- Add targeted tests for offline selectors, queue behavior, and Zero mutator surface.
- Run mobile/db/shared/API checks.
- Document Vessel Tender recommendations discovered during implementation.
