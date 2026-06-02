import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3 } from 'lucide-react';
import { useAdminData } from '@/contexts/AdminDataContext.jsx';
import { compact } from '@/lib/adminFormat.js';

const BAR_COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500'];

const AdminAIUsageAnalyticsCard = () => {
  const { analytics, loading, error } = useAdminData();
  const ai = analytics?.ai;
  const models = analytics?.models ?? [];
  const totalTokens = models.reduce((sum, m) => sum + (m.tokens || 0), 0);
  const top = models.slice(0, 4);

  return (
    <Card className="h-full shadow-sm border-border/50 flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <BarChart3 className="w-4 h-4" /> AI Usage Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center">
        {error ? (
          <p className="text-sm text-destructive">Unable to load AI usage</p>
        ) : loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : (
          <>
            <div className="flex items-end gap-2 mb-6">
              <span className="text-4xl font-bold font-mono">{compact(ai?.tokensLastHour)}</span>
              <span className="text-sm text-muted-foreground mb-1">tokens / hr</span>
            </div>
            {top.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No model usage recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {top.map((m, i) => {
                  const share = totalTokens > 0 ? Math.round((m.tokens / totalTokens) * 100) : 0;
                  return (
                    <div key={m.model} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-foreground truncate pr-2">{m.model}</span>
                        <span className="text-muted-foreground shrink-0">{share}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div className={`h-full ${BAR_COLORS[i % BAR_COLORS.length]}`} style={{ width: `${share}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminAIUsageAnalyticsCard;
