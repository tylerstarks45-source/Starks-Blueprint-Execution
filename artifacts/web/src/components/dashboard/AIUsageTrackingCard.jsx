import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, Loader2, RefreshCw, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import apiServerClient from '@/lib/apiServerClient.js';

const AIUsageTrackingCard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiServerClient.fetch('/ai/openrouter/usage');
      if (!response.ok) throw new Error('Failed to fetch usage stats');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const clearStats = async () => {
    if (!window.confirm('Are you sure you want to clear all usage statistics?')) return;
    
    setClearing(true);
    try {
      const response = await apiServerClient.fetch('/ai/testing/clear-usage-stats', {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to clear stats');
      toast.success('Usage statistics cleared');
      fetchStats();
    } catch (err) {
      console.error('Error clearing stats:', err);
      toast.error(err.message || 'Failed to clear stats');
    } finally {
      setClearing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <Card className="cinematic-card h-full flex flex-col">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-mono flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" /> AI Usage Metrics
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={fetchStats} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={clearStats} disabled={clearing || loading} className="text-destructive hover:text-destructive hover:bg-destructive/10">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 flex-grow flex flex-col">
        {loading && !stats ? (
          <div className="flex flex-col items-center justify-center flex-grow text-muted-foreground min-h-[200px]">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <p className="text-sm">Loading metrics...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center flex-grow text-destructive min-h-[200px]">
            <AlertCircle className="w-6 h-6 mb-2" />
            <p className="text-sm mb-4">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchStats}>Retry</Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Requests</p>
                <p className="text-2xl font-bold font-mono">{stats?.totalRequests || 0}</p>
              </div>
              <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Tokens</p>
                <p className="text-2xl font-bold font-mono text-primary">{stats?.totalTokens?.toLocaleString() || 0}</p>
              </div>
              <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Avg Latency</p>
                <p className="text-2xl font-bold font-mono text-amber-400">{stats?.averageResponseTimeMs || 0}ms</p>
              </div>
              <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Errors</p>
                <p className="text-2xl font-bold font-mono text-destructive">{stats?.totalErrors || 0}</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-foreground mb-3">Model Breakdown</h4>
              {stats?.modelBreakdown && stats.modelBreakdown.length > 0 ? (
                <div className="overflow-auto max-h-[150px] border border-border/50 rounded-lg ash-scroll">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs">Model</TableHead>
                        <TableHead className="text-xs text-right">Reqs</TableHead>
                        <TableHead className="text-xs text-right">Tokens</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.modelBreakdown.map((m, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-xs font-medium">{m.model}</TableCell>
                          <TableCell className="text-xs text-right">{m.requests}</TableCell>
                          <TableCell className="text-xs text-right font-mono text-muted-foreground">{m.tokens?.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No model usage data available yet.</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIUsageTrackingCard;