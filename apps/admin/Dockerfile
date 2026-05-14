FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/admin/package.json apps/admin/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY apps/admin apps/admin
COPY packages/shared packages/shared
RUN pnpm --filter @diaconia/admin build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY --from=build /app/apps/admin/.next apps/admin/.next
COPY --from=build /app/apps/admin/public apps/admin/public
COPY --from=deps /app/node_modules node_modules
COPY --from=deps /app/apps/admin/node_modules apps/admin/node_modules
COPY --from=build /app/apps/admin/package.json apps/admin/package.json
CMD ["pnpm", "--filter", "@diaconia/admin", "start"]
