# Neri AI — Technical Documentation

> **Fully offline. Zero API cost. Runs on your own hardware.**
> Built with Python, Ollama, FastAPI, and Pydantic.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Installation & Setup](#4-installation--setup)
5. [Running the App](#5-running-the-app)
6. [React Frontend Setup](#6-react-frontend-setup)
7. [Web UI Guide](#7-web-ui-guide)
8. [Suggested Improvements](#8-suggested-improvements)
9. [CLI Commands Reference](#9-cli-commands-reference)
10. [API Endpoints](#10-api-endpoints)
11. [Benchmark Results & Findings](#11-benchmark-results--findings)
12. [Model Comparison](#12-model-comparison)
13. [Temperature Experiments](#13-temperature-experiments)
14. [Structured Output & Pydantic Validation](#14-structured-output--pydantic-validation)
15. [Adding New Models](#15-adding-new-models)
16. [Troubleshooting](#16-troubleshooting)

---

## 1. Project Overview

This project is a **local AI assistant** that runs entirely offline using Small Language Models (SLMs) served by [Ollama](https://ollama.com). It demonstrates:

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
| **UI Framework**  | **React 18 + Vite 5**        | **Component-based SPA**           |
| **UI Components** | **shadcn/ui + Radix UI**     | **Accessible, styled components** |
| **Styling**       | **Tailwind CSS v3**          | **Utility-first CSS**             |
| **Theme**         | **next-themes**              | **Dark / Light toggle**           |
| **Markdown**      | **marked + highlight.js**    | **Renders code blocks in chat**   |
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
├── .gitignore
│
├── assistant/
│   ├── __init__.py
│   ├── client.py                 # Ollama wrapper + benchmark metrics collector
│   ├── schemas.py                # Pydantic models + structured output + retry logic
│   ├── benchmark.py              # Benchmark runner, CSV/JSON logger, Rich tables
│   └── compare.py                # Multi-model comparison runner
│
├── frontend/                     # React + Vite app (source code)
│   ├── src/
│   │   ├── App.tsx               # Root: ThemeProvider, Sidebar, tabs layout
│   │   ├── main.tsx              # React entry point
│   │   ├── index.css             # Tailwind + shadcn CSS variables
│   │   ├── types.ts              # Message, Conversation, BenchmarkResult types
│   │   ├── components/
│   │   │   ├── ui/               # shadcn components (Button, Badge, Select…)
│   │   │   ├── Sidebar.tsx       # Conversation history list + New Chat
│   │   │   ├── SettingsBar.tsx   # Model selector, temperature, health, theme
│   │   │   ├── ChatPanel.tsx     # Chat area, streaming, stop button, system prompt
│   │   │   ├── MessageBubble.tsx # Markdown rendering, copy, regenerate
│   │   │   ├── BenchmarkPanel.tsx
│   │   │   └── StructuredPanel.tsx
│   │   ├── hooks/
│   │   │   └── useChat.ts        # Chat state, streaming, abort, regenerate
│   │   └── lib/
│   │       ├── api.ts            # Fetch wrappers + SSE async generator
│   │       ├── conversations.ts  # localStorage CRUD for chat history
│   │       └── utils.ts          # cn() Tailwind class helper
│   ├── package.json
│   ├── vite.config.ts            # outDir: ../static/dist, proxy /api → :8000
│   └── tailwind.config.js
│
├── static/
│   ├── index.html                # Legacy vanilla JS UI (kept as backup)
│   └── dist/                     # Vite build output — served by FastAPI
│       ├── index.html
│       └── assets/
│
├── prompts/
│   └── prompt_set.json           # 26 standardized prompts for fair benchmarking
│
├─ results/                      # Auto-created. Stores all benchmark output
   ├── *.json
   └── *.csv

```

> **Note:** `frontend/node_modules/` and `static/dist/` are git-ignored. Run `npm run build` to regenerate the dist folder.

---

## 4. Installation & Setup

### Step 1 — Install Ollama

Download and install from [https://ollama.com](https://ollama.com). It is free and open source.

### Step 2 — Pull Models

Run the following commands in a terminal. Each model downloads once and is cached locally.

```bash
ollama pull llama3.2       # ~2 GB  — fastest, recommended starting point
ollama pull mistral:7b     # ~4 GB  — mid-tier speed and quality
ollama pull phi4           # ~9 GB  — largest, slowest on consumer hardware
```

> **Tip:** Pull `llama3.2` first and test everything before pulling larger models.

### Step 3 — Install Python Dependencies

```bash
pip install -r requirements.txt
```

Dependencies installed:

| Package             | Purpose                                |
| ------------------- | -------------------------------------- |
| `ollama`            | Python client for the Ollama local API |
| `pydantic`          | Structured output schema validation    |
| `rich`              | Pretty CLI tables and colored output   |
| `fastapi`           | Web server framework                   |
| `uvicorn[standard]` | ASGI server to run FastAPI             |

---

## 5. Running the App

### Option A — Web UI / Production (Recommended)

```bash
uvicorn app:app --reload
```

Then open: **http://localhost:8000**

FastAPI serves the pre-built React app from `static/dist/`. Terminal shows server logs only.

### Option B — Web UI / Development (hot-reload)

Run **two terminals** simultaneously:

**Terminal 1 — FastAPI backend:**

```bash
uvicorn app:app --reload
```

**Terminal 2 — Vite dev server (instant UI updates):**

```bash
cd frontend
npm run dev
```

Then open: **http://localhost:5173**

Vite proxies all `/api/*` calls to FastAPI automatically. Any UI change you save reloads instantly in the browser.

### Option C — CLI

```bash
# Interactive chat
python main.py chat --model llama3.2

# Benchmark a model
python main.py benchmark --model llama3.2 --limit 5

# Compare all 3 models
python main.py compare --models llama3.2,mistral:7b,phi4 --limit 5

# Structured output demo
python main.py structured --model llama3.2
```

---

## 6. React Frontend Setup

### First-time setup

```bash
cd frontend
npm install
npm run build
```

The build outputs to `static/dist/` which FastAPI serves at `http://localhost:8000`.

### Rebuild after UI changes

```bash
cd frontend
npm run build
```

### Development mode (no rebuild needed)

```bash
cd frontend
npm run dev      # starts at localhost:5173 with live reload
```

### Key frontend dependencies

| Package                    | Purpose                                   |
| -------------------------- | ----------------------------------------- |
| `react` + `react-dom`      | UI framework                              |
| `vite` v5                  | Build tool (requires Node ≥ 18)           |
| `tailwindcss` v3           | Utility CSS                               |
| `@radix-ui/*`              | Accessible UI primitives (used by shadcn) |
| `class-variance-authority` | Component variant system                  |
| `next-themes`              | Dark / Light theme toggle                 |
| `marked`                   | Markdown parser for chat responses        |
| `highlight.js`             | Code syntax highlighting                  |
| `dompurify`                | XSS sanitization of rendered markdown     |
| `lucide-react`             | Icon library                              |

---

## 7. Web UI Guide

The new React + shadcn/ui interface has a sidebar and three tabs:

### Sidebar

- **New Chat** button — starts a fresh conversation
- **Conversation list** — all past chats grouped by Today / Yesterday / Earlier
- Each entry shows the auto-generated title (first 40 chars of your first message) and relative time
- **Delete** button (appears on hover) with confirmation dialog
- **Collapse** button to hide the sidebar and gain screen space

### Settings Bar (top)

- **Ollama status badge** — green "Online" / red "Offline", polls every 30 seconds
- **Model selector** — auto-populated from installed Ollama models
- **Temperature slider** — 0 (deterministic) to 1 (creative)
- **Theme toggle** — dark ↔ light, preference saved to localStorage

The web interface has three tabs:

### 💬 Chat Tab

A full multi-turn AI chat interface.

| Feature                      | Description                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------ |
| **Message input**            | Press `Enter` to send, `Shift+Enter` for new line                                          |
| **Send button**              | Sends the message; tokens stream in real time                                              |
| **Stop button** (red square) | Cancels generation mid-stream — keeps the partial response                                 |
| **Copy button**              | Appears on hover over any assistant message                                                |
| **Regenerate button**        | Re-runs the last response (appears on last assistant message)                              |
| **System prompt**            | Click "System prompt" above the input to expand a custom instruction box                   |
| **Markdown rendering**       | Assistant responses render headings, bold, lists, and code blocks with syntax highlighting |

Responses are streamed token-by-token using Server-Sent Events. The model receives the **full conversation history** with every message, enabling context-aware multi-turn replies.

### 📊 Benchmark Tab

Runs the standardized prompt set against a model and measures performance.

| Field                 | Description                                                |
| --------------------- | ---------------------------------------------------------- |
| **Model**             | Which model to benchmark                                   |
| **Prompt Limit**      | How many of the 26 prompts to run (use 5 for a quick test) |
| **Trials per Prompt** | Each prompt is run N times; results are averaged           |
| **Temperature**       | Set to 0.7 for normal runs, 0.0 for determinism testing    |

After running, a results table appears showing:

- **TPS** — Tokens per second (higher = faster)
- **TTFT** — Time to first token in milliseconds (lower = snappier)
- **Latency** — Total response time in milliseconds

Results are also saved automatically to the `results/` folder as JSON and CSV.

### 🔧 Structured Output Tab

Demonstrates that the model can return a validated JSON object matching a Pydantic schema.

| Field           | Description                             |
| --------------- | --------------------------------------- |
| **Model**       | Which model to use                      |
| **Temperature** | Recommended: 0.0 for deterministic JSON |
| **Prompt**      | Your question or instruction            |

Output displays:

- **Title** — Short title for the response
- **Summary** — Main explanation
- **Tags** — Relevant keywords
- **Raw JSON** — The actual validated JSON string

If the model returns malformed JSON, the app retries automatically up to 3 times with a stricter prompt.

---

## 8. Suggested Improvements

These are recommended next steps to further improve the assistant. All are free to implement.

### Priority 1 — High Impact

| #     | Feature                                 | What it does                                          | Why it matters                                                     |
| ----- | --------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------ |
| ✅ 1  | **Multi-turn conversation memory**      | Pass full chat history to model on every message      | Model can reference earlier messages — biggest quality upgrade     |
| ✅ 2  | **Markdown + syntax highlighting**      | Render headings, bold, lists, code blocks in chat     | Responses look professional and readable                           |
| ✅ 3  | **Conversation history (localStorage)** | Save and restore chats across page reloads            | Pick up where you left off                                         |
| ✅ 4  | **Copy button**                         | One-click copy of any message                         | Standard expectation in AI interfaces                              |
| ✅ 5  | **Stop / Cancel generation**            | Abort mid-stream with a button                        | No forced wait on slow models (phi4 can take 90 seconds)           |
| ✅ 6  | **Regenerate button**                   | Re-runs last response with the same prompt            | Easy way to get a better answer                                    |
| ✅ 7  | **System prompt customization**         | Set instructions that apply to the whole conversation | E.g., "Respond only in bullet points" or "You are a Python expert" |
| ✅ 8  | **Dark / Light theme toggle**           | Persistent theme preference                           | Reduces eye strain, accessibility                                  |
| ✅ 9  | **Ollama health badge**                 | Shows if Ollama is running (polls every 30s)          | Instant feedback if server is down                                 |
| ✅ 10 | **Collapsible sidebar**                 | More screen space for chat                            | Better on smaller screens                                          |

### Priority 2 — Medium Impact (Future Work)

| #   | Feature                       | Implementation Hint                                                                           |
| --- | ----------------------------- | --------------------------------------------------------------------------------------------- |
| 11  | **Export conversation**       | Add a "Download as Markdown" button — `JSON.stringify` messages and use Blob download         |
| 12  | **Search conversations**      | Filter sidebar list by typing — `conversations.filter(c => c.title.includes(query))`          |
| 13  | **Multiple Pydantic schemas** | Add schema selector in Structured tab — define `CodeReview`, `TaskList`, etc. in `schemas.py` |
| 14  | **Prompt templates**          | Dropdown of pre-written prompts (e.g., "Summarize this:", "Explain like I'm 5:")              |
| 15  | **Token counter**             | Show tokens generated after each response — already available in `eval_count` from Ollama     |
| 16  | **Model auto-suggest**        | After a slow response, show "Try llama3.2 for faster replies"                                 |
| 17  | **Conversation summary**      | Auto-generate a 5-word title using the model after the first exchange                         |
| 18  | **Keyboard shortcuts**        | `Ctrl+N` = New chat, `Ctrl+K` = search conversations                                          |

### Priority 3 — Advanced

| #   | Feature                 | Notes                                                                                             |
| --- | ----------------------- | ------------------------------------------------------------------------------------------------- |
| 19  | **RAG (document chat)** | Upload a PDF → chunk it → store embeddings → inject relevant chunks into system prompt            |
| 20  | **Function calling**    | Define tools (calculator, search) as JSON schemas; model returns `{"tool": "...", "args": {...}}` |
| 21  | **Voice input**         | Web Speech API (`SpeechRecognition`) to transcribe voice to text in the input box                 |
| 22  | **Image input**         | Multimodal models (llava, bakllava) support image uploads via Ollama                              |
| 23  | **Response caching**    | Cache identical prompt+model+temp combos in localStorage for instant repeat responses             |

---

## 9. CLI Commands Reference

### `chat` — Interactive conversation

```bash
python main.py chat [--model llama3.2] [--temperature 0.7]
```

| Flag            | Default    | Description                                         |
| --------------- | ---------- | --------------------------------------------------- |
| `--model`       | `llama3.2` | Ollama model name                                   |
| `--temperature` | `0.7`      | Output creativity (0=deterministic, 1=max creative) |

Type `quit` or `exit` to end the session.

---

### `benchmark` — Single model benchmark

```bash
python main.py benchmark [--model llama3.2] [--prompts prompts/prompt_set.json] [--trials 3] [--temperature 0.7] [--limit 5]
```

| Flag            | Default                   | Description                        |
| --------------- | ------------------------- | ---------------------------------- |
| `--model`       | `llama3.2`                | Model to benchmark                 |
| `--prompts`     | `prompts/prompt_set.json` | Prompt dataset file                |
| `--trials`      | `3`                       | Runs per prompt (results averaged) |
| `--temperature` | `0.7`                     | Temperature setting                |
| `--limit`       | None (all)                | Max number of prompts to run       |

Results saved to `results/<model>_<timestamp>.json` and `.csv`.

---

### `compare` — Multi-model comparison

```bash
python main.py compare [--models llama3.2,mistral:7b,phi4] [--trials 3] [--temperature 0.0] [--limit 5]
```

| Flag            | Default                    | Description                             |
| --------------- | -------------------------- | --------------------------------------- |
| `--models`      | `llama3.2,mistral:7b,phi4` | Comma-separated model names             |
| `--trials`      | `3`                        | Runs per prompt per model               |
| `--temperature` | `0.0`                      | Use 0 for fair deterministic comparison |
| `--limit`       | None                       | Prompt limit                            |

Runs the same prompt set on all models sequentially and prints a summary table.

---

### `structured` — Pydantic structured output demo

```bash
python main.py structured [--model llama3.2] [--prompt "..."] [--temperature 0.0] [--retries 3]
```

| Flag            | Default               | Description                         |
| --------------- | --------------------- | ----------------------------------- |
| `--model`       | `llama3.2`            | Model to use                        |
| `--prompt`      | Recursion explanation | Custom prompt                       |
| `--temperature` | `0.0`                 | Recommended 0 for structured output |
| `--retries`     | `3`                   | Max retry attempts on parse failure |

---

## 10. API Endpoints

The FastAPI server exposes the following endpoints:

| Method | Path              | Description                            |
| ------ | ----------------- | -------------------------------------- |
| `GET`  | `/`               | Serves the web UI                      |
| `GET`  | `/api/models`     | Lists locally available Ollama models  |
| `POST` | `/api/chat`       | Streams tokens as Server-Sent Events   |
| `POST` | `/api/benchmark`  | Runs benchmark, returns JSON results   |
| `POST` | `/api/structured` | Returns Pydantic-validated JSON output |

### POST /api/chat

**Request body:**

```json
{
  "model": "llama3.2",
  "message": "Explain recursion",
  "temperature": 0.7
}
```

**Response:** `text/event-stream`

```
data: {"token": "Re"}
data: {"token": "cur"}
data: {"token": "sion"}
data: {"done": true}
```

---

### POST /api/benchmark

**Request body:**

```json
{
  "model": "llama3.2",
  "limit": 5,
  "trials": 3,
  "temperature": 0.7
}
```

**Response:**

```json
{
  "results": [
    {
      "model": "llama3.2",
      "prompt_preview": "If all roses are flowers...",
      "tokens_per_second": 125.47,
      "time_to_first_token_ms": 551.1,
      "total_latency_ms": 1966.8,
      "trials": 3,
      "temperature": 0.7
    }
  ]
}
```

---

### POST /api/structured

**Request body:**

```json
{
  "model": "llama3.2",
  "prompt": "Explain what recursion is in programming.",
  "temperature": 0.0
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "title": "Recursion in Programming",
    "summary": "A process where a function calls itself...",
    "tags": ["Algorithm Design", "Programming Fundamentals"]
  }
}
```

---

## 11. Benchmark Results & Findings

All benchmarks ran on the same hardware using **5 prompts × 3 trials each** (averaged).
Prompt categories: logical reasoning questions.

### Raw Results — llama3.2 (Temperature 0.7)

| Prompt                  | TPS       | TTFT (ms) | Latency (ms) |
| ----------------------- | --------- | --------- | ------------ |
| Roses & flowers logic   | 125.47    | 551.1     | 1,966.8      |
| Farmer's sheep puzzle   | 128.34    | 499.5     | 1,914.0      |
| Two ropes timing puzzle | 130.06    | 524.0     | 2,053.9      |
| Dog/animal logical flaw | 130.43    | 532.0     | 2,447.0      |
| Mislabeled boxes puzzle | 123.87    | 525.3     | 3,737.5      |
| **Average**             | **127.6** | **526.4** | **2,423.8**  |

### Raw Results — llama3.2 (Temperature 0.0)

| Prompt                  | TPS       | TTFT (ms) | Latency (ms) |
| ----------------------- | --------- | --------- | ------------ |
| Roses & flowers logic   | 124.51    | 601.7     | 2,233.4      |
| Farmer's sheep puzzle   | 126.12    | 527.1     | 1,716.2      |
| Two ropes timing puzzle | 125.47    | 537.4     | 1,876.3      |
| Dog/animal logical flaw | 125.52    | 522.5     | 2,241.0      |
| Mislabeled boxes puzzle | 124.24    | 523.2     | 2,791.4      |
| **Average**             | **125.2** | **542.4** | **2,171.7**  |

### Raw Results — Mistral 7B (Temperature 0.0)

| Prompt                  | TPS      | TTFT (ms) | Latency (ms) |
| ----------------------- | -------- | --------- | ------------ |
| Roses & flowers logic   | 23.63    | 6,555.0\* | 10,527.0     |
| Farmer's sheep puzzle   | 23.41    | 240.2     | 6,380.4      |
| Two ropes timing puzzle | 23.16    | 230.1     | 8,397.1      |
| Dog/animal logical flaw | 23.18    | 244.9     | 3,078.3      |
| Mislabeled boxes puzzle | 23.10    | 172.5     | 10,317.4     |
| **Average**             | **23.3** | **~230**  | **7,740.0**  |

> \*6,555ms TTFT on first prompt = cold start (model loading into RAM). Ignored in steady-state average.

### Raw Results — Phi-4 (Temperature 0.0)

| Prompt                  | TPS     | TTFT (ms)   | Latency (ms) |
| ----------------------- | ------- | ----------- | ------------ |
| Roses & flowers logic   | 4.80    | 8,180.1     | 57,729.9     |
| Farmer's sheep puzzle   | 4.86    | 1,209.3     | 22,866.5     |
| Two ropes timing puzzle | 4.67    | 1,181.3     | 57,710.2     |
| Dog/animal logical flaw | 4.56    | 1,249.9     | 48,596.3     |
| Mislabeled boxes puzzle | 4.62    | 1,035.1     | 93,264.7     |
| **Average**             | **4.7** | **2,571.1** | **56,033.5** |

---

## 12. Model Comparison

### Summary Table

| Model          | Avg TPS   | Avg TTFT   | Avg Latency | Size  | Usable?                |
| -------------- | --------- | ---------- | ----------- | ----- | ---------------------- |
| **llama3.2**   | **127.6** | **526 ms** | **2.4 s**   | ~2 GB | ✅ Yes — real-time     |
| **mistral:7b** | 23.3      | ~230 ms    | 7.7 s       | ~4 GB | ⚠️ Yes — slight wait   |
| **phi4**       | 4.7       | ~2,571 ms  | **56 s**    | ~9 GB | ❌ Too slow on this HW |

### Key Findings

**1. llama3.2 dominates on speed**
At 127 TPS it is 5.5× faster than Mistral and 27× faster than Phi-4. Responses arrive in ~2 seconds, making it feel real-time in the chat UI.

**2. Phi-4 is too large for this hardware**
At only 4.7 TPS and up to 93 seconds per response, Phi-4 is not practical on consumer hardware without a dedicated GPU. It is a 14B parameter model — more than double the size of Mistral 7B.

**3. Mistral 7B is a reasonable middle ground**
7–8 second responses are noticeable but tolerable. If output quality is more important than speed, Mistral is a viable alternative to llama3.2.

**4. Cold start penalty is real**
Mistral's first prompt had a 6.5 second TTFT because the model was loading into RAM. Subsequent prompts dropped to ~230ms TTFT. Always discard or note the first result.

**5. Recommendation**
Use **llama3.2** for everyday use. Use **mistral:7b** only if you specifically need its capabilities and can tolerate the wait. Avoid **phi4** unless you have a GPU with sufficient VRAM.

---

## 13. Temperature Experiments

Two llama3.2 benchmark runs were conducted under identical conditions except temperature:

| Metric      | temp = 0.7 | temp = 0.0 | Difference          |
| ----------- | ---------- | ---------- | ------------------- |
| Avg TPS     | 127.6      | 125.2      | −2.4 (negligible)   |
| Avg TTFT    | 526 ms     | 542 ms     | +16 ms (negligible) |
| Avg Latency | 2,424 ms   | 2,172 ms   | −252 ms (minor)     |

### Conclusions

- **Temperature has no meaningful impact on speed.** The ~2 TPS gap is within normal variance.
- **Temperature affects output behavior, not performance:**
  - `temperature = 0.0` → deterministic, consistent, best for structured output and benchmarking
  - `temperature = 0.7` → varied, more natural-sounding, better for open-ended chat
- For **structured output tasks**, always use `temperature = 0.0` to maximize format compliance.
- For **chat**, `temperature = 0.7` feels more natural.

---

## 14. Structured Output & Pydantic Validation

### Schema Definition

The `AIResponse` Pydantic model enforces a 3-field JSON structure:

```python
from pydantic import BaseModel

class AIResponse(BaseModel):
    title: str
    summary: str
    tags: list[str]
```

### How It Works

1. The model is given a system prompt that shows:
   - Required field names and their types
   - A concrete example JSON object
2. The model generates a response.
3. The response is stripped of markdown code fences if present.
4. `json.loads()` parses the raw string.
5. `AIResponse(**data)` validates it against the schema.
6. If either step fails, the request is retried with a stricter instruction.

### Retry Logic

```
Attempt 1: Base system prompt with field list + example
Attempt 2: Same + "Return ONLY valid JSON. No markdown, no backticks."
Attempt 3: Same stricter prompt
Attempt 4+: Raise RuntimeError
```

### Known Issue & Fix

The original implementation passed `model_json_schema()` to the model, which outputs a verbose JSON Schema specification. Small models like llama3.2 misinterpreted this as the expected output format and returned the schema itself instead of data.

**Fix:** The system prompt now shows a plain field list and a concrete example JSON object. This is much easier for small models to follow correctly.

---

## 15. Adding New Models

1. Pull the model with Ollama:

   ```bash
   ollama pull <model-name>
   ```

2. The Web UI auto-discovers installed models via `GET /api/models` on page load.

3. For the CLI, pass the model name directly:
   ```bash
   python main.py chat --model <model-name>
   ```

### Recommended Additional Models

| Model          | Command                      | Size    | Notes                           |
| -------------- | ---------------------------- | ------- | ------------------------------- |
| Llama 3.2 3B   | `ollama pull llama3.2:3b`    | ~2 GB   | Default — fastest               |
| Gemma 2 2B     | `ollama pull gemma2:2b`      | ~1.6 GB | Very fast, good for low RAM     |
| Qwen2.5 7B     | `ollama pull qwen2.5:7b`     | ~4 GB   | Strong reasoning                |
| DeepSeek-R1 7B | `ollama pull deepseek-r1:7b` | ~4 GB   | Good for step-by-step reasoning |

All models are free and open source.

---

## 16. Troubleshooting

### `ConnectionError` or `Failed to connect to Ollama`

Ollama is not running. Start it:

```bash
ollama serve
```

### Model not found error

You haven't pulled the model yet:

```bash
ollama pull llama3.2
```

List all locally available models:

```bash
ollama list
```

### Structured output keeps failing after 3 retries

- Try `temperature = 0.0` — deterministic mode improves JSON compliance.
- Try a larger model — llama3.2 handles structured output well.
- Phi-4 is very slow; its structured output attempts may time out on low-RAM systems.

### Web UI shows blank page

Make sure you run `uvicorn` from the project root directory (where `app.py` lives):

```bash
cd "path/to/local-ai-assistant"
uvicorn app:app --reload
```

### Phi-4 takes forever

That's expected. Phi-4 is a 14B model. On consumer hardware without a GPU, expect 5–90 seconds per response. Use llama3.2 instead.

### `pip install` fails on uvicorn[standard]

Try installing without extras:

```bash
pip install uvicorn
```

---

### UI shows old vanilla JS page instead of React app

The `static/dist/` folder may be missing. Build the React app:

```bash
cd frontend
npm install
npm run build
```

### `npm run build` fails with "Node.js version" error

Your Node.js is below 18. Vite 5 requires Node ≥ 18. Check your version with `node -v` and upgrade if needed. Node 20.15+ works fine.

### UI changes not reflected after editing source files

You must rebuild after every change when using production mode:

```bash
cd frontend && npm run build
```

Or use dev mode for instant updates: `npm run dev` (then use port 5173).

### Chat loses context between messages

This was fixed in the current version — `/api/chat` now uses `ollama.chat()` with full message history. If you're seeing this, make sure you're running the updated `app.py`.

---

_Documentation reflects benchmark results collected on 2026-04-04. UI updated to React + shadcn/ui._
