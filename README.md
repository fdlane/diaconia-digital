# Diaconia Digital

Foundation workspace for the Diaconia and Moiru digital ecosystem.

The first implemented slice is Facilitator Field Meetings inside the broader user mobile experience across iOS, Android, and web:

- Expo React Native mobile app in `apps/mobile`
- Next.js admin dashboard in `apps/admin`
- TypeScript API in `apps/api`
- Drizzle PostgreSQL schema in `packages/db`
- Shared validation/types in `packages/shared`
- Terraform AWS foundation in `infra`

See [docs/FoundationPlan.md](docs/FoundationPlan.md) for the implementation plan.

## Prerequisites

- Node.js 22+
- pnpm 10+
- PostgreSQL 16+ for local development
- Clerk application configured for phone/SMS OTP, Google, and Apple sign-in
- AWS account access for Terraform deployments

## Local Setup

```bash
pnpm install
cp .env.example .env
pnpm db:generate
pnpm check
```

### Clerk Auth

Diaconia uses Clerk for identity and keeps application access invite-only in the local `users` table. Phone is the primary identifier: store invited users with normalized E.164 Paraguay numbers such as `+595981000000`. The same verified number is treated as the user's WhatsApp contact number.

Required auth configuration:

- API: `CLERK_SECRET_KEY` or `CLERK_JWT_KEY`, `CLERK_JWT_AUDIENCE=diaconia-api`, `CLERK_AUTHORIZED_PARTIES`
- Admin: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_CLERK_JWT_TEMPLATE=diaconia-api`, `NEXT_PUBLIC_API_URL`
- Mobile: `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_CLERK_JWT_TEMPLATE=diaconia-api`, `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_ZERO_CACHE_URL`
- Zero cache: `ZERO_AUTH_JWKS_URL`, `ZERO_AUTH_ISSUER`, `ZERO_AUTH_AUDIENCE=diaconia-api`

Local auth bypass is available only when `AUTH_DEV_BYPASS=true` is set on the API and the matching public bypass flag is set for the client. Do not enable bypass flags in production.

## Apps

```bash
pnpm dev:api
pnpm dev:admin
pnpm dev:mobile
```

The mobile app targets iOS, Android, and web through Expo. The first workflow is facilitator field meetings, but the app is intended to grow into the holistic user experience for Diaconia actors.
