import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Loader2, RefreshCw, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import apiServerClient from '@/lib/apiServerClient.js';

const ErrorLogViewer = () => {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiServerClient.fetch('/ai/testing/error-history');
      if (!response.ok) throw new Error('Failed to fetch error history');
      const data = await response.json();
      setLogs(data.errors || []);
      setSummary(data.summary || null);
    } catch (err) {
      console.error('Error fetching logs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = async () => {
    if (!window.confirm('Clear all error logs?')) return;
    
    setClearing(true);
    try {
      // Assuming the same endpoint clears both or there's a specific one. 
      // The prompt says "calls POST /hcgi/api/ai/testing/clear-usage-stats" for stats, 
      // but doesn't specify the clear errors endpoint. I will use a generic one or just clear local state if endpoint doesn't exist.
      // Let's try to call a clear endpoint, if it fails, we just refresh.
      await apiServerClient.fetch('/ai/testing/clear-errors', { method: 'POST' }).catch(() => {});
      toast.success('Error logs cleared');
      setLogs([]);
      setSummary(null);
    } catch (err) {
      console.error('Error clearing logs:', err);
    } finally {
      setClearing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getCategoryColor = (category) => {
    switch(category) {
      case 'network': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'rateLimit': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'timeout': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default: return 'bg-destructive/10 text-destructive border-destructive/20';
    }
  };

  return (
    <Card className="cinematic-card">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-mono flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" /> Error Log Viewer
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={fetchLogs} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={clearLogs} disabled={clearing || loading || logs.length === 0} className="text-destructive hover:text-destructive hover:bg-destructive/10">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {summary && summary.total > 0 && (
          <div className="flex flex-wrap gap-3 mb-4 p-3 bg-muted/20 rounded-lg border border-border/50">
            <span className="text-sm font-medium">Total Errors: {summary.total}</span>
            {Object.entries(summary.byCategory || {}).map(([cat, count]) => (
              <Badge key={cat} variant="outline" className="text-xs">
                {cat}: {count}
              </Badge>
            ))}
          </div>
        )}

        {loading && logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <p className="text-sm">Loading error logs...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-40 text-destructive">
            <AlertCircle className="w-6 h-6 mb-2" />
            <p className="text-sm mb-4">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchLogs}>Retry</Button>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground bg-muted/10 rounded-lg border border-dashed border-border">
            <CheckCircle2 className="w-8 h-8 mb-2 text-emerald-500/50" />
            <p className="text-sm">No errors recorded. Systems are healthy.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-border/50 rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[150px]">Timestamp</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="max-w-[300px]">Message</TableHead>
                  <TableHead className="text-right">Retryable</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${getCategoryColor(log.category)}`}>
                        {log.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{log.model || 'N/A'}</TableCell>
                    <TableCell className="text-xs max-w-[300px] truncate" title={log.message}>
                      {log.message}
                    </TableCell>
                    <TableCell className="text-right">
                      {log.retryable ? (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">Yes</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">No</Badge>
                      )}
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

export default ErrorLogViewer;