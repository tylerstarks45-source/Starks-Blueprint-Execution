import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { HeartPulse } from 'lucide-react';
import { useAdminData } from '@/contexts/AdminDataContext.jsx';
import { formatUptime } from '@/lib/adminFormat.js';

const AdminPlatformHealthCard = () => {
  const { health, healthLoading, healthError } = useAdminData();
  const services = health?.services ?? [];
  const healthy = services.filter((s) => s.status === 'healthy').length;
  const allOk = services.length > 0 && healthy === services.length;

  const tone = allOk
    ? 'bg-emerald-500/5 border-emerald-500/20'
    : 'bg-amber-500/5 border-amber-500/20';
  const titleTone = allOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400';

  return (
    <Card className={`h-full shadow-sm border-border/50 ${tone}`}>
      <CardHeader className="pb-2">
        <CardTitle className={`text-sm font-medium uppercase tracking-wider ${titleTone} flex items-center gap-2`}>
          <HeartPulse className="w-4 h-4" /> Global Status
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {healthError ? (
          <p className="text-sm text-destructive">Unable to load status</p>
        ) : healthLoading && !health ? (
          <div className="space-y-2"><Skeleton className="h-6 w-40" /><Skeleton className="h-4 w-28" /></div>
        ) : (
          <>
            <p className={`text-lg font-semibold mb-1 ${allOk ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
              {allOk ? 'All Systems Operational' : `${healthy} of ${services.length} Operational`}
            </p>
            <p className={`text-xs ${allOk ? 'text-emerald-600/80 dark:text-emerald-400/80' : 'text-amber-600/80 dark:text-amber-400/80'}`}>
              Uptime: {formatUptime(health?.runtime?.uptimeSeconds)}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminPlatformHealthCard;
