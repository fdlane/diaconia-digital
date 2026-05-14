# Diaconia Digital Foundation Plan

## Summary

Build the first foundation slice as **Facilitator Field Sessions** inside the broader **Diaconia Mobile** experience across **iOS, Android, and Web**. Facilitators sign in, view assigned groups, record meetings offline, mark attendance, capture profile photos, attach meeting photos, add notes/follow-up flags, and sync later. Admin staff review sessions, attendance, notes, and images in a web dashboard.

This proves the platform foundation before banking, blockchain, marketplace, AI, WebRTC, or payment work begins.

## Key Decisions

- **Repo tooling:** use plain `pnpm` workspaces, not Nx. Add Nx only later if build orchestration becomes a real bottleneck.
- **Mobile/Web app:** Expo React Native targeting iOS, Android, and Web for the holistic Diaconia user experience; facilitator field sessions are the first workflow.
- **Admin web:** Next.js dashboard for staff/admin workflows.
- **Backend:** TypeScript API with OpenAPI.
- **Database:** PostgreSQL with **Drizzle ORM** for schema, migrations, and typed queries.
- **Offline sync:** **Zero** for offline-first local writes and sync, based on confirmation that the current Zero version supports writes.
- **Identity:** Amazon Cognito from the start, using AWS End User Messaging SMS for Paraguay `+595`, with email fallback.
- **Media:** profile photos and meeting images stored in S3; metadata syncs through PostgreSQL/Zero.
- **Infrastructure:** Terraform-first on a temporary personal AWS account, portable to Diaconia GitHub/AWS later.
- **Plan artifact:** this plan is saved as `docs/FoundationPlan.md`.

## Platform Scope

- **iOS:** Expo build target, camera/photo capture, offline local storage, Zero sync, Cognito sign-in.
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
  - Cognito User Pool, app clients, roles/groups, and SMS IAM configuration.
  - RDS PostgreSQL.
  - S3 bucket for encrypted profile photos and meeting images.
  - KMS, Secrets Manager, CloudWatch logs/alarms.
  - API and Zero hosting on ECS Fargate, App Runner, or the simplest AWS service that supports the runtime cleanly.
  - Web hosting through Amplify Hosting or S3/CloudFront.
- Data model v1:
  - Users/facilitators.
  - Groups/communities.
  - Attendees/members.
  - Sessions/meetings.
  - Attendance records.
  - Notes and follow-up flags.
  - Media assets: `user_profile_photo`, `attendee_profile_photo`, `meeting_photo`.
  - Audit metadata and sync timestamps.
- Mobile app v1, facilitator workflow:
  - Cognito sign-in.
  - Offline group and attendee list.
  - Capture/update facilitator and attendee profile photos.
  - Create meeting session offline.
  - Mark attendance.
  - Add notes and follow-up category.
  - Attach meeting photos.
  - Sync local writes and queued image uploads when online.
- Admin v1:
  - View sessions, attendance, notes, follow-up flags, profile photos, and meeting images.
  - Filter by facilitator, group, date, and follow-up status.
  - Export CSV.
  - Basic seed/import management for groups and attendees.

## Test Plan

- Unit tests for Drizzle schema helpers, validation schemas, auth guards, media metadata, attendance rules, and audit events.
- iOS, Android, and Web checks for sign-in, offline meeting creation, photo capture, restart persistence, and later sync.
- Sync tests for Zero write replay, duplicate prevention, conflict handling, and failed media upload recovery.
- API contract tests from OpenAPI.
- Deployment smoke tests for Cognito login, API health, admin login, Zero sync, and signed image access.
- Manual acceptance:
  - Facilitator records a meeting with no network.
  - Attendance, notes, profile photos, and meeting photos survive app restart.
  - Data and images sync when network returns.
  - Admin sees the session and images.
  - Admin exports session data.

## Assumptions

- First users are Diaconia staff/facilitators, not end clients.
- Spanish-first UX with English support.
- Paraguay SMS is supported through AWS, but email fallback remains required for reliability.
- Photos are personal data and require consent language, encrypted storage, role-based access, and audit logging.
- Binary images live in S3; only image metadata is synced through PostgreSQL/Zero.
- Deferred for later phases: core banking, Bancard, SIPAP, DIACOIN, Besu, SSI, AI counseling, WebRTC, QR/NFC payments, BLE/Wi-Fi Direct mesh, marketplace, and IRT scoring.
