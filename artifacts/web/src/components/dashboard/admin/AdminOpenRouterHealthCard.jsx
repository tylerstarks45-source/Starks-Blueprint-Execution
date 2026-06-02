import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Network, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import adminApi from '@/lib/adminApi.js';

const AdminOpenRouterHealthCard = () => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const runTest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(await adminApi.testOpenRouter());
    } catch (e) {
      setError(e.message || 'Test failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runTest();
  }, [runTest]);

  const ok = result?.ok;

  return (
    <Card className="h-full shadow-sm border-border/50 flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Network className="w-4 h-4" /> OpenRouter Core
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className={`flex items-center gap-3 mb-6 p-3 rounded-xl border ${ok ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-destructive/5 border-destructive/10'}`}>
          {loading && !result ? (
            <Loader2 className="w-8 h-8 text-muted-foreground shrink-0 animate-spin" />
          ) : ok ? (
            <CheckCircle2 className="w-8 h-8 text-emerald-500 shrink-0" />
          ) : (
            <XCircle className="w-8 h-8 text-destructive shrink-0" />
          )}
          <div className="min-w-0">
            <p className={`font-semibold truncate ${ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
              {error ? 'Test Failed' : result?.message ?? 'Checking…'}
            </p>
            {result?.latencyMs != null && (
              <p className="text-xs text-muted-foreground font-mono">Latency: {result.latencyMs}ms</p>
            )}
            {error && <p className="text-xs text-destructive/80 font-mono truncate">{error}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Models Online</p>
            <p className="text-xl font-semibold font-mono">{result?.modelsOnline ?? '—'}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Latency</p>
            <p className="text-xl font-semibold font-mono">{result?.latencyMs != null ? `${result.latencyMs}ms` : '—'}</p>
          </div>
        </div>
        <Button variant="outline" className="w-full mt-auto" onClick={runTest} disabled={loading}>
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Testing…</> : 'Test Connection'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AdminOpenRouterHealthCard;
