# Dashboard

## Prerequisites
- Node.js 20+
- Python 3.10+ (3.11 recommended)
- npm


## Authentication flow (new)
- The app now opens with an authentication screen (Login / Signup / Verify / Forgot Password).
- For local development, signup and forgot-password responses include verification/reset tokens so you can complete flows without an email provider.
- You must verify email before first login.

## Run the app (frontend only)
The React app lives in `app/` and defaults to calling backend at `http://localhost:8000`.

1. Install dependencies:
   ```bash
   cd app
   npm install
   ```
2. Start the dev server:
   ```bash
   npm run dev
   ```
3. Open the URL shown by Vite (typically `http://localhost:5173`).

## Run backend API locally
The FastAPI backend lives in `llm-dashboard/backend/`.

> Recommended: use a **fresh virtual environment** for this project (not a shared/base Conda env) to avoid package-version conflicts.

1. Create and activate a virtual environment:

   **macOS/Linux**
   ```bash
   cd llm-dashboard/backend
   python -m venv .venv
   source .venv/bin/activate
   ```

   **Windows (CMD)**
   ```bat
   cd llm-dashboard\backend
   python -m venv .venv
   .venv\Scripts\activate
   ```

   **Windows (PowerShell)**
   ```powershell
   cd llm-dashboard\backend
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

2. Install dependencies (recommended via the active Python interpreter):
   ```bash
   python -m pip install --upgrade pip
   python -m pip install -r requirements.txt
   ```

3. (Optional) Set environment variables:

   **macOS/Linux**
   ```bash
   export HUGGINGFACE_API_TOKEN=<your_token>
   export ENVIRONMENT=development
   export ALLOWED_ORIGINS=http://localhost:5173
   ```

   **Windows (CMD)**
   ```bat
   set HUGGINGFACE_API_TOKEN=<your_token>
   set ENVIRONMENT=development
   set ALLOWED_ORIGINS=http://localhost:5173
   ```

4. Run the API (cross-platform):
   ```bash
   python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

5. Verify health endpoint:
   ```bash
   curl http://localhost:8000/health
   ```

## Run both together
Open two terminals:
- Terminal 1: run backend from `llm-dashboard/backend`
- Terminal 2: run frontend from `app`

The frontend uses `VITE_API_URL` and defaults to `http://localhost:8000`.

## Docker option
A `docker-compose.yml` exists in `llm-dashboard/`, but its `frontend` service expects files in `llm-dashboard/frontend/` while the active Vite frontend is currently in `app/`. If you want a compose-based local run, update compose to point frontend build context at `../app` (or move/copy frontend files under `llm-dashboard/frontend`).

## Troubleshooting
- **`uvicorn` is not recognized** (Windows): your shell cannot find the `uvicorn` executable. Use the module form and ensure dependencies are installed in the currently active environment:
  ```bat
  python -m pip install -r requirements.txt
  python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
  ```
- **`curl http://localhost:8000/health` connection failed**: backend is not running yet (or started in another env). First start it with `python -m uvicorn ...`, then retry `/health`.
- **`Illegal header value b'Bearer '`**: this means `HUGGINGFACE_API_TOKEN` is empty. The backend now skips external LLM calls when no token is set and returns built-in fallback recommendations. Set a valid token if you want AI-generated suggestions.
- **`POST /api/analysis/use-case` returns 404**: this usually means the session does not exist yet. Upload a file first using `/api/upload/`, then submit the use case with the returned `session_id`.
- **`POST /api/analysis/use-case` returns 404 after refresh/restart**: stored browser session IDs can become stale if backend data was cleared or server restarted. Re-upload the file to create a new session.
- **Conda `anaconda-auth` / `pydantic` conflicts**: use a project-local virtualenv (`python -m venv .venv`) instead of a shared Conda env.
- **`pyarrow` / `fastparquet` missing during processing**: backend now falls back to CSV when parquet engines are unavailable, so processing should still succeed without extra installs.
