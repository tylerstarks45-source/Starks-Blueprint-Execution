import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ServerCrash } from 'lucide-react';
import { useAdminData } from '@/contexts/AdminDataContext.jsx';
import { formatUptime } from '@/lib/adminFormat.js';

const AdminAIInfrastructureMonitoringCard = () => {
  const { health, healthLoading, healthError } = useAdminData();
  const rt = health?.runtime;
  const memGb = rt ? (rt.memoryUsedMb / 1024).toFixed(1) : null;

  return (
    <Card className="h-full shadow-sm border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <ServerCrash className="w-4 h-4" /> Infra Capacity
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2 flex flex-col justify-center">
        {healthError ? (
          <p className="text-sm text-destructive">Unable to load infra</p>
        ) : healthLoading && !health ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <>
            <div className="text-center p-4 bg-muted/10 rounded-xl border border-border/40">
              <p className="text-3xl font-bold font-mono tracking-tighter">{(rt?.cpuLoad ?? 0).toFixed(2)}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">CPU Load Avg (1m)</p>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="text-center p-2 bg-muted/5 rounded-lg border border-border/20">
                <p className="text-sm font-mono font-bold">{memGb}GB</p>
                <p className="text-[10px] text-muted-foreground uppercase">Memory (RSS)</p>
              </div>
              <div className="text-center p-2 bg-muted/5 rounded-lg border border-border/20">
                <p className="text-sm font-mono font-bold">{formatUptime(rt?.uptimeSeconds)}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Uptime</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminAIInfrastructureMonitoringCard;
