# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory.
The user can carry out AI chat in order to establish what document they want and how to fill in the fields.
The available documents are covered in the catalog.json file in the project root, included here:

@catalog.json

The V1 technical foundation is in place and the AI chat feature for Mutual NDA drafting is implemented. Auth and document persistence are planned for future tickets.

## Development process

When instructed to build a feature:
1. Use your Atlassian tools to read the feature instructions from Jira
2. Develop the feature - do not skip any step from the feature-dev 7 step process
3. Thoroughly test the feature with unit tests and integration tests and fix any issues
4. Submit a PR using your github tools

## AI design

When writing code to make calls to LLMs, use your Cerebras skill to use LiteLLM via OpenRouter to the `openrouter/openai/gpt-oss-120b` model with Cerebras as the inference provider. You should use Structured Outputs so that you can interpret the results and populate fields in the legal document.

There is an OPENROUTER_API_KEY in the .env file in the project root.

## Technical design

The entire project should be packaged into a Docker container.  
The backend should be in backend/ and be a uv project, using FastAPI.  
The frontend should be in frontend/  
The database uses SQLite, persisted via a Docker named volume (not recreated on each start). A users table for sign up and sign in will be added when auth is implemented.
The frontend is statically built (`next build` with `output: "export"`) and served by FastAPI via `StaticFiles` at `/`.
There should be scripts in scripts/ for:  
```bash
# Mac
scripts/start-mac.sh    # Start
scripts/stop-mac.sh     # Stop

# Linux
scripts/start-linux.sh
scripts/stop-linux.sh

# Windows
scripts/start-windows.ps1
scripts/stop-windows.ps1
```
Backend available at http://localhost:8000

## Color Scheme
- Accent Yellow: `#ecad0a`
- Blue Primary: `#209dd7`
- Purple Secondary: `#753991` (submit buttons)
- Dark Navy: `#032147` (headings)
- Gray Text: `#888888`

## Implementation Status

### PL-4 — V1 Foundation (done)
- `backend/` — FastAPI uv project (`app/main.py`, `app/database.py`). SQLite bootstrapped on startup (WAL mode, no tables yet). `/health` endpoint at `http://localhost:8000/health`. Serves statically-built frontend via `StaticFiles` mounted at `/`; controlled by `STATIC_DIR` env var (default `/app/static`).
- `frontend/` — Next.js app with `output: "export"` for static builds. Main page replaced with a branded app shell placeholder (dark navy top nav, sidebar, placeholder cards). No auth or product features yet.
- `Dockerfile` — Multi-stage: Node 20 builds the static frontend, Python 3.11 slim runs uvicorn. Single container serves everything on port 8000.
- `docker-compose.yml` — Builds and runs the container; DB persisted via a named volume.
- `scripts/` — Direct-run start/stop scripts for Mac, Linux, and Windows (no Docker). Run frontend dev server on port 3000 and backend on port 8000 in parallel using PID files.
- No authentication implemented yet. Users table not created.

### PL-5 — AI Chat for Mutual NDA (done)
- `backend/app/chat.py` — Chat API router (`/sessions`). Creates sessions, stores message history in SQLite, calls LLM via LiteLLM/OpenRouter (`openai/gpt-oss-120b`, Cerebras provider) with structured JSON output to extract NDA fields.
- `backend/app/models.py` — Pydantic models: `ChatRequest`, `ChatResponse`.
- `backend/app/database.py` — Extended with sessions and messages tables; helpers: `create_session`, `session_exists`, `append_message`, `get_messages`.
- `frontend/app/components/ChatPanel.tsx` — Chat UI with message bubbles, typing indicator, and send form.
- `frontend/app/lib/api.ts` — API client for session creation, message history, and sending messages.

### PL-6 — Expand to All Supported Legal Document Types (done)
- `frontend/app/page.tsx` — Home page with catalog-driven document cards; each card has a Draft button routing to `/documents/[slug]`.
- `frontend/app/lib/catalog.ts` — Frontend catalog mirroring `catalog.json`; provides `getSlug` and `findBySlug` helpers.
- `frontend/app/documents/[slug]/page.tsx` — Static-param page for each document type.
- `frontend/app/documents/[slug]/DocumentChat.tsx` — Generic two-panel chat layout (chat 42% + field preview 58%) for any document type. Session and fields persisted in `localStorage` per slug.
- `frontend/app/components/FieldListPreview.tsx` — Right panel showing collected fields as a list. Download button appears once fields are collected; for Mutual NDA slugs renders a full cover-page HTML document in a new tab (Ctrl+P to save as PDF); other document types get a formatted field-list preview.
- `frontend/app/types/document.ts` — Shared `DocumentFields` and `Message` types.
- `frontend/next.config.ts` — `devIndicators: false` to hide the Next.js dev badge.
- `scripts/start-windows.ps1` — Clears ports 3000 and 8000 before starting to prevent stale-process conflicts.