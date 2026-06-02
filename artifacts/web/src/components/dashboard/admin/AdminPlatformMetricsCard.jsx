import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Server, DollarSign, Activity } from 'lucide-react';
import { useAdminData } from '@/contexts/AdminDataContext.jsx';
import { num, usdFromCents } from '@/lib/adminFormat.js';

const AdminPlatformMetricsCard = () => {
  const { analytics, loading, error, health } = useAdminData();
  const p = analytics?.platform;

  let healthValue = '—';
  if (health?.services?.length) {
    const healthy = health.services.filter((s) => s.status === 'healthy').length;
    healthValue = healthy === health.services.length ? '100%' : `${healthy}/${health.services.length}`;
  }

  const metrics = [
    { label: 'Total Users', value: p ? num(p.totalUsers) : '—', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Active Systems', value: p ? num(p.activeSystemInstances) : '—', icon: Server, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'MRR', value: p ? usdFromCents(p.mrrCents) : '—', icon: DollarSign, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Platform Health', value: healthValue, icon: Activity, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  ];

  return (
    <Card className="shadow-sm border-border/50 bg-card/50 backdrop-blur">
      <CardContent className="p-6">
        {error ? (
          <p className="text-sm text-destructive">Unable to load platform metrics: {error}</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {metrics.map((m, i) => (
              <div key={i} className="flex flex-col gap-3">
                <div className={`w-10 h-10 rounded-xl ${m.bg} flex items-center justify-center shrink-0`}>
                  <m.icon className={`w-5 h-5 ${m.color}`} />
                </div>
                <div>
                  {loading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <p className="text-2xl font-bold font-mono tracking-tight text-foreground">{m.value}</p>
                  )}
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">{m.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminPlatformMetricsCard;
