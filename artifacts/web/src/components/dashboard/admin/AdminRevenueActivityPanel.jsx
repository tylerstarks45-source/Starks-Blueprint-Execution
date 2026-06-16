import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TrendingUp, DollarSign, Activity, Filter, X, RefreshCw, Calendar } from 'lucide-react';
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

const PRESETS = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
];

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

const RevenueTrendChart = ({ data, loading, rangeLabel }) => {
  if (loading) {
    return <Skeleton className="h-40 w-full" />;
  }

  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic flex items-center justify-center h-40">
        No revenue data for the selected period.
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

  const [searchParams, setSearchParams] = useSearchParams();

  const filterUserId = searchParams.get('revenueUserId') ?? '';
  const filterSystemInstanceId = searchParams.get('revenueSystemId') ?? '';

  // Range params from URL
  const revenueDaysParam = searchParams.get('revenueDays');
  const revenueFrom = searchParams.get('revenueFrom') ?? '';
  const revenueTo = searchParams.get('revenueTo') ?? '';

  const selectedDays = revenueDaysParam ? Number(revenueDaysParam) : 30;
  const isCustomRange = revenueFrom !== '' && revenueTo !== '';
  const isNonDefaultRange = isCustomRange || selectedDays !== 30;

  // Local state for custom date inputs (not committed to URL until both are filled)
  const [showCustomPicker, setShowCustomPicker] = useState(isCustomRange);
  const [customFromInput, setCustomFromInput] = useState(revenueFrom);
  const [customToInput, setCustomToInput] = useState(revenueTo);

  const [users, setUsers] = useState([]);
  const [systemInstanceInput, setSystemInstanceInput] = useState(filterSystemInstanceId);

  const [filteredRevenue, setFilteredRevenue] = useState(null);
  const [filteredLoading, setFilteredLoading] = useState(false);
  const [filteredError, setFilteredError] = useState(null);

  // Any active filter (user, system, or non-default range) triggers a custom fetch
  const isFiltered = filterUserId !== '' || filterSystemInstanceId !== '' || isNonDefaultRange;

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

  useEffect(() => {
    setSystemInstanceInput(filterSystemInstanceId);
  }, [filterSystemInstanceId]);

  // Keep local custom inputs in sync when URL changes externally
  useEffect(() => {
    setCustomFromInput(revenueFrom);
    setCustomToInput(revenueTo);
    if (revenueFrom && revenueTo) setShowCustomPicker(true);
  }, [revenueFrom, revenueTo]);

  const fetchFiltered = useCallback(async (userId, systemInstanceId, days, from, to) => {
    setFilteredLoading(true);
    setFilteredError(null);
    try {
      const params = {};
      if (userId) params.userId = userId;
      if (systemInstanceId) params.systemInstanceId = systemInstanceId;
      if (from && to) {
        params.from = from;
        params.to = to;
      } else {
        params.days = days;
      }
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
      fetchFiltered(
        filterUserId,
        filterSystemInstanceId,
        selectedDays,
        revenueFrom,
        revenueTo,
      );
    } else {
      setFilteredRevenue(null);
      setFilteredError(null);
    }
  }, [filterUserId, filterSystemInstanceId, selectedDays, revenueFrom, revenueTo, isFiltered, fetchFiltered]);

  function setFilterUser(userId) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (userId) next.set('revenueUserId', userId);
      else next.delete('revenueUserId');
      return next;
    }, { replace: true });
  }

  function applySystemInstance() {
    const val = systemInstanceInput.trim();
    if (val === '' || /^\d+$/.test(val)) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (val) next.set('revenueSystemId', val);
        else next.delete('revenueSystemId');
        return next;
      }, { replace: true });
    }
  }

  function filterBySystemInstance(id) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('revenueSystemId', String(id));
      return next;
    }, { replace: true });
  }

  function selectPreset(days) {
    setShowCustomPicker(false);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('revenueDays', String(days));
      next.delete('revenueFrom');
      next.delete('revenueTo');
      return next;
    }, { replace: true });
  }

  function applyCustomRange() {
    const from = customFromInput.trim();
    const to = customToInput.trim();
    if (!from || !to) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('revenueFrom', from);
      next.set('revenueTo', to);
      next.delete('revenueDays');
      return next;
    }, { replace: true });
  }

  function clearFilters() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('revenueUserId');
      next.delete('revenueSystemId');
      next.delete('revenueDays');
      next.delete('revenueFrom');
      next.delete('revenueTo');
      return next;
    }, { replace: true });
    setSystemInstanceInput('');
    setCustomFromInput('');
    setCustomToInput('');
    setShowCustomPicker(false);
    setFilteredRevenue(null);
    setFilteredError(null);
  }

  const selectedUser = users.find((u) => String(u.id) === String(filterUserId));

  // Build a human-readable range label for the chart title
  const rangeLabel = isCustomRange
    ? `${revenueFrom} – ${revenueTo}`
    : `${selectedDays}-Day`;

  // 4th stat tile adapts to the selected range
  const rangeStatLabel = isCustomRange
    ? 'In Range'
    : selectedDays === 30
      ? 'This Month'
      : `${selectedDays}d Total`;

  const rangeStatValue = isCustomRange || selectedDays !== 30
    ? usdFromCents(stats?.rangeCents)
    : usdFromCents(stats?.monthCents);

  const hasAnyFilter = isFiltered;

  return (
    <Card id="admin-revenue-panel" className="shadow-sm border-border/50 bg-card/50 backdrop-blur">
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
              onChange={(e) => setFilterUser(e.target.value)}
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

            {hasAnyFilter && (
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

        {(filterUserId || filterSystemInstanceId) && (
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
              <StatTile label={rangeStatLabel} value={rangeStatValue} loading={revenueLoading} />
              <StatTile label="All Time" value={usdFromCents(stats?.allTimeCents)} loading={revenueLoading} />
            </div>

            <div>
              {/* Range selector */}
              <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" /> {rangeLabel} Revenue Trend
                </p>
                <div className="flex items-center gap-1.5">
                  {PRESETS.map((p) => (
                    <button
                      key={p.days}
                      type="button"
                      onClick={() => selectPreset(p.days)}
                      className={`h-6 px-2 rounded text-xs font-mono transition-colors ${
                        !isCustomRange && selectedDays === p.days
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'text-muted-foreground hover:text-foreground border border-border/40 hover:border-border'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowCustomPicker((v) => !v)}
                    className={`h-6 px-2 rounded text-xs flex items-center gap-1 transition-colors ${
                      isCustomRange || showCustomPicker
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'text-muted-foreground hover:text-foreground border border-border/40 hover:border-border'
                    }`}
                  >
                    <Calendar className="w-3 h-3" /> Custom
                  </button>
                </div>
              </div>

              {/* Custom date inputs */}
              {showCustomPicker && (
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <Input
                    type="date"
                    className="h-7 w-36 text-xs"
                    value={customFromInput}
                    max={customToInput || undefined}
                    onChange={(e) => setCustomFromInput(e.target.value)}
                  />
                  <span className="text-xs text-muted-foreground">to</span>
                  <Input
                    type="date"
                    className="h-7 w-36 text-xs"
                    value={customToInput}
                    min={customFromInput || undefined}
                    onChange={(e) => setCustomToInput(e.target.value)}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-3 text-xs"
                    onClick={applyCustomRange}
                    disabled={!customFromInput || !customToInput}
                  >
                    Apply
                  </Button>
                </div>
              )}

              <RevenueTrendChart data={dailyRevenue} loading={revenueLoading} rangeLabel={rangeLabel} />
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
                  <p className="text-sm text-muted-foreground italic">No blueprint revenue in this period.</p>
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
                  <p className="text-sm text-muted-foreground italic">No revenue events in this period.</p>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1 ash-scroll">
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
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {e.userEmail && (
                              <span className="text-xs text-sky-400/80 font-mono truncate max-w-[140px]" title={e.userEmail}>
                                {e.userEmail}
                              </span>
                            )}
                            {e.systemInstanceName && (
                              <>
                                <span className="text-xs text-muted-foreground/50">·</span>
                                <button
                                  type="button"
                                  onClick={() => filterBySystemInstance(e.systemInstanceId)}
                                  className="text-xs text-emerald-500/80 hover:text-emerald-400 underline-offset-2 hover:underline transition-colors truncate max-w-[120px]"
                                  title={`${e.systemInstanceName} — filter to this system`}
                                >
                                  {e.systemInstanceName}
                                </button>
                              </>
                            )}
                            <span className="text-xs text-muted-foreground/50">·</span>
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
