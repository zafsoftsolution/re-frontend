# ── Rakib Enterprise — Next.js frontend (production image) ──────────────────
# Multi-stage build using Next.js `output: "standalone"` (see next.config.ts).
#
# NEXT_PUBLIC_* values are inlined into the browser bundle at BUILD time, so
# they arrive as build args (from GitHub Actions `vars.*` in CI, or from
# docker-compose.yml locally). Server-only secrets (e.g. JMN_JWT_SECRET,
# INTERNAL_DJANGO_BACKEND) are supplied at RUNTIME via env / env_file and are
# never baked into the image.
#
# Keep NODE_VERSION in sync with `node-version` in .github/workflows/ci-cd.yml.
ARG NODE_VERSION=22

# ── 1. Dependencies ──────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

# ── 2. Build ─────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_DJANGO_API_URL
ARG NEXT_PUBLIC_DJANGO_BACKEND
ENV NEXT_PUBLIC_DJANGO_API_URL=$NEXT_PUBLIC_DJANGO_API_URL \
    NEXT_PUBLIC_DJANGO_BACKEND=$NEXT_PUBLIC_DJANGO_BACKEND

RUN npm run build

# ── 3. Runtime ───────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=9085 \
    HOSTNAME=0.0.0.0

RUN addgroup -S -g 1001 nodejs \
 && adduser -S -u 1001 -G nodejs nextjs

# Standalone server + its traced node_modules, plus static assets and public/
# (standalone does not copy these by default).
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 9085

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" >/dev/null || exit 1

CMD ["node", "server.js"]
