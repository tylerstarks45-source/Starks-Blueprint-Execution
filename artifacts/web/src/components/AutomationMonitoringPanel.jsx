import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';

const authH = () => { const t = localStorage.getItem('sbep_auth_token'); return t ? { Authorization: `Bearer ${t}` } : {}; };

const AutomationMonitoringPanel = () => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({ active: 0, building: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.id) { setIsLoading(false); return; }
    fetch(`/api/system-instances?userId=${currentUser.id}`, { headers: authH() })
      .then(r => r.ok ? r.json() : { items: [] })
      .then(d => {
        const items = d.items || [];
        setStats({
          total: items.length,
          active: items.filter(s => s.buildStatus === 'active' || s.buildStatus === 'running').length,
          building: items.filter(s => s.buildStatus === 'building').length,
        });
      })
      .catch(() => {}).finally(() => setIsLoading(false));
  }, [currentUser?.id]);

  return (
    <Card className="bg-card border-border shadow-none">
      <CardHeader className="pb-3 border-b border-border/50">
        <CardTitle className="text-lg font-mono flex items-center gap-2">
          <Eye className="w-5 h-5 text-purple-400" /> Automation Monitoring
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {isLoading ? (
          <div className="grid grid-cols-3 gap-3 animate-pulse">{[0,1,2].map(i=><div key={i} className="h-16 bg-muted/40 rounded-xl"/>)}</div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/10 rounded-xl p-3 border border-border/30 text-center">
              <p className="text-2xl font-bold font-mono text-foreground">{stats.total}</p>
              <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">Total</p>
            </div>
            <div className="bg-emerald-500/5 rounded-xl p-3 border border-emerald-500/20 text-center">
              <p className="text-2xl font-bold font-mono text-emerald-400">{stats.active}</p>
              <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider flex items-center justify-center gap-1"><CheckCircle2 className="w-2.5 h-2.5"/>Active</p>
            </div>
            <div className="bg-amber-500/5 rounded-xl p-3 border border-amber-500/20 text-center">
              <p className="text-2xl font-bold font-mono text-amber-400">{stats.building}</p>
              <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider flex items-center justify-center gap-1"><Loader2 className="w-2.5 h-2.5"/>Building</p>
            </div>
          </div>
        )}
        {!isLoading && stats.total === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-4">No systems found. <a href="/blueprints" className="text-primary hover:underline">Build one →</a></p>
        )}
      </CardContent>
    </Card>
  );
};

export default AutomationMonitoringPanel;