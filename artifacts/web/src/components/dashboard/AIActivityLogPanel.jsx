import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { History, Loader2, RefreshCw, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import apiServerClient from '@/lib/apiServerClient.js';
import AIModelBadge from '@/components/AIModelBadge.jsx';

const AIActivityLogPanel = () => {
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiServerClient.fetch('/ai/testing/request-history');
      if (!response.ok) throw new Error('Failed to fetch activity log');
      const data = await response.json();
      setHistory(data.requests || []);
      setSummary(data.summary || null);
    } catch (err) {
      console.error('Error fetching history:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <Card className="bg-card/40 backdrop-blur-md border-border/50 shadow-lg transition-all duration-300 hover:shadow-xl hover:border-primary/20">
      <CardHeader className="pb-3 border-b border-border/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-purple-400" /> AI Activity Log
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={fetchHistory} disabled={loading} className="hover:bg-muted/50 transition-colors">
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        {summary && (
          <div className="grid grid-cols-3 gap-2 sm:gap-5 mb-6">
            <div className="bg-muted/10 p-4 rounded-xl border border-border/30 shadow-sm text-center">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">Total Operations</p>
              <p className="text-2xl font-bold font-mono text-foreground/90">{summary.totalRequests || 0}</p>
            </div>
            <div className="bg-muted/10 p-4 rounded-xl border border-border/30 shadow-sm text-center">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">Avg Processing Time</p>
              <p className="text-2xl font-bold font-mono text-amber-400">{summary.avgResponseTimeMs || 0}ms</p>
            </div>
            <div className="bg-muted/10 p-4 rounded-xl border border-border/30 shadow-sm text-center">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">Avg Compute Units</p>
              <p className="text-2xl font-bold font-mono text-primary">{summary.avgTokens || 0}</p>
            </div>
          </div>
        )}

        {loading && history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mb-3 text-primary/50" />
            <p className="text-sm font-medium">Loading AI activity log...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-48 text-destructive">
            <AlertCircle className="w-6 h-6 mb-3 opacity-80" />
            <p className="text-sm mb-4 font-medium">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchHistory} className="transition-all active:scale-95">Retry</Button>
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground bg-muted/5 rounded-xl border border-dashed border-border/40">
            <History className="w-8 h-8 mb-3 opacity-20" />
            <p className="text-sm font-medium">No recent AI operations found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-border/30 rounded-xl shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/20 bg-muted/5">
                  <TableHead className="w-[160px] text-xs font-medium text-muted-foreground uppercase tracking-wider">Timestamp</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Model</TableHead>
                  <TableHead className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Latency</TableHead>
                  <TableHead className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Compute</TableHead>
                  <TableHead className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Finish Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((req, idx) => (
                  <TableRow key={idx} className="border-border/10 hover:bg-muted/20 transition-colors">
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-mono">
                      {new Date(req.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {req.status === 'success' ? (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] font-medium"><CheckCircle2 className="w-3 h-3 mr-1" /> Success</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] font-medium"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>
                      )}
                    </TableCell>
                    <TableCell><AIModelBadge model={req.model} /></TableCell>
                    <TableCell className="text-xs text-right font-mono text-muted-foreground">{req.responseTimeMs}ms</TableCell>
                    <TableCell className="text-xs text-right font-mono text-muted-foreground">{req.tokens || 0}</TableCell>
                    <TableCell className="text-xs text-right">
                      <Badge variant="secondary" className="text-[10px] bg-background/50 font-medium text-muted-foreground border-border/30">{req.finishReason || 'unknown'}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIActivityLogPanel;