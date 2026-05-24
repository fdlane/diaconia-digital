FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/admin/package.json apps/admin/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY apps/api apps/api
COPY packages packages
RUN pnpm --filter @diaconia/api build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY --from=deps /app/node_modules node_modules
COPY --from=deps /app/apps/api/node_modules apps/api/node_modules
COPY --from=deps /app/packages/db/node_modules packages/db/node_modules
COPY --from=deps /app/packages/shared/node_modules packages/shared/node_modules
COPY --from=build /app/apps/api/src apps/api/src
COPY --from=build /app/packages packages
CMD ["node", "--import", "./apps/api/node_modules/tsx/dist/loader.mjs", "apps/api/src/server.ts"]
