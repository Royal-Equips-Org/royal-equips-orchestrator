# Multi-stage build: Web assets + API
FROM node:20-alpine AS web
WORKDIR /repo
COPY apps/command-center-ui ./apps/command-center-ui
RUN corepack enable && cd apps/command-center-ui && pnpm i --frozen-lockfile && pnpm build

FROM node:20-alpine AS api
WORKDIR /app
COPY apps/api ./apps/api
RUN corepack enable && cd apps/api && pnpm i --frozen-lockfile && pnpm build

# Bundle UI in the API image
COPY --from=web /repo/apps/command-center-ui/dist /app/apps/api/dist-web

ENV PORT=10000 RELEASE=${GIT_COMMIT:-local}
WORKDIR /app/apps/api
CMD ["node","dist/server.js"]