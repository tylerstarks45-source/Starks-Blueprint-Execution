import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  TrendingUp, DollarSign, CreditCard, Share2, Download,
  Calendar, ChevronDown, RefreshCw, Target, BarChart2,
} from 'lucide-react';
import { AuthContext } from '@/contexts/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton.jsx';

const API_BASE = '';

function apiFetch(path, opts = {}) {
  const token = localStorage.getItem('sbep_auth_token');
  return fetch(`${API_BASE}/api${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const ct = r.headers.get('content-type') ?? '';
    if (ct.includes('text/csv')) return r.text();
    return r.json();
  });
}

function downloadCsv(data, filename) {
  const blob = new Blob([data], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function KpiCard({ icon: Icon, label, value, sub, trend, color = 'violet' }) {
  const palette = {
    violet: { bg: 'bg-violet-500/10 border-violet-500/20', icon: 'text-violet-400' },
    emerald: { bg: 'bg-emerald-500/10 border-emerald-500/20', icon: 'text-emerald-400' },
    amber:  { bg: 'bg-amber-500/10 border-amber-500/20', icon: 'text-amber-400' },
    blue:   { bg: 'bg-blue-500/10 border-blue-500/20', icon: 'text-blue-400' },
  };
  const p = palette[color] ?? palette.violet;
  return (
    <div className={`rounded-xl border p-5 ${p.bg}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${p.bg}`}>
          <Icon className={`w-4 h-4 ${p.icon}`} />
        </div>
        {trend != null && (
          <span className={`text-xs font-mono px-2 py-0.5 rounded ${trend >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold font-mono text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
      {sub && <div className="text-xs text-muted-foreground/60 mt-0.5">{sub}</div>}
    </div>
  );
}

const COLORS = ['#7c3aed', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#06b6d4'];

const PERIODS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

export default function AnalyticsPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [period, setPeriod] = useState(30);
  const [activeTab, setActiveTab] = useState('revenue');
  const [loading, setLoading] = useState(true);

  const [revenueByDay, setRevenueByDay] = useState([]);
  const [revenueBySystem, setRevenueBySystem] = useState([]);
  const [revenueByCategory, setRevenueByCategory] = useState([]);
  const [creditEfficiency, setCreditEfficiency] = useState([]);
  const [affiliateFunnel, setAffiliateFunnel] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [bpPerf, setBpPerf] = useState([]);

  const dateRange = useCallback(() => {
    const end = new Date();
    const start = new Date(Date.now() - period * 86_400_000);
    return `startDate=${start.toISOString().slice(0, 10)}&endDate=${end.toISOString().slice(0, 10)}`;
  }, [period]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const dr = dateRange();
      const [rbd, rbs, rbc, ce, af, fc, bp] = await Promise.all([
        apiFetch(`/analytics/me/revenue-by-day?${dr}`),
        apiFetch(`/analytics/me/revenue-by-system?${dr}`),
        apiFetch(`/analytics/me/revenue-by-category?${dr}`),
        apiFetch(`/analytics/me/credit-efficiency?${dr}`),
        apiFetch(`/analytics/me/affiliate-funnel`),
        apiFetch(`/analytics/me/forecast`),
        apiFetch(`/analytics/blueprint-performance`),
      ]);
      if (Array.isArray(rbd)) setRevenueByDay(rbd);
      if (Array.isArray(rbs)) setRevenueBySystem(rbs);
      if (Array.isArray(rbc)) setRevenueByCategory(rbc);
      if (Array.isArray(ce)) setCreditEfficiency(ce);
      if (Array.isArray(af)) setAffiliateFunnel(af);
      if (fc && !Array.isArray(fc)) setForecast(fc);
      if (Array.isArray(bp)) setBpPerf(bp.slice(0, 10));
    } catch (err) {
      console.error('Analytics load error:', err);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => { load(); }, [load]);

  if (!user) {
    navigate('/login');
    return null;
  }

  // KPIs
  const totalRevenue = revenueByDay.reduce((s, r) => s + (r.totalCents ?? 0), 0);
  const totalCredits = creditEfficiency.reduce((s, r) => s + (r.creditsConsumed ?? 0), 0);
  const totalClicks = affiliateFunnel.reduce((s, r) => s + (r.clicks ?? 0), 0);
  const totalConversions = affiliateFunnel.reduce((s, r) => s + (r.conversions ?? 0), 0);
  const overallCvr = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : '0';

  const TABS = [
    { key: 'revenue', label: 'Revenue', icon: DollarSign },
    { key: 'credits', label: 'Credit ROI', icon: CreditCard },
    { key: 'affiliate', label: 'Affiliate Funnel', icon: Share2 },
    { key: 'forecast', label: 'Forecast', icon: TrendingUp },
    { key: 'leaderboard', label: 'Blueprint Leaderboard', icon: BarChart2 },
  ];

  const handleCsvExport = async (endpoint, filename) => {
    try {
      const dr = dateRange();
      const data = await apiFetch(`/analytics/me/${endpoint}?${dr}&format=csv`);
      downloadCsv(data, filename);
    } catch { /* silent */ }
  };

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Your performance dashboard — revenue, credits, and affiliate ROI</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 p-1 bg-muted/20 rounded-lg border border-border/40">
              {PERIODS.map((p) => (
                <button
                  key={p.days}
                  onClick={() => setPeriod(p.days)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                    period === p.days ? 'bg-violet-600 text-white' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button onClick={load} className="p-2 rounded-lg border border-border hover:bg-muted/30 transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={DollarSign}
            label={`Revenue (${period}d)`}
            value={`$${(totalRevenue / 100).toFixed(2)}`}
            color="emerald"
          />
          <KpiCard
            icon={CreditCard}
            label={`Credits Used (${period}d)`}
            value={totalCredits.toLocaleString()}
            sub="AI + automation spend"
            color="violet"
          />
          <KpiCard
            icon={Share2}
            label="Affiliate Clicks"
            value={totalClicks.toLocaleString()}
            sub={`${totalConversions} conversions (${overallCvr}%)`}
            color="blue"
          />
          <KpiCard
            icon={Target}
            label="30d Revenue Forecast"
            value={forecast ? `$${((forecast.projections?.day30?.value ?? 0) / 100).toFixed(2)}` : '—'}
            sub={forecast ? `${forecast.confidence}% confidence` : 'Building model…'}
            color="amber"
          />
        </div>

        {/* Tab nav */}
        <div className="flex gap-1 p-1 bg-muted/20 rounded-xl border border-border/40 w-fit overflow-x-auto">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === key
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border/40 bg-card/50 p-6 space-y-4">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-52 w-full" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map(i => (
                <div key={i} className="rounded-xl border border-border/40 bg-card/50 p-6 space-y-4">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-40 w-full" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Revenue tab ── */}
        {!loading && activeTab === 'revenue' && (
          <div className="space-y-6">
            {/* Daily line chart */}
            <div className="rounded-xl border border-border/40 bg-card/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Daily Revenue</h2>
                <button
                  onClick={() => handleCsvExport('revenue-by-day', 'revenue-by-day.csv')}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded px-2 py-1 transition-colors"
                >
                  <Download className="w-3 h-3" /> CSV
                </button>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={revenueByDay.map((r) => ({ ...r, dollars: r.totalCents / 100 }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#888', fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                    formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Revenue']}
                  />
                  <Line type="monotone" dataKey="dollars" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* By system */}
              <div className="rounded-xl border border-border/40 bg-card/50 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">By System</h2>
                  <button
                    onClick={() => handleCsvExport('revenue-by-system', 'revenue-by-system.csv')}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded px-2 py-1 transition-colors"
                  >
                    <Download className="w-3 h-3" /> CSV
                  </button>
                </div>
                <div className="space-y-3">
                  {revenueBySystem.slice(0, 8).map((s) => {
                    const pct = totalRevenue > 0 ? (s.totalCents / totalRevenue) * 100 : 0;
                    return (
                      <div key={s.systemInstanceId}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-foreground truncate max-w-[60%]">{s.systemName}</span>
                          <span className="font-mono text-emerald-400">${(s.totalCents / 100).toFixed(2)}</span>
                        </div>
                        <div className="h-1.5 bg-muted/30 rounded-full">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  {revenueBySystem.length === 0 && (
                    <div className="text-sm text-muted-foreground py-6 text-center">No revenue data yet — build your first system to start tracking</div>
                  )}
                </div>
              </div>

              {/* By category */}
              <div className="rounded-xl border border-border/40 bg-card/50 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">By Category</h2>
                  <button
                    onClick={() => handleCsvExport('revenue-by-category', 'revenue-by-category.csv')}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded px-2 py-1 transition-colors"
                  >
                    <Download className="w-3 h-3" /> CSV
                  </button>
                </div>
                {revenueByCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={revenueByCategory} dataKey="totalCents" nameKey="categoryName" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}>
                        {revenueByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => `$${(Number(v) / 100).toFixed(2)}`} contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-sm text-muted-foreground py-6 text-center">No category data yet</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Credit ROI tab ── */}
        {!loading && activeTab === 'credits' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border/40 bg-card/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Credits Spent vs Revenue Earned</h2>
                <button
                  onClick={() => handleCsvExport('credit-efficiency', 'credit-efficiency.csv')}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded px-2 py-1 transition-colors"
                >
                  <Download className="w-3 h-3" /> CSV
                </button>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={creditEfficiency.map((r) => ({ ...r, revenueDollars: r.revenueCents / 100 }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 11 }} />
                  <YAxis yAxisId="credits" tick={{ fill: '#888', fontSize: 11 }} />
                  <YAxis yAxisId="revenue" orientation="right" tick={{ fill: '#888', fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                  <Legend />
                  <Bar yAxisId="credits" dataKey="creditsConsumed" name="Credits Spent" fill="#7c3aed" radius={[3, 3, 0, 0]} />
                  <Bar yAxisId="revenue" dataKey="revenueDollars" name="Revenue ($)" fill="#10b981" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* ROI table */}
            <div className="rounded-xl border border-border/40 bg-card/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-border/40">
                <h3 className="text-sm font-semibold">Daily Credit ROI</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border/40">
                    <tr className="text-left text-muted-foreground text-xs uppercase tracking-wider">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Credits Used</th>
                      <th className="px-4 py-3 text-right">Tokens</th>
                      <th className="px-4 py-3 text-right">Revenue</th>
                      <th className="px-4 py-3 text-right">ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creditEfficiency.map((r) => (
                      <tr key={r.date} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3 font-mono text-sm">{r.date}</td>
                        <td className="px-4 py-3 text-right">{(r.creditsConsumed ?? 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{(r.tokensUsed ?? 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-400">${((r.revenueCents ?? 0) / 100).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-mono text-sm ${(r.roiPercent ?? 0) > 0 ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                            {(r.roiPercent ?? 0).toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                    {creditEfficiency.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No credit usage data yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Affiliate Funnel tab ── */}
        {!loading && activeTab === 'affiliate' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border/40 bg-card/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Affiliate Link Performance</h2>
                <button
                  onClick={() => handleCsvExport('affiliate-funnel', 'affiliate-funnel.csv')}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded px-2 py-1 transition-colors"
                >
                  <Download className="w-3 h-3" /> CSV
                </button>
              </div>
              {affiliateFunnel.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={affiliateFunnel.slice(0, 10)} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#888', fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#888', fontSize: 11 }} width={100} />
                    <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                    <Legend />
                    <Bar dataKey="clicks" name="Clicks" fill="#3b82f6" radius={[0, 3, 3, 0]} />
                    <Bar dataKey="conversions" name="Conversions" fill="#10b981" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-sm text-muted-foreground py-10 text-center">
                  No affiliate links yet.{' '}
                  <button onClick={() => navigate('/affiliate-links')} className="text-violet-400 underline">Create your first link</button>
                </div>
              )}
            </div>

            {affiliateFunnel.length > 0 && (
              <div className="rounded-xl border border-border/40 bg-card/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border/40">
                      <tr className="text-left text-muted-foreground text-xs uppercase tracking-wider">
                        <th className="px-4 py-3">Link</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3 text-right">Clicks</th>
                        <th className="px-4 py-3 text-right">Conversions</th>
                        <th className="px-4 py-3 text-right">CVR</th>
                        <th className="px-4 py-3 text-right">Revenue</th>
                        <th className="px-4 py-3 text-right">Rev/Click</th>
                      </tr>
                    </thead>
                    <tbody>
                      {affiliateFunnel.map((r) => (
                        <tr key={r.linkId} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-foreground">{r.name}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[180px]">{r.url}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-xs bg-muted/40 text-muted-foreground capitalize">{r.category ?? '—'}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono">{(r.clicks ?? 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-mono">{r.conversions ?? 0}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-mono text-sm ${(r.conversionRate ?? 0) >= 2 ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                              {(r.conversionRate ?? 0).toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-emerald-400">${((r.revenueCents ?? 0) / 100).toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-mono text-xs">${((r.revenuePerClick ?? 0) / 100).toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Forecast tab ── */}
        {!loading && activeTab === 'forecast' && (
          <div className="space-y-6">
            {forecast ? (
              <>
                {/* Projection cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: '30-Day Projection', proj: forecast.projections?.day30, days: 30 },
                    { label: '60-Day Projection', proj: forecast.projections?.day60, days: 60 },
                    { label: '90-Day Projection', proj: forecast.projections?.day90, days: 90 },
                  ].map((p) => (
                    <div key={p.days} className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-5">
                      <div className="text-xs text-violet-400 font-medium uppercase tracking-wider mb-2">{p.label}</div>
                      <div className="text-3xl font-bold font-mono text-foreground">${((p.proj?.value ?? 0) / 100).toFixed(2)}</div>
                      {p.proj?.lower != null && p.proj?.upper != null && (
                        <div className="text-xs text-violet-300/70 mt-1.5 font-mono">
                          95% CI: ${(p.proj.lower / 100).toFixed(2)} – ${(p.proj.upper / 100).toFixed(2)}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">Linear regression on {forecast.points?.length ?? 0} days</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="rounded-xl border border-border/40 bg-card/50 p-4">
                    <div className="text-xs text-muted-foreground mb-1">Model Confidence</div>
                    <div className={`text-xl font-bold font-mono ${forecast.confidence >= 70 ? 'text-emerald-400' : forecast.confidence >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                      {forecast.confidence}%
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/40 bg-card/50 p-4">
                    <div className="text-xs text-muted-foreground mb-1">Daily Trend</div>
                    <div className={`text-xl font-bold font-mono ${(forecast.slope ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {(forecast.slope ?? 0) >= 0 ? '+' : ''}{((forecast.slope ?? 0) / 100).toFixed(2)}/d
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/40 bg-card/50 p-4">
                    <div className="text-xs text-muted-foreground mb-1">Avg Daily Revenue</div>
                    <div className="text-xl font-bold font-mono">${((forecast.dailyAvgCents ?? 0) / 100).toFixed(2)}</div>
                  </div>
                  <div className="rounded-xl border border-border/40 bg-card/50 p-4">
                    <div className="text-xs text-muted-foreground mb-1">Data Points</div>
                    <div className="text-xl font-bold font-mono">{forecast.points?.length ?? 0} days</div>
                  </div>
                </div>

                {/* Historical chart */}
                {forecast.points?.length > 0 && (
                  <div className="rounded-xl border border-border/40 bg-card/50 p-6">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Historical Trend (basis for forecast)</h2>
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={forecast.points.map((p) => ({ ...p, dollars: p.totalCents / 100 }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 11 }} />
                        <YAxis tick={{ fill: '#888', fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                        <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Revenue']} />
                        <Line type="monotone" dataKey="dollars" stroke="#7c3aed" strokeWidth={2} dot={{ fill: '#7c3aed', r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {forecast.points?.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border/40 p-10 text-center text-muted-foreground">
                    <TrendingUp className="w-8 h-8 mx-auto mb-3 opacity-30" />
                    <p>No revenue events in the last 30 days — forecast will appear once you start generating revenue.</p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-3 text-muted-foreground py-8">
                <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                Building forecast…
              </div>
            )}
          </div>
        )}

        {/* ── Blueprint Leaderboard tab ── */}
        {!loading && activeTab === 'leaderboard' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border/40 bg-card/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Top Blueprints by Revenue Generated</h2>
                <button
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem('sbep_auth_token');
                      const r = await fetch('/api/analytics/blueprint-performance?format=csv', { headers: { Authorization: `Bearer ${token}` } });
                      const text = await r.text();
                      const blob = new Blob([text], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a'); a.href = url; a.download = 'blueprint-leaderboard.csv'; a.click(); URL.revokeObjectURL(url);
                    } catch { /* silent */ }
                  }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded px-2 py-1 transition-colors"
                >
                  <Download className="w-3 h-3" /> CSV
                </button>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={bpPerf.slice(0, 8).map((r) => ({ ...r, avgDollars: r.avgRevenuePerUserCents / 100 }))} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#888', fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                  <YAxis type="category" dataKey="blueprintName" tick={{ fill: '#888', fontSize: 11 }} width={120} />
                  <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Avg Rev / User']} />
                  <Bar dataKey="avgDollars" name="Avg Rev/User" fill="#7c3aed" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-xl border border-border/40 bg-card/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border/40">
                    <tr className="text-left text-muted-foreground text-xs uppercase tracking-wider">
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Blueprint</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3 text-right">Active Systems</th>
                      <th className="px-4 py-3 text-right">Users</th>
                      <th className="px-4 py-3 text-right">Total Revenue</th>
                      <th className="px-4 py-3 text-right">Avg Rev/User</th>
                      <th className="px-4 py-3 text-right">Success Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bpPerf.map((r, i) => (
                      <tr key={r.blueprintId} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground font-mono">#{i + 1}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{r.blueprintName}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-xs bg-muted/40 text-muted-foreground capitalize">{r.categoryName ?? '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-right">{(r.totalActiveSystems ?? 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">{(r.totalUsers ?? 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-400">${((r.totalRevenueCents ?? 0) / 100).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-mono text-violet-400">${((r.avgRevenuePerUserCents ?? 0) / 100).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-mono text-sm ${(r.successRate ?? 0) >= 30 ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                            {r.successRate ?? 0}%
                          </span>
                        </td>
                      </tr>
                    ))}
                    {bpPerf.length === 0 && (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No blueprint performance data yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
