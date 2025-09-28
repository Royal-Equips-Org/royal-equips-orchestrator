# Multi-stage build: Web assets + API
FROM node:20-alpine AS web
WORKDIR /repo
COPY apps/web ./apps/web
RUN corepack enable && cd apps/web && pnpm i --frozen-lockfile && pnpm build

FROM node:20-alpine AS api
WORKDIR /app
COPY apps/api ./apps/api
RUN corepack enable && cd apps/api && pnpm i --frozen-lockfile && pnpm build

# Bundle UI in the API image
COPY --from=web /repo/apps/web/dist /app/apps/api/dist-web

ENV PORT=10000 RELEASE=${GIT_COMMIT:-local}
WORKDIR /app/apps/api
CMD ["node","dist/server.js"]