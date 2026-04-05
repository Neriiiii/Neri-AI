"""
Neri AI — FastAPI Web Server
Run with: uvicorn app:app --reload
Open:      http://localhost:8000

Dev (with hot-reload UI): run `npm run dev` inside frontend/ instead.
"""

import json
import statistics
from pathlib import Path
from typing import Optional

import ollama
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel as PydanticBase, Field

from assistant.client import benchmark_generate
from assistant.benchmark import save_results
from assistant.schemas import structured_generate, AIResponse

app = FastAPI(title="Neri AI")

DIST_DIR = Path("static/dist")
_DIST_BUILT = (DIST_DIR / "index.html").exists()

# Mount the Vite assets folder only when the build exists
if _DIST_BUILT and (DIST_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(DIST_DIR / "assets")), name="assets")


# ---------------------------------------------------------------------------
# Helper: friendly "please build first" page
# ---------------------------------------------------------------------------

_BUILD_NOTICE = """<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Build Required — Neri AI</title>
  <style>
    body { font-family: system-ui, sans-serif; background:#0d1117; color:#e6edf3;
           display:flex; align-items:center; justify-content:center; height:100vh; margin:0; }
    .box { text-align:center; max-width:480px; padding:2rem; }
    h1   { font-size:1.5rem; margin-bottom:.5rem; }
    p    { color:#8b949e; margin:.5rem 0; }
    pre  { background:#161b22; border:1px solid #30363d; border-radius:8px;
           padding:1rem; text-align:left; font-size:.85rem; color:#79c0ff; }
  </style>
</head>
<body>
  <div class="box">
    <h1>🔨 Build the UI first</h1>
    <p>The React app has not been built yet.<br>Run these commands once:</p>
    <pre>cd frontend\nnpm install\nnpm run build</pre>
    <p>Then restart the server.</p>
    <p style="font-size:.75rem;margin-top:1.5rem">
      The API is running — only the UI needs to be built.
    </p>
  </div>
</body>
</html>"""


# ---------------------------------------------------------------------------
# Serve React UI (production build)
# ---------------------------------------------------------------------------

@app.get("/")
async def root():
    index = DIST_DIR / "index.html"
    if index.exists():
        return FileResponse(index)
    return HTMLResponse(_BUILD_NOTICE, status_code=503)


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class MessageItem(PydanticBase):
    role: str = Field(pattern=r"^(user|assistant|system)$")
    content: str = Field(max_length=32_000)


class ChatRequest(PydanticBase):
    model: str = Field(default="llama3.2", max_length=128)
    messages: list[MessageItem] = Field(max_length=200)
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    system: Optional[str] = Field(default=None, max_length=8_000)


class BenchmarkRequest(PydanticBase):
    model: str = Field(default="llama3.2", max_length=128)
    limit: int = Field(default=5, ge=1, le=50)
    trials: int = Field(default=3, ge=1, le=10)
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)


class StructuredRequest(PydanticBase):
    model: str = Field(default="llama3.2", max_length=128)
    prompt: str = Field(max_length=16_000)
    temperature: float = Field(default=0.0, ge=0.0, le=2.0)


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/health")
async def health():
    """Check if Ollama is reachable."""
    try:
        ollama.list()
        return {"status": "ok", "ollama": True}
    except Exception:
        return {"status": "degraded", "ollama": False}


@app.get("/api/models")
async def get_models():
    """Return list of locally available Ollama models."""
    try:
        response = ollama.list()
        if hasattr(response, "models"):
            models = [m.model for m in response.models]
        else:
            models = [
                m.get("name", m.get("model", ""))
                for m in response.get("models", [])
            ]
        return {"models": [m for m in models if m]}
    except Exception:
        return {"models": ["llama3.2", "mistral:7b", "phi4"]}


@app.post("/api/chat")
async def chat(req: ChatRequest):
    """
    Stream tokens from the model as Server-Sent Events.

    Accepts a full message history for multi-turn conversations.
    Uses ollama.chat() so the model maintains context across turns.

    SSE format:
        data: {"token": "..."}\n\n
        data: {"done": true}\n\n
    """
    def generate():
        msgs = [{"role": m.role, "content": m.content} for m in req.messages]
        if req.system:
            msgs = [{"role": "system", "content": req.system}] + msgs

        for chunk in ollama.chat(
            model=req.model,
            messages=msgs,
            stream=True,
            options={"temperature": req.temperature},
        ):
            # ollama.chat() may return an object or a dict depending on version
            if isinstance(chunk, dict):
                token = (chunk.get("message") or {}).get("content", "")
                done  = chunk.get("done", False)
            else:
                token = chunk.message.content if chunk.message else ""
                done  = getattr(chunk, "done", False)

            if token:
                yield f"data: {json.dumps({'token': token})}\n\n"
            if done:
                yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/api/benchmark")
def benchmark(req: BenchmarkRequest):
    """Run benchmark on selected model and return averaged results."""
    prompts_file = Path("prompts/prompt_set.json")
    prompts = [p["prompt"] for p in json.loads(prompts_file.read_text())]
    prompts = prompts[: req.limit]

    rows = []
    for prompt in prompts:
        trial_results = [
            benchmark_generate(req.model, prompt, req.temperature)
            for _ in range(req.trials)
        ]
        rows.append(
            {
                "model": req.model,
                "prompt_preview": prompt[:60],
                "tokens_per_second": round(
                    statistics.mean(r["tokens_per_second"] for r in trial_results), 2
                ),
                "time_to_first_token_ms": round(
                    statistics.mean(
                        r["time_to_first_token_ms"]
                        for r in trial_results
                        if r["time_to_first_token_ms"] is not None
                    ),
                    1,
                ),
                "total_latency_ms": round(
                    statistics.mean(r["total_latency_ms"] for r in trial_results), 1
                ),
                "trials": req.trials,
                "temperature": req.temperature,
            }
        )

    save_results(rows, label=req.model.replace(":", "_"))
    return {"results": rows}


@app.post("/api/structured")
def structured(req: StructuredRequest):
    """Return a Pydantic-validated JSON output from the model."""
    try:
        result = structured_generate(
            model=req.model,
            prompt=req.prompt,
            schema=AIResponse,
            temperature=req.temperature,
        )
        return {"success": True, "data": result.model_dump()}
    except RuntimeError:
        return {"success": False, "error": "Structured output generation failed — the model did not return valid JSON after all retries."}


# ---------------------------------------------------------------------------
# SPA fallback — serve React app for all unmatched routes
# MUST stay at the very bottom, after all API routes
# ---------------------------------------------------------------------------

@app.get("/{full_path:path}")
async def spa_fallback(full_path: str):
    # Serve the exact file if it exists in dist (e.g. assets, favicon)
    file_path = DIST_DIR / full_path
    # Guard against path traversal (e.g. ../../main.py)
    try:
        file_path.resolve().relative_to(DIST_DIR.resolve())
    except ValueError:
        raise HTTPException(status_code=404)
    if file_path.exists() and file_path.is_file():
        return FileResponse(file_path)
    # Otherwise serve the SPA shell (React handles routing client-side)
    index = DIST_DIR / "index.html"
    if index.exists():
        return FileResponse(index)
    return HTMLResponse(_BUILD_NOTICE, status_code=503)
