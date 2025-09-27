# Multi-stage build: Web assets + API
FROM node:20-alpine AS web
WORKDIR /w
COPY apps/web ./apps/web
RUN corepack enable && cd apps/web && pnpm i --frozen-lockfile && pnpm build

FROM node:20-alpine AS api
WORKDIR /app
COPY apps/api ./apps/api
RUN corepack enable && cd apps/api && pnpm i --frozen-lockfile && pnpm build

# Copy web assets into API dist folder
COPY --from=web /w/apps/web/dist /app/apps/api/dist-web

ENV RELEASE=${GIT_COMMIT:-local}
WORKDIR /app/apps/api
CMD ["node","dist/server.js"]