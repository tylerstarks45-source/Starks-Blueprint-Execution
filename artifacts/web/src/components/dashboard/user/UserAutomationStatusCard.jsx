import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const STATUS_ICON = {
  completed: <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />,
  in_progress: <Loader2 className="w-4 h-4 text-blue-400 mt-0.5 shrink-0 animate-spin" />,
  pending: <Clock className="w-4 h-4 text-muted-foreground/40 mt-0.5 shrink-0" />,
};

const UserAutomationStatusCard = () => {
  const { currentUser } = useAuth();
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.id) return;
    const load = async () => {
      try {
        const siRes = await fetch('/api/system-instances', { headers: authHeaders() });
        const systems = siRes.ok ? await siRes.json() : [];
        const ids = (Array.isArray(systems) ? systems : []).map(s => s.id);

        if (ids.length === 0) { setIsLoading(false); return; }

        const promises = ids.slice(0, 2).map(id =>
          fetch(`/api/build-engine/${id}/status`, { headers: authHeaders() })
            .then(r => r.ok ? r.json() : null)
        );
        const results = (await Promise.all(promises)).filter(Boolean);
        const allSteps = results.flatMap(r => r.steps || []);
        const recent = allSteps
          .filter(s => s.status !== 'pending')
          .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
          .slice(0, 4);
        setEvents(recent);
      } catch {
        setEvents([]);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [currentUser?.id]);

  const timeAgo = (d) => {
    if (!d) return '';
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
  };

  return (
    <Card className="h-full flex flex-col shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Activity className="w-5 h-5 text-rose-500" /> Build Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pt-4">
        {isLoading ? (
          <div className="animate-pulse space-y-4">{[1,2,3].map(i => <div key={i} className="h-10 bg-muted/50 rounded" />)}</div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-6">
            <Activity className="w-8 h-8 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No build activity yet.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Start building a blueprint to see activity here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map(e => (
              <div key={e.id} className="flex items-start gap-3">
                {STATUS_ICON[e.status] || STATUS_ICON.pending}
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight truncate">{e.notes || `Step ${e.stepNumber}`}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono">{timeAgo(e.updatedAt || e.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserAutomationStatusCard;
