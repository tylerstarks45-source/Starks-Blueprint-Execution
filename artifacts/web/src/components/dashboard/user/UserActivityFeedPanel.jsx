import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, RefreshCw } from 'lucide-react';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const EVENT_TYPE_STYLES = {
  revenue:  { dot: 'bg-emerald-400', label: 'Revenue' },
  action:   { dot: 'bg-blue-400',    label: 'Action'  },
  error:    { dot: 'bg-rose-400',    label: 'Error'   },
  info:     { dot: 'bg-amber-400',   label: 'Info'    },
};

const timeAgo = (d) => {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const fmtAmount = (cents) => {
  if (!cents) return null;
  return `$${(cents / 100).toFixed(2)}`;
};

const EventRow = ({ event }) => {
  const style = EVENT_TYPE_STYLES[event.eventType] ?? { dot: 'bg-muted-foreground', label: event.eventType };
  return (
    <div className="flex items-start gap-3 pb-3 border-b border-white/8 last:border-0 last:pb-0">
      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${style.dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground truncate">{event.description}</p>
          {event.amountCents ? (
            <span className="font-mono text-sm font-semibold text-emerald-400 shrink-0">
              {fmtAmount(event.amountCents)}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground truncate max-w-[140px]">{event.systemName}</span>
          <span className="text-xs text-muted-foreground/50">·</span>
          <span className="text-xs text-muted-foreground/70 uppercase tracking-wide font-medium">{style.label}</span>
          <span className="text-xs text-muted-foreground/50">·</span>
          <span className="text-xs text-muted-foreground font-mono">{timeAgo(event.createdAt)}</span>
        </div>
      </div>
    </div>
  );
};

const UserActivityFeedPanel = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEvents = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch('/api/system-instances/activity', { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEvents(data);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    const id = setInterval(() => fetchEvents(true), 30000);
    return () => clearInterval(id);
  }, [fetchEvents]);

  return (
    <Card className="shadow-sm border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3 border-b border-border/30">
        <CardTitle className="text-lg font-medium flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" /> Activity Feed
          </span>
          <button
            onClick={() => fetchEvents(true)}
            disabled={refreshing}
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            aria-label="Refresh activity"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {error ? (
          <p className="text-sm text-destructive">Unable to load activity: {error}</p>
        ) : loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="w-2 h-2 rounded-full mt-1.5 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="py-8 text-center">
            <Activity className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground italic">No activity yet across your systems.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Events will appear here as your systems run.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1 ash-scroll">
            {events.map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserActivityFeedPanel;
