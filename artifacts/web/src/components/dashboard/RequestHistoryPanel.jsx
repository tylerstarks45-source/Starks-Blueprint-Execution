import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { History, Loader2, RefreshCw, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import apiServerClient from '@/lib/apiServerClient.js';

const RequestHistoryPanel = () => {
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiServerClient.fetch('/ai/testing/request-history');
      if (!response.ok) throw new Error('Failed to fetch request history');
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
    <Card className="cinematic-card">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-mono flex items-center gap-2">
            <History className="w-5 h-5 text-purple-400" /> Request History
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={fetchHistory} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {summary && (
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
            <div className="bg-muted/20 p-3 rounded-lg border border-border/50 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Requests</p>
              <p className="text-xl font-bold font-mono">{summary.totalRequests || 0}</p>
            </div>
            <div className="bg-muted/20 p-3 rounded-lg border border-border/50 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Avg Response Time</p>
              <p className="text-xl font-bold font-mono text-amber-400">{summary.avgResponseTimeMs || 0}ms</p>
            </div>
            <div className="bg-muted/20 p-3 rounded-lg border border-border/50 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Avg Tokens</p>
              <p className="text-xl font-bold font-mono text-primary">{summary.avgTokens || 0}</p>
            </div>
          </div>
        )}

        {loading && history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <p className="text-sm">Loading request history...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-40 text-destructive">
            <AlertCircle className="w-6 h-6 mb-2" />
            <p className="text-sm mb-4">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchHistory}>Retry</Button>
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground bg-muted/10 rounded-lg border border-dashed border-border">
            <History className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-sm">No recent requests found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-border/50 rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[150px]">Timestamp</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Latency</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Finish Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((req, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(req.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {req.status === 'success' ? (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]"><CheckCircle2 className="w-3 h-3 mr-1" /> Success</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-mono">{req.model}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{req.responseTimeMs}ms</TableCell>
                    <TableCell className="text-xs text-right font-mono text-muted-foreground">{req.tokens || 0}</TableCell>
                    <TableCell className="text-xs text-right">
                      <Badge variant="secondary" className="text-[10px] bg-muted">{req.finishReason || 'unknown'}</Badge>
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

export default RequestHistoryPanel;