# Multi-stage build: Web assets + API
FROM node:20-alpine AS web
WORKDIR /repo
# Copy workspace files first
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/command-center-ui ./apps/command-center-ui
RUN corepack enable && cd apps/command-center-ui && pnpm i --frozen-lockfile && pnpm build

FROM node:20-alpine AS api
WORKDIR /app
# Copy workspace files first
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api ./apps/api
RUN corepack enable && cd apps/api && pnpm i --frozen-lockfile && pnpm build

# Install curl for health checks
RUN apk add --no-cache curl

# Bundle UI in the API image
COPY --from=web /repo/apps/command-center-ui/dist /app/apps/api/dist-web

# Set production environment variables
ENV NODE_ENV=production \
    PORT=10000 \
    HOST=0.0.0.0 \
    RELEASE=${GIT_COMMIT:-local}

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT}/v1/healthz || exit 1

WORKDIR /app/apps/api
EXPOSE ${PORT}
CMD ["node","dist/server.js"]