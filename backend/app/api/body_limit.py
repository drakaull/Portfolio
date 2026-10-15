from starlette.exceptions import HTTPException
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

# Largest accepted request body: a 5 MB CV plus multipart overhead.
MAX_BODY_BYTES = 6 * 1024 * 1024


class BodySizeLimitMiddleware:
    """Refuses request bodies over the limit while they are received, before any parsing.

    FastAPI reads the whole body (and spools uploads to disk) before checking the admin session,
    so without this an anonymous client could make the server store arbitrarily large uploads.
    """

    def __init__(self, app: ASGIApp, max_bytes: int = MAX_BODY_BYTES) -> None:
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        declared = dict(scope["headers"]).get(b"content-length", b"")
        if declared.isdigit() and int(declared) > self.max_bytes:
            await self._too_large()(scope, receive, send)
            return

        received = 0

        async def limited_receive() -> Message:
            # Also covers bodies sent without Content-Length (chunked) or with a false one.
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > self.max_bytes:
                    # FastAPI re-raises HTTPException from body parsing, so this becomes a 413.
                    raise HTTPException(413, "Request body too large")
            return message

        await self.app(scope, limited_receive, send)

    @staticmethod
    def _too_large() -> JSONResponse:
        return JSONResponse({"detail": "Request body too large"}, status_code=413)
