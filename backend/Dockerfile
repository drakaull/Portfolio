# Production image of the API. Built by deploy/compose.yaml; see docs/deployment.md.
# Versions pinned to releases at least two weeks old.
FROM python:3.12.14-slim-trixie

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/app/.venv \
    PATH="/app/.venv/bin:$PATH"

RUN pip install --no-cache-dir uv==0.12.20

WORKDIR /app

# Dependencies first, exactly as locked: this layer is reused while only the code changes.
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-dev --no-install-project

COPY alembic.ini ./
COPY migrations ./migrations
COPY app ./app

# Never run as root: a flaw in the app would not give it the whole container.
RUN useradd --system --uid 10001 --no-create-home app \
    && mkdir -p /app/storage \
    && chown app /app/storage
USER app

EXPOSE 8000

# One process: the login and contact rate limiters live in memory.
# --proxy-headers: the visitor's IP comes from Caddy's X-Forwarded-For, trusted only from the
# addresses in FORWARDED_ALLOW_IPS (the private Docker network, set in deploy/compose.yaml).
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--no-server-header"]
