import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, CheckCircle2, XCircle } from 'lucide-react';
import { useAdminData } from '@/contexts/AdminDataContext.jsx';
import { compact, num } from '@/lib/adminFormat.js';

const AdminAIUsageAnalyticsCard = () => {
  const { analytics, loading, error } = useAdminData();
  const ai = analytics?.ai;
  const models = analytics?.models ?? [];

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <BarChart3 className="w-4 h-4" /> AI Usage — Per-Model Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-destructive">Unable to load AI usage</p>
        ) : loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-6 mb-4 text-sm">
              <div>
                <span className="text-2xl font-bold font-mono">{num(ai?.totalRequests)}</span>
                <span className="text-muted-foreground ml-1">total calls</span>
              </div>
              <div>
                <span className="text-2xl font-bold font-mono">{compact(ai?.totalTokens)}</span>
                <span className="text-muted-foreground ml-1">tokens</span>
              </div>
              <div>
                <span className="text-2xl font-bold font-mono text-emerald-500">{num(ai?.successfulRequests)}</span>
                <span className="text-muted-foreground ml-1">success</span>
              </div>
              <div>
                <span className="text-2xl font-bold font-mono text-destructive">{num(ai?.failedRequests)}</span>
                <span className="text-muted-foreground ml-1">failed</span>
              </div>
            </div>

            {models.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No model usage recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-muted-foreground text-xs uppercase tracking-wider">
                      <th className="text-left py-2 pr-4 font-medium">Model</th>
                      <th className="text-right py-2 px-2 font-medium">Calls</th>
                      <th className="text-right py-2 px-2 font-medium">Success</th>
                      <th className="text-right py-2 px-2 font-medium">Failed</th>
                      <th className="text-right py-2 px-2 font-medium">Tokens</th>
                      <th className="text-right py-2 pl-2 font-medium">Credits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {models.map((m) => {
                      const successRate = m.requests > 0
                        ? Math.round((m.successCount / m.requests) * 100)
                        : 0;
                      return (
                        <tr key={m.model} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                          <td className="py-2 pr-4 font-mono text-xs text-foreground max-w-[180px] truncate" title={m.model}>
                            {m.model}
                          </td>
                          <td className="text-right py-2 px-2 tabular-nums">{num(m.requests)}</td>
                          <td className="text-right py-2 px-2 tabular-nums">
                            <span className="inline-flex items-center gap-1 text-emerald-500">
                              <CheckCircle2 className="w-3 h-3" />{num(m.successCount)}
                            </span>
                          </td>
                          <td className="text-right py-2 px-2 tabular-nums">
                            <span className={`inline-flex items-center gap-1 ${m.failureCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                              <XCircle className="w-3 h-3" />{num(m.failureCount)}
                            </span>
                          </td>
                          <td className="text-right py-2 px-2 tabular-nums text-muted-foreground">
                            {compact(m.tokens)}
                          </td>
                          <td className="text-right py-2 pl-2 tabular-nums font-medium">
                            {num(m.creditsConsumed)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-muted-foreground border-t border-border/30 pt-3">
                  <div>
                    <span className="block text-foreground font-medium">{compact(ai?.totalPromptTokens)}</span>
                    Prompt tokens
                  </div>
                  <div>
                    <span className="block text-foreground font-medium">{compact(ai?.totalCompletionTokens)}</span>
                    Completion tokens
                  </div>
                  <div>
                    <span className="block text-foreground font-medium">{num(ai?.requestsLast24h)}</span>
                    Calls last 24 h
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminAIUsageAnalyticsCard;
