# Neri AI - Technical Documentation

> **Fully offline. Zero API cost. Runs on your own hardware.**
> Built with Python, Ollama, FastAPI, and Pydantic.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Installation & Setup](#4-installation--setup)
5. [Running the App](#5-running-the-app)
6. [Web UI Guide](#6-web-ui-guide)
7. [CLI Commands Reference](#7-cli-commands-reference)
8. [API Endpoints](#8-api-endpoints)
9. [Benchmark Results & Findings](#9-benchmark-results--findings)
10. [Model Comparison](#10-model-comparison)
11. [Temperature Experiments](#11-temperature-experiments)
12. [Structured Output & Pydantic Validation](#12-structured-output--pydantic-validation)
13. [Adding New Models](#13-adding-new-models)
14. [Troubleshooting](#14-troubleshooting)

---

## 1. Project Overview

A **local AI assistant** running entirely offline using Small Language Models (SLMs) served by [Ollama](https://ollama.com). It demonstrates:

- Local model inference with no cloud dependency
- Performance benchmarking (tokens/sec, latency, time-to-first-token)
- Enforced structured JSON outputs with Pydantic validation and retry logic
- Fair multi-model comparison under identical hardware conditions

No API keys. No subscriptions. No internet required at inference time.

---

## 2. Tech Stack

| Layer             | Tool                         | Purpose                           |
| ----------------- | ---------------------------- | --------------------------------- |
| Runtime           | Python 3.10+                 | Core language                     |
| LLM Runtime       | Ollama                       | Runs models locally via HTTP      |
| Web Server        | FastAPI + Uvicorn            | Serves the web UI and API         |
| UI Framework      | React 18 + Vite 5            | Component-based SPA               |
| UI Components     | shadcn/ui + Radix UI         | Accessible, styled components     |
| Styling           | Tailwind CSS v3              | Utility-first CSS                 |
| Theme             | next-themes                  | Dark / Light toggle               |
| Markdown          | marked + highlight.js        | Renders code blocks in chat       |
| CLI               | argparse                     | Terminal-based interface          |
| Validation        | Pydantic v2                  | Structured output schemas         |
| Output            | Rich                         | Pretty terminal tables            |
| Models            | Llama 3.2, Mistral 7B, Phi-4 | Open-weight SLMs (free)           |
| Quantization      | GGUF Q4/Q5                   | Reduced memory footprint          |

---

## 3. Project Structure

```
local-ai-assistant/
│
├── app.py                        # FastAPI web server (multi-turn chat, health endpoint)
├── main.py                       # CLI entry point
├── requirements.txt
│
├── assistant/
│   ├── client.py                 # Ollama wrapper + benchmark metrics collector
│   ├── schemas.py                # Pydantic models + structured output + retry logic
│   ├── benchmark.py              # Benchmark runner, CSV/JSON logger, Rich tables
│   └── compare.py                # Multi-model comparison runner
│
├── frontend/                     # React + Vite app (source code)
│   ├── src/
│   │   ├── App.tsx               # Root: ThemeProvider, Sidebar, tabs layout
│   │   ├── types.ts              # Message, Conversation, BenchmarkResult types
│   │   ├── components/
│   │   │   ├── ui/               # shadcn components
│   │   │   ├── Sidebar.tsx       # Conversation history list + New Chat
│   │   │   ├── SettingsBar.tsx   # Model selector, temperature, health, theme
│   │   │   ├── ChatPanel.tsx     # Chat area, streaming, stop button, system prompt
│   │   │   ├── MessageBubble.tsx # Markdown rendering, copy, regenerate
│   │   │   ├── BenchmarkPanel.tsx
│   │   │   └── StructuredPanel.tsx
│   │   ├── hooks/useChat.ts      # Chat state, streaming, abort, regenerate
│   │   └── lib/
│   │       ├── api.ts            # Fetch wrappers + SSE async generator
│   │       ├── conversations.ts  # localStorage CRUD for chat history
│   │       └── utils.ts          # cn() Tailwind class helper
│   ├── vite.config.ts            # outDir: ../static/dist, proxy /api → :8000
│   └── tailwind.config.js
│
├── static/
│   ├── index.html                # Legacy vanilla JS UI (kept as backup)
│   └── dist/                     # Vite build output - served by FastAPI
│
├── prompts/
│   └── prompt_set.json           # 26 standardized prompts for fair benchmarking
│
└── results/                      # Auto-created. Stores all benchmark output (JSON + CSV)
```

> **Note:** `frontend/node_modules/` and `static/dist/` are git-ignored. Run `npm run build` to regenerate.

---

## 4. Installation & Setup

### Step 1 - Install Ollama

Download from [https://ollama.com](https://ollama.com) (free and open source).

### Step 2 - Pull Models

```bash
ollama pull llama3.2       # ~2 GB  - fastest, recommended starting point
ollama pull mistral:7b     # ~4 GB  - mid-tier speed and quality
ollama pull phi4           # ~9 GB  - largest, slowest on consumer hardware
```

### Step 3 - Install Python Dependencies

```bash
pip install -r requirements.txt
```

### Step 4 - Build the Frontend

```bash
cd frontend
npm install
npm run build
```

---

## 5. Running the App

### Production (Web UI)

```bash
uvicorn app:app --reload
```

Open **http://localhost:8000** - FastAPI serves the pre-built React app from `static/dist/`.

### Development (hot-reload)

Run two terminals simultaneously:

```bash
# Terminal 1 - backend
uvicorn app:app --reload

# Terminal 2 - frontend (instant UI updates)
cd frontend && npm run dev
```

Open **http://localhost:5173** - Vite proxies `/api/*` calls to FastAPI automatically.

### CLI

```bash
python main.py chat --model llama3.2
python main.py benchmark --model llama3.2 --limit 5
python main.py compare --models llama3.2,mistral:7b,phi4 --limit 5
python main.py structured --model llama3.2
```

---

## 6. Web UI Guide

### Settings Bar (top)

- **Ollama status badge** - green "Online" / red "Offline", polls every 30 seconds
- **Model selector** - auto-populated from installed Ollama models
- **Temperature slider** - 0 (deterministic) to 1 (creative)
- **Theme toggle** - dark ↔ light, saved to localStorage

### Sidebar

- **New Chat** button, conversation history grouped by Today / Yesterday / Earlier
- Delete button (hover) with confirmation dialog
- Collapsible to gain screen space

### Chat Tab

| Feature               | Description                                                             |
| --------------------- | ----------------------------------------------------------------------- |
| Message input         | `Enter` to send, `Shift+Enter` for new line                             |
| Stop button           | Cancels generation mid-stream, keeps partial response                   |
| Copy / Regenerate     | Appear on hover over assistant messages                                 |
| System prompt         | Expandable box above input for custom instructions                      |
| Markdown rendering    | Headings, bold, lists, code blocks with syntax highlighting             |
| Streaming             | Tokens stream via SSE; full conversation history sent on every message  |

### Benchmark Tab

Runs the standardized prompt set against a model. Results show **TPS**, **TTFT**, and **Latency**, and are saved to `results/` as JSON and CSV.

### Structured Output Tab

Demonstrates Pydantic-validated JSON output. If the model returns malformed JSON, the app retries up to 3 times with a stricter prompt.

---

## 7. CLI Commands Reference

```bash
# Interactive chat
python main.py chat [--model llama3.2] [--temperature 0.7]

# Single model benchmark
python main.py benchmark [--model llama3.2] [--trials 3] [--temperature 0.7] [--limit 5]

# Multi-model comparison
python main.py compare [--models llama3.2,mistral:7b,phi4] [--trials 3] [--temperature 0.0] [--limit 5]

# Structured output demo
python main.py structured [--model llama3.2] [--prompt "..."] [--temperature 0.0] [--retries 3]
```

Results saved to `results/<model>_<timestamp>.json` and `.csv`.

---

## 8. API Endpoints

| Method | Path              | Description                            |
| ------ | ----------------- | -------------------------------------- |
| `GET`  | `/`               | Serves the web UI                      |
| `GET`  | `/api/models`     | Lists locally available Ollama models  |
| `POST` | `/api/chat`       | Streams tokens as Server-Sent Events   |
| `POST` | `/api/benchmark`  | Runs benchmark, returns JSON results   |
| `POST` | `/api/structured` | Returns Pydantic-validated JSON output |

**POST /api/chat** - Request: `{ "model": "llama3.2", "message": "...", "temperature": 0.7 }` → Response: `text/event-stream` with `{"token": "..."}` chunks.

**POST /api/benchmark** - Request: `{ "model": "llama3.2", "limit": 5, "trials": 3, "temperature": 0.7 }` → Response: array of `{ tokens_per_second, time_to_first_token_ms, total_latency_ms }`.

**POST /api/structured** - Request: `{ "model": "llama3.2", "prompt": "...", "temperature": 0.0 }` → Response: `{ "success": true, "data": { "title", "summary", "tags" } }`.

---

## 9. Benchmark Results & Findings

All benchmarks ran on the same hardware using **5 prompts × 3 trials each** (averaged).
Prompt categories: logical reasoning questions.

### llama3.2 (Temperature 0.7)

| Prompt                  | TPS       | TTFT (ms) | Latency (ms) |
| ----------------------- | --------- | --------- | ------------ |
| Roses & flowers logic   | 125.47    | 551.1     | 1,966.8      |
| Farmer's sheep puzzle   | 128.34    | 499.5     | 1,914.0      |
| Two ropes timing puzzle | 130.06    | 524.0     | 2,053.9      |
| Dog/animal logical flaw | 130.43    | 532.0     | 2,447.0      |
| Mislabeled boxes puzzle | 123.87    | 525.3     | 3,737.5      |
| **Average**             | **127.6** | **526.4** | **2,423.8**  |

### llama3.2 (Temperature 0.0)

| Prompt                  | TPS       | TTFT (ms) | Latency (ms) |
| ----------------------- | --------- | --------- | ------------ |
| Roses & flowers logic   | 124.51    | 601.7     | 2,233.4      |
| Farmer's sheep puzzle   | 126.12    | 527.1     | 1,716.2      |
| Two ropes timing puzzle | 125.47    | 537.4     | 1,876.3      |
| Dog/animal logical flaw | 125.52    | 522.5     | 2,241.0      |
| Mislabeled boxes puzzle | 124.24    | 523.2     | 2,791.4      |
| **Average**             | **125.2** | **542.4** | **2,171.7**  |

### Mistral 7B (Temperature 0.0)

| Prompt                  | TPS      | TTFT (ms) | Latency (ms) |
| ----------------------- | -------- | --------- | ------------ |
| Roses & flowers logic   | 23.63    | 6,555.0*  | 10,527.0     |
| Farmer's sheep puzzle   | 23.41    | 240.2     | 6,380.4      |
| Two ropes timing puzzle | 23.16    | 230.1     | 8,397.1      |
| Dog/animal logical flaw | 23.18    | 244.9     | 3,078.3      |
| Mislabeled boxes puzzle | 23.10    | 172.5     | 10,317.4     |
| **Average**             | **23.3** | **~230**  | **7,740.0**  |

> \*6,555ms TTFT on first prompt = cold start (model loading into RAM). Ignored in steady-state average.

### Phi-4 (Temperature 0.0)

| Prompt                  | TPS     | TTFT (ms)   | Latency (ms) |
| ----------------------- | ------- | ----------- | ------------ |
| Roses & flowers logic   | 4.80    | 8,180.1     | 57,729.9     |
| Farmer's sheep puzzle   | 4.86    | 1,209.3     | 22,866.5     |
| Two ropes timing puzzle | 4.67    | 1,181.3     | 57,710.2     |
| Dog/animal logical flaw | 4.56    | 1,249.9     | 48,596.3     |
| Mislabeled boxes puzzle | 4.62    | 1,035.1     | 93,264.7     |
| **Average**             | **4.7** | **2,571.1** | **56,033.5** |

---

## 10. Model Comparison

| Model          | Avg TPS   | Avg TTFT   | Avg Latency | Size  | Usable?                |
| -------------- | --------- | ---------- | ----------- | ----- | ---------------------- |
| **llama3.2**   | **127.6** | **526 ms** | **2.4 s**   | ~2 GB | Yes - real-time        |
| **mistral:7b** | 23.3      | ~230 ms    | 7.7 s       | ~4 GB | Yes - slight wait      |
| **phi4**       | 4.7       | ~2,571 ms  | **56 s**    | ~9 GB | Too slow on this HW    |

### Key Findings

1. **llama3.2 dominates on speed** - at 127 TPS it is 5.5× faster than Mistral and 27× faster than Phi-4. Responses arrive in ~2 seconds, real-time in chat.

2. **Phi-4 is too large for this hardware** - at 4.7 TPS and up to 93 seconds per response, it is not practical on consumer hardware without a dedicated GPU (14B parameters, 2× the size of Mistral 7B).

3. **Mistral 7B is a reasonable middle ground** - 7–8 second responses are noticeable but tolerable if output quality is prioritized over speed.

4. **Cold start penalty is real** - Mistral's first prompt had a 6.5s TTFT due to model loading into RAM. Subsequent prompts dropped to ~230ms. Always discard or note the first result.

5. **Recommendation:** Use **llama3.2** for everyday use. Use **mistral:7b** only when quality justifies the wait. Avoid **phi4** without a GPU.

---

## 11. Temperature Experiments

Two llama3.2 runs under identical conditions, temperature only variable:

| Metric      | temp = 0.7 | temp = 0.0 | Difference          |
| ----------- | ---------- | ---------- | ------------------- |
| Avg TPS     | 127.6      | 125.2      | −2.4 (negligible)   |
| Avg TTFT    | 526 ms     | 542 ms     | +16 ms (negligible) |
| Avg Latency | 2,424 ms   | 2,172 ms   | −252 ms (minor)     |

**Conclusions:**
- Temperature has no meaningful impact on speed. The ~2 TPS gap is within normal variance.
- `temperature = 0.0` → deterministic, consistent; best for structured output and benchmarking.
- `temperature = 0.7` → varied, more natural-sounding; better for open-ended chat.

---

## 12. Structured Output & Pydantic Validation

### Schema

```python
class AIResponse(BaseModel):
    title: str
    summary: str
    tags: list[str]
```

### How It Works

1. Model is given a system prompt with required field names, types, and a concrete JSON example.
2. Response is stripped of markdown fences, parsed with `json.loads()`, then validated via `AIResponse(**data)`.
3. On failure, retried with progressively stricter instructions (max 3 retries).

### Known Issue & Fix

The original implementation passed `model_json_schema()` to the model - small models misinterpreted the verbose JSON Schema spec as the expected output format and returned the schema itself. **Fix:** system prompt now shows a plain field list + concrete example, which small models follow correctly.

---

## 13. Adding New Models

```bash
ollama pull <model-name>
```

The Web UI auto-discovers installed models via `GET /api/models`. For CLI, pass `--model <model-name>` directly.

| Model          | Command                      | Size    | Notes                           |
| -------------- | ---------------------------- | ------- | ------------------------------- |
| Llama 3.2 3B   | `ollama pull llama3.2:3b`    | ~2 GB   | Default - fastest               |
| Gemma 2 2B     | `ollama pull gemma2:2b`      | ~1.6 GB | Very fast, good for low RAM     |
| Qwen2.5 7B     | `ollama pull qwen2.5:7b`     | ~4 GB   | Strong reasoning                |
| DeepSeek-R1 7B | `ollama pull deepseek-r1:7b` | ~4 GB   | Good for step-by-step reasoning |

---

## 14. Troubleshooting

| Issue | Fix |
| ----- | --- |
| `ConnectionError` / `Failed to connect to Ollama` | Run `ollama serve` |
| Model not found | Run `ollama pull <model>` - list installed with `ollama list` |
| Structured output keeps failing | Use `temperature = 0.0`; try a larger model |
| Web UI shows blank page | Run `uvicorn` from the project root (where `app.py` lives) |
| UI shows old vanilla JS page | Build the React app: `cd frontend && npm install && npm run build` |
| `npm run build` fails with Node version error | Vite 5 requires Node ≥ 18 - check with `node -v` |
| UI changes not reflected | Rebuild: `cd frontend && npm run build`, or use dev mode (`npm run dev`, port 5173) |
| Phi-4 takes forever | Expected - 14B model on CPU. Use llama3.2 instead |
| Chat loses context | Fixed in current version - `app.py` uses `ollama.chat()` with full message history |

---

_Benchmarks collected on 2026-04-04. UI: React + shadcn/ui._
