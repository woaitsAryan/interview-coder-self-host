FROM oven/bun:1.2-alpine AS base

FROM base AS builder

WORKDIR /app

COPY bun.lock package.json ./

RUN bun install

COPY backend/ backend/

RUN bun run backend:build

FROM base AS runner

COPY --from=builder /app/backend/dist ./dist

CMD ["bun", "run", "dist/index.js"]