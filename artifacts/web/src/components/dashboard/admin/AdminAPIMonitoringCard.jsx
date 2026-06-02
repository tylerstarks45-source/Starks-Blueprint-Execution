import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Webhook } from 'lucide-react';
import { useAdminData } from '@/contexts/AdminDataContext.jsx';

const badgeFor = (status) => {
  if (status === 'healthy') return 'bg-emerald-500/10 text-emerald-500';
  if (status === 'degraded') return 'bg-amber-500/10 text-amber-500';
  return 'bg-destructive/10 text-destructive';
};

const AdminAPIMonitoringCard = () => {
  const { health, healthLoading, healthError } = useAdminData();
  const services = health?.services ?? [];

  return (
    <Card className="h-full shadow-sm border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Webhook className="w-4 h-4" /> Service Status
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {healthError ? (
          <p className="text-sm text-destructive">Unable to load services</p>
        ) : healthLoading && !health ? (
          <div className="space-y-3"><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-full" /></div>
        ) : (
          <div className="space-y-3">
            {services.map((s) => (
              <div key={s.name} className="flex justify-between items-center">
                <span className="text-sm font-medium">{s.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded font-medium capitalize ${badgeFor(s.status)}`}>{s.status}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminAPIMonitoringCard;
