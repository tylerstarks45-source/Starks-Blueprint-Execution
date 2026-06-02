import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { useAdminData } from '@/contexts/AdminDataContext.jsx';
import { num } from '@/lib/adminFormat.js';

const AdminSystemHealthOverviewCard = () => {
  const { analytics, loading, error } = useAdminData();
  const failed = analytics?.ai?.failedRequests ?? 0;

  return (
    <Card className="h-full shadow-sm border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" /> System Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2 flex flex-col justify-center items-center h-24">
        {error ? (
          <p className="text-sm text-destructive">Unable to load alerts</p>
        ) : loading ? (
          <Skeleton className="h-6 w-32" />
        ) : failed > 0 ? (
          <div className="text-center">
            <p className="text-2xl font-bold font-mono text-amber-500">{num(failed)}</p>
            <p className="text-xs text-muted-foreground mt-1">Failed AI requests (all-time)</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
            <p className="text-sm text-muted-foreground italic">No active alerts.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminSystemHealthOverviewCard;
