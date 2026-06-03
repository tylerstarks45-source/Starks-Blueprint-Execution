import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Network, Wifi, WifiOff, RefreshCw } from 'lucide-react';

const OpenRouterStatusWidget = () => {
  const [status, setStatus] = useState('checking'); // checking | ok | error
  const [latency, setLatency] = useState(null);

  const check = () => {
    setStatus('checking');
    const start = Date.now();
    fetch('/api/health')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        setLatency(Date.now() - start);
        setStatus(d.openrouter === 'ok' ? 'ok' : 'degraded');
      })
      .catch(() => setStatus('error'));
  };

  useEffect(() => { check(); }, []);

  const statusCfg = {
    checking: { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', label: 'Checking…', Icon: RefreshCw, spin: true },
    ok:       { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'Connected', Icon: Wifi, spin: false },
    degraded: { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', label: 'Degraded', Icon: Wifi, spin: false },
    error:    { color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20', label: 'Offline', Icon: WifiOff, spin: false },
  };
  const cfg = statusCfg[status] || statusCfg.checking;

  return (
    <Card className="bg-card border-border shadow-none">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-mono flex items-center gap-2">
            <Network className="w-5 h-5 text-primary" /> OpenRouter Status
          </CardTitle>
          <button onClick={check} className="text-muted-foreground hover:text-foreground transition-colors" title="Refresh">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        <div className={`flex items-center gap-3 rounded-xl px-3 py-3 border ${cfg.bg}`}>
          <cfg.Icon className={`w-5 h-5 ${cfg.color} ${cfg.spin ? 'animate-spin' : ''}`} />
          <div>
            <p className={`text-sm font-bold font-mono ${cfg.color}`}>{cfg.label}</p>
            <p className="text-[10px] text-muted-foreground">AI Model API · OpenRouter</p>
          </div>
          {latency && <span className="ml-auto text-[10px] text-muted-foreground font-mono">{latency}ms</span>}
        </div>
        <div className="space-y-1.5">
          {[['Primary Model', 'gpt-4o-mini'], ['Provider', 'OpenRouter'], ['Protocol', 'REST / streaming']].map(([k,v]) => (
            <div key={k} className="flex justify-between text-xs">
              <span className="text-muted-foreground">{k}</span>
              <span className="font-mono text-foreground">{v}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default OpenRouterStatusWidget;