import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Zap, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';

const authH = () => { const t = localStorage.getItem('sbep_auth_token'); return t ? { Authorization: `Bearer ${t}` } : {}; };

const fmtDate = (d) => {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const AIActivityLog = () => {
  const { currentUser } = useAuth();
  const [systems, setSystems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.id) { setIsLoading(false); return; }
    fetch(`/api/system-instances?userId=${currentUser.id}`, { headers: authH() })
      .then(r => r.ok ? r.json() : { items: [] })
      .then(d => setSystems((d.items || []).slice(0, 6)))
      .catch(() => {}).finally(() => setIsLoading(false));
  }, [currentUser?.id]);

  return (
    <Card className="bg-card border-accent/20 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
        <Bot className="w-32 h-32 text-accent" />
      </div>
      <CardHeader className="pb-2 relative z-10">
        <CardTitle className="text-lg font-mono flex items-center gap-2">
          <Bot className="w-5 h-5 text-accent" /> AI Activity Log
        </CardTitle>
      </CardHeader>
      <CardContent className="relative z-10 pt-4">
        {isLoading ? (
          <div className="space-y-3 animate-pulse">{[0,1,2].map(i=><div key={i} className="h-10 bg-muted/40 rounded-lg"/>)}</div>
        ) : systems.length === 0 ? (
          <div className="p-6 bg-background/50 border border-border/50 rounded-xl text-center">
            <Zap className="w-8 h-8 text-accent/50 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">No systems yet</p>
            <p className="text-xs text-muted-foreground">Build your first blueprint to see activity here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {systems.map(s => (
              <div key={s.id} className="flex items-center gap-3 bg-background/30 rounded-lg px-3 py-2.5 border border-border/30">
                <div className={`w-2 h-2 rounded-full shrink-0 ${s.buildStatus === 'active' || s.buildStatus === 'running' ? 'bg-emerald-400' : s.buildStatus === 'building' ? 'bg-amber-400 animate-pulse' : 'bg-muted-foreground/40'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{s.name || 'Unnamed System'}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{s.buildStatus}</p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-1">
                  <Clock className="w-3 h-3" />{fmtDate(s.createdAt || s.created)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIActivityLog;