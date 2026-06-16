import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, Loader2, RefreshCw, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import apiServerClient from '@/lib/apiServerClient.js';

const AIComputeUsageCard = () => {
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
    if (!window.confirm('Are you sure you want to clear all compute usage statistics?')) return;
    
    setClearing(true);
    try {
      const response = await apiServerClient.fetch('/ai/testing/clear-usage-stats', {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to clear stats');
      toast.success('Compute usage statistics cleared');
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
    <Card className="bg-card/40 backdrop-blur-md border-border/50 shadow-lg transition-all duration-300 hover:shadow-xl hover:border-primary/20 h-full flex flex-col">
      <CardHeader className="pb-3 border-b border-border/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" /> AI Compute Usage
          </CardTitle>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={fetchStats} disabled={loading} className="hover:bg-muted/50 transition-colors">
              <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={clearStats} disabled={clearing || loading} className="text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-5 flex-grow flex flex-col">
        {loading && !stats ? (
          <div className="flex flex-col items-center justify-center flex-grow text-muted-foreground min-h-[200px]">
            <Loader2 className="w-6 h-6 animate-spin mb-3 text-primary/50" />
            <p className="text-sm font-medium">Loading compute metrics...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center flex-grow text-destructive min-h-[200px]">
            <AlertCircle className="w-6 h-6 mb-3 opacity-80" />
            <p className="text-sm mb-4 font-medium">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchStats} className="transition-all active:scale-95">Retry</Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/10 p-4 rounded-xl border border-border/30 shadow-sm">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">Total Operations</p>
                <p className="text-2xl font-bold font-mono text-foreground/90">{stats?.totalRequests || 0}</p>
              </div>
              <div className="bg-muted/10 p-4 rounded-xl border border-border/30 shadow-sm">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">Total Compute Units</p>
                <p className="text-2xl font-bold font-mono text-primary">{stats?.totalTokens?.toLocaleString() || 0}</p>
              </div>
              <div className="bg-muted/10 p-4 rounded-xl border border-border/30 shadow-sm">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">Avg Processing Time</p>
                <p className="text-2xl font-bold font-mono text-amber-400">{stats?.averageResponseTimeMs || 0}ms</p>
              </div>
              <div className="bg-muted/10 p-4 rounded-xl border border-border/30 shadow-sm">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">System Errors</p>
                <p className="text-2xl font-bold font-mono text-destructive/90">{stats?.totalErrors || 0}</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-foreground tracking-tight mb-3">Network Breakdown</h4>
              {stats?.modelBreakdown && stats.modelBreakdown.length > 0 ? (
                <div className="overflow-auto max-h-[160px] border border-border/30 rounded-lg ash-scroll">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-border/20">
                        <TableHead className="text-xs font-medium text-muted-foreground">Model</TableHead>
                        <TableHead className="text-xs font-medium text-muted-foreground text-right">Ops</TableHead>
                        <TableHead className="text-xs font-medium text-muted-foreground text-right">Compute</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.modelBreakdown.map((m, idx) => (
                        <TableRow key={idx} className="border-border/10 hover:bg-muted/20 transition-colors">
                          <TableCell className="text-xs font-medium text-foreground/80">{m.model}</TableCell>
                          <TableCell className="text-xs text-right text-muted-foreground">{m.requests}</TableCell>
                          <TableCell className="text-xs text-right font-mono text-muted-foreground/80">{m.tokens?.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic bg-muted/10 p-4 rounded-lg border border-border/20 text-center">No compute usage data available yet.</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIComputeUsageCard;