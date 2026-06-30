from __future__ import annotations
import json
import os
import sys

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from api.bedrock import invoke_model

app = FastAPI()

STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "build")


@app.post("/api/review")
async def review(request: Request):
    try:
        data = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)

    user_input = data.get("input", "")
    if not isinstance(user_input, str) or not user_input.strip():
        return JSONResponse({"error": "input field required (string)"}, status_code=400)
    user_input = user_input.strip()
    if len(user_input) < 10:
        return JSONResponse({"error": "input too short"}, status_code=400)
    if len(user_input) > 5000:
        return JSONResponse({"error": "input too long (max 5000 chars)"}, status_code=400)

    try:
        result = invoke_model(user_input)
        return JSONResponse({"result": result})
    except ValueError as e:
        return JSONResponse({"error": f"ValueError: {e}"}, status_code=502)
    except Exception as e:
        return JSONResponse({"error": f"{type(e).__name__}: {e}"}, status_code=500)


# Serve React static files — catch-all must come last
if os.path.isdir(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=os.path.join(STATIC_DIR, "static")), name="static")

    @app.get("/{full_path:path}")
    async def serve_react(full_path: str):
        index = os.path.join(STATIC_DIR, "index.html")
        return FileResponse(index)
