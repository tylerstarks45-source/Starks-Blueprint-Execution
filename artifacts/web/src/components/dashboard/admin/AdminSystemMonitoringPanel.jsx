import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Server, Activity, CheckCircle2, XCircle, PauseCircle, Wrench, BarChart3 } from 'lucide-react';
import { useAdminData } from '@/contexts/AdminDataContext.jsx';

const num = (n) => (n ?? 0).toLocaleString();
const usd = (cents) => `$${((cents ?? 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const StatCard = ({ icon: Icon, label, value, color = 'text-muted-foreground', loading }) => (
  <Card className="border-border/50">
    <CardContent className="pt-5 pb-4">
      {loading ? (
        <div className="space-y-2"><Skeleton className="h-6 w-20" /><Skeleton className="h-4 w-28" /></div>
      ) : (
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-lg bg-current/10 flex items-center justify-center shrink-0 ${color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        </div>
      )}
    </CardContent>
  </Card>
);

const AdminSystemMonitoringPanel = () => {
  const { analytics, loading, revenue, revenueLoading } = useAdminData();

  const platform = analytics?.platform ?? {};

  const totalSystems   = platform.totalSystemInstances ?? 0;
  const activeSystems  = platform.activeSystemInstances ?? 0;
  const buildingSystems = platform.buildingSystemInstances ?? 0;
  const otherSystems   = Math.max(0, totalSystems - activeSystems - buildingSystems);

  // Revenue by blueprint — use the existing byBlueprint array from the revenue endpoint
  const byBlueprint = revenue?.byBlueprint ?? [];

  // Subscription distribution for system context
  const subscriptions = analytics?.subscriptions ?? [];
  const tierOrder = ['empire', 'operator', 'starter', 'builder', 'free', 'none'];
  const sortedTiers = [...subscriptions].sort((a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier));

  const TIER_COLORS = {
    empire: 'text-amber-400',
    operator: 'text-violet-400',
    starter: 'text-blue-400',
    builder: 'text-blue-300',
    none: 'text-muted-foreground',
  };
  const TIER_LABELS = { empire: 'Empire', operator: 'Operator', starter: 'Starter', builder: 'Starter (legacy)', none: 'No Tier' };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold font-mono flex items-center gap-2">
          <Server className="w-5 h-5 text-primary" /> System Monitoring
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">Platform-wide system status and performance</p>
      </div>

      {/* System count KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Server}       label="Total Systems Built"  value={num(totalSystems)}    color="text-primary"    loading={loading} />
        <StatCard icon={CheckCircle2} label="Active Systems"        value={num(activeSystems)}   color="text-emerald-400" loading={loading} />
        <StatCard icon={Wrench}       label="Building / In Progress" value={num(buildingSystems)} color="text-amber-400"  loading={loading} />
        <StatCard icon={Activity}     label="Idle / Paused"         value={num(otherSystems)}    color="text-muted-foreground" loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by blueprint */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Revenue by Blueprint
            </CardTitle>
          </CardHeader>
          <CardContent>
            {revenueLoading ? (
              <div className="space-y-2"><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-3/4" /></div>
            ) : byBlueprint.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No revenue events recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {byBlueprint.map((bp) => {
                  const maxCents = byBlueprint[0]?.totalCents ?? 1;
                  const pct = Math.round(((bp.totalCents ?? 0) / maxCents) * 100);
                  return (
                    <div key={bp.blueprintId ?? bp.blueprintName}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium truncate max-w-[180px]" title={bp.blueprintName}>
                          {bp.blueprintName || `Blueprint #${bp.blueprintId}`}
                        </span>
                        <span className="text-emerald-400 font-mono font-bold shrink-0 ml-2">{usd(bp.totalCents)}</span>
                      </div>
                      <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{num(bp.eventCount)} revenue event{bp.eventCount !== 1 ? 's' : ''}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active subscribers by tier (system context) */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Activity className="w-4 h-4" /> Subscribers by Tier
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3"><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-full" /></div>
            ) : sortedTiers.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No active subscriptions.</p>
            ) : (
              <div className="space-y-4">
                {sortedTiers.map((s) => {
                  const limits = { empire: 'Unlimited systems', operator: '15 systems', starter: '3 systems', builder: '3 systems' };
                  const colorClass = TIER_COLORS[s.tier] ?? 'text-muted-foreground';
                  return (
                    <div key={s.tier} className="flex items-center justify-between border-b border-border/30 pb-3">
                      <div>
                        <span className={`text-sm font-semibold ${colorClass}`}>{TIER_LABELS[s.tier] ?? s.tier}</span>
                        <div className="text-xs text-muted-foreground">{limits[s.tier] ?? ''}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold">{num(s.count)}</div>
                        <div className="text-xs text-muted-foreground">subscribers</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Platform aggregate stats */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Platform Stats</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <div className="text-2xl font-bold font-mono text-primary">{num(platform.totalUsers)}</div>
                <div className="text-xs text-muted-foreground">registered users</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono text-emerald-400">{num(platform.activeMembers)}</div>
                <div className="text-xs text-muted-foreground">active members</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono text-blue-400">{num(platform.newUsersThisWeek)}</div>
                <div className="text-xs text-muted-foreground">new this week</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono text-violet-400">{num(platform.totalAffiliateClicks)}</div>
                <div className="text-xs text-muted-foreground">affiliate clicks</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSystemMonitoringPanel;
