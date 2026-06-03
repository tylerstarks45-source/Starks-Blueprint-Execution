import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Zap, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';

const authH = () => { const t = localStorage.getItem('sbep_auth_token'); return t ? { Authorization: `Bearer ${t}` } : {}; };

const fmtDate = (d) => {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m || 1}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h/24)}d ago`;
};

const AIActivityPanel = () => {
  const { currentUser } = useAuth();
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.id) { setIsLoading(false); return; }
    fetch(`/api/system-instances?userId=${currentUser.id}`, { headers: authH() })
      .then(r => r.ok ? r.json() : { items: [] })
      .then(d => {
        const items = (d.items || []).slice(0, 5);
        setEvents(items.map(s => ({
          id: s.id,
          label: s.buildStatus === 'active' ? `${s.name || 'System'} is live` : `${s.name || 'System'} ${s.buildStatus}`,
          time: s.updatedAt || s.createdAt,
          status: s.buildStatus,
        })));
      })
      .catch(() => {}).finally(() => setIsLoading(false));
  }, [currentUser?.id]);

  return (
    <Card className="bg-card border-border shadow-none">
      <CardHeader className="pb-3 border-b border-border/50">
        <CardTitle className="text-lg font-mono flex items-center gap-2">
          <Bot className="w-5 h-5 text-accent" /> AI Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {isLoading ? (
          <div className="space-y-3 animate-pulse">{[0,1,2].map(i=><div key={i} className="h-9 bg-muted/40 rounded-lg"/>)}</div>
        ) : events.length === 0 ? (
          <div className="text-center py-6">
            <Zap className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2"/>
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map(e => {
              const Icon = e.status === 'building' ? Loader2 : CheckCircle2;
              const color = e.status === 'active' || e.status === 'running' ? 'text-emerald-400' : e.status === 'building' ? 'text-amber-400' : 'text-muted-foreground';
              return (
                <div key={e.id} className="flex items-center gap-2.5 text-xs">
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${color} ${e.status === 'building' ? 'animate-spin' : ''}`}/>
                  <span className="flex-1 text-foreground truncate">{e.label}</span>
                  <span className="text-muted-foreground shrink-0">{fmtDate(e.time)}</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIActivityPanel;