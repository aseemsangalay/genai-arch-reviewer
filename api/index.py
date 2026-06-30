from __future__ import annotations
import os
import sys
import time
from collections import defaultdict

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from api.bedrock import invoke_model

app = FastAPI()

STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "build")

ACCESS_CODE = os.environ.get("ACCESS_CODE", "").strip()

CANONICAL_INPUT = (
    "I'm building a RAG-based customer support platform for 1M users, "
    "using OpenAI embeddings + Pinecone + GPT-4 for generation, "
    "expecting 10K daily active users, sub-2-second response requirement."
)

# In-memory rate limit for the demo endpoint.
# Per-IP: max 5 demo requests per 60s window.
# Note: resets on cold start — intentional for serverless; good enough to prevent
# casual abuse without requiring external state.
_demo_hits: dict[str, list[float]] = defaultdict(list)
_DEMO_WINDOW = 60.0
_DEMO_MAX = 5


def _demo_rate_limited(ip: str) -> bool:
    now = time.time()
    hits = _demo_hits[ip]
    hits[:] = [t for t in hits if now - t < _DEMO_WINDOW]
    if len(hits) >= _DEMO_MAX:
        return True
    hits.append(now)
    return False


def _get_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _validate_input(text: str) -> str | None:
    """Returns error string or None if valid."""
    if not isinstance(text, str) or not text.strip():
        return "input field required (string)"
    if len(text.strip()) < 10:
        return "input too short"
    if len(text.strip()) > 5000:
        return "input too long (max 5000 chars)"
    return None


@app.post("/api/review/demo")
async def review_demo(request: Request):
    ip = _get_ip(request)
    if _demo_rate_limited(ip):
        return JSONResponse({"error": "Too many demo requests. Wait a minute."}, status_code=429)

    try:
        result = invoke_model(CANONICAL_INPUT)
        return JSONResponse({"result": result})
    except ValueError:
        return JSONResponse({"error": "Model returned malformed output. Try again."}, status_code=502)
    except Exception as e:
        import traceback
        print(f"invoke_model error (demo): {e}\n{traceback.format_exc()}")
        return JSONResponse({"error": "Review failed. Try again."}, status_code=500)


@app.post("/api/review")
async def review(request: Request):
    code = request.headers.get("x-access-code", "")
    if not ACCESS_CODE or code != ACCESS_CODE:
        return JSONResponse({"error": "Invalid access code."}, status_code=401)

    try:
        data = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)

    err = _validate_input(data.get("input", ""))
    if err:
        return JSONResponse({"error": err}, status_code=400)

    user_input = data["input"].strip()

    try:
        result = invoke_model(user_input)
        return JSONResponse({"result": result})
    except ValueError:
        return JSONResponse({"error": "Model returned malformed output. Try again."}, status_code=502)
    except Exception as e:
        import traceback
        print(f"invoke_model error: {e}\n{traceback.format_exc()}")
        return JSONResponse({"error": "Review failed. Try again."}, status_code=500)


# Serve React static files — catch-all must come last
if os.path.isdir(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=os.path.join(STATIC_DIR, "static")), name="static")

    @app.get("/{full_path:path}")
    async def serve_react(full_path: str):
        index = os.path.join(STATIC_DIR, "index.html")
        return FileResponse(index)
