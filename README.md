# Diaconia Digital

Foundation workspace for the Diaconia and Moiru digital ecosystem.

The first implemented slice is Facilitator Field Sessions inside the broader user mobile experience across iOS, Android, and web:

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
- AWS account access for Terraform deployments

## Local Setup

```bash
pnpm install
cp .env.example .env
pnpm db:generate
pnpm check
```

## Apps

```bash
pnpm dev:api
pnpm dev:admin
pnpm dev:mobile
```

The mobile app targets iOS, Android, and web through Expo. The first workflow is facilitator field sessions, but the app is intended to grow into the holistic user experience for Diaconia actors.
