# Diaconia Digital Foundation Plan

## Summary

Build the first foundation slice as **Facilitator Field Meetings** inside the broader **Diaconia Mobile** experience across **iOS, Android, and Web**. Facilitators sign in, view assigned groups, record meetings offline, mark attendance, capture profile photos, attach meeting photos, add text-only prayer requests, add notes/follow-up flags, and sync later. Admin staff review meetings, attendance, notes, prayer requests, and images in a web dashboard.

This proves the platform foundation before banking, blockchain, marketplace, AI, WebRTC, or payment work begins.

## Key Decisions

- **Repo tooling:** use plain `pnpm` workspaces, not Nx. Add Nx only later if build orchestration becomes a real bottleneck.
- **Mobile/Web app:** Expo React Native targeting iOS, Android, and Web for the holistic Diaconia user experience; facilitator field meetings are the first workflow.
- **Admin web:** Next.js dashboard for staff/admin workflows.
- **Backend:** TypeScript API with OpenAPI.
- **Database:** PostgreSQL with **Drizzle ORM** for schema, migrations, and typed queries.
- **API split:** one shared API service exposes REST for admin/server-owned commands and Zero endpoints for mobile sync.
- **Offline sync:** **Zero** for mobile offline-first synced reads and replayable field data; server-owned workflows continue through REST.
- **Identity:** Clerk-backed sign-in as an implementation detail, with local app invitations as the source of truth for access.
- **Media:** profile photos and meeting images stored in S3; metadata syncs through PostgreSQL/Zero.
- **Infrastructure:** Terraform-first on a temporary personal AWS account, portable to Diaconia GitHub/AWS later.
- **Plan artifact:** this plan is saved as `docs/FoundationPlan.md`.

## Platform Scope

- **iOS:** Expo build target, camera/photo capture, offline local storage, Zero sync, invited-user sign-in.
- **Android:** Expo build target with the same mobile workflow as iOS.
- **Web mobile app:** Expo Web target for basic browser use, prioritizing the same data model and sync path; camera/photo support should use browser APIs where available.
- **Admin web:** Next.js app optimized for desktop/tablet staff workflows, not offline-first in phase 1.

## Implementation Changes

- Create workspace layout:
  - `apps/mobile`: Expo React Native app for iOS, Android, and Web.
  - `apps/admin`: Next.js admin dashboard.
  - `apps/api`: TypeScript API for auth, media signing, admin endpoints, audit, and health checks.
  - `packages/db`: Drizzle schema, migrations, and database client.
  - `packages/shared`: shared types, validation schemas, API client, i18n keys.
  - `infra`: Terraform for AWS resources and deployment wiring.
- AWS foundation:
  - Identity-provider configuration, invite-first access, roles, and group authorization.
  - RDS PostgreSQL.
  - S3 bucket for encrypted profile photos and meeting images.
  - KMS, Secrets Manager, CloudWatch logs/alarms.
  - API and Zero hosting on ECS Fargate, App Runner, or the simplest AWS service that supports the runtime cleanly.
  - Web hosting through Amplify Hosting or S3/CloudFront.
- Data model v1:
  - Users/facilitators.
  - Groups/communities.
  - Attendees/members.
  - Meetings.
  - Attendance records.
  - Notes and follow-up flags.
  - Prayer requests linked to meetings only, with text-only request content.
  - Media assets: `user_profile_photo`, `group_profile_photo`, `meeting_photo`.
  - Audit metadata and sync timestamps.
- Mobile app v1, facilitator workflow:
  - Invited-user sign-in.
  - Offline group and member list.
  - Capture/update user and group profile photos.
  - Create meeting report offline.
  - Mark attendance.
  - Add notes and follow-up category.
  - Attach meeting photos.
  - Sync local writes and queued image uploads when online.
- Admin v1:
  - View meetings, attendance, notes, prayer requests, follow-up flags, profile photos, and meeting images.
  - Filter by facilitator, group, date, and follow-up status.
  - Export CSV.
  - Basic seed/import management for groups and members.

## Test Plan

- Unit tests for Drizzle schema helpers, validation schemas, auth guards, media metadata, attendance rules, and audit events.
- iOS, Android, and Web checks for sign-in, offline meeting creation, photo capture, restart persistence, and later sync.
- Sync tests for Zero write replay, duplicate prevention, conflict handling, and failed media upload recovery.
- API contract tests from OpenAPI.
- Deployment smoke tests for invited-user login, API health, admin login, Zero sync, and signed image access.
- Manual acceptance:
  - Facilitator records a meeting with no network.
  - Attendance, notes, profile photos, and meeting photos survive app restart.
  - Data and images sync when network returns.
  - Admin sees the meeting and images.
  - Admin exports meeting data.

## Assumptions

- First users are Diaconia staff/facilitators, not end clients.
- Spanish-first UX with English support.
- Email invitations are required; SMS can be added later if needed.
- Photos are personal data and require consent language, encrypted storage, role-based access, and audit logging.
- Binary images live in S3; only image metadata is synced through PostgreSQL/Zero.
- Deferred for later phases: core banking, Bancard, SIPAP, DIACOIN, Besu, SSI, AI counseling, WebRTC, QR/NFC payments, BLE/Wi-Fi Direct mesh, marketplace, and IRT scoring.
