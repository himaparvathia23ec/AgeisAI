// API configuration - use VITE_API_URL for backend base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export interface UserInfo {
  email: string;
  name: string;
  picture?: string;
}

export interface TokenData {
  token: string;
  refresh_token?: string;
  token_uri: string;
  client_id: string;
  client_secret: string;
  scopes: string[];
}

export interface DashboardData {
  total_scanned: number;
  total_phishing: number;
  severity_counts: {
    CRITICAL: number;
    WARNING: number;
    LOW: number;
  };
  weekly_trend: Array<{ date: string; count: number }>;
  recent_incidents: Array<{
    id: string;
    sender: string;
    subject: string;
    severity: string;
    timestamp: string;
    risk_score: number;
  }>;
}

export interface Incident {
  id: string;
  sender: string;
  subject: string;
  severity: string;
  timestamp: string;
  risk_score: number;
  snippet?: string;
}

/** Single email from fetch-emails scan (subject, sender, date, risk, deleted). */
export interface EmailResult {
  id: string;
  subject: string;
  sender: string;
  date: string;
  text: string;
  prediction: number;
  risk: string;
  deleted: boolean;
}

/** Response from POST /auth/fetch-emails */
export interface FetchEmailsResponse {
  user_email: string;
  emails_analyzed: number;
  results: EmailResult[];
}

/** Response from POST /analyze */
export interface AnalyzeResult {
  prediction: number;
  confidence: number;
  risk_level: string;
  suspicious_words: string[];
  severity: string;
  explanation: string;
}

export async function analyzeContent(content: string): Promise<AnalyzeResult> {
  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || 'Analysis failed');
  }
  return response.json();
}

/** Google ID Token login (no redirect, no code exchange). */
export async function loginWithGoogleIdToken(idToken: string): Promise<{ success: boolean; user_info: UserInfo }> {
  const response = await fetch(`${API_BASE_URL}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token: idToken }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.details || data.detail || data.error || 'Login failed');
  return data;
}

/** Gmail connect: get URL to redirect user to Google for Gmail scope. */
export async function getGmailAuthUrl(): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/auth/gmail/url`);
  if (!response.ok) throw new Error('Failed to get Gmail auth URL');
  const data = await response.json();
  return data.auth_url;
}

/** Gmail connect: exchange code (from redirect) for token_data. */
export async function exchangeGmailCode(code: string): Promise<{ success: boolean; token_data: TokenData; user_info: UserInfo }> {
  const response = await fetch(`${API_BASE_URL}/auth/gmail/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.details || data.detail || data.error || 'Gmail connect failed');
  return data;
}

/** Gmail connect: claim token_data by state after redirect from backend callback. */
export async function claimGmailState(state: string): Promise<{ success: boolean; token_data: TokenData; user_info: UserInfo }> {
  const response = await fetch(`${API_BASE_URL}/auth/gmail/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.details || data.detail || data.error || 'Gmail claim failed');
  return data;
}

export async function fetchAndAnalyzeEmails(tokenData: TokenData, maxResults: number = 50): Promise<FetchEmailsResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/fetch-emails?max_results=${maxResults}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tokenData),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || data.details || data.error || 'Failed to fetch and analyze emails');
  return data as FetchEmailsResponse;
}

export async function getDashboardData(userEmail: string): Promise<DashboardData> {
  const response = await fetch(`${API_BASE_URL}/dashboard/${encodeURIComponent(userEmail)}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || data.details || data.error || 'Failed to get dashboard data');
  return data;
}

export async function getRecentIncidents(userEmail: string, limit: number = 20): Promise<{ incidents: Incident[] }> {
  const response = await fetch(`${API_BASE_URL}/recent-incidents/${encodeURIComponent(userEmail)}?limit=${limit}`);
  if (!response.ok) throw new Error('Failed to get recent incidents');
  return response.json();
}

export async function getSeverityStats(userEmail: string): Promise<Record<string, { count: number; avg_risk: number }>> {
  const response = await fetch(`${API_BASE_URL}/severity-stats/${encodeURIComponent(userEmail)}`);
  if (!response.ok) throw new Error('Failed to get severity stats');
  return response.json();
}

export async function getEmailsInBin(userEmail: string): Promise<{ emails: Incident[]; count: number }> {
  const response = await fetch(`${API_BASE_URL}/emails-in-bin/${encodeURIComponent(userEmail)}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || data.details || data.error || 'Failed to get emails in bin');
  return data;
}
