# AegisAI Setup Guide

Complete setup instructions for the AegisAI phishing detection system.

## Prerequisites

- Python 3.9+
- Node.js 18+
- npm or yarn
- Google Cloud Platform account

## Backend Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Google OAuth2 Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Gmail API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Gmail API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:3000` (for local dev - frontend URL)
     - Your production frontend URL (for production)
   - **Important**: The redirect URI should point to your FRONTEND, not backend
   - Save the Client ID and Client Secret

### 3. Configure Environment Variables

```bash
cd backend
cp .env.example .env
```

Edit `.env` and add your Google OAuth credentials:

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
OAUTH_REDIRECT_URI=http://localhost:8000/auth/callback
CORS_ORIGINS=http://localhost:3000
```

### 4. Initialize Database

The database will be automatically created on first run. The SQLite database file `aegisai.db` will be created in the `backend/` directory.

### 5. Run Backend Server

```bash
cd backend
uvicorn main:app --reload --port 8000
```

The backend will be available at `http://localhost:8000`

## Frontend Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment Variables

```bash
cd frontend
cp .env.example .env
```

Edit `.env`:

```env
VITE_API_URL=http://localhost:8000
```

### 3. Run Frontend Development Server

```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:3000` (or the port shown in terminal)

## Usage

### First Time Setup

1. Open `http://localhost:3000` in your browser
2. Click "Continue with Google"
3. Sign in with your Google account
4. Grant Gmail read-only access
5. The system will automatically:
   - Fetch your last 50 emails
   - Analyze them using ML
   - Extract URLs and calculate risk scores
   - Store results in the database
   - Display them in the dashboard

### Dashboard Features

- **Home**: Overview with KPIs, threat level, and recent incidents
- **Threats**: View all detected threats
- **Emails in Bin**: View emails flagged as phishing/threats
- **Analysis**: Detailed analysis and statistics
- **Quick Scan**: Manually trigger email analysis

### API Endpoints

- `GET /auth/url` - Get Google OAuth authorization URL
- `POST /auth/token` - Exchange authorization code for token
- `POST /auth/fetch-emails` - Fetch and analyze emails from Gmail
- `POST /analyze-email` - Analyze a single email
- `GET /dashboard/{user_email}` - Get dashboard data
- `GET /recent-incidents/{user_email}` - Get recent incidents
- `GET /severity-stats/{user_email}` - Get severity statistics
- `GET /emails-in-bin/{user_email}` - Get emails in bin

## Database Schema

The SQLite database contains a `detections` table with:

- `id` - Primary key
- `user_email` - User's email address
- `sender` - Email sender
- `subject` - Email subject
- `ml_confidence` - ML model confidence (0.0-1.0)
- `url_risk_score` - URL risk score (0.0-1.0)
- `final_risk_score` - Combined risk score (0.0-1.0)
- `severity` - CRITICAL, WARNING, or LOW
- `timestamp` - Email timestamp
- `email_snippet` - Email preview text
- `urls_found` - Comma-separated list of URLs found
- `created_at` - Record creation timestamp

## Production Deployment

### Backend

1. Set environment variables on your hosting platform
2. Use a production WSGI server (e.g., Gunicorn with Uvicorn workers)
3. Set up proper CORS origins
4. Use a production database (PostgreSQL recommended for production)

### Frontend

1. Build the frontend:
   ```bash
   cd frontend
   npm run build
   ```
2. Deploy the `dist/` folder to your hosting platform
3. Update `VITE_API_URL` to point to your production backend
4. Update Google OAuth redirect URI in Google Cloud Console

## Troubleshooting

### OAuth Errors

- Ensure redirect URI matches exactly in Google Cloud Console
- Check that Gmail API is enabled
- Verify Client ID and Secret are correct

### Database Errors

- Ensure write permissions in backend directory
- Check that SQLite is available
- Verify database file isn't locked

### API Connection Errors

- Verify backend is running
- Check CORS settings
- Ensure `VITE_API_URL` matches backend URL

### Email Fetching Errors

- Verify OAuth token is valid
- Check Gmail API quota limits
- Ensure user granted Gmail read-only permission

## Security Notes

- Never commit `.env` files to version control
- Use environment variables for all secrets
- Implement rate limiting in production
- Use HTTPS in production
- Regularly rotate OAuth credentials
- Implement proper session management

## Support

For issues or questions, check:
- Backend logs: Check terminal running uvicorn
- Frontend console: Check browser developer console
- Database: Check `backend/aegisai.db` file
