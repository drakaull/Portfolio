#!/usr/bin/env bash
# Nightly backup of the site, run by cron on the server (see docs/deployment.md):
# the database (pg_dump) and the uploads (CV, photo) in one dated archive.
# The newest KEEP archives are kept; older ones are deleted, so backups never pile up.
# They hold contact messages (personal data): readable by their owner only.
set -euo pipefail

KEEP=14
DEST="${BACKUP_DIR:-/var/backups/portfolio}"

cd "$(dirname "$0")" # docker compose needs this folder (compose.yaml, .env)
umask 077
mkdir -p "$DEST"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

docker compose exec -T db pg_dump --username=portfolio --dbname=portfolio --format=custom > "$work/db.dump"
docker compose exec -T backend tar --directory=/app/storage --create --file=- . > "$work/storage.tar"

archive="$DEST/portfolio-$(date +%Y-%m-%d_%H%M).tar.gz"
tar --directory="$work" --create --gzip --file="$archive" db.dump storage.tar
echo "$(date '+%F %T') saved $archive ($(du -h "$archive" | cut -f1))"

# Rotation: keep the KEEP newest archives.
ls -1t "$DEST"/portfolio-*.tar.gz | tail -n +$((KEEP + 1)) | xargs -r rm --
