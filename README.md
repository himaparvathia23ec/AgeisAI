# AegisAI - Phishing Detection System

A full-stack AI-powered phishing detection system that integrates with Gmail to analyze emails in real time and detect phishing threats.

**Standardized URLs (local):**
- **Frontend:** `http://localhost:3000`
- **Backend:** `http://127.0.0.1:8000`
- **Gmail OAuth redirect:** `http://127.0.0.1:8000/auth/gmail/callback`

## Features

- 🔐 **Google Sign-In (ID token)** – Sign in with Google Identity Services; no redirect for login
- 📧 **Gmail Connect (OAuth)** – Separate “Connect Gmail” flow; redirect goes to backend callback, then frontend claims tokens
- 🤖 **ML-Powered Detection** – TF-IDF + Logistic Regression for phishing classification
- 🔗 **URL Risk Analysis** – Extracts and scores URLs for suspicious patterns
- 📊 **Real-time Dashboard** – Threat stats, weekly trends, severity breakdown, recent incidents
- 💾 **SQLite Database** – Stores detection results per user
- 🎯 **Severity Levels** – CRITICAL, WARNING, LOW
- ⚡ **Quick Scan** – Fetch and analyze Gmail inbox after connecting
- 📝 **Analysis Tab** – Paste text for instant phishing analysis (no Gmail required)
- 🛡️ **Error handling** – All errors shown in UI (no `alert`); ErrorBoundary prevents blank screens

## Architecture

### Backend (FastAPI, port 8000)
- **Google ID token auth** – `POST /auth/google` verifies JWT and returns user info (no redirect)
- **Gmail OAuth** – `GET /auth/gmail/url` (auth URL); `GET /auth/gmail/callback` (receives `code`, exchanges tokens, redirects to frontend with `#gmail-state=...`); `POST /auth/gmail/claim` (frontend claims full token_data by state)
- **Gmail API** – Read-only; fetches and analyzes emails via `POST /auth/fetch-emails`
- **ML Service** – scikit-learn model for content classification
- **URL extraction & scoring** – in `utils.py`
- **SQLite** – `database.py`; detections stored per `user_email`
- **CORS** – Allows `http://localhost:3000` (from env `CORS_ORIGINS`)

### Frontend (React + TypeScript + Vite, port 3000)
- **Landing** – Google Sign-In button (GIS); login errors in UI
- **Onboarding** – Single step then dashboard
- **Dashboard** – Sidebar: Home, Threats, Emails in Bin, Analysis; header: Quick Scan / Connect Gmail; errors in banner with dismiss
- **Gmail flow** – Connect Gmail → backend auth URL → Google → backend callback → redirect to `http://localhost:3000/#gmail-state=...` → frontend calls `POST /auth/gmail/claim` and stores token_data
- **ErrorBoundary** – Catches render errors and shows fallback + retry
- **API base** – `VITE_API_URL` (default `http://127.0.0.1:8000`)

## Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+
- [Google Cloud Console](https://console.cloud.google.com/) project with Gmail API enabled

### 1. Backend (port 8000)

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, OAUTH_REDIRECT_URI, CORS_ORIGINS
python3 -m uvicorn main:app --reload --port 8000
```

Backend runs at **http://127.0.0.1:8000**.

### 2. Frontend (port 3000)

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env: VITE_API_URL=http://127.0.0.1:8000, VITE_GOOGLE_CLIENT_ID=<same web client ID as backend>
npm run dev
```

Frontend runs at **http://localhost:3000** (Vite is configured with `server.port: 3000`).

### 3. Google Cloud configuration

In your OAuth 2.0 Client (Web application):

- **Authorized JavaScript origins:** `http://localhost:3000`
- **Authorized redirect URIs:** `http://127.0.0.1:8000/auth/gmail/callback`

Use the **same** Web client ID in:
- **Backend** `.env` → `GOOGLE_CLIENT_ID`
- **Frontend** `.env` → `VITE_GOOGLE_CLIENT_ID`

See [SETUP.md](SETUP.md) for detailed setup and troubleshooting.

## Project Structure

```
AegisAI/
├── backend/
│   ├── main.py              # FastAPI app: auth, callback, claim, fetch-emails, dashboard, analyze
│   ├── gmail_service.py     # Gmail OAuth (redirect_uri = backend callback) and API
│   ├── database.py          # SQLite detections and dashboard queries
│   ├── ml_service.py        # ML model (TF-IDF + Logistic Regression)
│   ├── utils.py             # CORS, URL extraction, risk scoring
│   ├── requirements.txt
│   ├── .env.example         # GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, OAUTH_REDIRECT_URI, CORS_ORIGINS
│   └── aegisai.db           # SQLite DB (created on first run; in .gitignore)
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # Landing, onboarding, dashboard, Gmail claim (#gmail-state)
│   │   ├── api.ts           # loginWithGoogleIdToken, getGmailAuthUrl, claimGmailState, fetchAndAnalyzeEmails, etc.
│   │   ├── main.tsx         # React root + ErrorBoundary
│   │   ├── ErrorBoundary.tsx
│   │   └── index.css        # Tailwind
│   ├── index.html           # GSI script for Google Sign-In
│   ├── vite.config.ts       # port 3000
│   ├── package.json
│   └── .env.example         # VITE_API_URL, VITE_GOOGLE_CLIENT_ID
├── SETUP.md
└── README.md
```

## API Endpoints

### Auth (Google Sign-In – no redirect)
- `POST /auth/google` – Body: `{ "id_token": "..." }`. Verifies Google ID token, returns `{ success, user_info }`.

### Gmail Connect (OAuth via backend callback)
- `GET /auth/gmail/url` – Returns `{ auth_url }` with `redirect_uri=http://127.0.0.1:8000/auth/gmail/callback`, `access_type=offline`, `prompt=consent`.
- `GET /auth/gmail/callback?code=...&state=...&format=...` – Receives code from Google; exchanges for tokens; if `format=json` returns `{ access_token, refresh_token, id_token }`, else redirects to `http://localhost:3000/#gmail-state=<state>` for frontend to claim.
- `POST /auth/gmail/claim` – Body: `{ state }`. Returns `{ success, token_data, user_info }` and invalidates state.
- `POST /auth/gmail/token` – (Legacy) Body: `{ code }`. Exchange code for token_data when redirect was to frontend.

### Gmail & analysis
- `POST /auth/fetch-emails` – Body: token_data (from claim), Query: `max_results`. Fetches Gmail messages, runs ML analysis, stores detections.
- `POST /analyze` – Body: `{ content }`. Analyzes raw text; returns prediction, confidence, severity, explanation.

### Dashboard
- `GET /dashboard/{user_email}` – Stats, severity_counts, weekly_trend, recent_incidents.
- `GET /recent-incidents/{user_email}` – Recent incidents (optional `limit`).
- `GET /severity-stats/{user_email}` – Severity counts and avg risk.
- `GET /emails-in-bin/{user_email}` – Emails in bin (threats).

## How It Works

1. **Sign-in** – User clicks “Continue with Google” on the landing page; frontend uses Google Identity Services to get an ID token and sends it to `POST /auth/google`. Backend verifies the token and returns user info. No redirect.
2. **Onboarding** – User sees a short onboarding step, then enters the dashboard.
3. **Connect Gmail** – User clicks “Connect Gmail”; frontend gets the auth URL from `GET /auth/gmail/url` and redirects to Google. After consent, Google redirects to `http://127.0.0.1:8000/auth/gmail/callback?code=...`. Backend exchanges the code for tokens, then redirects the browser to `http://localhost:3000/#gmail-state=<state>`. Frontend reads the hash, calls `POST /auth/gmail/claim` with that state, receives full token_data, and stores it (Quick Scan becomes available).
4. **Quick Scan** – Frontend sends stored token_data to `POST /auth/fetch-emails`; backend fetches messages from Gmail, runs ML + URL risk on each, and stores detections in SQLite.
5. **Dashboard** – Stats and recent incidents are loaded from `GET /dashboard/{user_email}`; severity and weekly trend come from the same payload.
6. **Analysis tab** – User can paste any text; frontend calls `POST /analyze` for instant classification (no Gmail needed).

## Database Schema

```sql
CREATE TABLE detections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    sender TEXT NOT NULL,
    subject TEXT NOT NULL,
    ml_confidence REAL NOT NULL,
    url_risk_score REAL NOT NULL,
    final_risk_score REAL NOT NULL,
    severity TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    email_snippet TEXT,
    urls_found TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

## Security Features

- ✅ Google Sign-In via verified ID token (no password, no redirect for login)
- ✅ Gmail OAuth with backend callback; tokens claimed once via short-lived state
- ✅ Read-only Gmail scope
- ✅ User-specific data isolation (dashboard by email)
- ✅ CORS restricted to frontend origin
- ✅ Input validation and error responses without leaking internals

## Development

### Backend (http://127.0.0.1:8000)
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # then edit with your credentials
python3 -m uvicorn main:app --reload --port 8000
```

### Frontend (http://localhost:3000)
```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_URL=http://127.0.0.1:8000, VITE_GOOGLE_CLIENT_ID=...
npm run dev
```

Vite is configured with `server.port: 3000` so the app always runs at **http://localhost:3000**.

### Database
SQLite is created automatically at `backend/aegisai.db` on first run (and is listed in `.gitignore`).

## Run Locally (full stack)

```bash
# Terminal 1 – Backend
cd backend
pip install -r requirements.txt
cp .env.example .env   # edit with Google credentials
python3 -m uvicorn main:app --reload --port 8000

# Terminal 2 – Frontend
cd frontend
npm install
cp .env.example .env   # edit VITE_API_URL and VITE_GOOGLE_CLIENT_ID
npm run dev
```

Open **http://localhost:3000**. Sign in with Google, then optionally connect Gmail and run Quick Scan. The **Analysis** tab works without Gmail (paste text to analyze).

## Production Deployment

- **Frontend (e.g. Vercel):** Root `frontend`, build `npm run build`, output `dist`. Set `VITE_API_URL` to your backend URL and `VITE_GOOGLE_CLIENT_ID` to your Web client ID. `vercel.json` is included for SPA routing.
- **Backend (e.g. Render):** Root `backend`, build `pip install -r requirements.txt`, start `uvicorn main:app --host 0.0.0.0 --port $PORT`. Set env: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `OAUTH_REDIRECT_URI` (e.g. `https://your-backend.onrender.com/auth/gmail/callback`), `CORS_ORIGINS` (e.g. `https://your-frontend.vercel.app`).

In Google Cloud Console, add your production **Authorized JavaScript origins** and **Authorized redirect URIs** (backend callback URL). Use HTTPS everywhere in production.

## Troubleshooting

See [SETUP.md](SETUP.md) for a full guide.

Common issues:
- **Redirect URI mismatch** – Google Cloud must have exactly `http://127.0.0.1:8000/auth/gmail/callback` (local). Backend `.env` must have `OAUTH_REDIRECT_URI=http://127.0.0.1:8000/auth/gmail/callback`.
- **invalid_grant** – Usually the same redirect_uri was not used when requesting the auth URL and when exchanging the code; backend uses one redirect_uri for both.
- **Gmail API not enabled** – Enable it in the Google Cloud project.
- **CORS errors** – Backend `CORS_ORIGINS` must include the frontend origin (e.g. `http://localhost:3000`).
- **Blank screen** – Check browser console; the app uses an ErrorBoundary and in-UI error messages instead of `alert()`.

## License

Apache 2.0

## Contributing

This is a hackathon project. For production use, consider:
- Adding rate limiting and request validation
- Stronger session/token management and expiry
- Using a production database (e.g. PostgreSQL)
- Extending logging and monitoring
- Keeping OAuth redirect URIs and CORS in sync with deployed URLs
