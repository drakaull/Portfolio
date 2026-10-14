#!/usr/bin/env bash
# Puts a backup archive made by backup.sh back: the database AND the uploads are replaced.
# Usage (from anywhere): deploy/restore.sh /var/backups/portfolio/portfolio-2026-10-14_0330.tar.gz
set -euo pipefail

archive="$(realpath "${1:?usage: restore.sh <backup archive .tar.gz>}")"
cd "$(dirname "$0")"

read -r -p "Replace the site's database and uploads with $archive? Type yes: " answer
[ "$answer" = "yes" ] || { echo "Nothing changed."; exit 1; }

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
tar --directory="$work" --extract --gzip --file="$archive"

# --clean drops what exists before recreating it from the dump.
docker compose exec -T db pg_restore --username=portfolio --dbname=portfolio \
  --clean --if-exists --no-owner --single-transaction < "$work/db.dump"
docker compose exec -T backend sh -c \
  'find /app/storage -mindepth 1 -delete && tar --directory=/app/storage --extract --file=-' \
  < "$work/storage.tar"
echo "Restored $archive."
