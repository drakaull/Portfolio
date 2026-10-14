# Production web image: Node builds the React site, then Caddy alone serves it (no Node at run time).
# Built by deploy/compose.yaml from the repository root; see docs/deployment.md.
# Versions pinned to releases at least two weeks old.
FROM node:22.23.2-trixie-slim AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM caddy:2.11.4-alpine
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
