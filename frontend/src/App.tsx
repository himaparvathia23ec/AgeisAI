/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  ShieldCheck, 
  HelpCircle, 
  Sparkles, 
  Mail, 
  Lock, 
  ChevronRight, 
  Bell, 
  Search, 
  Bolt, 
  Bug, 
  Link as LinkIcon, 
  CheckCircle, 
  LayoutDashboard, 
  ShieldAlert, 
  Network, 
  Box, 
  AlertTriangle, 
  BarChart3, 
  Trash2, 
  Settings,
  Info,
  Brain,
  FileWarning,
  X,
  Eye,
  Ban
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getGmailAuthUrl, exchangeGmailCode, claimGmailState, fetchAndAnalyzeEmails, getDashboardData, getRecentIncidents, getEmailsInBin, analyzeContent, type UserInfo, type TokenData, type DashboardData, type Incident, type AnalyzeResult, type EmailResult, type FetchEmailsResponse } from './api';

// --- Types ---

type View = 'landing' | 'onboarding' | 'dashboard';
type SidebarView = 'home' | 'threats' | 'emails-bin' | 'analysis';

interface IncidentDisplay extends Incident {
  source: string;
  sourceDetail: string;
  category: string;
  type: 'mail' | 'link' | 'network';
}

// --- Components ---

const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

const LandingPage = () => {
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleContinueWithGoogle = async () => {
    setLoading(true);
    setLoginError(null);
    try {
      const res = await fetch(`${API_URL}/auth/gmail/url`);
      if (!res.ok) throw new Error('Failed to get login URL');
      const data = await res.json();
      if (!data.auth_url) throw new Error('Invalid response from server');
      window.location.href = data.auth_url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setLoginError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-[#0a0c10] text-white">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]"></div>
        <div className="absolute inset-0 hero-gradient"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 w-full px-6 lg:px-12 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2 rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
            <Shield className="text-white size-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight uppercase">AegisAI</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 border border-slate-700">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-medium text-slate-400">System Secure</span>
          </div>
          <button className="p-2 rounded-lg hover:bg-slate-800 transition-colors">
            <HelpCircle className="size-5 text-slate-400" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="max-w-[1024px] w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left Side */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col gap-6 text-center lg:text-left"
          >
            <div className="inline-flex items-center self-center lg:self-start gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold">
              <Sparkles className="size-4" />
              AI-Driven Cybersecurity
            </div>
            <h1 className="text-5xl lg:text-7xl font-bold leading-[1.1] tracking-tight">
              Your Intelligent <span className="text-primary">Privacy Shield</span>
            </h1>
            <p className="text-lg lg:text-xl text-slate-400 leading-relaxed max-w-xl mx-auto lg:mx-0 font-light">
              Advanced AI-powered protection for your emails and URLs. Secure your digital footprint with real-time threat detection and automated privacy guardrails.
            </p>
            
            <div className="flex flex-wrap justify-center lg:justify-start gap-8 mt-4 opacity-70">
              <div className="flex flex-col items-center lg:items-start gap-1">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Encryption</span>
                <span className="text-sm font-medium">AES-256 Bit</span>
              </div>
              <div className="flex flex-col items-center lg:items-start gap-1">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Protection</span>
                <span className="text-sm font-medium">Real-time URL</span>
              </div>
              <div className="flex flex-col items-center lg:items-start gap-1">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Privacy</span>
                <span className="text-sm font-medium">Zero-Knowledge</span>
              </div>
            </div>
          </motion.div>

          {/* Right Side: Login Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex justify-center lg:justify-end"
          >
            <div className="glass-panel w-full max-w-md p-8 lg:p-10 rounded-2xl shadow-2xl flex flex-col gap-8 relative overflow-hidden group">
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 rounded-full blur-[60px] group-hover:bg-primary/30 transition-colors"></div>
              
              <div className="flex flex-col gap-2 relative z-10">
                <h3 className="text-2xl font-bold">Welcome to AEGISAI</h3>
                <p className="text-slate-400">Securely sign in to your AegisAI account.</p>
              </div>

              <div className="flex flex-col gap-4 relative z-10">
                <button
                  type="button"
                  onClick={handleContinueWithGoogle}
                  disabled={loading}
                  className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-600 bg-white/5 hover:bg-white/10 text-white font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? (
                    'Redirecting...'
                  ) : (
                    <>
                      <svg className="size-5" viewBox="0 0 24 24" aria-hidden>
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Continue with Google
                    </>
                  )}
                </button>
                {loginError && (
                  <p className="text-center text-red-400 text-sm bg-red-500/10 rounded-lg p-2">{loginError}</p>
                )}
              </div>

              <div className="relative z-10 flex flex-col gap-6">
                <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/10 flex items-start gap-3">
                  <ShieldCheck className="text-emerald-500 size-5 shrink-0" />
                  <p className="text-xs text-slate-400 leading-normal">
                    Your login is protected by advanced biometric verification and hardware-level security protocols.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full px-6 lg:px-12 py-10 flex flex-col md:flex-row items-center justify-between border-t border-slate-800/50 gap-6">
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 lg:gap-10">
          {['Privacy Policy', 'Terms of Service', 'Security Standards', 'Compliance'].map(link => (
            <a key={link} className="text-sm font-medium text-slate-500 hover:text-primary transition-colors" href="#">{link}</a>
          ))}
        </div>
        <div className="flex items-center gap-6">
          <p className="text-sm font-medium text-slate-500 whitespace-nowrap">© 2024 AegisAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

const OnboardingPage = ({ onNext }: { onNext: () => void }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#101622] text-white">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white">
            <Shield className="size-5" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">AegisAI</h2>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-2xl w-full">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 md:p-12 shadow-xl backdrop-blur-sm"
          >
            <div className="text-center mb-10">
              <h1 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">Grant Email Access</h1>
              <p className="text-slate-400 max-w-md mx-auto leading-relaxed">
                AegisAI needs your permission to scan incoming threats and keep your inbox safe from sophisticated cyber attacks.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-10">
              <div className="group p-6 rounded-xl border border-slate-800 bg-slate-800/40 hover:border-primary/50 transition-all duration-300">
                <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                  <Mail className="size-6" />
                </div>
                <h3 className="text-lg font-bold mb-2">Real-time Scanning</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-4">
                  AI-driven analysis of every incoming email to detect phishing and malicious links instantly.
                </p>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-primary">
                  <ShieldCheck className="size-3" />
                  Active Protection
                </div>
              </div>
              <div className="group p-6 rounded-xl border border-slate-800 bg-slate-800/40 hover:border-primary/50 transition-all duration-300">
                <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                  <Lock className="size-6" />
                </div>
                <h3 className="text-lg font-bold mb-2">Private & Secure</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-4">
                  Your data is fully encrypted. AegisAI never reads personal content; we only analyze security metadata.
                </p>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                  <Lock className="size-3" />
                  End-to-End Encrypted
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 items-center">
              <button 
                onClick={onNext}
                className="w-full md:w-64 h-12 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              >
                Allow Access & Continue
                <ChevronRight className="size-5" />
              </button>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

const SEVERITY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  LOW: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30' },
  MEDIUM: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30' },
  HIGH: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/30' },
  CRITICAL: { bg: 'bg-red-900/30', text: 'text-red-700 dark:text-red-300', border: 'border-red-700/50' },
};

const Dashboard = ({ userInfo, tokenData, onConnectGmail, connectGmailError, gmailExchangeError, onDismissConnectError }: { userInfo: UserInfo; tokenData: TokenData | null; onConnectGmail: () => void; connectGmailError?: string | null; gmailExchangeError?: string | null; onDismissConnectError?: () => void }) => {
  const [selectedIncident, setSelectedIncident] = useState<IncidentDisplay | null>(null);
  const [sidebarView, setSidebarView] = useState<SidebarView>('home');
  const [userEmail, setUserEmail] = useState("");
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [incidents, setIncidents] = useState<IncidentDisplay[]>([]);
  const [emailsInBin, setEmailsInBin] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analyzeInput, setAnalyzeInput] = useState('');
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [emailList, setEmailList] = useState<EmailResult[]>([]);
  const [stats, setStats] = useState<{ scanned: number; threats: number; safe: number } | null>(null);

  const loadDashboardData = async () => {
    setDashboardError(null);
    try {
      const data = await getDashboardData(userInfo.email);
      setDashboardData(data);
      
      // Convert incidents to display format (defensive: ensure array)
      const incidentsList = Array.isArray(data?.recent_incidents) ? data.recent_incidents : [];
      const displayIncidents: IncidentDisplay[] = incidentsList.map((inc: Incident) => ({
        ...inc,
        source: inc.subject,
        sourceDetail: inc.sender,
        category: inc.severity === 'CRITICAL' ? 'Phishing' : inc.severity === 'WARNING' ? 'Suspicious' : 'Low Risk',
        type: 'mail' as const,
      }));
      setIncidents(displayIncidents);
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Failed to load dashboard. Check that the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const loadEmailsInBin = async () => {
    try {
      const data = await getEmailsInBin(userInfo.email);
      setEmailsInBin(data.emails);
    } catch (_error) {
      // Error loading emails in bin; leave emailsInBin empty
    }
  };

  const handleQuickScan = async () => {
    setScanError(null);
    if (!tokenData) {
      setScanError('Gmail scan requires OAuth; connect Gmail first to scan emails.');
      return;
    }
    setRefreshing(true);
    try {
      const data: FetchEmailsResponse = await fetchAndAnalyzeEmails(tokenData, 50);
      if (data.user_email) setUserEmail(data.user_email);
      const list = data.results ?? [];
      setEmailList(list);
      const threats = list.filter((e) => e.risk === 'high' || e.risk === 'medium').length;
      const safe = list.filter((e) => e.risk === 'low').length;
      setStats({ scanned: list.length, threats, safe });
      await loadDashboardData();
      if (sidebarView === 'emails-bin') {
        await loadEmailsInBin();
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to scan emails. Please try again.';
      setScanError(msg);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadDashboardData();
  }, [userInfo.email]);

  /** Auto-run Gmail scan when dashboard loads with Gmail connected (or when tokenData is set after Connect Gmail) */
  useEffect(() => {
    if (!tokenData?.token) return;
    handleQuickScan();
  }, [tokenData?.token]);

  useEffect(() => {
    if (sidebarView === 'emails-bin') {
      loadEmailsInBin();
    }
  }, [sidebarView, userInfo.email]);

  const handleAnalyze = async () => {
    setAnalyzeError(null);
    setAnalyzeResult(null);
    if (!analyzeInput.trim()) return;
    setAnalyzeLoading(true);
    try {
      const result = await analyzeContent(analyzeInput.trim());
      setAnalyzeResult(result);
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setAnalyzeLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return timestamp;
    }
  };

  const getThreatLevel = () => {
    if (stats && stats.scanned > 0) {
      return Math.min(100, Math.round((stats.threats / stats.scanned) * 100));
    }
    if (!dashboardData) return 0;
    const total = dashboardData.total_scanned;
    if (total === 0) return 0;
    const threats = dashboardData.total_phishing;
    return Math.min(100, Math.round((threats / total) * 100));
  };

  const displayStats = {
    scanned: stats?.scanned ?? dashboardData?.total_scanned ?? 0,
    threats: stats?.threats ?? dashboardData?.total_phishing ?? 0,
    safe: stats ? stats.safe : (dashboardData ? dashboardData.total_scanned - dashboardData.total_phishing : 0),
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-slate-400">Loading dashboard...</p>
          </div>
        </div>
      );
    }

    if (dashboardError || !dashboardData) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <p className="text-red-400 text-sm bg-red-500/10 rounded-lg p-4 mb-4">
              {dashboardError || 'Dashboard data is not available.'}
            </p>
            <p className="text-slate-400 text-sm mb-4">Ensure the backend is running at {import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}.</p>
            <button
              type="button"
              onClick={() => { setLoading(true); loadDashboardData(); }}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    if (sidebarView === 'emails-bin') {
      const deletedFromScan = emailList.filter((e) => e.deleted);
      const hasDeleted = deletedFromScan.length > 0;
      const hasLegacyBin = emailsInBin.length > 0;
      return (
        <div className="p-8">
          <h2 className="text-2xl font-bold mb-6">Emails in Bin</h2>
          {hasDeleted ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800">
              {deletedFromScan.map((email) => (
                <div key={email.id} className="px-6 py-4 hover:bg-slate-800/30 transition-colors">
                  <div className="font-medium">{email.subject}</div>
                  <div className="text-sm text-slate-500">{email.sender}</div>
                  <div className="text-xs text-red-400 mt-1 flex items-center gap-1">
                    <Trash2 className="size-3.5" /> Moved to Trash
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {!hasDeleted && hasLegacyBin && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-800/50 text-xs font-bold uppercase text-slate-500">
                    <tr>
                      <th className="px-6 py-4">Timestamp</th>
                      <th className="px-6 py-4">Sender</th>
                      <th className="px-6 py-4">Subject</th>
                      <th className="px-6 py-4">Severity</th>
                      <th className="px-6 py-4">Risk Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-sm">
                    {emailsInBin.map((email) => (
                      <tr key={email.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-slate-500">{formatTimestamp(email.timestamp)}</td>
                        <td className="px-6 py-4">{email.sender}</td>
                        <td className="px-6 py-4">{email.subject}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            email.severity === 'CRITICAL' ? 'bg-red-500/10 text-red-500' :
                            email.severity === 'WARNING' ? 'bg-amber-500/10 text-amber-500' :
                            'bg-slate-800 text-slate-400'
                          }`}>
                            {email.severity}
                          </span>
                        </td>
                        <td className="px-6 py-4">{Math.round(email.risk_score * 100)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {!hasDeleted && !hasLegacyBin && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-6 py-8 text-center text-slate-400">
              No emails moved to Trash yet. High-risk emails from Quick Scan are moved automatically.
            </div>
          )}
        </div>
      );
    }

    if (sidebarView === 'analysis') {
      const severityStyle = analyzeResult ? SEVERITY_STYLES[analyzeResult.severity] ?? SEVERITY_STYLES.LOW : null;
      return (
        <div className="p-8 max-w-3xl mx-auto space-y-6">
          <h2 className="text-2xl font-bold">Analyze content</h2>
          <p className="text-slate-400 text-sm">Paste email or text to check for phishing. Uses AI + URL risk scoring.</p>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <textarea
              value={analyzeInput}
              onChange={(e) => setAnalyzeInput(e.target.value)}
              placeholder="Paste email body or suspicious text here..."
              className="w-full h-40 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none resize-none"
              disabled={analyzeLoading}
            />
            <button
              onClick={handleAnalyze}
              disabled={analyzeLoading || !analyzeInput.trim()}
              className="px-6 py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors shadow-lg shadow-primary/20"
            >
              {analyzeLoading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
          {analyzeError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
              {analyzeError}
            </div>
          )}
          {analyzeResult && severityStyle && (
            <div className={`rounded-xl border p-6 ${severityStyle.bg} ${severityStyle.border}`}>
              <div className="flex items-center gap-3 mb-4">
                <span className={`font-bold uppercase tracking-wider ${severityStyle.text}`}>
                  {analyzeResult.severity}
                </span>
                <span className="text-slate-400 text-sm">
                  {analyzeResult.prediction === 1 ? 'Likely phishing' : 'Likely safe'}
                </span>
              </div>
              <p className="text-slate-300 text-sm mb-4">{analyzeResult.explanation}</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Confidence</span>
                  <p className="font-medium">{(analyzeResult.confidence * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <span className="text-slate-500">Risk level</span>
                  <p className="font-medium">{analyzeResult.risk_level}</p>
                </div>
              </div>
              {analyzeResult.suspicious_words.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <span className="text-slate-500 text-sm">Suspicious keywords: </span>
                  <span className="text-amber-400 font-medium">{analyzeResult.suspicious_words.join(', ')}</span>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    if (!dashboardData) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-400">No data available</p>
        </div>
      );
    }

    return (
      <div className="p-8 space-y-8">
        {/* Welcome Message */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Welcome, {userInfo.name?.split(' ')[0] || 'User'}</h1>
          <p className="text-slate-400">{userInfo.email}</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Threat Level */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4">
              <span className="p-2 bg-red-500/10 text-red-500 rounded-lg"><ShieldAlert className="size-5" /></span>
              <span className="text-xs font-bold text-red-500">
                {dashboardData.total_phishing > 0 ? `+${dashboardData.total_phishing}` : '0'}
              </span>
            </div>
            <h3 className="text-slate-400 text-sm font-medium">System Threat Level</h3>
            <p className="text-3xl font-bold mt-1">{getThreatLevel()}%</p>
            <div className="mt-4 h-1.5 w-full bg-slate-800 rounded-full">
              <div className="h-full bg-red-500 rounded-full" style={{ width: `${getThreatLevel()}%` }}></div>
            </div>
          </div>
          {/* Active Threats */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
            <div className="flex justify-between items-start mb-4">
              <span className="p-2 bg-amber-500/10 text-amber-500 rounded-lg"><Bug className="size-5" /></span>
              <span className="text-xs font-bold text-slate-400">Live</span>
            </div>
            <h3 className="text-slate-400 text-sm font-medium">Active Threats</h3>
            <p className="text-3xl font-bold mt-1">{displayStats.threats}</p>
            <p className="text-xs text-slate-400 mt-4 flex items-center gap-1">
              <Bolt className="size-3" /> {stats ? 'From last scan' : 'Updated just now'}
            </p>
          </div>
          {/* Scanned Emails */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
            <div className="flex justify-between items-start mb-4">
              <span className="p-2 bg-primary/10 text-primary rounded-lg"><Mail className="size-5" /></span>
              <span className="text-xs font-bold text-primary">Total</span>
            </div>
            <h3 className="text-slate-400 text-sm font-medium">Scanned Emails</h3>
            <p className="text-3xl font-bold mt-1">{displayStats.scanned.toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-4">{stats ? 'From last scan' : 'All time'}</p>
          </div>
          {/* Protected Emails */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
            <div className="flex justify-between items-start mb-4">
              <span className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg"><ShieldCheck className="size-5" /></span>
              <span className="text-xs font-bold text-emerald-500">{displayStats.safe}</span>
            </div>
            <h3 className="text-slate-400 text-sm font-medium">Safe Emails</h3>
            <p className="text-3xl font-bold mt-1">{displayStats.safe.toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-4">Protected</p>
          </div>
        </div>

        {/* Charts & Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Threat Overview Chart */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-bold">Threat Overview</h3>
                <p className="text-sm text-slate-400">Activity detected in the last 7 days</p>
              </div>
            </div>
            {/* Visual Graph */}
            <div className="h-64 flex items-end justify-between gap-2 relative">
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-5">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="border-b border-slate-400 h-px w-full"></div>
                ))}
              </div>
              <div className="w-full flex items-end justify-around gap-4 h-48 relative z-0">
                {dashboardData.weekly_trend.length > 0 ? (
                  dashboardData.weekly_trend.map((day, i) => {
                    const maxCount = Math.max(...dashboardData.weekly_trend.map(d => d.count), 1);
                    const height = (day.count / maxCount) * 100;
                    return (
                      <div key={i} className="w-full bg-primary/20 rounded-t-lg relative group" style={{ height: `${Math.max(height, 5)}%` }}>
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: `${height}%` }}
                          className="absolute bottom-0 w-full bg-primary rounded-t-lg group-hover:h-full transition-all duration-500"
                        />
                      </div>
                    );
                  })
                ) : (
                  <div className="w-full text-center text-slate-500 py-8">No data for the last 7 days</div>
                )}
              </div>
            </div>
            <div className="flex justify-between mt-4 text-xs font-bold text-slate-500 uppercase tracking-tighter">
              {dashboardData.weekly_trend.length > 0 ? (
                dashboardData.weekly_trend.map((day, i) => (
                  <span key={i}>{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                ))
              ) : (
                <span>No data</span>
              )}
            </div>
          </div>

          {/* Severity Breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-bold mb-6">Severity Breakdown</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-slate-400">CRITICAL</span>
                  <span className="text-sm font-bold text-red-500">{dashboardData.severity_counts.CRITICAL}</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full" style={{ width: `${dashboardData.total_scanned > 0 ? (dashboardData.severity_counts.CRITICAL / dashboardData.total_scanned) * 100 : 0}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-slate-400">WARNING</span>
                  <span className="text-sm font-bold text-amber-500">{dashboardData.severity_counts.WARNING}</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${dashboardData.total_scanned > 0 ? (dashboardData.severity_counts.WARNING / dashboardData.total_scanned) * 100 : 0}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-slate-400">LOW</span>
                  <span className="text-sm font-bold text-slate-400">{dashboardData.severity_counts.LOW}</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-400 rounded-full" style={{ width: `${dashboardData.total_scanned > 0 ? (dashboardData.severity_counts.LOW / dashboardData.total_scanned) * 100 : 0}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scanned Email List (dynamic from last Quick Scan) */}
        {emailList.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-slate-800">
              <h3 className="text-lg font-bold">Scanned Emails</h3>
              <p className="text-sm text-slate-400 mt-1">From last Quick Scan — risk level per email</p>
            </div>
            <div className="divide-y divide-slate-800">
              {emailList.map((email) => (
                <div key={email.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-800/30 transition-colors email-row">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{email.subject}</div>
                    <div className="text-sm text-slate-500 truncate">{email.sender}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{new Date(email.date).toLocaleString()}</div>
                    {email.deleted && (
                      <div className="text-xs text-red-400 mt-1 flex items-center gap-1">
                        <Trash2 className="size-3.5" /> Moved to Trash
                      </div>
                    )}
                  </div>
                  <span className={`shrink-0 ml-4 px-2.5 py-0.5 rounded-full text-xs font-bold risk-${email.risk} ${
                    email.risk === 'high' ? 'bg-red-500/10 text-red-500' :
                    email.risk === 'medium' ? 'bg-amber-500/10 text-amber-500' :
                    'bg-slate-700 text-slate-300'
                  }`}>
                    {email.risk.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Incidents Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-lg font-bold">Recent Incidents</h3>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-primary/10 text-primary text-xs font-bold rounded-lg hover:bg-primary/20 transition-all">
                Export CSV
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-800/50 text-xs font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Threat Source</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Severity</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {incidents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                      No incidents detected yet. Click "Quick Scan" to analyze your emails.
                    </td>
                  </tr>
                ) : (
                  incidents.map((incident) => (
                    <tr key={incident.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-slate-500">{formatTimestamp(incident.timestamp)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Mail className="size-4 text-slate-400" />
                          <div>
                            <p className="font-medium">{incident.source}</p>
                            <p className="text-xs text-slate-500">{incident.sourceDetail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4"><span className="bg-slate-800 px-2 py-1 rounded text-[11px] font-bold">{incident.category}</span></td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          incident.severity === 'CRITICAL' ? 'bg-red-500/10 text-red-500' : 
                          incident.severity === 'WARNING' ? 'bg-amber-500/10 text-amber-500' : 
                          'bg-slate-800 text-slate-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            incident.severity === 'CRITICAL' ? 'bg-red-500' : 
                            incident.severity === 'WARNING' ? 'bg-amber-500' : 
                            'bg-slate-400'
                          }`}></span>
                          {incident.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setSelectedIncident(incident)}
                          className="text-primary hover:underline font-bold text-xs uppercase tracking-wider"
                        >
                          Investigate
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#101622] text-white font-display">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 flex flex-col bg-[#101622] z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-white">
            <Shield className="size-5" />
          </div>
          <span className="text-xl font-bold tracking-tight uppercase">AegisAI</span>
        </div>
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          <div className="pb-4 pt-2">
            <p className="px-2 text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Main Menu</p>
            <button 
              onClick={() => setSidebarView('home')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${
                sidebarView === 'home' ? 'text-primary bg-primary/10' : 'text-slate-400 hover:text-primary'
              }`}
            >
              <LayoutDashboard className="size-5" />
              <span>Home</span>
            </button>
            <button 
              onClick={() => setSidebarView('threats')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${
                sidebarView === 'threats' ? 'text-primary bg-primary/10' : 'text-slate-400 hover:text-primary'
              }`}
            >
              <ShieldAlert className="size-5" />
              <span>Threats</span>
            </button>
            <button 
              onClick={() => setSidebarView('emails-bin')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-colors ${
                sidebarView === 'emails-bin' ? 'text-primary bg-primary/10' : 'text-slate-400 hover:text-primary'
              }`}
            >
              <div className="flex items-center gap-3">
                <Trash2 className="size-5" />
                <span>Emails in Bin</span>
              </div>
              {emailsInBin.length > 0 && (
                <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-[10px] font-bold">{emailsInBin.length}</span>
              )}
            </button>
            <button 
              onClick={() => setSidebarView('analysis')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${
                sidebarView === 'analysis' ? 'text-primary bg-primary/10' : 'text-slate-400 hover:text-primary'
              }`}
            >
              <BarChart3 className="size-5" />
              <span>Analysis</span>
            </button>
          </div>
          <div className="py-4 border-t border-slate-800">
            <button className="w-full flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-primary transition-colors">
              <Settings className="size-5" />
              <span>Settings</span>
            </button>
          </div>
        </nav>
        <div className="p-4 mt-auto">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-800">
            <div className="flex items-center gap-3">
              <img 
                alt="Profile" 
                className="w-10 h-10 rounded-lg object-cover" 
                src={userInfo.picture || 'https://via.placeholder.com/40'} 
              />
              <div className="overflow-hidden">
                <p className="text-sm font-bold truncate">{userEmail || 'Loading...'}</p>
                <p className="text-xs text-slate-400 truncate">Connected Gmail</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#101622] overflow-y-auto custom-scrollbar">
        {/* Top Header */}
        <header className="h-20 border-b border-slate-800 px-8 flex items-center justify-between shrink-0 bg-[#101622]/50 backdrop-blur-md sticky top-0 z-10">
          <h1 className="text-2xl font-bold">Security Dashboard</h1>
          <div className="flex items-center gap-6">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
              <input className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/50 transition-all outline-none" placeholder="Search threats, IPs, or logs..." type="text" />
            </div>
            <button className="relative p-2 text-slate-400 hover:text-primary transition-colors">
              <Bell className="size-5" />
              {dashboardData && dashboardData.total_phishing > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#101622]"></span>
              )}
            </button>
            {tokenData ? (
              <button 
                onClick={handleQuickScan}
                disabled={refreshing}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Bolt className="size-4" />
                {refreshing ? 'Scanning...' : 'Quick Scan'}
              </button>
            ) : (
              <button 
                onClick={onConnectGmail}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-emerald-600/20"
              >
                <Mail className="size-4" />
                Connect Gmail
              </button>
            )}
          </div>
        </header>

        {(scanError || connectGmailError || gmailExchangeError) && (
          <div className="mx-8 mt-4 flex items-center justify-between gap-4 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
            <span>{scanError || connectGmailError || gmailExchangeError}</span>
            <button type="button" onClick={() => { setScanError(null); onDismissConnectError?.(); }} className="p-1 hover:bg-red-500/20 rounded transition-colors" aria-label="Dismiss">
              <X className="size-4" />
            </button>
          </div>
        )}

        {renderContent()}

        {/* Footer Meta */}
        <footer className="mt-auto p-8 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 uppercase tracking-widest font-bold">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Systems Operational
          </div>
          <div>
            AegisAI Engine v4.0.12 • Last sync: {new Date().toLocaleTimeString()}
          </div>
        </footer>
      </main>

      {/* Incident Modal */}
      <AnimatePresence>
        {selectedIncident && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-800 shadow-2xl shadow-red-500/10 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-800/30">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                    <AlertTriangle className="size-8" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Incident Analysis: {selectedIncident.category}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-widest uppercase ${
                        selectedIncident.severity === 'CRITICAL' ? 'bg-red-500 text-white' :
                        selectedIncident.severity === 'WARNING' ? 'bg-amber-500 text-white' :
                        'bg-slate-500 text-white'
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                        {selectedIncident.severity}
                      </span>
                      <span className="text-xs text-slate-500 font-medium tracking-tight uppercase">Case ID: #{selectedIncident.id}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedIncident(null)}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Info className="text-primary size-4" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Detection Details</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-4 bg-slate-800/50 p-4 rounded-xl border border-slate-800">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Timestamp</p>
                      <p className="text-sm font-medium mt-1">{formatTimestamp(selectedIncident.timestamp)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Source Email</p>
                      <p className="text-sm font-medium mt-1 text-red-400">{selectedIncident.sourceDetail}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Risk Score</p>
                      <p className="text-sm font-medium mt-1">{Math.round(selectedIncident.risk_score * 100)}%</p>
                    </div>
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Brain className="text-primary size-4" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">AI Analysis</h3>
                  </div>
                  <div className="flex gap-6 items-start">
                    <div className="shrink-0 relative">
                      <svg className="w-20 h-20 transform -rotate-90">
                        <circle className="text-slate-800" cx="40" cy="40" fill="transparent" r="36" stroke="currentColor" strokeWidth="6"></circle>
                        <circle 
                          className="text-red-500" 
                          cx="40" 
                          cy="40" 
                          fill="transparent" 
                          r="36" 
                          stroke="currentColor" 
                          strokeDasharray={226.19} 
                          strokeDashoffset={226.19 - (selectedIncident.risk_score * 226.19)} 
                          strokeWidth="6"
                        ></circle>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-lg font-bold">{Math.round(selectedIncident.risk_score * 100)}%</span>
                        <span className="text-[8px] font-bold text-slate-500">THREAT</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm leading-relaxed text-slate-300">
                        The AegisAI engine flagged this email due to suspicious patterns detected in the content and URLs.
                        {selectedIncident.severity === 'CRITICAL' && (
                          <span className="text-red-500 font-medium"> High confidence phishing attempt detected.</span>
                        )}
                      </p>
                    </div>
                  </div>
                </section>

                {selectedIncident.snippet && (
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <Mail className="text-primary size-4" />
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Email Preview</h3>
                    </div>
                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-800">
                      <p className="text-sm text-slate-300">{selectedIncident.snippet}</p>
                    </div>
                  </section>
                )}
              </div>

              <div className="p-6 bg-slate-950/50 border-t border-slate-800">
                <div className="flex flex-col gap-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Recommended Actions</p>
                  <div className="flex items-center gap-3">
                    <button className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/20">
                      <Ban className="size-5" />
                      Quarantine
                    </button>
                    <button className="flex-1 bg-slate-800 hover:bg-slate-700 font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all">
                      <Eye className="size-5" />
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState<View>('landing');
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [gmailConnectError, setGmailConnectError] = useState<string | null>(null);
  const [gmailExchangeError, setGmailExchangeError] = useState<string | null>(null);

  useEffect(() => {
    const storedUserInfo = localStorage.getItem('userInfo');
    const storedTokenData = localStorage.getItem('tokenData');
    const hasTokenInUrl = new URLSearchParams(window.location.search).get('token') != null;
    if (storedUserInfo) {
      try {
        const parsed = JSON.parse(storedUserInfo) as UserInfo;
        if (parsed && typeof parsed.email === 'string') {
          setUserInfo(parsed);
          if (storedTokenData) {
            try {
              setTokenData(JSON.parse(storedTokenData) as TokenData);
            } catch {
              localStorage.removeItem('tokenData');
            }
          }
          // Do not force dashboard when URL has ?token= (Gmail callback → show onboarding)
          if (!hasTokenInUrl) setView('dashboard');
        } else {
          localStorage.removeItem('userInfo');
          localStorage.removeItem('tokenData');
        }
      } catch {
        localStorage.removeItem('userInfo');
        localStorage.removeItem('tokenData');
      }
    }
  }, []);

  // Guard: never show dashboard without userInfo (prevents blank screen)
  useEffect(() => {
    if ((view === 'dashboard' || view === 'onboarding') && !userInfo) {
      setView('landing');
    }
  }, [view, userInfo]);

  // Gmail callback redirect: ?token=ENCODED (base64url JSON of { token_data, user_info? }) — decode, store, clean URL, show onboarding
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenEncoded = params.get('token');
    if (!tokenEncoded) return;
    try {
      const base64 = tokenEncoded.replace(/-/g, '+').replace(/_/g, '/');
      const pad = base64.length % 4;
      const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
      const decoded = JSON.parse(atob(padded)) as { token_data?: TokenData; user_info?: UserInfo };
      const tokenDataPayload = decoded?.token_data ?? (decoded as unknown as TokenData);
      const hasTokenData = tokenDataPayload && typeof tokenDataPayload === 'object' && tokenDataPayload.token && tokenDataPayload.client_id && tokenDataPayload.token_uri;
      if (hasTokenData) {
        setTokenData(tokenDataPayload as TokenData);
        localStorage.setItem('tokenData', JSON.stringify(tokenDataPayload));
      }
      if (decoded?.user_info && typeof decoded.user_info === 'object' && typeof (decoded.user_info as UserInfo).email === 'string') {
        setUserInfo(decoded.user_info as UserInfo);
        localStorage.setItem('userInfo', JSON.stringify(decoded.user_info));
      }
      const path = window.location.pathname || '/';
      window.history.replaceState({}, document.title, path);
      setView('onboarding');
    } catch (_e) {
      setGmailExchangeError('Invalid token from Gmail callback.');
    }
  }, []);

  // Gmail connect: backend redirects to frontend with #gmail-state=STATE; claim token_data from backend
  const gmailClaimAttempted = React.useRef(false);
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const state = params.get('gmail-state');
    if (!state || gmailClaimAttempted.current) return;
    gmailClaimAttempted.current = true;
    setGmailExchangeError(null);
    (async () => {
      try {
        const data = await claimGmailState(state);
        if (data.token_data) {
          setTokenData(data.token_data);
          localStorage.setItem('tokenData', JSON.stringify(data.token_data));
        }
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gmail connect failed. Please try again.';
        setGmailExchangeError(msg);
        gmailClaimAttempted.current = false;
      }
    })();
  }, []);

  // Legacy: Gmail ?code= on frontend (when redirect was to frontend)
  const gmailCodeExchanged = React.useRef(false);
  useEffect(() => {
    if (!userInfo) return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (!code || gmailCodeExchanged.current) return;
    gmailCodeExchanged.current = true;
    setGmailExchangeError(null);
    (async () => {
      try {
        const data = await exchangeGmailCode(code);
        if (data.token_data) {
          setTokenData(data.token_data);
          localStorage.setItem('tokenData', JSON.stringify(data.token_data));
        }
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gmail connect failed. Please try again.';
        setGmailExchangeError(msg);
        gmailCodeExchanged.current = false;
      }
    })();
  }, [userInfo]);

  const handleOnboardingComplete = () => {
    setView('dashboard');
  };

  const handleConnectGmail = async () => {
    setGmailConnectError(null);
    try {
      const authUrl = await getGmailAuthUrl();
      window.location.href = authUrl;
    } catch (err) {
      setGmailConnectError(err instanceof Error ? err.message : 'Failed to start Gmail connection. Please try again.');
    }
  };

  return (
    <div className="font-display">
      <AnimatePresence mode="wait">
        {view === 'landing' && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <LandingPage />
          </motion.div>
        )}
        {view === 'onboarding' && userInfo && (
          <motion.div
            key="onboarding"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <OnboardingPage onNext={handleOnboardingComplete} />
          </motion.div>
        )}
        {view === 'dashboard' && userInfo && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Dashboard userInfo={userInfo} tokenData={tokenData} onConnectGmail={handleConnectGmail} connectGmailError={gmailConnectError} gmailExchangeError={gmailExchangeError} onDismissConnectError={() => { setGmailConnectError(null); setGmailExchangeError(null); }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
