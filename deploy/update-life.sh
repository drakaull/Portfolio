#!/usr/bin/env bash
# Puts the Game of Life online at a release tag, on the server (see docs/deployment.md):
#   ./update-life.sh v1.0.0
# The build runs in a throwaway Node container (no Node on the server). Caddy serves ~/sites/life
# as it is, so it needs no restart.
set -euo pipefail

TAG="${1:?usage: ./update-life.sh <release tag, e.g. v1.0.0>}"
REPO=https://github.com/drakaull/game-of-life.git
SRC="$HOME/game-of-life"
SITES="$HOME/sites"
NODE_IMAGE=node:22.23.2-trixie-slim # the one frontend/Dockerfile uses

[ -d "$SRC" ] || git clone --quiet "$REPO" "$SRC"
git -C "$SRC" fetch --quiet --tags --force
git -C "$SRC" -c advice.detachedHead=false checkout --quiet "$TAG"

# Checked, then built, exactly as the game's checklist asks. As this user, not root: the files
# stay ours; npm's cache stays inside the throwaway container.
docker run --rm --user "$(id -u):$(id -g)" --env HOME=/tmp \
  --volume "$SRC":/app --workdir /app "$NODE_IMAGE" \
  sh -c 'npm ci --no-audit --no-fund && npm test && npm run lint && npm run format:check && npm run build'

# Swap the folders: the site is never half copied, and nothing of the previous release lingers.
mkdir -p "$SITES"
rm -rf "$SITES/life.new" "$SITES/life.old"
cp -r "$SRC/dist" "$SITES/life.new"
if [ -d "$SITES/life" ]; then mv "$SITES/life" "$SITES/life.old"; fi
mv "$SITES/life.new" "$SITES/life"
rm -rf "$SITES/life.old"
echo "$(date '+%F %T') Game of Life $TAG online"
