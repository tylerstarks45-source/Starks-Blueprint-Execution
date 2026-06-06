import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from 'recharts';
import { BrainCircuit, DollarSign, Zap, Activity, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import adminApi from '@/lib/adminApi.js';
import { useAdminData } from '@/contexts/AdminDataContext.jsx';

const fmt$ = (usd) => {
  if (usd === null || usd === undefined) return '$0.00';
  if (usd < 0.01) return `$${(usd * 1000).toFixed(2)}m`;
  return `$${Number(usd).toFixed(2)}`;
};
const fmtK = (n) => {
  if (!n) return '0';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
};
const num = (n) => (n ?? 0).toLocaleString();

const RANGE_OPTIONS = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
];

const TIER_COLORS = {
  starter: '#3b82f6',
  operator: '#8b5cf6',
  empire: '#f59e0b',
  none: '#6b7280',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border/60 rounded-lg p-3 text-xs shadow-xl">
      <p className="font-mono text-muted-foreground mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-bold font-mono">
            {p.dataKey === 'costUsd' ? fmt$(p.value) : fmtK(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

const KPICard = ({ icon: Icon, label, value, sub, color = 'text-emerald-400', loading }) => (
  <Card className="border-border/50">
    <CardContent className="pt-5 pb-4">
      {loading ? (
        <div className="space-y-2"><Skeleton className="h-6 w-24" /><Skeleton className="h-4 w-32" /></div>
      ) : (
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-lg bg-current/10 flex items-center justify-center shrink-0 ${color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xl font-bold font-mono">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
            {sub && <div className="text-xs text-muted-foreground/70 mt-0.5">{sub}</div>}
          </div>
        </div>
      )}
    </CardContent>
  </Card>
);

const AdminAIAnalyticsDashboard = () => {
  const { analytics } = useAdminData();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [days, setDays] = useState(30);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (selectedDays, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const result = await adminApi.getAiAnalytics({ days: selectedDays });
      setData(result);
    } catch (e) {
      setError(e.message || 'Failed to load AI analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(days); }, [days, load]);

  const dailyForChart = (data?.daily ?? []).map((r) => ({
    ...r,
    date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  const successRate = data
    ? data.totals.totalRequests > 0
      ? ((data.totals.successfulRequests / data.totals.totalRequests) * 100).toFixed(1)
      : '100'
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-mono flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-primary" /> AI Cost Analytics
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">OpenRouter usage, spend, and model breakdown</p>
        </div>
        <button
          onClick={() => load(days, true)}
          disabled={loading || refreshing}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border/50 rounded-lg px-3 py-1.5 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-sm px-4 py-3">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard icon={DollarSign} label="All-Time AI Cost" value={fmt$(data?.totals?.totalCostUsd)} loading={loading} color="text-rose-400" />
        <KPICard icon={DollarSign} label="This Month" value={fmt$(data?.thisMonth?.costUsd)} sub={`${num(data?.thisMonth?.requests)} requests`} loading={loading} color="text-orange-400" />
        <KPICard icon={DollarSign} label="Today" value={fmt$(data?.today?.costUsd)} sub={`${num(data?.today?.requests)} requests`} loading={loading} color="text-amber-400" />
        <KPICard icon={Activity} label="Success Rate" value={successRate ? `${successRate}%` : '—'} sub={`${num(data?.totals?.totalRequests)} total calls`} loading={loading} color="text-emerald-400" />
      </div>

      {/* Daily cost chart */}
      <Card className="border-border/50">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Zap className="w-4 h-4" /> Daily AI Spend
          </CardTitle>
          <div className="flex gap-1">
            {RANGE_OPTIONS.map((o) => (
              <button
                key={o.days}
                onClick={() => setDays(o.days)}
                className={`px-2.5 py-1 text-xs rounded-md font-mono transition-colors ${days === o.days ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/50'}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-44 w-full" />
          ) : dailyForChart.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-sm text-muted-foreground italic">
              No AI usage recorded yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={176}>
              <AreaChart data={dailyForChart} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="aiCostGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toFixed(2)}`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="costUsd" name="Cost (USD)" stroke="#f43f5e" strokeWidth={2} fill="url(#aiCostGrad)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Daily tokens chart */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Zap className="w-4 h-4" /> Daily Token Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-44 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={176}>
              <AreaChart data={dailyForChart} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="tokensGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={fmtK} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="tokens" name="Tokens" stroke="#8b5cf6" strokeWidth={2} fill="url(#tokensGrad)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model cost breakdown */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <BrainCircuit className="w-4 h-4" /> Cost by Model
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-3/4" /></div>
            ) : !data?.models?.length ? (
              <p className="text-sm text-muted-foreground italic">No model usage recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/40 text-muted-foreground uppercase tracking-wider">
                      <th className="text-left py-2 pr-3 font-medium">Model</th>
                      <th className="text-right py-2 px-2 font-medium">Calls</th>
                      <th className="text-right py-2 px-2 font-medium">Tokens</th>
                      <th className="text-right py-2 pl-2 font-medium">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.models.map((m) => (
                      <tr key={m.model} className="border-b border-border/20 hover:bg-muted/10">
                        <td className="py-2 pr-3 font-mono max-w-[160px] truncate" title={m.model}>{m.model}</td>
                        <td className="text-right py-2 px-2 tabular-nums">
                          <span className="inline-flex items-center gap-1">
                            {num(m.requests)}
                            {m.failureCount > 0 && (
                              <XCircle className="w-3 h-3 text-destructive" title={`${m.failureCount} failed`} />
                            )}
                          </span>
                        </td>
                        <td className="text-right py-2 px-2 tabular-nums text-muted-foreground">{fmtK(m.tokens)}</td>
                        <td className="text-right py-2 pl-2 tabular-nums font-medium text-rose-400">{fmt$(m.costUsd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tier-based AI usage */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Activity className="w-4 h-4" /> AI Usage by Subscription Tier
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-40 w-full" />
            ) : !data?.byTier?.length ? (
              <p className="text-sm text-muted-foreground italic">No tier usage data yet.</p>
            ) : (
              <div className="space-y-3">
                {data.byTier.map((t) => {
                  const tierLabel = t.tier ? (t.tier.charAt(0).toUpperCase() + t.tier.slice(1)) : 'None';
                  const totalCost = data.totals.totalCostUsd || 1;
                  const pct = Math.round((t.costUsd / totalCost) * 100);
                  const color = TIER_COLORS[t.tier] || '#6b7280';
                  return (
                    <div key={t.tier}>
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color }} className="font-medium">{tierLabel}</span>
                        <span className="text-muted-foreground font-mono">{fmt$(t.costUsd)} · {num(t.requests)} calls</span>
                      </div>
                      <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAIAnalyticsDashboard;
