import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, DollarSign, Activity } from 'lucide-react';
import { useAdminData } from '@/contexts/AdminDataContext.jsx';
import { usdFromCents, num, relativeTime } from '@/lib/adminFormat.js';

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

const AdminRevenueActivityPanel = () => {
  const { revenue, revenueLoading, revenueError } = useAdminData();

  const stats = revenue?.stats;
  const byBlueprint = revenue?.byBlueprint ?? [];
  const recentEvents = revenue?.recentEvents ?? [];

  return (
    <Card className="shadow-sm border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3 border-b border-border/30">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-500" /> Revenue Activity
        </CardTitle>
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
