import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers, CheckCircle2, Loader2, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';

const authH = () => { const t = localStorage.getItem('sbep_auth_token'); return t ? { Authorization: `Bearer ${t}` } : {}; };
const STATUS_MAP = {
  building: { label: 'Building', color: 'text-amber-400', Icon: Loader2, spin: true },
  active:   { label: 'Active',   color: 'text-emerald-400', Icon: CheckCircle2, spin: false },
  running:  { label: 'Running',  color: 'text-emerald-400', Icon: CheckCircle2, spin: false },
  pending:  { label: 'Queued',   color: 'text-blue-400',    Icon: Clock,        spin: false },
};

const BlueprintBuildQueuePanel = () => {
  const { currentUser } = useAuth();
  const [systems, setSystems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.id) { setIsLoading(false); return; }
    fetch(`/api/system-instances?userId=${currentUser.id}`, { headers: authH() })
      .then(r => r.ok ? r.json() : { items: [] })
      .then(d => setSystems((d.items || []).filter(s => s.buildStatus !== 'complete').slice(0, 5)))
      .catch(() => {}).finally(() => setIsLoading(false));
  }, [currentUser?.id]);

  return (
    <Card className="bg-card border-border shadow-none">
      <CardHeader className="pb-3 border-b border-border/50">
        <CardTitle className="text-lg font-mono flex items-center gap-2">
          <Layers className="w-5 h-5 text-amber-400" /> Build Queue
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {isLoading ? (
          <div className="space-y-2 animate-pulse">{[0,1].map(i=><div key={i} className="h-10 bg-muted/40 rounded-lg"/>)}</div>
        ) : systems.length === 0 ? (
          <div className="text-center py-3 space-y-2">
            <p className="text-sm text-muted-foreground">No active builds.</p>
            <Link to="/blueprints" className="text-xs text-primary hover:underline">Start a blueprint →</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {systems.map(s => {
              const cfg = STATUS_MAP[s.buildStatus] || STATUS_MAP.pending;
              return (
                <div key={s.id} className="flex items-center justify-between bg-muted/10 rounded-lg px-3 py-2 border border-border/30 text-sm">
                  <span className="truncate font-medium text-foreground pr-2">{s.name || 'Unnamed System'}</span>
                  <span className={`flex items-center gap-1 shrink-0 text-xs font-mono ${cfg.color}`}>
                    <cfg.Icon className={`w-3 h-3 ${cfg.spin ? 'animate-spin' : ''}`}/>{cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BlueprintBuildQueuePanel;