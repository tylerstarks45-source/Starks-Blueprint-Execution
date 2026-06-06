import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, DollarSign, Minus, Server, BarChart3 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAdminData } from '@/contexts/AdminDataContext.jsx';
import adminApi from '@/lib/adminApi.js';

const usd = (cents) => {
  if (cents === null || cents === undefined) return '$0.00';
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border/60 rounded-lg p-3 text-xs shadow-xl">
      <p className="font-mono text-muted-foreground mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-bold font-mono">{usd(p.value * 100)}</span>
        </div>
      ))}
    </div>
  );
};

const MetricRow = ({ label, value, color = '', sign = '', isTotal = false }) => (
  <div className={`flex justify-between items-center py-3 ${isTotal ? 'border-t border-border/60 mt-2 pt-4' : 'border-b border-border/30'}`}>
    <span className={`text-sm ${isTotal ? 'font-bold' : 'text-muted-foreground'}`}>{label}</span>
    <span className={`font-mono font-bold text-sm ${color} ${isTotal ? 'text-base' : ''}`}>
      {sign}{value}
    </span>
  </div>
);

const AdminProfitabilityPanel = () => {
  const { analytics, loading: analyticsLoading, revenue, revenueLoading } = useAdminData();
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(true);

  useEffect(() => {
    adminApi.getAiAnalytics({ days: 30 })
      .then(setAiData)
      .catch(() => {})
      .finally(() => setAiLoading(false));
  }, []);

  const isLoading = analyticsLoading || revenueLoading || aiLoading;

  // Revenue metrics (in cents)
  const allTimeRevCents  = revenue?.stats?.allTimeCents ?? 0;
  const monthRevCents    = revenue?.stats?.thisMonthCents ?? 0;
  const todayRevCents    = revenue?.stats?.todayCents ?? 0;

  // AI cost metrics (USD → convert to cents for consistent math)
  const allTimeAiCents  = Math.round((aiData?.totals?.totalCostUsd ?? 0) * 100);
  const monthAiCents    = Math.round((aiData?.thisMonth?.costUsd ?? 0) * 100);
  const todayAiCents    = Math.round((aiData?.today?.costUsd ?? 0) * 100);

  // Infrastructure cost (Replit hosting — fixed estimate)
  const MONTHLY_INFRA_CENTS = 0; // Update when Replit deployment cost is known

  // Net profit calculations
  const monthNetCents = monthRevCents - monthAiCents - MONTHLY_INFRA_CENTS;
  const allTimeNetCents = allTimeRevCents - allTimeAiCents;
  const todayNetCents  = todayRevCents - todayAiCents;

  // Margin
  const monthMarginPct = monthRevCents > 0
    ? Math.round((monthNetCents / monthRevCents) * 100)
    : null;

  // Daily profit chart: zip revenue daily data and AI daily data by date
  const revDaily = revenue?.dailyRevenue ?? [];
  const aiDaily  = aiData?.daily ?? [];
  const aiByDate = Object.fromEntries(aiDaily.map((r) => [r.date, r.costUsd]));
  const profitChart = revDaily.map((r) => {
    const aiCostUsd = aiByDate[r.date] ?? 0;
    const revUsd    = (r.amountCents ?? 0) / 100;
    return {
      date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: revUsd,
      aiCost:  aiCostUsd,
      profit:  revUsd - aiCostUsd,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold font-mono flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-400" /> Profitability
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Revenue minus AI costs and infrastructure
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Today */}
        <Card className="border-border/50">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Today</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-12 w-full" /> : (
              <>
                <div className={`text-2xl font-bold font-mono ${todayNetCents >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {usd(todayNetCents)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">net profit</div>
                <div className="text-xs text-muted-foreground mt-2 space-y-1">
                  <div className="flex justify-between"><span>Revenue</span><span className="text-emerald-400">{usd(todayRevCents)}</span></div>
                  <div className="flex justify-between"><span>AI Cost</span><span className="text-rose-400">−{usd(todayAiCents)}</span></div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* This Month */}
        <Card className="border-border/50">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-12 w-full" /> : (
              <>
                <div className={`text-2xl font-bold font-mono ${monthNetCents >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {usd(monthNetCents)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  net profit{monthMarginPct !== null ? ` · ${monthMarginPct}% margin` : ''}
                </div>
                <div className="text-xs text-muted-foreground mt-2 space-y-1">
                  <div className="flex justify-between"><span>Revenue</span><span className="text-emerald-400">{usd(monthRevCents)}</span></div>
                  <div className="flex justify-between"><span>AI Cost</span><span className="text-rose-400">−{usd(monthAiCents)}</span></div>
                  {MONTHLY_INFRA_CENTS > 0 && (
                    <div className="flex justify-between"><span>Infrastructure</span><span className="text-rose-400">−{usd(MONTHLY_INFRA_CENTS)}</span></div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* All Time */}
        <Card className="border-border/50">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">All Time</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-12 w-full" /> : (
              <>
                <div className={`text-2xl font-bold font-mono ${allTimeNetCents >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {usd(allTimeNetCents)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">net profit</div>
                <div className="text-xs text-muted-foreground mt-2 space-y-1">
                  <div className="flex justify-between"><span>Revenue</span><span className="text-emerald-400">{usd(allTimeRevCents)}</span></div>
                  <div className="flex justify-between"><span>AI Cost</span><span className="text-rose-400">−{usd(allTimeAiCents)}</span></div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* P&L breakdown */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Monthly P&L Statement
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
          ) : (
            <div>
              <MetricRow label="Subscription Revenue" value={usd(monthRevCents)} color="text-emerald-400" sign="+" />
              <MetricRow label="OpenRouter AI Cost" value={usd(monthAiCents)} color="text-rose-400" sign="−" />
              <MetricRow label="Infrastructure Cost" value={MONTHLY_INFRA_CENTS > 0 ? usd(MONTHLY_INFRA_CENTS) : '$0.00'} color="text-rose-400" sign="−" />
              <MetricRow
                label="Net Platform Profit"
                value={usd(Math.abs(monthNetCents))}
                color={monthNetCents >= 0 ? 'text-emerald-400' : 'text-rose-400'}
                sign={monthNetCents >= 0 ? '+' : '−'}
                isTotal
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily profit chart */}
      {profitChart.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> 30-Day Profit Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={profitChart} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toFixed(0)}`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={1.5} fill="url(#revGrad)" dot={false} />
                <Area type="monotone" dataKey="profit" name="Net Profit" stroke="#3b82f6" strokeWidth={2} fill="url(#profitGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminProfitabilityPanel;
