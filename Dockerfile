# ─── Stage 1: Dependencies ───
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json bun.lock .
RUN corepack enable bun && bun install --frozen-lockfile --production=false

# ─── Stage 2: Prisma Generate + Build ───
FROM deps AS builder
COPY . .
RUN cp prisma/schema.production.prisma prisma/schema.prisma
RUN npx prisma generate
RUN corepack enable bun && bun run build

# ─── Stage 3: Runner (minimal, production) ───
FROM node:20-alpine AS runner

RUN addgroup -g 1001 nodejs && \
    adduser -u 1001 -G nodejs -s /bin/sh -D pandai

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone .
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

# Entrypoint runs migrations then starts the server
CMD ["sh", "-c", "npx prisma migrate deploy --schema prisma/schema.production.prisma && node server.js"]
