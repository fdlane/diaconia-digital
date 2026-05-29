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

#### Local auth parity

Use this path when testing auth locally with the same security model as a deployment:

1. In Clerk, use the development instance and enable the sign-in methods you want to test, such as phone/SMS OTP, Google, and Apple.
2. In Clerk, create a JWT template named `diaconia-api`. Include an `aud` claim of `diaconia-api` and claims the API can match against invited users:

   ```json
   {
     "aud": "diaconia-api",
     "email": "{{user.primary_email_address}}",
     "phone_number": "{{user.primary_phone_address}}"
   }
   ```

3. Put backend-only values in the repo root `.env`, which the API loads:

   ```bash
   CLERK_SECRET_KEY=sk_test_...
   CLERK_JWT_AUDIENCE=diaconia-api
   CLERK_AUTHORIZED_PARTIES=http://localhost:3000,http://localhost:3001
   AUTH_DEV_BYPASS=false
   AUTH_AUTO_PROVISION_CLERK_USERS=true
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
   ```

   `CLERK_JWT_KEY` can be used instead of `CLERK_SECRET_KEY` if you want networkless JWT verification with Clerk's JWT public key.
   `AUTH_AUTO_PROVISION_CLERK_USERS=true` is a non-production convenience: any valid Clerk user who signs in is created as an active admin in the database. The flag is ignored when `ENVIRONMENT` is `prod` or `production`.

4. Put admin public values in `apps/admin/.env.local` or export them before running `pnpm dev:admin`. Next.js does not automatically read the repo root `.env` for this package:

   ```bash
   NEXT_PUBLIC_API_URL=http://localhost:4000
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   NEXT_PUBLIC_CLERK_JWT_TEMPLATE=diaconia-api
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/
   NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/
   NEXT_PUBLIC_AUTH_DEV_BYPASS=false
   ```

5. If `AUTH_AUTO_PROVISION_CLERK_USERS=false`, make sure the local database has an invited or active admin user whose phone or email matches the Clerk account you will sign in with. `pnpm db:seed` creates demo users, but you may need to update one seeded admin row to your own test phone or email.
6. For local invite and password reset testing, configure the Clerk development instance URLs to point at `http://localhost:3000` and use `http://localhost:3000/sign-up` for sign-up/invitation links. The admin uses Clerk's hosted sign-in and sign-up components locally, so Clerk handles password reset, invitation acceptance, and required session tasks.
7. Run the services:

   ```bash
   pnpm dev:api
   pnpm dev:admin
   ```

8. Open `http://localhost:3000`, sign in through Clerk, and confirm the API accepts the Clerk Bearer token. A direct unauthenticated API request such as `curl -i http://localhost:4000/me` should return `401`; a signed-in admin should load normally.

For deployed dev environments, the same pattern applies with `auth_auto_provision_clerk_users = true` in Terraform. Make sure every deployed browser origin, such as the ALB DNS name or custom domain, is present in `allowed_callback_urls` so the API includes it in `CLERK_AUTHORIZED_PARTIES`.

## Apps

```bash
pnpm dev:api
pnpm dev:admin
pnpm dev:mobile
```

The mobile app targets iOS, Android, and web through Expo. The first workflow is facilitator field meetings, but the app is intended to grow into the holistic user experience for Diaconia actors.
