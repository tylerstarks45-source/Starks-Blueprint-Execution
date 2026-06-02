import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings2, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { useAdminData } from '@/contexts/AdminDataContext.jsx';

const statusIcon = (status) => {
  if (status === 'healthy') return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
  if (status === 'degraded') return <AlertCircle className="w-4 h-4 text-amber-500" />;
  return <XCircle className="w-4 h-4 text-destructive" />;
};

const AdminSystemDiagnosticsPanel = () => {
  const { health, healthLoading, healthError } = useAdminData();
  const services = health?.services ?? [];

  return (
    <Card className="h-full shadow-sm border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Settings2 className="w-4 h-4" /> Component Diagnostics
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {healthError ? (
          <p className="text-sm text-destructive">Unable to load diagnostics</p>
        ) : healthLoading && !health ? (
          <div className="space-y-3"><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-full" /></div>
        ) : (
          <div className="space-y-3">
            {services.map((s) => (
              <div key={s.name} className="flex items-center justify-between">
                <span className="text-sm">
                  {s.name}
                  {s.latencyMs != null && <span className="text-xs text-muted-foreground font-mono ml-2">{s.latencyMs}ms</span>}
                </span>
                {statusIcon(s.status)}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminSystemDiagnosticsPanel;
