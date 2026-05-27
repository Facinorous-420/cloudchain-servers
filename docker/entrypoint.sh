#!/bin/sh
# Container entrypoint — applies any pending Prisma migrations against the
# linked database, then hands off to whatever CMD was set (the Next.js
# standalone server in normal use).
set -e

echo "[entrypoint] applying database migrations…"
npx --no-install prisma migrate deploy

echo "[entrypoint] migrations complete, starting server"
exec "$@"
