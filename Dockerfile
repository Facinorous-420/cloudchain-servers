# syntax=docker/dockerfile:1

# ---- base ----
FROM node:22-alpine AS base
WORKDIR /app

# ---- deps: install all dependencies for the build ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: produce the Next.js standalone output ----
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
# Prisma throws at module-import time when DATABASE_URL is absent, and
# NextAuth requires AUTH_SECRET to initialise. Neither is used during the
# build (all routes are force-dynamic), but their absence crashes the
# "Collecting page data" step. Placeholders satisfy the init checks; the
# real values come from the runtime environment via docker-compose.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV AUTH_SECRET="build-time-placeholder-not-used-at-runtime"
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate the Prisma client before building — app code imports it.
RUN npx prisma generate
RUN npm run build

# ---- runner: minimal image running the standalone server ----
# No USER directive, no --chown anywhere. Files end up root-owned with
# default modes (644 for files, 755 for dirs) → world-readable. The
# container is meant to run as an arbitrary non-root UID set via
# compose `user:` (so writes to bind-mounted host dirs land as that
# user). Same pattern as linkwarden et al — works on TrueNAS/ZFS
# bind mounts without any host-side chown gymnastics or init helpers.
FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Arbitrary compose UIDs won't have a /etc/passwd entry or a real
# home dir. Point HOME at /tmp so anything that wants to write a
# cache (npm/prisma CLI scratch files) lands somewhere writable.
ENV HOME=/tmp

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Full node_modules required for Prisma CLI/runtime
COPY --from=builder /app/node_modules ./node_modules

# Prisma schema + migrations
COPY --from=builder /app/prisma ./prisma

# Generated Prisma client — schema.prisma's `output` puts it under
# src/generated/prisma (not node_modules/.prisma). The Next standalone
# bundle has its own copy traced into .next/, but `tsx prisma/seed.ts`
# runs outside that and imports it via `../src/generated/prisma`, so
# the seed needs the source-tree copy at /app/src/generated/prisma.
COPY --from=builder /app/src/generated/prisma ./src/generated/prisma

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# System presets baked into the image (read-only reference data).
# Custom presets live in the bind-mounted volume at /app/presets/custom.
COPY --from=builder /app/presets/system ./presets/system

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh

# Normalize permissions so any UID the container runs as can read the
# files we copied in. `a+rX` grants read to everyone, and execute to
# everyone only on directories (capital X), so files stay
# non-executable but every path is traversable and readable. We skip
# node_modules — npm ci writes those with proper modes already, and
# recursing through ~tens of thousands of small files is extremely
# slow on overlayfs-on-ZFS (e.g. TrueNAS). Only the files that came
# from `COPY . .` need normalization.
RUN find /app -mindepth 1 -maxdepth 1 -not -name node_modules \
        -exec chmod -R a+rX {} + \
 && chmod 0755 /usr/local/bin/entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "server.js"]
