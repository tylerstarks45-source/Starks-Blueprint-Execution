import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Box, ArrowUpRight } from 'lucide-react';
import { useAdminData } from '@/contexts/AdminDataContext.jsx';
import { num } from '@/lib/adminFormat.js';

const AdminBlueprintDeploymentMonitoringCard = () => {
  const { analytics, loading, error } = useAdminData();
  const p = analytics?.platform;
  const active = p?.activeSystemInstances ?? 0;
  const total = p?.totalSystemInstances ?? 0;
  const pctActive = total > 0 ? Math.round((active / total) * 100) : 0;

  return (
    <Card className="h-full shadow-sm border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Box className="w-4 h-4" /> Deployments
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2 flex flex-col justify-center">
        {error ? (
          <p className="text-sm text-destructive">Unable to load deployments</p>
        ) : loading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <span className="text-3xl font-bold font-mono">{num(active)}</span>
              <span className="text-xs font-medium text-emerald-500 flex items-center bg-emerald-500/10 px-2 py-1 rounded-md">
                <ArrowUpRight className="w-3 h-3 mr-1" /> Active
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">{num(active)} of {num(total)} system instances are currently active.</p>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${pctActive}%` }}></div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminBlueprintDeploymentMonitoringCard;
