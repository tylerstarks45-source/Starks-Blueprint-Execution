import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Users, TrendingUp, DollarSign, AlertTriangle, RefreshCw, Zap, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  }).then((r) => r.json());
}

function downloadCsv(text, filename) {
  const blob = new Blob([text], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function handleCsvExport(endpoint, filename) {
  try {
    const token = localStorage.getItem('sbep_auth_token');
    const res = await fetch(`${API_BASE}/api${endpoint}?format=csv`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const text = await res.text();
    downloadCsv(text, filename);
  } catch { /* silent */ }
}

function KpiCard({ icon: Icon, label, value, sub, color = 'violet' }) {
  const colors = {
    violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium uppercase tracking-wider opacity-70">{label}</span>
      </div>
      <div className="text-2xl font-bold font-mono">{value}</div>
      {sub && <div className="text-xs opacity-60 mt-1">{sub}</div>}
    </div>
  );
}

function ChurnRiskBadge({ score }) {
  if (score >= 8) return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">High {score}/10</span>;
  if (score >= 5) return <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">Med {score}/10</span>;
  return <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Low {score}/10</span>;
}

function CsvButton({ endpoint, filename }) {
  return (
    <button
      onClick={() => handleCsvExport(endpoint, filename)}
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded px-2 py-1 transition-colors"
    >
      <Download className="w-3 h-3" /> CSV
    </button>
  );
}

export default function AdminCohortsPanel() {
  const { toast } = useToast();
  const [cohorts, setCohorts] = useState([]);
  const [ltv, setLtv] = useState([]);
  const [churnRisk, setChurnRisk] = useState([]);
  const [platformFunnel, setPlatformFunnel] = useState([]);
  const [userHealth, setUserHealth] = useState([]);
  const [loading, setLoading] = useState(true);
  const [digestLoading, setDigestLoading] = useState(false);
  const [activeView, setActiveView] = useState('cohorts');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, l, cr, pf, uh] = await Promise.all([
        apiFetch('/analytics/admin/cohorts'),
        apiFetch('/analytics/admin/ltv'),
        apiFetch('/analytics/admin/churn-risk?limit=100'),
        apiFetch('/analytics/admin/platform-funnel'),
        apiFetch('/analytics/admin/user-health?limit=50'),
      ]);
      setCohorts(Array.isArray(c) ? c : []);
      setLtv(Array.isArray(l) ? l : []);
      setChurnRisk(Array.isArray(cr) ? cr : []);
      setPlatformFunnel(Array.isArray(pf) ? pf : []);
      setUserHealth(Array.isArray(uh) ? uh : []);
    } catch {
      toast({ title: 'Failed to load cohort data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const triggerDigest = async () => {
    setDigestLoading(true);
    try {
      const r = await apiFetch('/analytics/admin/weekly-digest', { method: 'POST' });
      toast({ title: `Weekly digest sent to ${r.sent} users` });
    } catch {
      toast({ title: 'Digest send failed', variant: 'destructive' });
    } finally {
      setDigestLoading(false);
    }
  };

  const totalUsers = cohorts.reduce((s, c) => s + (c.totalUsers ?? 0), 0);
  const avgAdoption = cohorts.length > 0
    ? Math.round(cohorts.reduce((s, c) => s + (c.systemAdoptionRate ?? 0), 0) / cohorts.length)
    : 0;
  const avgActivation = cohorts.length > 0
    ? Math.round(cohorts.reduce((s, c) => s + (c.revenueActivationRate ?? 0), 0) / cohorts.length)
    : 0;
  // High-risk: had revenue before (>$0) but now inactive >30d with no active systems
  const highRisk = churnRisk.filter(
    (u) => (u.totalRevenueCents ?? 0) > 0
      && (u.daysSinceLastRevenue ?? 999) > 30
      && (u.activeSystems ?? 0) === 0,
  ).length;

  const VIEWS = [
    { key: 'cohorts', label: 'Cohort Retention' },
    { key: 'ltv', label: 'LTV by Cohort' },
    { key: 'churn', label: 'Churn Risk' },
    { key: 'funnel', label: 'Platform Funnel' },
    { key: 'health', label: 'User Health' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mr-3" />
        Loading cohort analytics…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Cohort Analytics & LTV</h2>
          <p className="text-sm text-muted-foreground mt-0.5">User retention, lifetime value, churn risk, platform funnel and health scores</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={triggerDigest}
            disabled={digestLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {digestLoading
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Zap className="w-4 h-4" />}
            Send Weekly Digest
          </button>
          <button
            onClick={load}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-muted/30 text-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Users} label="Total Users" value={totalUsers.toLocaleString()} color="violet" />
        <KpiCard icon={TrendingUp} label="Avg System Adoption" value={`${avgAdoption}%`} sub="users who built a system" color="emerald" />
        <KpiCard icon={DollarSign} label="Avg Revenue Activation" value={`${avgActivation}%`} sub="users who earned revenue" color="emerald" />
        <KpiCard icon={AlertTriangle} label="High-Risk Users" value={highRisk} sub="had revenue, now inactive >30d" color="red" />
      </div>

      {/* Sub-tab nav */}
      <div className="flex flex-wrap gap-1 p-1 bg-muted/20 rounded-xl border border-border/40 w-fit">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            onClick={() => setActiveView(v.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeView === v.key
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* ── Cohort Retention ── */}
      {activeView === 'cohorts' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/40 bg-card/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">System Adoption & Revenue Activation by Cohort</h3>
              <CsvButton endpoint="/analytics/admin/cohorts" filename="cohorts.csv" />
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={cohorts} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="cohortMonth" tick={{ fill: '#888', fontSize: 11 }} />
                <YAxis tick={{ fill: '#888', fontSize: 11 }} unit="%" />
                <Tooltip
                  contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                  formatter={(v, n) => [`${v}%`, n]}
                />
                <Legend />
                <Bar dataKey="systemAdoptionRate" name="System Adoption" fill="#7c3aed" radius={[3, 3, 0, 0]} />
                <Bar dataKey="revenueActivationRate" name="Revenue Activation" fill="#10b981" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-border/40 bg-card/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Cohort Table</h3>
              <CsvButton endpoint="/analytics/admin/cohorts" filename="cohorts.csv" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border/40">
                  <tr className="text-left text-muted-foreground text-xs uppercase tracking-wider">
                    <th className="px-4 py-3">Cohort</th>
                    <th className="px-4 py-3 text-right">Users</th>
                    <th className="px-4 py-3 text-right">w/ Systems</th>
                    <th className="px-4 py-3 text-right">w/ Revenue</th>
                    <th className="px-4 py-3 text-right">Adoption</th>
                    <th className="px-4 py-3 text-right">Activation</th>
                    <th className="px-4 py-3 text-right">Ret 30d</th>
                    <th className="px-4 py-3 text-right">Ret 60d</th>
                    <th className="px-4 py-3 text-right">Ret 90d</th>
                    <th className="px-4 py-3 text-right">Avg Rev.</th>
                  </tr>
                </thead>
                <tbody>
                  {cohorts.map((c) => (
                    <tr key={c.cohortMonth} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-3 font-mono text-foreground">{c.cohortMonth}</td>
                      <td className="px-4 py-3 text-right">{(c.totalUsers ?? 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">{(c.usersWithSystems ?? 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">{(c.usersWithRevenue ?? 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-mono ${(c.systemAdoptionRate ?? 0) >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {c.systemAdoptionRate ?? 0}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-mono ${(c.revenueActivationRate ?? 0) >= 20 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {c.revenueActivationRate ?? 0}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-violet-400">{c.retention30dRate ?? '—'}%</td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-violet-400">{c.retention60dRate ?? '—'}%</td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-violet-400">{c.retention90dRate ?? '—'}%</td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-400">
                        ${((c.avgRevenueCents ?? 0) / 100).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {cohorts.length === 0 && (
                    <tr><td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">No cohort data yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── LTV by Cohort ── */}
      {activeView === 'ltv' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/40 bg-card/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Avg Lifetime Value per User by Cohort Month</h3>
              <CsvButton endpoint="/analytics/admin/ltv" filename="ltv.csv" />
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={ltv} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="cohortMonth" tick={{ fill: '#888', fontSize: 11 }} />
                <YAxis tick={{ fill: '#888', fontSize: 11 }} tickFormatter={(v) => `$${(v / 100).toFixed(0)}`} />
                <Tooltip
                  contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                  formatter={(v) => [`$${(Number(v) / 100).toFixed(2)}`, 'Avg LTV / user']}
                />
                <Line type="monotone" dataKey="avgLtvCents" name="Avg LTV/user" stroke="#7c3aed" strokeWidth={2} dot={{ fill: '#7c3aed', r: 4 }} />
                <Line type="monotone" dataKey="monthlyAvgCents" name="Monthly Avg/user" stroke="#10b981" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-border/40 bg-card/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
              <h3 className="text-sm font-semibold">LTV Table — Avg per User</h3>
              <CsvButton endpoint="/analytics/admin/ltv" filename="ltv.csv" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border/40">
                  <tr className="text-left text-muted-foreground text-xs uppercase tracking-wider">
                    <th className="px-4 py-3">Cohort</th>
                    <th className="px-4 py-3 text-right">Users</th>
                    <th className="px-4 py-3 text-right">Total Revenue</th>
                    <th className="px-4 py-3 text-right">Avg LTV / User</th>
                    <th className="px-4 py-3 text-right">Monthly Avg / User</th>
                    <th className="px-4 py-3 text-right">Months Active</th>
                  </tr>
                </thead>
                <tbody>
                  {ltv.map((r) => (
                    <tr key={r.cohortMonth} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-3 font-mono text-foreground">{r.cohortMonth}</td>
                      <td className="px-4 py-3 text-right">{(r.totalUsers ?? 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-400">${((r.totalRevenueCents ?? 0) / 100).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono text-violet-400">${((r.avgLtvCents ?? 0) / 100).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono">${((r.monthlyAvgCents ?? 0) / 100).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">{r.monthsOld ?? 0}</td>
                    </tr>
                  ))}
                  {ltv.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No LTV data yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Churn Risk ── */}
      {activeView === 'churn' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/40 bg-card/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Churn Risk Score Distribution</h3>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={[1,2,3,4,5,6,7,8,9,10].map((score) => ({
                  score: `${score}`,
                  count: churnRisk.filter((u) => u.churnRiskScore === score).length,
                }))}
                margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="score" tick={{ fill: '#888', fontSize: 11 }} />
                <YAxis tick={{ fill: '#888', fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                <Bar dataKey="count" name="Users" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-border/40 bg-card/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">High-Risk Users</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Had revenue &gt; $0 · Inactive &gt; 30 days · No active systems</p>
              </div>
              <CsvButton endpoint="/analytics/admin/churn-risk" filename="churn-risk.csv" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border/40">
                  <tr className="text-left text-muted-foreground text-xs uppercase tracking-wider">
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Tier</th>
                    <th className="px-4 py-3 text-right">Risk Score</th>
                    <th className="px-4 py-3 text-right">Days Since Rev.</th>
                    <th className="px-4 py-3 text-right">Active Systems</th>
                    <th className="px-4 py-3 text-right">Lifetime Rev.</th>
                    <th className="px-4 py-3 text-right">Credits</th>
                  </tr>
                </thead>
                <tbody>
                  {churnRisk
                    .filter((u) =>
                      (u.totalRevenueCents ?? 0) > 0 &&
                      (u.daysSinceLastRevenue ?? 999) > 30 &&
                      (u.activeSystems ?? 0) === 0
                    )
                    .map((u) => (
                      <tr key={u.userId} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-foreground">{u.name ?? '—'}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-muted/40 text-muted-foreground capitalize">
                            {u.membershipTier ?? 'none'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <ChurnRiskBadge score={u.churnRiskScore} />
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-red-400">{u.daysSinceLastRevenue}d</td>
                        <td className="px-4 py-3 text-right">{u.activeSystems ?? 0}/{u.totalSystems ?? 0}</td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-400">
                          ${((u.totalRevenueCents ?? 0) / 100).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">{u.creditsBalance ?? 0}</td>
                      </tr>
                    ))}
                  {churnRisk.filter((u) =>
                    (u.totalRevenueCents ?? 0) > 0 &&
                    (u.daysSinceLastRevenue ?? 999) > 30 &&
                    (u.activeSystems ?? 0) === 0
                  ).length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No high-risk users meeting criteria</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Platform Funnel ── */}
      {activeView === 'funnel' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/40 bg-card/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Platform Conversion Funnel</h3>
              <CsvButton endpoint="/analytics/admin/platform-funnel" filename="platform-funnel.csv" />
            </div>
            {platformFunnel.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={platformFunnel} layout="vertical" margin={{ left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#888', fontSize: 11 }} />
                  <YAxis type="category" dataKey="step" tick={{ fill: '#888', fontSize: 11 }} width={130} />
                  <Tooltip
                    contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                    formatter={(v, name) => [Number(v).toLocaleString(), name]}
                  />
                  <Bar dataKey="count" name="Users" fill="#7c3aed" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-muted-foreground py-8 text-center">No funnel data yet</div>
            )}
          </div>

          {platformFunnel.length > 0 && (
            <div className="rounded-xl border border-border/40 bg-card/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Funnel Steps</h3>
                <CsvButton endpoint="/analytics/admin/platform-funnel" filename="platform-funnel.csv" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border/40">
                    <tr className="text-left text-muted-foreground text-xs uppercase tracking-wider">
                      <th className="px-4 py-3">Step</th>
                      <th className="px-4 py-3 text-right">Users</th>
                      <th className="px-4 py-3 text-right">Conversion</th>
                      <th className="px-4 py-3 text-right">Drop-off</th>
                    </tr>
                  </thead>
                  <tbody>
                    {platformFunnel.map((row, i) => {
                      const prev = i > 0 ? platformFunnel[i - 1].count : row.count;
                      const cvr = prev > 0 ? ((row.count / prev) * 100).toFixed(1) : '100';
                      const dropoff = prev > 0 ? prev - row.count : 0;
                      return (
                        <tr key={row.step} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground">{row.step}</td>
                          <td className="px-4 py-3 text-right font-mono">{(row.count ?? 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-mono ${Number(cvr) >= 50 ? 'text-emerald-400' : Number(cvr) >= 20 ? 'text-amber-400' : 'text-red-400'}`}>
                              {i === 0 ? '—' : `${cvr}%`}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                            {i === 0 ? '—' : dropoff > 0 ? `-${dropoff.toLocaleString()}` : '0'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── User Health ── */}
      {activeView === 'health' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/40 bg-card/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">User Health Score Distribution</h3>
              <CsvButton endpoint="/analytics/admin/user-health" filename="user-health.csv" />
            </div>
            {userHealth.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={[
                    { range: '0–20', count: userHealth.filter((u) => (u.healthScore ?? 0) <= 20).length },
                    { range: '21–40', count: userHealth.filter((u) => (u.healthScore ?? 0) > 20 && (u.healthScore ?? 0) <= 40).length },
                    { range: '41–60', count: userHealth.filter((u) => (u.healthScore ?? 0) > 40 && (u.healthScore ?? 0) <= 60).length },
                    { range: '61–80', count: userHealth.filter((u) => (u.healthScore ?? 0) > 60 && (u.healthScore ?? 0) <= 80).length },
                    { range: '81–100', count: userHealth.filter((u) => (u.healthScore ?? 0) > 80).length },
                  ]}
                  margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="range" tick={{ fill: '#888', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#888', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                  <Bar dataKey="count" name="Users" fill="#10b981" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-muted-foreground py-8 text-center">No health data yet</div>
            )}
          </div>

          <div className="rounded-xl border border-border/40 bg-card/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">User Health Scores</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Lower scores = at-risk users</p>
              </div>
              <CsvButton endpoint="/analytics/admin/user-health" filename="user-health.csv" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border/40">
                  <tr className="text-left text-muted-foreground text-xs uppercase tracking-wider">
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Tier</th>
                    <th className="px-4 py-3 text-right">Health Score</th>
                    <th className="px-4 py-3 text-right">Active Systems</th>
                    <th className="px-4 py-3 text-right">Lifetime Rev.</th>
                    <th className="px-4 py-3 text-right">Days Since Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {userHealth.map((u) => (
                    <tr key={u.userId} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-foreground">{u.name ?? '—'}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-muted/40 text-muted-foreground capitalize">
                          {u.membershipTier ?? 'none'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-mono text-sm font-bold ${
                          (u.healthScore ?? 0) >= 70 ? 'text-emerald-400'
                          : (u.healthScore ?? 0) >= 40 ? 'text-amber-400'
                          : 'text-red-400'
                        }`}>
                          {u.healthScore ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{u.activeSystems ?? 0}/{u.totalSystems ?? 0}</td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-400">
                        ${((u.totalLifetimeCents ?? 0) / 100).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm">
                        {u.daysSinceLastActivity != null ? `${u.daysSinceLastActivity}d` : '—'}
                      </td>
                    </tr>
                  ))}
                  {userHealth.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No user health data yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
