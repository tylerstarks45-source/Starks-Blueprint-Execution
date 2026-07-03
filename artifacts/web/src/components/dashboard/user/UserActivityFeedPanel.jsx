import React, { useEffect, useState, useCallback } from 'react';
import { Activity, RefreshCw } from 'lucide-react';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const EVENT_TYPE_STYLES = {
  revenue: { dot: 'bg-emerald-400', label: 'Revenue', text: 'text-emerald-400' },
  action:  { dot: 'bg-sky-400',     label: 'Action',  text: 'text-sky-400' },
  error:   { dot: 'bg-rose-400',    label: 'Error',   text: 'text-rose-400' },
  lead:    { dot: 'bg-violet-400',  label: 'Lead',    text: 'text-violet-400' },
  info:    { dot: 'bg-amber-400',   label: 'Info',    text: 'text-amber-400' },
};

const timeAgo = (d) => {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
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
  const style = EVENT_TYPE_STYLES[event.eventType] ?? { dot: 'bg-white/30', label: event.eventType, text: 'text-white/50' };
  return (
    <div className="relative flex gap-4 pb-3.5 pl-6">
      <span className={`absolute left-0 top-[5px] w-[11px] h-[11px] rounded-full border-2 border-[#080a16] ${style.dot}`} />
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold text-white/70 truncate">{event.description}</p>
          {event.amountCents ? (
            <span className="font-mono text-[11px] font-bold text-emerald-400 shrink-0">{fmtAmount(event.amountCents)}</span>
          ) : (
            <span className="text-[9px] text-white/20 font-mono shrink-0">{timeAgo(event.createdAt)}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] text-white/30 font-mono truncate max-w-[150px]">{event.systemName}</span>
          <span className="text-white/15">·</span>
          <span className={`text-[9px] uppercase tracking-wide font-mono font-bold ${style.text}`}>{style.label}</span>
          {event.amountCents ? (
            <>
              <span className="text-white/15">·</span>
              <span className="text-[9px] text-white/20 font-mono">{timeAgo(event.createdAt)}</span>
            </>
          ) : null}
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
      setEvents(Array.isArray(data) ? data : []);
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
    <div>
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/8">
        <div className="flex items-center gap-2.5">
          <div className="w-[3px] h-4 bg-sky-400 rounded-full" />
          <h2 className="text-[10px] font-bold text-white/55 uppercase tracking-widest font-mono flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-sky-400" /> ASH Activity Feed
          </h2>
        </div>
        <button
          onClick={() => fetchEvents(true)}
          disabled={refreshing}
          className="text-white/30 hover:text-white/70 transition-colors disabled:opacity-40"
          aria-label="Refresh activity"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <div className="p-4">
        {error ? (
          <p className="text-[11px] text-rose-400 font-mono text-center py-6">Unable to load activity</p>
        ) : loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 pl-1">
                <span className="w-2 h-2 rounded-full bg-white/10 mt-1.5 shrink-0 animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-3/4 bg-white/8 rounded animate-pulse" />
                  <div className="h-2.5 w-1/2 bg-white/5 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Activity className="w-7 h-7 text-white/6" />
            <p className="text-[11px] text-white/25 font-mono text-center">No activity yet.<br />Events appear here as your systems run.</p>
          </div>
        ) : (
          <div className="relative overflow-y-auto max-h-[260px] pr-1">
            <div className="absolute left-[5px] top-2 bottom-2 w-px bg-white/8" />
            <div className="space-y-0">
              {events.map((e) => (
                <EventRow key={e.id} event={e} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserActivityFeedPanel;
