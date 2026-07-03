import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import adminApi from '@/lib/adminApi.js';

const AdminEmailHealthCard = () => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const checkStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(await adminApi.getEmailStatus());
    } catch (e) {
      setError(e.message || 'Status check failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const sendTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await adminApi.testEmailDelivery();
      setTestResult(r);
    } catch (e) {
      setTestResult({ ok: false, error: e.message || 'Test failed' });
    } finally {
      setTesting(false);
    }
  };

  const configured = result?.configured;
  const domainVerified = result?.domainVerified;
  const ok = configured && domainVerified;
  const partial = configured && !domainVerified;

  const statusColor = loading && !result
    ? 'bg-muted/10 border-border/20'
    : ok
      ? 'bg-emerald-500/5 border-emerald-500/10'
      : partial
        ? 'bg-amber-500/5 border-amber-500/10'
        : 'bg-destructive/5 border-destructive/10';

  const Icon = loading && !result
    ? () => <Loader2 className="w-8 h-8 text-muted-foreground shrink-0 animate-spin" />
    : ok
      ? () => <CheckCircle2 className="w-8 h-8 text-emerald-500 shrink-0" />
      : partial
        ? () => <AlertTriangle className="w-8 h-8 text-amber-500 shrink-0" />
        : () => <XCircle className="w-8 h-8 text-destructive shrink-0" />;

  const statusText = error
    ? 'Check Failed'
    : !result
      ? 'Checking…'
      : !configured
        ? 'Not Configured'
        : !domainVerified
          ? 'Domain Unverified'
          : 'Operational';

  const statusClass = ok
    ? 'text-emerald-600 dark:text-emerald-400'
    : partial
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-destructive';

  return (
    <Card className="h-full shadow-sm border-border/50 flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Mail className="w-4 h-4" /> Email Delivery
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className={`flex items-center gap-3 mb-4 p-3 rounded-xl border ${statusColor}`}>
          <Icon />
          <div className="min-w-0">
            <p className={`font-semibold truncate ${statusClass}`}>{statusText}</p>
            {result?.fromAddress && (
              <p className="text-xs text-muted-foreground font-mono truncate">{result.fromAddress}</p>
            )}
            {result?.latencyMs != null && (
              <p className="text-xs text-muted-foreground font-mono">Latency: {result.latencyMs}ms</p>
            )}
            {error && <p className="text-xs text-destructive/80 font-mono truncate">{error}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Provider</p>
            <p className="text-sm font-semibold font-mono">{result ? 'Resend' : '—'}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Domain</p>
            <p className={`text-sm font-semibold font-mono ${domainVerified ? 'text-emerald-500' : result ? 'text-amber-500' : ''}`}>
              {!result ? '—' : domainVerified ? 'Verified' : result.domainStatus ?? 'Unverified'}
            </p>
          </div>
        </div>

        {testResult && (
          <div className={`p-2 rounded-lg text-xs font-mono mb-3 ${testResult.ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-destructive/10 text-destructive'}`}>
            {testResult.ok ? `Test sent to ${testResult.to}` : `Error: ${testResult.error}`}
          </div>
        )}

        <div className="mt-auto flex flex-col gap-2">
          <Button variant="outline" className="w-full" onClick={checkStatus} disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Checking…</> : 'Check Status'}
          </Button>
          <Button variant="ghost" size="sm" className="w-full text-xs" onClick={sendTest} disabled={testing || !configured}>
            {testing ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Sending…</> : 'Send Test Email'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminEmailHealthCard;
