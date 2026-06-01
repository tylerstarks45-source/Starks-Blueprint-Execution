import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Loader2, RefreshCw, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import apiServerClient from '@/lib/apiServerClient.js';

const SystemDiagnosticsPanel = () => {
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
      if (!response.ok) throw new Error('Failed to fetch diagnostic history');
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
    if (!window.confirm('Clear all diagnostic logs?')) return;
    
    setClearing(true);
    try {
      await apiServerClient.fetch('/ai/testing/clear-errors', { method: 'POST' }).catch(() => {});
      toast.success('Diagnostic logs cleared');
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
    <Card className="bg-card/40 backdrop-blur-md border-border/50 shadow-lg transition-all duration-300 hover:shadow-xl hover:border-primary/20">
      <CardHeader className="pb-3 border-b border-border/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive/80" /> System Diagnostics
          </CardTitle>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={fetchLogs} disabled={loading} className="hover:bg-muted/50 transition-colors">
              <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={clearLogs} disabled={clearing || loading || logs.length === 0} className="text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        {summary && summary.total > 0 && (
          <div className="flex flex-wrap gap-3 mb-5 p-4 bg-muted/10 rounded-xl border border-border/30 shadow-sm">
            <span className="text-sm font-semibold text-foreground/90">Total Diagnostics: {summary.total}</span>
            <div className="w-px h-5 bg-border/50 mx-1 hidden sm:block"></div>
            {Object.entries(summary.byCategory || {}).map(([cat, count]) => (
              <Badge key={cat} variant="outline" className="text-xs font-medium bg-background/50">
                {cat}: {count}
              </Badge>
            ))}
          </div>
        )}

        {loading && logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mb-3 text-primary/50" />
            <p className="text-sm font-medium">Loading diagnostic logs...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-48 text-destructive">
            <AlertCircle className="w-6 h-6 mb-3 opacity-80" />
            <p className="text-sm mb-4 font-medium">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchLogs} className="transition-all active:scale-95">Retry</Button>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground bg-muted/5 rounded-xl border border-dashed border-border/40">
            <CheckCircle2 className="w-8 h-8 mb-3 text-emerald-500/40" />
            <p className="text-sm font-medium">No diagnostic events recorded. Systems are healthy.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-border/30 rounded-xl shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/20 bg-muted/5">
                  <TableHead className="w-[160px] text-xs font-medium text-muted-foreground uppercase tracking-wider">Timestamp</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Diagnostic Category</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Model</TableHead>
                  <TableHead className="max-w-[300px] text-xs font-medium text-muted-foreground uppercase tracking-wider">Diagnostic Message</TableHead>
                  <TableHead className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Retryable</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log, idx) => (
                  <TableRow key={idx} className="border-border/10 hover:bg-muted/20 transition-colors">
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-mono">
                      {new Date(log.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] font-medium ${getCategoryColor(log.category)}`}>
                        {log.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-foreground/80">{log.model || 'N/A'}</TableCell>
                    <TableCell className="text-xs max-w-[300px] truncate text-foreground/80" title={log.message}>
                      {log.message}
                    </TableCell>
                    <TableCell className="text-right">
                      {log.retryable ? (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] font-medium">Yes</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted/50 text-muted-foreground text-[10px] font-medium border-border/30">No</Badge>
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

export default SystemDiagnosticsPanel;