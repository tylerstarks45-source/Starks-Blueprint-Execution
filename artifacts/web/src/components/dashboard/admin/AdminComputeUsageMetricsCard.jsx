import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Zap } from 'lucide-react';
import { useAdminData } from '@/contexts/AdminDataContext.jsx';
import { usd } from '@/lib/adminFormat.js';

const AdminComputeUsageMetricsCard = () => {
  const { analytics, loading, error } = useAdminData();
  const total = analytics?.ai?.totalCostUsd ?? 0;
  const models = analytics?.models ?? [];

  // Aggregate provider spend from per-model cost (model id is "provider/model").
  const byProvider = {};
  models.forEach((m) => {
    const provider = (m.model || 'unknown').split('/')[0];
    byProvider[provider] = (byProvider[provider] || 0) + (m.costUsd || 0);
  });
  const providers = Object.entries(byProvider)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <Card className="h-full shadow-sm border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Zap className="w-4 h-4" /> Compute Spend
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {error ? (
          <p className="text-sm text-destructive">Unable to load compute spend</p>
        ) : loading ? (
          <div className="space-y-3"><Skeleton className="h-8 w-28 mx-auto" /><Skeleton className="h-4 w-full" /></div>
        ) : (
          <>
            <div className="text-center mb-4">
              <p className="text-3xl font-bold font-mono text-destructive">{usd(total)}</p>
              <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider font-semibold">Provider Cost (all-time)</p>
            </div>
            {providers.length === 0 ? (
              <p className="text-sm text-muted-foreground italic text-center">No provider spend recorded.</p>
            ) : (
              <div className="space-y-2">
                {providers.map(([provider, cost]) => (
                  <div key={provider} className="flex justify-between text-sm">
                    <span className="text-muted-foreground capitalize">{provider}</span>
                    <span className="font-mono font-medium">{usd(cost)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminComputeUsageMetricsCard;
