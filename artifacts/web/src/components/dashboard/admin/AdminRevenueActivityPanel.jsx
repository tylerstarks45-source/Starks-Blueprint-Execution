import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TrendingUp, DollarSign, Activity, Filter, X, RefreshCw } from 'lucide-react';
import { useAdminData } from '@/contexts/AdminDataContext.jsx';
import adminApi from '@/lib/adminApi.js';
import { usdFromCents, num, relativeTime } from '@/lib/adminFormat.js';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

const StatTile = ({ label, value, loading }) => (
  <div className="flex flex-col gap-1">
    {loading ? (
      <Skeleton className="h-7 w-24" />
    ) : (
      <p className="text-xl font-bold font-mono tracking-tight text-foreground">{value}</p>
    )}
    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border/50 bg-card/90 backdrop-blur px-3 py-2 shadow-lg text-xs">
      <p className="font-medium text-muted-foreground mb-1">{label}</p>
      <p className="font-mono font-semibold text-emerald-400">{usdFromCents(payload[0]?.value)}</p>
    </div>
  );
};

const RevenueTrendChart = ({ data, loading }) => {
  if (loading) {
    return <Skeleton className="h-40 w-full" />;
  }

  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic flex items-center justify-center h-40">
        No daily revenue data for the past 30 days.
      </p>
    );
  }

  const formatted = data.map((d) => ({
    date: d.date
      ? new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : d.date,
    amountCents: d.amountCents,
  }));

  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={formatted} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(255,255,255,0.06)"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontFamily: 'inherit' }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
          tickMargin={6}
        />
        <YAxis
          tickFormatter={(v) => `$${(v / 100).toFixed(0)}`}
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontFamily: 'inherit' }}
          axisLine={false}
          tickLine={false}
          width={44}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(16,185,129,0.3)', strokeWidth: 1 }} />
        <Area
          type="monotone"
          dataKey="amountCents"
          stroke="#10b981"
          strokeWidth={2}
          fill="url(#revenueGradient)"
          dot={false}
          activeDot={{ r: 4, fill: '#10b981', stroke: '#064e3b', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

const LastUpdatedBadge = ({ timestamp, loading }) => {
  const [display, setDisplay] = useState('');

  useEffect(() => {
    if (!timestamp) return;
    const update = () => {
      const diff = Math.floor((Date.now() - timestamp.getTime()) / 1000);
      if (diff < 5) setDisplay('just now');
      else if (diff < 60) setDisplay(`${diff}s ago`);
      else setDisplay(`${Math.floor(diff / 60)}m ago`);
    };
    update();
    const id = setInterval(update, 5000);
    return () => clearInterval(id);
  }, [timestamp]);

  if (!timestamp) return null;

  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground/70 font-mono">
      <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
      {loading ? 'Refreshing…' : `Updated ${display}`}
    </span>
  );
};

const AdminRevenueActivityPanel = () => {
  const { revenue: contextRevenue, revenueLoading: contextLoading, revenueRefreshing: contextRefreshing, revenueError: contextError, revenueLastUpdated } = useAdminData();

  const [users, setUsers] = useState([]);
  const [filterUserId, setFilterUserId] = useState('');
  const [filterSystemInstanceId, setFilterSystemInstanceId] = useState('');
  const [systemInstanceInput, setSystemInstanceInput] = useState('');

  const [filteredRevenue, setFilteredRevenue] = useState(null);
  const [filteredLoading, setFilteredLoading] = useState(false);
  const [filteredError, setFilteredError] = useState(null);

  const isFiltered = filterUserId !== '' || filterSystemInstanceId !== '';

  const revenue = isFiltered ? filteredRevenue : contextRevenue;
  const revenueLoading = isFiltered ? filteredLoading : contextLoading;
  const revenueError = isFiltered ? filteredError : contextError;

  const stats = revenue?.stats;
  const byBlueprint = revenue?.byBlueprint ?? [];
  const recentEvents = revenue?.recentEvents ?? [];
  const dailyRevenue = revenue?.dailyRevenue ?? [];

  useEffect(() => {
    adminApi.listUsers({ limit: 200 }).then((res) => {
      setUsers(res?.items ?? res ?? []);
    }).catch(() => {});
  }, []);

  const fetchFiltered = useCallback(async (userId, systemInstanceId) => {
    setFilteredLoading(true);
    setFilteredError(null);
    try {
      const params = {};
      if (userId) params.userId = userId;
      if (systemInstanceId) params.systemInstanceId = systemInstanceId;
      const data = await adminApi.getRevenueActivity(params);
      setFilteredRevenue(data);
    } catch (e) {
      setFilteredError(e.message || 'Failed to load filtered revenue');
    } finally {
      setFilteredLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isFiltered) {
      fetchFiltered(filterUserId, filterSystemInstanceId);
    }
  }, [filterUserId, filterSystemInstanceId, isFiltered, fetchFiltered]);

  function applySystemInstance() {
    const val = systemInstanceInput.trim();
    if (val === '' || /^\d+$/.test(val)) {
      setFilterSystemInstanceId(val);
    }
  }

  function clearFilters() {
    setFilterUserId('');
    setFilterSystemInstanceId('');
    setSystemInstanceInput('');
    setFilteredRevenue(null);
    setFilteredError(null);
  }

  const selectedUser = users.find((u) => String(u.id) === String(filterUserId));

  return (
    <Card className="shadow-sm border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3 border-b border-border/30">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" /> Revenue Activity
            </CardTitle>
            {!isFiltered && (
              <LastUpdatedBadge timestamp={revenueLastUpdated} loading={contextRefreshing} />
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />

            <select
              className="h-8 rounded-md border border-border/50 bg-background/60 px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring min-w-[130px]"
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
            >
              <option value="">All users</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email ?? u.name ?? `User #${u.id}`}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1">
              <Input
                className="h-8 w-32 text-xs"
                placeholder="System ID"
                value={systemInstanceInput}
                onChange={(e) => setSystemInstanceInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') applySystemInstance(); }}
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2 text-xs"
                onClick={applySystemInstance}
              >
                Go
              </Button>
            </div>

            {isFiltered && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={clearFilters}
              >
                <X className="w-3.5 h-3.5 mr-1" /> Clear
              </Button>
            )}
          </div>
        </div>

        {isFiltered && (
          <p className="text-xs text-muted-foreground mt-2">
            Showing revenue for{' '}
            {filterUserId && (
              <span className="font-medium text-foreground">
                {selectedUser ? (selectedUser.email ?? selectedUser.name ?? `User #${filterUserId}`) : `User #${filterUserId}`}
              </span>
            )}
            {filterUserId && filterSystemInstanceId && ' · '}
            {filterSystemInstanceId && (
              <span className="font-medium text-foreground">System #{filterSystemInstanceId}</span>
            )}
          </p>
        )}
      </CardHeader>

      <CardContent className="pt-5">
        {revenueError ? (
          <p className="text-sm text-destructive">Unable to load revenue data: {revenueError}</p>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b border-border/30">
              <StatTile label="Today" value={usdFromCents(stats?.todayCents)} loading={revenueLoading} />
              <StatTile label="This Week" value={usdFromCents(stats?.weekCents)} loading={revenueLoading} />
              <StatTile label="This Month" value={usdFromCents(stats?.monthCents)} loading={revenueLoading} />
              <StatTile label="All Time" value={usdFromCents(stats?.allTimeCents)} loading={revenueLoading} />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> 30-Day Revenue Trend
              </p>
              <RevenueTrendChart data={dailyRevenue} loading={revenueLoading} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2 border-t border-border/30">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" /> By Blueprint
                </p>
                {revenueLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-3/4" />
                  </div>
                ) : byBlueprint.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No blueprint revenue yet.</p>
                ) : (
                  <div className="space-y-2">
                    {byBlueprint.map((b) => (
                      <div key={b.blueprintId} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="text-sm truncate">{b.blueprintName}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs text-muted-foreground font-mono">{num(b.eventCount)} events</span>
                          <span className="font-mono font-semibold text-sm text-emerald-400">
                            {usdFromCents(b.totalCents)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> Recent Events
                </p>
                {revenueLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : recentEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No revenue events yet.</p>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {recentEvents.map((e) => (
                      <div key={e.id} className="flex items-start gap-3 pb-2 border-b border-border/20 last:border-0 last:pb-0">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium truncate">{e.description}</p>
                            <span className="font-mono text-sm font-semibold text-emerald-400 shrink-0">
                              {usdFromCents(e.amountCents)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">{e.blueprintName}</span>
                            <span className="text-xs text-muted-foreground/50">·</span>
                            <span className="text-xs text-muted-foreground font-mono">{relativeTime(e.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminRevenueActivityPanel;
