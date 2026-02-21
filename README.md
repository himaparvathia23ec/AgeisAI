# AegisAI - Phishing Detection System

A full-stack AI-powered phishing detection system that integrates with Gmail to analyze emails in real-time and detect phishing threats.

## Features

- 🔐 **Google OAuth2 Authentication** - Secure login with Google accounts
- 📧 **Gmail Integration** - Read-only access to analyze your emails
- 🤖 **ML-Powered Detection** - Advanced machine learning model for phishing detection
- 🔗 **URL Risk Analysis** - Extracts and analyzes URLs for suspicious patterns
- 📊 **Real-time Dashboard** - Dynamic dashboard with real threat data
- 💾 **SQLite Database** - Stores all detection results for analysis
- 🎯 **Severity Scoring** - CRITICAL, WARNING, and LOW severity levels
- 📈 **Analytics** - Weekly trends, severity breakdowns, and incident tracking

## Architecture

### Backend (FastAPI)
- **OAuth2 Authentication** - Google OAuth integration
- **Gmail API** - Fetches and analyzes emails
- **ML Service** - Phishing detection using scikit-learn
- **URL Extraction** - Finds and scores URLs in emails
- **Database** - SQLite for storing detections
- **REST API** - Endpoints for dashboard and analysis

### Frontend (React + TypeScript)
- **Google Login** - OAuth flow integration
- **Dynamic Dashboard** - Real-time data from backend
- **Sidebar Navigation** - Home, Threats, Emails in Bin, Analysis
- **Incident Management** - View and investigate threats
- **Responsive UI** - Modern, dark-themed interface

## Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+
- Google Cloud Platform account

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your Google OAuth credentials
uvicorn main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install
# Create .env with: VITE_API_URL=http://localhost:8000
npm run dev
```

Frontend uses `VITE_API_URL` (or `VITE_API_BASE_URL`) for the backend; set it in production to your deployed backend URL.

### Google OAuth Setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Gmail API
3. Create OAuth 2.0 credentials
4. Add redirect URI: `http://localhost:3000` (for local dev)
5. Copy Client ID and Secret to `backend/.env`

See [SETUP.md](SETUP.md) for detailed instructions.

## Project Structure

```
AegisAI/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── ml_service.py         # ML model service
│   ├── gmail_service.py     # Gmail API integration
│   ├── database.py          # Database operations
│   ├── utils.py             # Utilities (URL extraction, scoring)
│   ├── requirements.txt     # Python dependencies
│   ├── .env.example         # Environment variables template
│   ├── model.pkl            # ML model (if exists)
│   └── vectorizer.pkl        # ML vectorizer (if exists)
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # Main React component
│   │   ├── api.ts           # API service functions
│   │   └── main.tsx         # React entry point
│   ├── package.json         # Node dependencies
│   └── .env.example         # Environment variables template
├── SETUP.md                 # Detailed setup guide
└── README.md                # This file
```

## API Endpoints

### Authentication
- `GET /auth/url` - Get Google OAuth authorization URL
- `POST /auth/token` - Exchange authorization code for token
- `POST /auth/fetch-emails` - Fetch and analyze emails from Gmail

### Analysis
- `POST /analyze-email` - Analyze a single email

### Dashboard
- `GET /dashboard/{user_email}` - Get dashboard statistics
- `GET /recent-incidents/{user_email}` - Get recent incidents
- `GET /severity-stats/{user_email}` - Get severity statistics
- `GET /emails-in-bin/{user_email}` - Get emails flagged as threats

## How It Works

1. **User Login**: User signs in with Google OAuth
2. **Email Fetching**: System fetches last 50 emails from Gmail
3. **ML Analysis**: Each email is analyzed using the ML model
4. **URL Extraction**: URLs are extracted and scored for risk
5. **Risk Calculation**: Final risk score combines ML confidence + URL risk
6. **Severity Assignment**: CRITICAL (≥80%), WARNING (≥50%), LOW (<50%)
7. **Storage**: Results stored in SQLite database
8. **Dashboard**: Real-time display of threats and statistics

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

- ✅ OAuth2 secure authentication
- ✅ Read-only Gmail access
- ✅ User-specific data isolation
- ✅ Encrypted token storage
- ✅ CORS protection
- ✅ Input validation

## Development

### Backend Development
```bash
cd backend
uvicorn main:app --reload --port 8000
```

### Frontend Development
```bash
cd frontend
npm run dev
```

### Database
The SQLite database is automatically created on first run at `backend/aegisai.db`

## Run Locally (full stack)

```bash
# Terminal 1 - Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
```

Open http://localhost:3000. Use **Analysis** in the sidebar to paste text and run phishing analysis (works without Google login).

## Production Deployment

- **Frontend (Vercel):** Root directory `frontend`, build `npm run build`, output `dist`. Set `VITE_API_URL` to your backend URL. `vercel.json` is included for SPA routing.
- **Backend (Render):** Use repo root `render.yaml` or create a Web Service with root `backend`, build `pip install -r requirements.txt`, start `uvicorn main:app --host 0.0.0.0 --port $PORT`. Set env: `CORS_ORIGINS`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `OAUTH_REDIRECT_URI`.

Additional: Use production WSGI if needed; consider PostgreSQL for production; use HTTPS; update OAuth redirect URIs in Google Cloud Console.

## Troubleshooting

See [SETUP.md](SETUP.md) for troubleshooting guide.

Common issues:
- OAuth redirect URI mismatch
- Gmail API not enabled
- CORS errors
- Database permission issues

## License

Apache 2.0

## Contributing

This is a hackathon project. For production use, consider:
- Adding rate limiting
- Implementing proper session management
- Using a production database
- Adding comprehensive error handling
- Implementing logging and monitoring
