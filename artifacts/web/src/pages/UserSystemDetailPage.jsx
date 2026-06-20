import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import VideoBackground from '@/components/VideoBackground.jsx';
import { toast } from 'sonner';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
};

// ─── STATUS HELPERS ───────────────────────────────────────────────────────────

const BUILD_STATUS_META = {
  pending:    { label: 'Pending',    color: 'text-yellow-400',  bg: 'bg-yellow-400/10', ring: 'ring-yellow-400/30', dot: 'bg-yellow-400' },
  building:   { label: 'Building',   color: 'text-blue-400',    bg: 'bg-blue-400/10',   ring: 'ring-blue-400/30',   dot: 'bg-blue-400', pulse: true },
  built:      { label: 'Built',      color: 'text-cyan-400',    bg: 'bg-cyan-400/10',   ring: 'ring-cyan-400/30',   dot: 'bg-cyan-400' },
  deploying:  { label: 'Deploying',  color: 'text-violet-400',  bg: 'bg-violet-400/10', ring: 'ring-violet-400/30', dot: 'bg-violet-400', pulse: true },
  running:    { label: 'Running',    color: 'text-emerald-400', bg: 'bg-emerald-400/10',ring: 'ring-emerald-400/30',dot: 'bg-emerald-400', pulse: true },
  active:     { label: 'Active',     color: 'text-emerald-400', bg: 'bg-emerald-400/10',ring: 'ring-emerald-400/30',dot: 'bg-emerald-400', pulse: true },
  degraded:   { label: 'Degraded',   color: 'text-yellow-400',  bg: 'bg-yellow-400/10', ring: 'ring-yellow-400/30', dot: 'bg-yellow-400', pulse: true },
  paused:     { label: 'Paused',     color: 'text-gray-400',    bg: 'bg-gray-400/10',   ring: 'ring-gray-400/30',   dot: 'bg-gray-400' },
  failed:     { label: 'Failed',     color: 'text-red-400',     bg: 'bg-red-400/10',    ring: 'ring-red-400/30',    dot: 'bg-red-400' },
  completed:  { label: 'Completed',  color: 'text-purple-400',  bg: 'bg-purple-400/10', ring: 'ring-purple-400/30', dot: 'bg-purple-400' },
  archived:   { label: 'Archived',   color: 'text-gray-600',    bg: 'bg-gray-600/10',   ring: 'ring-gray-600/30',   dot: 'bg-gray-600' },
};

const HEALTH_META = {
  healthy:  { label: 'Healthy',   color: 'text-emerald-400', icon: '✓' },
  degraded: { label: 'Degraded',  color: 'text-yellow-400',  icon: '⚠' },
  down:     { label: 'Down',      color: 'text-red-400',     icon: '✗' },
  paused:   { label: 'Paused',    color: 'text-gray-400',    icon: '⏸' },
  starting: { label: 'Starting',  color: 'text-violet-400',  icon: '◉' },
  offline:  { label: 'Offline',   color: 'text-gray-600',    icon: '○' },
  unknown:  { label: 'Unknown',   color: 'text-gray-400',    icon: '?' },
};

const STEP_STATUS_META = {
  pending:    { icon: '○', color: 'text-gray-500' },
  in_progress:{ icon: '◉', color: 'text-blue-400 animate-pulse' },
  completed:  { icon: '●', color: 'text-emerald-400' },
  failed:     { icon: '✗', color: 'text-red-400' },
  skipped:    { icon: '–', color: 'text-gray-600' },
};

const EVENT_TYPE_META = {
  revenue:  { icon: '💰', color: 'text-emerald-400', label: 'Revenue' },
  action:   { icon: '⚡', color: 'text-blue-400',    label: 'Action' },
  info:     { icon: '📋', color: 'text-gray-400',    label: 'Info' },
  error:    { icon: '⚠',  color: 'text-red-400',     label: 'Error' },
};

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── CHANNEL META ──────────────────────────────────────────────────────────────
const CHANNEL_META = {
  twitter:    { icon: '𝕏',  label: 'X (Twitter)', color: 'text-violet-400',  bg: 'bg-violet-400/10', border: 'border-violet-400/20' },
  instagram:  { icon: '📸', label: 'Instagram',   color: 'text-pink-400',    bg: 'bg-pink-400/10',   border: 'border-pink-400/20' },
  mailchimp:  { icon: '🐒', label: 'Mailchimp',   color: 'text-amber-400',   bg: 'bg-amber-400/10',  border: 'border-amber-400/20' },
  convertkit: { icon: '✉',  label: 'ConvertKit',  color: 'text-orange-400',  bg: 'bg-orange-400/10', border: 'border-orange-400/20' },
  wordpress:  { icon: '🌐', label: 'WordPress',   color: 'text-blue-400',    bg: 'bg-blue-400/10',   border: 'border-blue-400/20' },
  ghost:      { icon: '👻', label: 'Ghost',       color: 'text-gray-300',    bg: 'bg-white/5',       border: 'border-white/10' },
};

// ─── PUBLISHED CONTENT PANEL ──────────────────────────────────────────────────
function PublishedContentPanel({ instanceId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [retrying, setRetrying] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/system-instances/${instanceId}/published-content`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setItems(data);
    } catch { /* silently fail — panel just stays empty */ }
    finally { setLoading(false); }
  }, [instanceId]);

  useEffect(() => { load(); }, [load]);

  const retry = async (item) => {
    setRetrying(item.id);
    try {
      const res = await fetch(`/api/system-instances/${instanceId}/published-content/${item.id}/retry`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Retry failed');
      }
      toast.success(`Retrying publish to ${CHANNEL_META[item.channel]?.label ?? item.channel}…`);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally { setRetrying(null); }
  };

  const remove = async (item) => {
    if (!confirm(`Delete this content record for "${CHANNEL_META[item.channel]?.label ?? item.channel}"?`)) return;
    setDeleting(item.id);
    try {
      await fetch(`/api/system-instances/${instanceId}/published-content/${item.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      setItems(prev => prev.filter(x => x.id !== item.id));
      toast.success('Record removed');
    } catch (err) {
      toast.error(err.message);
    } finally { setDeleting(null); }
  };

  const now = Date.now();
  // Sort: upcoming scheduled first (soonest first), then past by newest first
  const sorted = [...items].sort((a, b) => {
    const aScheduled = a.status === 'scheduled';
    const bScheduled = b.status === 'scheduled';
    if (aScheduled && !bScheduled) return -1;
    if (!aScheduled && bScheduled) return 1;
    if (aScheduled && bScheduled) return new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime();
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  const filtered = filter === 'all' ? sorted : sorted.filter(x => x.status === filter);
  const counts = {
    all: items.length,
    scheduled: items.filter(x => x.status === 'scheduled').length,
    published: items.filter(x => x.status === 'published').length,
    failed: items.filter(x => x.status === 'failed').length,
    pending: items.filter(x => x.status === 'pending').length,
  };

  return (
    <div className="rounded-xl border border-white/10 bg-black/80 backdrop-blur-sm">
      <div className="border-b border-white/5 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="text-xs font-mono text-gray-300 uppercase tracking-widest">Content Calendar</span>
          <span className="text-xs text-gray-600 font-mono">{counts.all} item{counts.all !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-1">
          {['all', 'scheduled', 'published', 'failed', 'pending'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono capitalize transition-all ${
                filter === f
                  ? 'bg-white/15 text-white'
                  : 'bg-transparent text-gray-600 hover:text-gray-400'
              }`}
            >
              {f} {f !== 'all' && counts[f] > 0 && <span className="ml-0.5 opacity-60">({counts[f]})</span>}
            </button>
          ))}
          <button onClick={load} className="ml-1 px-2 py-1 rounded-lg text-[10px] font-mono text-gray-600 hover:text-gray-400 transition-all">↺</button>
        </div>
      </div>

      {loading ? (
        <div className="px-4 py-10 text-center">
          <div className="w-5 h-5 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-gray-600 font-mono">Loading content…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <p className="text-2xl mb-2">{filter === 'failed' ? '⚠' : filter === 'published' ? '✓' : '📅'}</p>
          <p className="text-xs text-gray-600 font-mono">
            {filter === 'all' ? 'No published content yet — ASH will log posts here when it publishes on your behalf.' : `No ${filter} items.`}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {filtered.map(item => {
            const ch = CHANNEL_META[item.channel] ?? { icon: '📤', label: item.channel, color: 'text-gray-400', bg: 'bg-white/5', border: 'border-white/10' };
            const statusColors = { published: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', failed: 'text-red-400 bg-red-400/10 border-red-400/20', pending: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', scheduled: 'text-violet-400 bg-violet-400/10 border-violet-400/20' };
            const sc = statusColors[item.status] ?? statusColors.pending;
            return (
              <div key={item.id} className="px-4 py-3 flex items-start gap-3 hover:bg-white/2 transition-colors">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 ${ch.bg} ${ch.border} border`}>
                  {ch.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <span className={`text-xs font-mono ${ch.color} shrink-0`}>{ch.label}</span>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border capitalize ${sc}`}>
                      {item.status === 'published' ? '✓' : item.status === 'failed' ? '✗' : item.status === 'pending' ? '◉' : '⏱'} {item.status}
                    </span>
                    {item.publishedUrl && (
                      <a
                        href={item.publishedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-blue-400 hover:text-blue-300 underline truncate max-w-[160px]"
                      >
                        View post ↗
                      </a>
                    )}
                  </div>
                  {item.title && (
                    <p className="text-xs font-semibold text-white mt-1 truncate">{item.title}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{item.content}</p>
                  {item.errorMessage && (
                    <p className="text-[10px] text-red-400 mt-1 font-mono line-clamp-2">{item.errorMessage}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[10px] text-gray-700 font-mono">
                      {item.status === 'scheduled' && item.scheduledFor
                        ? `Scheduled for ${new Date(item.scheduledFor).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                        : item.publishedAt
                          ? `Published ${timeAgo(item.publishedAt)}`
                          : `Created ${timeAgo(item.createdAt)}`}
                    </span>
                    {item.retryCount > 0 && (
                      <span className="text-[10px] text-gray-700 font-mono">{item.retryCount} retry{item.retryCount !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {item.status === 'failed' && item.retryCount < 3 && (
                    <button
                      onClick={() => retry(item)}
                      disabled={retrying === item.id}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-mono bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/20 transition-all disabled:opacity-50"
                    >
                      {retrying === item.id ? '…' : '↺ Retry'}
                    </button>
                  )}
                  <button
                    onClick={() => remove(item)}
                    disabled={deleting === item.id}
                    className="px-2 py-1 rounded-lg text-[10px] font-mono bg-red-500/5 hover:bg-red-500/15 text-red-500 border border-red-500/10 transition-all disabled:opacity-50"
                  >
                    {deleting === item.id ? '…' : '✕'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function centsToDisplay(cents) {
  if (cents === 0) return '$0';
  const dollars = cents / 100;
  if (dollars < 1) return `$${(dollars).toFixed(2)}`;
  if (dollars >= 1000) return `$${(dollars / 1000).toFixed(1)}k`;
  return `$${dollars.toFixed(2)}`;
}

function uptimePercent(createdAt, buildStatus) {
  if (buildStatus === 'active') return '99.9%';
  if (buildStatus === 'paused') return '—';
  if (buildStatus === 'failed') return '0%';
  return '—';
}

// ─── HEALTH SPARKLINE ─────────────────────────────────────────────────────────

function HealthSparkline({ sessions }) {
  if (!sessions || sessions.length === 0) {
    return <span className="text-xs font-mono text-gray-600">No history</span>;
  }

  const bars = [...sessions].sort(
    (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
  ).slice(-10);

  const colorMap = {
    completed: '#34d399',
    active:    '#60a5fa',
    building:  '#60a5fa',
    failed:    '#f87171',
  };

  return (
    <div className="flex items-end gap-0.5 h-5" title="Build session health — last 10 sessions">
      {bars.map((s, i) => {
        const color = colorMap[(s.status || '').toLowerCase()] ?? '#4b5563';
        const label = `Session #${s.id}: ${s.status}`;
        return (
          <div
            key={i}
            title={label}
            className="w-1.5 rounded-sm transition-all"
            style={{ height: '100%', backgroundColor: color, opacity: 0.85 }}
          />
        );
      })}
    </div>
  );
}

// ─── REVENUE SPARKLINE ────────────────────────────────────────────────────────

function RevenueSparkline({ trend }) {
  if (!trend || trend.length === 0) return null;
  const hasData = trend.some((t) => t.amountCents > 0);

  const data = trend.map((t) => ({
    date: t.date.slice(5),
    value: t.amountCents / 100,
  }));

  return (
    <div className="h-16 w-full mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" hide />
          <YAxis hide domain={[0, 'auto']} />
          <Tooltip
            contentStyle={{ background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 10, fontFamily: 'monospace' }}
            itemStyle={{ color: '#34d399' }}
            formatter={(v) => [`$${v.toFixed(2)}`, 'Revenue']}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={hasData ? '#34d399' : '#1f2937'}
            strokeWidth={1.5}
            fill="url(#revenueGrad)"
            dot={false}
            activeDot={{ r: 3, fill: '#34d399', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent = 'blue' }) {
  const colors = {
    blue: 'from-blue-500/10 to-transparent border-blue-500/20',
    emerald: 'from-emerald-500/10 to-transparent border-emerald-500/20',
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/30',
    amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/30',
  };
  return (
    <div className={`relative rounded-xl border bg-gradient-to-br ${colors[accent]} bg-black/70 p-4`}>
      <p className="text-[10px] uppercase tracking-widest text-gray-400 font-mono mb-1">{label}</p>
      <p className="text-2xl font-bold text-white font-mono">{value}</p>
      {sub && <p className="text-xs text-gray-300 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── BUILD LOG PANEL ─────────────────────────────────────────────────────────

const BUILD_LOG_PAGE_SIZE = 20;

function BuildLogPanel({ steps, session }) {
  const [showAll, setShowAll] = React.useState(false);

  const totalSteps = steps.length;
  const completedSteps = steps.filter((s) => s.status === 'completed').length;
  const progressPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  const visibleSteps = showAll ? steps : steps.slice(-BUILD_LOG_PAGE_SIZE);
  const hiddenCount = totalSteps - visibleSteps.length;

  return (
    <div className="rounded-xl border border-white/10 bg-black/80 backdrop-blur-sm overflow-hidden">
      <div className="border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-400"></span>
          <span className="text-xs font-mono text-gray-300 uppercase tracking-widest">Build Log</span>
        </div>
        <span className="text-xs font-mono text-gray-500">
          {completedSteps}/{totalSteps} steps · {progressPct}%
        </span>
      </div>

      {totalSteps > 0 && (
        <div className="px-4 py-2 bg-black/20">
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      <div className="p-4 space-y-1 max-h-96 overflow-y-auto font-mono text-xs">
        {steps.length === 0 ? (
          <p className="text-gray-600 text-center py-8">No build steps recorded yet.</p>
        ) : (
          <>
            {hiddenCount > 0 && (
              <button
                onClick={() => setShowAll(true)}
                className="w-full text-center text-xs text-gray-600 hover:text-gray-400 py-1 mb-2 border border-white/5 rounded hover:border-white/10 transition-colors"
              >
                ↑ Show {hiddenCount} earlier step{hiddenCount !== 1 ? 's' : ''}
              </button>
            )}
            {visibleSteps.map((step) => {
              const meta = STEP_STATUS_META[step.status] ?? STEP_STATUS_META.pending;
              return (
                <div key={step.id} className="flex items-start gap-3 py-1 group hover:bg-white/2 rounded px-1">
                  <span className={`mt-0.5 shrink-0 ${meta.color}`}>{meta.icon}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-gray-300">
                      Step {step.stepNumber}
                      {step.title && <span className="text-gray-400 ml-1 font-sans not-italic">{step.title}</span>}
                      {step.notes && <span className="text-gray-500 ml-2">— {step.notes}</span>}
                    </span>
                    {step.output && (
                      <p className="text-gray-600 mt-0.5 truncate max-w-xs">{step.output}</p>
                    )}
                  </div>
                  <span className="text-gray-600 shrink-0 whitespace-nowrap">
                    {step.completedAt ? timeAgo(step.completedAt) : step.startedAt ? timeAgo(step.startedAt) : ''}
                  </span>
                </div>
              );
            })}
            {showAll && totalSteps > BUILD_LOG_PAGE_SIZE && (
              <button
                onClick={() => setShowAll(false)}
                className="w-full text-center text-xs text-gray-600 hover:text-gray-400 py-1 mt-2 border border-white/5 rounded hover:border-white/10 transition-colors"
              >
                ↓ Show fewer
              </button>
            )}
          </>
        )}
      </div>

      {session && (
        <div className="border-t border-white/5 px-4 py-2 flex items-center justify-between text-xs text-gray-600">
          <span>Session #{session.id} · {completedSteps}/{totalSteps} steps</span>
          <span>Started {timeAgo(session.startedAt)}</span>
        </div>
      )}
    </div>
  );
}

// ─── OUTPUTS PANEL ────────────────────────────────────────────────────────────

function OutputsPanel({ outputs }) {
  const OUTPUT_ICONS = {
    recommendation: '💡',
    warning: '⚠',
    link: '🔗',
    report: '📊',
    credential_check: '🔑',
  };

  return (
    <div className="rounded-xl border border-white/10 bg-black/80 backdrop-blur-sm">
      <div className="border-b border-white/5 px-4 py-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-purple-400"></span>
        <span className="text-xs font-mono text-gray-300 uppercase tracking-widest">AI Outputs</span>
        <span className="ml-auto text-xs text-gray-600">{outputs.length} items</span>
      </div>
      <div className="p-4 space-y-3 max-h-72 overflow-y-auto">
        {outputs.length === 0 ? (
          <p className="text-gray-600 text-center py-6 text-xs font-mono">No outputs generated yet.</p>
        ) : (
          outputs.map((out) => (
            <div key={out.id} className="rounded-lg bg-black/60 border border-white/10 p-3">
              <div className="flex items-center gap-2 mb-1">
                <span>{OUTPUT_ICONS[out.outputType] ?? '📄'}</span>
                <span className="text-xs font-semibold text-white">{out.title}</span>
                <span className="ml-auto text-xs text-gray-600">{timeAgo(out.createdAt)}</span>
              </div>
              {out.content && <p className="text-xs text-gray-400 leading-relaxed">{out.content}</p>}
              {out.url && (
                <a href={out.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline mt-1 block">
                  {out.url}
                </a>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── CONTROL BUTTON ───────────────────────────────────────────────────────────

function ControlBtn({ label, icon, onClick, variant = 'ghost', disabled }) {
  const base = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all disabled:opacity-40 disabled:cursor-not-allowed';
  const variants = {
    ghost: 'border border-white/10 text-gray-400 hover:border-white/20 hover:text-white hover:bg-white/5',
    emerald: 'border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10',
    red: 'border border-red-500/30 text-red-400 hover:bg-red-500/10',
    blue: 'border border-blue-500/30 text-blue-400 hover:bg-blue-500/10',
    amber: 'border border-amber-500/30 text-amber-400 hover:bg-amber-500/10',
  };
  return (
    <button className={`${base} ${variants[variant]}`} onClick={onClick} disabled={disabled}>
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// ─── DELETE CONFIRM MODAL ─────────────────────────────────────────────────────

function DeleteModal({ systemName, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl border border-red-500/20 bg-gray-900 p-6 shadow-2xl">
        <h3 className="text-base font-bold text-white mb-2">Delete System?</h3>
        <p className="text-sm text-gray-400 mb-5">
          <span className="text-white font-medium">{systemName}</span> will be permanently deleted.
          This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg border border-white/10 text-gray-400 text-sm hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AUTOMATION SCHEDULE PANEL ────────────────────────────────────────────────

const SCHEDULE_TYPE_LABELS = {
  every_n_minutes: (cfg) => `Every ${cfg.intervalMinutes ?? 15} min`,
  every_n_hours:   (cfg) => `Every ${cfg.intervalHours ?? 1}h`,
  daily:           (cfg) => `Daily at ${String(cfg.hour ?? 9).padStart(2,'0')}:${String(cfg.minute ?? 0).padStart(2,'0')} UTC`,
  weekly:          (cfg) => {
    const days = ['', 'Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    return `Every ${days[cfg.dayOfWeek ?? 1]} at ${String(cfg.hour ?? 9).padStart(2,'0')}:${String(cfg.minute ?? 0).padStart(2,'0')} UTC`;
  },
};

function formatScheduleLabel(scheduleType, scheduleConfig) {
  const fn = SCHEDULE_TYPE_LABELS[scheduleType];
  if (!fn) return scheduleType;
  try { return fn(scheduleConfig ?? {}); } catch { return scheduleType; }
}

function AddTaskModal({ instanceId, onCreated, onClose }) {
  const [name, setName] = useState('');
  const [scheduleType, setScheduleType] = useState('daily');
  const [intervalMinutes, setIntervalMinutes] = useState(15);
  const [intervalHours, setIntervalHours] = useState(1);
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [connectorId, setConnectorId] = useState('webhook');
  const [action, setAction] = useState('trigger');
  const [actionPayload, setActionPayload] = useState('{}');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const buildScheduleConfig = () => {
    if (scheduleType === 'every_n_minutes') return { intervalMinutes: Number(intervalMinutes) };
    if (scheduleType === 'every_n_hours') return { intervalHours: Number(intervalHours) };
    if (scheduleType === 'daily') return { hour: Number(hour), minute: Number(minute) };
    if (scheduleType === 'weekly') return { dayOfWeek: Number(dayOfWeek), hour: Number(hour), minute: Number(minute) };
    return {};
  };

  const handleCreate = async () => {
    if (!name.trim()) { setErr('Task name is required'); return; }
    let parsedPayload = {};
    try { parsedPayload = JSON.parse(actionPayload); } catch { setErr('Action payload must be valid JSON'); return; }
    setLoading(true);
    setErr('');
    try {
      const token = localStorage.getItem('sbep_auth_token');
      const res = await fetch(`/api/system-instances/${instanceId}/scheduled-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          name: name.trim(),
          scheduleType,
          scheduleConfig: buildScheduleConfig(),
          actionType: 'connector',
          actionParams: { connectorId, action, params: parsedPayload },
          enabled: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create task');
      onCreated(data);
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-violet-500/20 bg-gray-900 p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <h3 className="text-base font-bold text-white mb-4 font-mono">Add Scheduled Task</h3>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-mono block mb-1">Task Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Post daily TikTok update"
              className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-mono block mb-1">Schedule</label>
            <select
              value={scheduleType}
              onChange={e => setScheduleType(e.target.value)}
              className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-violet-500/50"
            >
              <option value="every_n_minutes">Every N minutes</option>
              <option value="every_n_hours">Every N hours</option>
              <option value="daily">Daily at specific time</option>
              <option value="weekly">Weekly on specific day</option>
            </select>
          </div>

          {scheduleType === 'every_n_minutes' && (
            <div>
              <label className="text-[10px] uppercase tracking-widest text-gray-500 font-mono block mb-1">Interval (minutes)</label>
              <input type="number" min="1" value={intervalMinutes} onChange={e => setIntervalMinutes(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-violet-500/50" />
            </div>
          )}
          {scheduleType === 'every_n_hours' && (
            <div>
              <label className="text-[10px] uppercase tracking-widest text-gray-500 font-mono block mb-1">Interval (hours)</label>
              <input type="number" min="1" value={intervalHours} onChange={e => setIntervalHours(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-violet-500/50" />
            </div>
          )}
          {(scheduleType === 'daily' || scheduleType === 'weekly') && (
            <div className="grid grid-cols-2 gap-2">
              {scheduleType === 'weekly' && (
                <div className="col-span-2">
                  <label className="text-[10px] uppercase tracking-widest text-gray-500 font-mono block mb-1">Day of Week</label>
                  <select value={dayOfWeek} onChange={e => setDayOfWeek(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-violet-500/50">
                    <option value={1}>Monday</option><option value={2}>Tuesday</option><option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option><option value={5}>Friday</option><option value={6}>Saturday</option><option value={7}>Sunday</option>
                  </select>
                </div>
              )}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-gray-500 font-mono block mb-1">Hour (UTC)</label>
                <input type="number" min="0" max="23" value={hour} onChange={e => setHour(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-violet-500/50" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-gray-500 font-mono block mb-1">Minute</label>
                <input type="number" min="0" max="59" value={minute} onChange={e => setMinute(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-violet-500/50" />
              </div>
            </div>
          )}

          <div>
            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-mono block mb-1">Connector</label>
            <select value={connectorId} onChange={e => setConnectorId(e.target.value)}
              className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-violet-500/50">
              <option value="webhook">Webhook</option>
              <option value="slack">Slack</option>
              <option value="twitter">Twitter/X</option>
              <option value="mailchimp">Mailchimp</option>
              <option value="convertkit">ConvertKit</option>
              <option value="sendgrid">SendGrid</option>
              <option value="zapier">Zapier</option>
              <option value="gohighlevel">GoHighLevel</option>
              <option value="stripe">Stripe</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-mono block mb-1">Action</label>
            <input value={action} onChange={e => setAction(e.target.value)} placeholder="trigger / postTweet / postMessage…"
              className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-violet-500/50" />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-mono block mb-1">Action Params (JSON)</label>
            <textarea value={actionPayload} onChange={e => setActionPayload(e.target.value)} rows={3}
              placeholder='{"text": "Daily update!"}'
              className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder-gray-600 focus:outline-none focus:border-violet-500/50 resize-none" />
          </div>

          {err && <p className="text-xs text-red-400 font-mono">{err}</p>}
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-white/10 text-gray-400 text-sm hover:text-white transition-colors">
            Cancel
          </button>
          <button onClick={handleCreate} disabled={loading}
            className="flex-1 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50">
            {loading ? 'Creating…' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditTaskModal({ task, onUpdated, onClose }) {
  const [name, setName] = useState(task.name ?? '');
  const [scheduleType, setScheduleType] = useState(task.scheduleType ?? 'daily');
  const [intervalMinutes, setIntervalMinutes] = useState(task.scheduleConfig?.intervalMinutes ?? 15);
  const [intervalHours, setIntervalHours] = useState(task.scheduleConfig?.intervalHours ?? 1);
  const [hour, setHour] = useState(task.scheduleConfig?.hour ?? 9);
  const [minute, setMinute] = useState(task.scheduleConfig?.minute ?? 0);
  const [dayOfWeek, setDayOfWeek] = useState(task.scheduleConfig?.dayOfWeek ?? 1);
  const [connectorId, setConnectorId] = useState(task.actionParams?.connectorId ?? 'webhook');
  const [action, setAction] = useState(task.actionParams?.action ?? 'trigger');
  const [actionPayload, setActionPayload] = useState(
    task.actionParams?.params ? JSON.stringify(task.actionParams.params, null, 2) : '{}'
  );
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const buildScheduleConfig = () => {
    if (scheduleType === 'every_n_minutes') return { intervalMinutes: Number(intervalMinutes) };
    if (scheduleType === 'every_n_hours') return { intervalHours: Number(intervalHours) };
    if (scheduleType === 'daily') return { hour: Number(hour), minute: Number(minute) };
    if (scheduleType === 'weekly') return { dayOfWeek: Number(dayOfWeek), hour: Number(hour), minute: Number(minute) };
    return {};
  };

  const handleSave = async () => {
    if (!name.trim()) { setErr('Task name is required'); return; }
    let parsedPayload = {};
    try { parsedPayload = JSON.parse(actionPayload); } catch { setErr('Action payload must be valid JSON'); return; }
    setLoading(true);
    setErr('');
    try {
      const token = localStorage.getItem('sbep_auth_token');
      const res = await fetch(`/api/scheduled-tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          name: name.trim(),
          scheduleType,
          scheduleConfig: buildScheduleConfig(),
          actionType: 'connector',
          actionParams: { connectorId, action, params: parsedPayload },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to update task');
      onUpdated(data);
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-violet-500/20 bg-gray-900 p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <h3 className="text-base font-bold text-white mb-4 font-mono">Edit Scheduled Task</h3>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-mono block mb-1">Task Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Post daily TikTok update"
              className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-violet-500/50" />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-mono block mb-1">Schedule</label>
            <select value={scheduleType} onChange={e => setScheduleType(e.target.value)}
              className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-violet-500/50">
              <option value="every_n_minutes">Every N minutes</option>
              <option value="every_n_hours">Every N hours</option>
              <option value="daily">Daily at specific time</option>
              <option value="weekly">Weekly on specific day</option>
            </select>
          </div>

          {scheduleType === 'every_n_minutes' && (
            <div>
              <label className="text-[10px] uppercase tracking-widest text-gray-500 font-mono block mb-1">Interval (minutes)</label>
              <input type="number" min="1" value={intervalMinutes} onChange={e => setIntervalMinutes(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-violet-500/50" />
            </div>
          )}
          {scheduleType === 'every_n_hours' && (
            <div>
              <label className="text-[10px] uppercase tracking-widest text-gray-500 font-mono block mb-1">Interval (hours)</label>
              <input type="number" min="1" value={intervalHours} onChange={e => setIntervalHours(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-violet-500/50" />
            </div>
          )}
          {(scheduleType === 'daily' || scheduleType === 'weekly') && (
            <div className="grid grid-cols-2 gap-2">
              {scheduleType === 'weekly' && (
                <div className="col-span-2">
                  <label className="text-[10px] uppercase tracking-widest text-gray-500 font-mono block mb-1">Day of Week</label>
                  <select value={dayOfWeek} onChange={e => setDayOfWeek(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-violet-500/50">
                    <option value={1}>Monday</option><option value={2}>Tuesday</option><option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option><option value={5}>Friday</option><option value={6}>Saturday</option><option value={7}>Sunday</option>
                  </select>
                </div>
              )}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-gray-500 font-mono block mb-1">Hour (UTC)</label>
                <input type="number" min="0" max="23" value={hour} onChange={e => setHour(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-violet-500/50" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-gray-500 font-mono block mb-1">Minute</label>
                <input type="number" min="0" max="59" value={minute} onChange={e => setMinute(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-violet-500/50" />
              </div>
            </div>
          )}

          <div>
            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-mono block mb-1">Connector</label>
            <select value={connectorId} onChange={e => setConnectorId(e.target.value)}
              className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-violet-500/50">
              <option value="webhook">Webhook</option>
              <option value="slack">Slack</option>
              <option value="twitter">Twitter/X</option>
              <option value="mailchimp">Mailchimp</option>
              <option value="convertkit">ConvertKit</option>
              <option value="sendgrid">SendGrid</option>
              <option value="zapier">Zapier</option>
              <option value="gohighlevel">GoHighLevel</option>
              <option value="stripe">Stripe</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-mono block mb-1">Action</label>
            <input value={action} onChange={e => setAction(e.target.value)} placeholder="trigger / postTweet / postMessage…"
              className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-violet-500/50" />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-mono block mb-1">Action Params (JSON)</label>
            <textarea value={actionPayload} onChange={e => setActionPayload(e.target.value)} rows={3}
              placeholder='{"text": "Daily update!"}'
              className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder-gray-600 focus:outline-none focus:border-violet-500/50 resize-none" />
          </div>

          {err && <p className="text-xs text-red-400 font-mono">{err}</p>}
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-white/10 text-gray-400 text-sm hover:text-white transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={loading}
            className="flex-1 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50">
            {loading ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AutomationSchedulePanel({ instanceId }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [toggling, setToggling] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const authHdrs = () => {
    const token = localStorage.getItem('sbep_auth_token');
    return token
      ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      : { 'Content-Type': 'application/json' };
  };

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/system-instances/${instanceId}/scheduled-tasks`, { headers: authHdrs() });
      if (res.ok) setTasks(await res.json());
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [instanceId]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const toggleTask = async (task) => {
    setToggling(task.id);
    try {
      const token = localStorage.getItem('sbep_auth_token');
      const res = await fetch(`/api/scheduled-tasks/${task.id}`, {
        method: 'PATCH',
        headers: authHdrs(),
        body: JSON.stringify({ enabled: !task.enabled }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTasks(ts => ts.map(t => t.id === task.id ? updated : t));
        toast.success(updated.enabled ? 'Task enabled' : 'Task paused');
      }
    } catch { toast.error('Failed to update task'); } finally {
      setToggling(null);
    }
  };

  const deleteTask = async (taskId) => {
    setDeleting(taskId);
    try {
      const token = localStorage.getItem('sbep_auth_token');
      const res = await fetch(`/api/scheduled-tasks/${taskId}`, {
        method: 'DELETE',
        headers: authHdrs(),
      });
      if (res.ok || res.status === 204) {
        setTasks(ts => ts.filter(t => t.id !== taskId));
        toast.success('Task deleted');
      }
    } catch { toast.error('Failed to delete task'); } finally {
      setDeleting(null);
    }
  };

  const STATUS_COLORS = {
    success:  { text: 'text-emerald-400', dot: 'bg-emerald-400', label: 'OK' },
    retrying: { text: 'text-yellow-400',  dot: 'bg-yellow-400',  label: 'Retrying' },
    failed:   { text: 'text-red-400',     dot: 'bg-red-400',     label: 'Failed' },
    null:     { text: 'text-gray-600',    dot: 'bg-gray-600',    label: 'Never run' },
  };

  return (
    <>
      {showAdd && (
        <AddTaskModal
          instanceId={instanceId}
          onCreated={(task) => { setTasks(ts => [task, ...ts]); toast.success('Scheduled task created'); }}
          onClose={() => setShowAdd(false)}
        />
      )}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onUpdated={(updated) => {
            setTasks(ts => ts.map(t => t.id === updated.id ? updated : t));
            toast.success('Task updated');
            setEditingTask(null);
          }}
          onClose={() => setEditingTask(null)}
        />
      )}
      <div className="rounded-xl border border-white/10 bg-black/80 backdrop-blur-sm">
        <div className="border-b border-white/5 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse"></span>
            <span className="text-xs font-mono text-gray-300 uppercase tracking-widest">Automation Schedule</span>
            <span className="text-xs text-gray-600 font-mono">
              {tasks.filter(t => t.enabled).length} active
            </span>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-violet-500/30 text-violet-400 text-xs font-mono hover:bg-violet-500/10 transition-colors"
          >
            <span>+</span> Add Task
          </button>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <div className="w-5 h-5 border border-violet-400/30 border-t-violet-400 rounded-full animate-spin mx-auto" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-2xl mb-2">⏰</p>
            <p className="text-sm text-gray-400 font-mono">No scheduled tasks yet</p>
            <p className="text-xs text-gray-600 mt-1">Add recurring tasks to automate your system 24/7</p>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-4 px-4 py-2 rounded-lg border border-violet-500/20 bg-violet-500/5 text-xs text-violet-400 hover:bg-violet-500/10 transition-colors font-mono"
            >
              Add first task →
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {tasks.map((task) => {
              const statusKey = task.lastRunStatus ?? 'null';
              const sColor = STATUS_COLORS[statusKey] ?? STATUS_COLORS['null'];
              const isDisabled = !task.enabled;
              return (
                <div key={task.id} className={`px-4 py-3 flex items-start gap-3 ${isDisabled ? 'opacity-50' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white font-mono truncate">{task.name}</span>
                      {isDisabled && (
                        <span className="px-1.5 py-0.5 rounded bg-gray-600/20 border border-gray-600/30 text-[9px] font-mono text-gray-500 uppercase">Paused</span>
                      )}
                      {task.lastRunStatus === 'failed' && (
                        <span className="px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-[9px] font-mono text-red-400 uppercase">Failed</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-[11px] font-mono text-violet-400">
                        ⏱ {formatScheduleLabel(task.scheduleType, task.scheduleConfig)}
                      </span>
                      <span className="text-[10px] font-mono text-gray-600">
                        {task.actionParams?.connectorId && `${task.actionParams.connectorId} → ${task.actionParams.action}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <div className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${sColor.dot}`} />
                        <span className={`text-[10px] font-mono ${sColor.text}`}>{sColor.label}</span>
                      </div>
                      {task.lastRunAt && (
                        <span className="text-[10px] text-gray-700 font-mono">Last: {timeAgo(task.lastRunAt)}</span>
                      )}
                      {task.nextRunAt && task.enabled && (
                        <span className="text-[10px] text-gray-500 font-mono">Next: {timeAgo(task.nextRunAt)}</span>
                      )}
                    </div>
                    {task.lastRunError && task.lastRunStatus === 'failed' && (
                      <p className="text-[10px] text-red-400 mt-1 truncate font-mono">{task.lastRunError}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setEditingTask(task)}
                      disabled={toggling === task.id || deleting === task.id}
                      className="px-2 py-1 rounded text-[10px] font-mono border border-blue-500/20 text-blue-400 hover:bg-blue-500/10 transition-colors disabled:opacity-40"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleTask(task)}
                      disabled={toggling === task.id || deleting === task.id}
                      className={`px-2 py-1 rounded text-[10px] font-mono border transition-colors disabled:opacity-40 ${
                        task.enabled
                          ? 'border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10'
                          : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                      }`}
                    >
                      {toggling === task.id ? '…' : task.enabled ? 'Pause' : 'Enable'}
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      disabled={deleting === task.id || toggling === task.id}
                      className="px-2 py-1 rounded text-[10px] font-mono border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                    >
                      {deleting === task.id ? '…' : '✕'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// ─── REAL REVENUE PANEL ───────────────────────────────────────────────────────

const PROVIDER_META = {
  stripe:  { label: 'Stripe',  icon: '💳', color: 'text-violet-400', credentialKeys: ['stripe_secret_key'],                              hints: { stripe_secret_key: 'Stripe Secret Key (sk_live_…)' } },
  gumroad: { label: 'Gumroad', icon: '🟢', color: 'text-emerald-400', credentialKeys: ['gumroad_access_token'],                           hints: { gumroad_access_token: 'Gumroad Access Token' } },
  paypal:  { label: 'PayPal',  icon: '🔵', color: 'text-blue-400',    credentialKeys: ['paypal_client_id', 'paypal_client_secret'],       hints: { paypal_client_id: 'PayPal Client ID', paypal_client_secret: 'PayPal Client Secret' } },
};

function LinkProviderModal({ instanceId, onLinked, onClose }) {
  const [provider, setProvider] = useState('stripe');
  const [credentialKeys, setCredentialKeys] = useState({});
  const [userCreds, setUserCreds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('sbep_auth_token');
    fetch('/api/user-credentials/summary', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => { setUserCreds(Array.isArray(data) ? data : []); })
      .catch(() => {});
  }, []);

  const providerMeta = PROVIDER_META[provider] ?? { credentialKeys: [], hints: {}, label: provider, icon: '🔑', color: 'text-gray-400' };
  const requiredKeys = providerMeta.credentialKeys ?? [];

  const setKeyMapping = (providerKey, userCredKey) => {
    setCredentialKeys(prev => ({ ...prev, [providerKey]: userCredKey }));
  };

  const handleLink = async () => {
    const missingKeys = requiredKeys.filter(k => !credentialKeys[k]);
    if (missingKeys.length > 0) {
      setErr(`Select credentials for: ${missingKeys.join(', ')}`);
      return;
    }
    setLoading(true);
    setErr('');
    try {
      const token = localStorage.getItem('sbep_auth_token');
      const res = await fetch(`/api/system-instances/${instanceId}/revenue-providers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ provider, credentialKeys }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to link provider');
      onLinked(data);
      onClose();
      toast.success(`${providerMeta.label} linked — syncing revenue…`);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = requiredKeys.every(k => credentialKeys[k]) && userCreds.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-emerald-500/20 bg-gray-900 p-6 shadow-2xl">
        <h3 className="text-base font-bold text-white mb-1 font-mono">Link Revenue Source</h3>
        <p className="text-xs text-gray-500 mb-5">Connect a payment platform to track real income for this system.</p>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-mono block mb-1">Payment Provider</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(PROVIDER_META).map(([pid, meta]) => (
                <button
                  key={pid}
                  onClick={() => { setProvider(pid); setCredentialKeys({}); setErr(''); }}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                    provider === pid
                      ? 'border-emerald-500/50 bg-emerald-500/10'
                      : 'border-white/10 bg-black/40 hover:border-white/20'
                  }`}
                >
                  <span className="text-xl">{meta.icon}</span>
                  <span className={`text-[10px] font-mono ${provider === pid ? meta.color : 'text-gray-400'}`}>{meta.label}</span>
                </button>
              ))}
            </div>
          </div>

          {userCreds.length === 0 ? (
            <p className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2">
              No credentials found. Add your {providerMeta.label} keys in the{' '}
              <a href="/connections" className="underline">Connections Hub</a> first.
            </p>
          ) : (
            requiredKeys.map(providerKey => (
              <div key={providerKey}>
                <label className="text-[10px] uppercase tracking-widest text-gray-500 font-mono block mb-1">
                  {providerMeta.hints?.[providerKey] ?? providerKey}
                </label>
                <select
                  value={credentialKeys[providerKey] ?? ''}
                  onChange={e => setKeyMapping(providerKey, e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="">— select stored credential —</option>
                  {userCreds.map(c => (
                    <option key={c.id} value={c.credentialKey}>{c.credentialKey}</option>
                  ))}
                </select>
              </div>
            ))
          )}

          {err && <p className="text-xs text-red-400 font-mono">{err}</p>}
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-white/10 text-gray-400 text-sm hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={handleLink}
            disabled={loading || !canSubmit}
            className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Linking…' : 'Link Provider'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RealRevenuePanel({ instanceId }) {
  const [linkedProviders, setLinkedProviders] = useState([]);
  const [realRevenue, setRealRevenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('sbep_auth_token');
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [providersRes, revenueRes] = await Promise.all([
        fetch(`/api/system-instances/${instanceId}/revenue-providers`, { headers }),
        fetch(`/api/system-instances/${instanceId}/real-revenue`, { headers }),
      ]);
      if (providersRes.ok) setLinkedProviders(await providersRes.json());
      if (revenueRes.ok) setRealRevenue(await revenueRes.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [instanceId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSync = async (providerId) => {
    setSyncing(providerId);
    try {
      const token = localStorage.getItem('sbep_auth_token');
      const res = await fetch(`/api/system-instances/${instanceId}/revenue-providers/${providerId}/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Sync failed');
      toast.success(`Synced ${data.synced} new transaction${data.synced !== 1 ? 's' : ''}`);
      await fetchData();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSyncing(null);
    }
  };

  const handleUnlink = async (providerId, providerName) => {
    const token = localStorage.getItem('sbep_auth_token');
    try {
      const res = await fetch(`/api/system-instances/${instanceId}/revenue-providers/${providerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Unlink failed');
      toast.success(`${providerName} unlinked`);
      await fetchData();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const stats = realRevenue?.stats;

  return (
    <>
      {showModal && (
        <LinkProviderModal
          instanceId={instanceId}
          onLinked={() => { setShowModal(false); fetchData(); }}
          onClose={() => setShowModal(false)}
        />
      )}

      <div className="rounded-xl border border-emerald-500/20 bg-black/80 backdrop-blur-sm">
        <div className="border-b border-white/5 px-4 py-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="text-xs font-mono text-gray-300 uppercase tracking-widest">Live Revenue</span>
          <span className="ml-auto flex items-center gap-2">
            {loading && <span className="w-3 h-3 border border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />}
            <button
              onClick={() => setShowModal(true)}
              className="text-xs font-mono text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/50 px-2 py-0.5 rounded-md transition-all"
            >
              + Link Source
            </button>
          </span>
        </div>

        <div className="p-5 space-y-4">
          {!loading && linkedProviders.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-2xl mb-2">🔗</p>
              <p className="text-sm font-medium text-white mb-1">No revenue source linked</p>
              <p className="text-xs text-gray-500 mb-4">Connect Stripe, Gumroad, or PayPal to track real income from this system.</p>
              <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
              >
                Link Revenue Source
              </button>
            </div>
          ) : (
            <>
              {/* Linked provider badges */}
              <div className="flex flex-wrap gap-2">
                {linkedProviders.map(p => {
                  const meta = PROVIDER_META[p.provider] ?? { label: p.provider, icon: '💰', color: 'text-gray-400' };
                  const isSyncing = syncing === p.id;
                  return (
                    <div key={p.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-black/60">
                      <span>{meta.icon}</span>
                      <span className={`text-xs font-mono font-semibold ${meta.color}`}>{meta.label}</span>
                      {p.syncStatus === 'ok' && <span className="text-[9px] text-emerald-500 font-mono">✓ synced</span>}
                      {p.syncStatus === 'error' && <span className="text-[9px] text-red-400 font-mono" title={p.syncMessage}>⚠ error</span>}
                      {p.syncStatus === 'syncing' && <span className="text-[9px] text-blue-400 font-mono animate-pulse">syncing…</span>}
                      {p.lastSyncAt && (
                        <span className="text-[9px] text-gray-600 font-mono">{timeAgo(p.lastSyncAt)}</span>
                      )}
                      <button
                        onClick={() => handleSync(p.id)}
                        disabled={isSyncing}
                        title="Refresh revenue data"
                        className="text-[10px] text-gray-500 hover:text-emerald-400 transition-colors disabled:opacity-30 ml-1"
                      >
                        {isSyncing ? '⟳' : '↺'}
                      </button>
                      <button
                        onClick={() => handleUnlink(p.id, meta.label)}
                        title="Unlink provider"
                        className="text-[10px] text-gray-600 hover:text-red-400 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Real revenue stats */}
              {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Today',    value: centsToDisplay(stats.todayCents) },
                    { label: 'This Week', value: centsToDisplay(stats.weekCents) },
                    { label: 'This Month', value: centsToDisplay(stats.monthCents) },
                    { label: 'All Time',  value: centsToDisplay(stats.lifetimeCents) },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-lg bg-emerald-500/5 border border-emerald-500/15 p-3 text-center">
                      <p className="text-[10px] uppercase tracking-widest text-gray-600 font-mono mb-1">{label}</p>
                      <p className={`text-xl font-bold font-mono ${stats.lifetimeCents > 0 ? 'text-emerald-400' : 'text-white'}`}>{value}</p>
                    </div>
                  ))}
                </div>
              )}

              {stats && stats.trend && stats.trend.some(t => t.amountCents > 0) && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-600 font-mono mb-1">7-day real revenue</p>
                  <div className="rounded-lg bg-black/60 border border-white/10 p-3">
                    <RevenueSparkline trend={stats.trend} />
                    <div className="flex justify-between mt-1">
                      {stats.trend.map(t => (
                        <span key={t.date} className="text-[9px] text-gray-700 font-mono">{t.date.slice(5)}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─── REVENUE SECTION ──────────────────────────────────────────────────────────

function RevenueSection({ instanceId, buildStatus, buildRevenueCents = 0 }) {
  const [revenue, setRevenue] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loadingRevenue, setLoadingRevenue] = useState(true);

  const fetchActivity = useCallback(async () => {
    try {
      const actRes = await fetch(`/api/system-instances/${instanceId}/activity`, { headers: authHeaders() });
      if (actRes.ok) setActivity(await actRes.json());
    } catch {
      // silently ignore
    }
  }, [instanceId]);

  const fetchRevenue = useCallback(async () => {
    try {
      const [revRes, actRes] = await Promise.all([
        fetch(`/api/system-instances/${instanceId}/revenue`, { headers: authHeaders() }),
        fetch(`/api/system-instances/${instanceId}/activity`, { headers: authHeaders() }),
      ]);
      if (revRes.ok) setRevenue(await revRes.json());
      if (actRes.ok) setActivity(await actRes.json());
    } catch {
      // silently ignore
    } finally {
      setLoadingRevenue(false);
    }
  }, [instanceId]);

  useEffect(() => {
    fetchRevenue();
  }, [fetchRevenue]);

  // While building, poll both revenue and activity every 8 seconds so the
  // build engine's events appear promptly.
  useEffect(() => {
    if (buildStatus !== 'building') return;
    const interval = setInterval(fetchRevenue, 8000);
    return () => clearInterval(interval);
  }, [fetchRevenue, buildStatus]);

  // While active, poll only the activity endpoint every 8 seconds so the
  // live feed stays current without fetching revenue unnecessarily.
  useEffect(() => {
    if (buildStatus !== 'active') return;
    const interval = setInterval(fetchActivity, 8000);
    return () => clearInterval(interval);
  }, [fetchActivity, buildStatus]);

  // Use the build-time total as a floor for Lifetime until the API catches up.
  const effectiveLifetimeCents = Math.max(revenue?.lifetimeCents ?? 0, buildRevenueCents);
  const revenueCards = [
    { label: 'Today',      value: revenue ? centsToDisplay(revenue.todayCents)    : '$0', accent: 'emerald' },
    { label: 'This Week',  value: revenue ? centsToDisplay(revenue.weekCents)     : '$0', accent: 'emerald' },
    { label: 'This Month', value: revenue ? centsToDisplay(revenue.monthCents)    : '$0', accent: 'emerald' },
    { label: 'Lifetime',   value: centsToDisplay(effectiveLifetimeCents),                 accent: 'emerald' },
  ];

  return (
    <>
      {/* ── Revenue Tracking ── */}
      <div className="rounded-xl border border-white/10 bg-black/80 backdrop-blur-sm">
        <div className="border-b border-white/5 px-4 py-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="text-xs font-mono text-gray-300 uppercase tracking-widest">Revenue Tracking</span>
          {loadingRevenue && (
            <span className="ml-auto w-3 h-3 border border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
          )}
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {revenueCards.map(({ label, value }) => (
              <div key={label} className="rounded-lg bg-white/3 border border-white/5 p-3 text-center">
                <p className="text-[10px] uppercase tracking-widest text-gray-600 font-mono mb-1">{label}</p>
                <p className={`text-xl font-bold font-mono ${(label === 'Lifetime' ? effectiveLifetimeCents : revenue && (label === 'Today' ? revenue.todayCents : label === 'This Week' ? revenue.weekCents : revenue.monthCents)) > 0 ? 'text-emerald-400' : 'text-white'}`}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          {revenue && revenue.trend && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-600 font-mono mb-1">7-day revenue trend</p>
              <div className="rounded-lg bg-black/60 border border-white/10 p-3">
                <RevenueSparkline trend={revenue.trend} />
                <div className="flex justify-between mt-1">
                  {revenue.trend.map((t) => (
                    <span key={t.date} className="text-[9px] text-gray-700 font-mono">{t.date.slice(5)}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Live Activity Feed ── */}
      <div className="rounded-xl border border-white/10 bg-black/80 backdrop-blur-sm">
        <div className="border-b border-white/5 px-4 py-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
          <span className="text-xs font-mono text-gray-300 uppercase tracking-widest">Live Activity</span>
          <span className="ml-auto text-xs text-gray-600">{activity.length} event{activity.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="divide-y divide-white/5 max-h-80 overflow-y-auto">
          {activity.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-xs font-mono text-gray-600">No activity recorded yet.</p>
              <p className="text-[10px] text-gray-700 mt-1">Events will appear here as your system runs.</p>
            </div>
          ) : (
            activity.map((evt) => {
              const meta = EVENT_TYPE_META[evt.eventType] ?? EVENT_TYPE_META.action;
              return (
                <div key={evt.id} className="flex items-start gap-3 px-4 py-3 hover:bg-white/2 transition-colors">
                  <span className="text-base shrink-0 mt-0.5">{meta.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-200 leading-snug">{evt.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-mono uppercase ${meta.color}`}>{meta.label}</span>
                      {evt.amountCents != null && evt.amountCents > 0 && (
                        <span className="text-[10px] font-mono text-emerald-400">+{centsToDisplay(evt.amountCents)}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-600 shrink-0 font-mono whitespace-nowrap mt-0.5">
                    {timeAgo(evt.createdAt)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

// ─── EXPERIMENTS PANEL ────────────────────────────────────────────────────────

const TEST_TYPE_META = {
  landing_page:   { icon: '🖥', label: 'Landing Page',   color: 'text-blue-400',   bg: 'bg-blue-400/10',   border: 'border-blue-400/20' },
  email_subject:  { icon: '✉',  label: 'Email Subject',  color: 'text-amber-400',  bg: 'bg-amber-400/10',  border: 'border-amber-400/20' },
};

const TEST_STATUS_META = {
  running:   { label: 'Running',   color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', dot: 'bg-emerald-400', pulse: true },
  concluded: { label: 'Concluded', color: 'text-violet-400',  bg: 'bg-violet-400/10',  border: 'border-violet-400/20', dot: 'bg-violet-400',  pulse: false },
  archived:  { label: 'Archived',  color: 'text-gray-600',    bg: 'bg-gray-600/10',    border: 'border-gray-600/20',   dot: 'bg-gray-600',    pulse: false },
};

function convRate(visits, conversions) {
  if (!visits) return '—';
  return `${((conversions / visits) * 100).toFixed(1)}%`;
}

function CreateAbTestModal({ instanceId, onCreated, onClose }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('landing_page');
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/ab-tests', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ systemInstanceId: instanceId, name: name.trim(), type }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to create test');
      }
      const data = await res.json();
      toast.success('A/B test created');
      onCreated(data);
    } catch (err) {
      toast.error(err.message);
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-gray-900 p-6 shadow-2xl">
        <h3 className="text-sm font-bold text-white mb-4">New A/B Test</h3>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono">Test Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Hero headline test"
              className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/20"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono">Test Type</label>
            <div className="flex gap-2">
              {[['landing_page', '🖥 Landing Page'], ['email_subject', '✉ Email Subject']].map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setType(v)}
                  className={`flex-1 py-2 rounded-lg text-xs font-mono border transition-all ${
                    type === v
                      ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                      : 'border-white/10 text-gray-500 hover:text-gray-300 hover:border-white/20'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-white/10 text-gray-400 text-sm hover:text-white transition-colors">Cancel</button>
            <button type="submit" disabled={saving || !name.trim()} className="flex-1 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50">
              {saving ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GenerateVariantsModal({ test, onGenerated, onClose }) {
  const [originalContent, setOriginalContent] = useState('');
  const [generating, setGenerating] = useState(false);

  const isEmail = test.type === 'email_subject';

  async function generate(e) {
    e.preventDefault();
    if (!originalContent.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch(`/api/ab-tests/${test.id}/generate-variants`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ originalContent: originalContent.trim(), pageTitle: test.name, numberOfVariants: 2 }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Generation failed');
      }
      const data = await res.json();
      toast.success(`${data.variants.length} variants generated`);
      onGenerated(data.variants);
    } catch (err) {
      toast.error(err.message);
    } finally { setGenerating(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-gray-900 p-6 shadow-2xl">
        <h3 className="text-sm font-bold text-white mb-1">Generate Variants with ASH</h3>
        <p className="text-xs text-gray-500 mb-4">
          {isEmail
            ? 'Paste your original email subject line and ASH will create 2 alternatives.'
            : 'Describe your current landing page and ASH will create 2 variant descriptions to test.'}
        </p>
        <form onSubmit={generate} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono">{isEmail ? 'Original Subject Line' : 'Original Content Description'}</label>
            <textarea
              value={originalContent}
              onChange={(e) => setOriginalContent(e.target.value)}
              rows={isEmail ? 2 : 4}
              placeholder={isEmail ? 'e.g. "5 tools to grow your audience"' : 'e.g. "Landing page for my affiliate review site with a bold headline promising passive income..."'}
              className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/20 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-white/10 text-gray-400 text-sm hover:text-white transition-colors">Cancel</button>
            <button type="submit" disabled={generating || !originalContent.trim()} className="flex-1 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50">
              {generating ? '✨ Generating…' : '✨ Generate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ExperimentsPanel({ instanceId }) {
  const [tests, setTests] = useState([]);
  const [variants, setVariants] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showGenerate, setShowGenerate] = useState(null);
  const [expanded, setExpanded] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ab-tests?systemInstanceId=${instanceId}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setTests(data);
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  }, [instanceId]);

  useEffect(() => { load(); }, [load]);

  async function loadVariants(testId) {
    if (variants[testId]) { setExpanded(prev => ({ ...prev, [testId]: !prev[testId] })); return; }
    try {
      const res = await fetch(`/api/ab-tests/${testId}`, { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setVariants(prev => ({ ...prev, [testId]: data.variants }));
      setExpanded(prev => ({ ...prev, [testId]: true }));
    } catch { /* ignore */ }
  }

  async function deleteTest(test) {
    if (!confirm(`Delete A/B test "${test.name}"?`)) return;
    try {
      await fetch(`/api/ab-tests/${test.id}`, { method: 'DELETE', headers: authHeaders() });
      setTests(prev => prev.filter(t => t.id !== test.id));
      toast.success('Test deleted');
    } catch { toast.error('Delete failed'); }
  }

  function onTestCreated(test) {
    setTests(prev => [test, ...prev]);
    setShowCreate(false);
    setShowGenerate(test);
  }

  function onVariantsGenerated(testId, newVariants) {
    setVariants(prev => ({ ...prev, [testId]: [...(prev[testId] ?? []), ...newVariants] }));
    setExpanded(prev => ({ ...prev, [testId]: true }));
    setShowGenerate(null);
  }

  const copyCookieSnippet = (test) => {
    const snippet = `<script>
// A/B Test: ${test.name}
fetch('/api/public/ab-tests/${test.token}/assign', { credentials: 'include' })
  .then(r => r.json())
  .then(d => {
    window.__abVariant = d;
    // Use d.variantId and d.contentRef to show the right variant
  });
// Track conversions:
// fetch('/api/public/ab-tests/${test.token}/convert', { method:'POST', credentials:'include' })
</script>`;
    navigator.clipboard.writeText(snippet).then(() => toast.success('Tracking snippet copied'));
  };

  return (
    <>
      {showCreate && (
        <CreateAbTestModal instanceId={instanceId} onCreated={onTestCreated} onClose={() => setShowCreate(false)} />
      )}
      {showGenerate && (
        <GenerateVariantsModal
          test={showGenerate}
          onGenerated={(v) => onVariantsGenerated(showGenerate.id, v)}
          onClose={() => setShowGenerate(null)}
        />
      )}
      <div className="rounded-xl border border-white/10 bg-black/80 backdrop-blur-sm">
        <div className="border-b border-white/5 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-violet-400"></span>
            <span className="text-xs font-mono text-gray-300 uppercase tracking-widest">Experiments</span>
            <span className="text-xs text-gray-600 font-mono">{tests.length} test{tests.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="px-2 py-1 rounded-lg text-[10px] font-mono text-gray-600 hover:text-gray-400 transition-all">↺</button>
            <button
              onClick={() => setShowCreate(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-mono bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/20 transition-all"
            >
              + New Test
            </button>
          </div>
        </div>

        {loading ? (
          <div className="px-4 py-10 text-center">
            <div className="w-5 h-5 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-gray-600 font-mono">Loading experiments…</p>
          </div>
        ) : tests.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-2xl mb-2">🧪</p>
            <p className="text-xs text-gray-500 font-mono mb-1">No A/B tests yet.</p>
            <p className="text-xs text-gray-700 font-mono">Create a test and let ASH generate variants to find what converts best.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {tests.map(test => {
              const tm = TEST_TYPE_META[test.type] ?? TEST_TYPE_META.landing_page;
              const sm = TEST_STATUS_META[test.status] ?? TEST_STATUS_META.running;
              const testVariants = variants[test.id] ?? [];
              const isExpanded = expanded[test.id];

              return (
                <div key={test.id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 ${tm.bg} ${tm.border} border`}>
                      {tm.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-white truncate">{test.name}</span>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border ${sm.color} ${sm.bg} ${sm.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sm.dot} ${sm.pulse ? 'animate-pulse' : ''}`} />
                          {sm.label}
                        </span>
                        <span className={`text-[10px] font-mono ${tm.color}`}>{tm.label}</span>
                      </div>
                      <p className="text-[10px] text-gray-600 font-mono mt-0.5">
                        Created {timeAgo(test.createdAt)}
                        {test.concludedAt && ` · Concluded ${timeAgo(test.concludedAt)}`}
                      </p>

                      {/* Variant rows */}
                      {isExpanded && testVariants.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          {testVariants.map(v => {
                            const isWinner = test.winnerVariantId === v.id;
                            return (
                              <div key={v.id} className={`rounded-lg p-2.5 border ${isWinner ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/5 bg-white/2'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-[10px] font-mono font-semibold ${isWinner ? 'text-emerald-400' : 'text-gray-300'}`}>
                                    {isWinner ? '🏆 ' : ''}{v.name}
                                  </span>
                                  <span className="text-[10px] text-gray-600 font-mono ml-auto">
                                    {v.visits} visits · {v.conversions} conv · {convRate(v.visits, v.conversions)}
                                  </span>
                                </div>
                                {/* Conversion rate bar */}
                                <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${isWinner ? 'bg-emerald-400' : 'bg-violet-400'}`}
                                    style={{ width: `${Math.min(100, (v.conversions / Math.max(v.visits, 1)) * 100 * 10)}%` }}
                                  />
                                </div>
                                {v.contentRef && (
                                  <p className="text-[10px] text-gray-600 mt-1.5 line-clamp-2 leading-relaxed">{v.contentRef}</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-1">
                      <button
                        onClick={() => loadVariants(test.id)}
                        className="px-2 py-1 rounded text-[10px] font-mono text-gray-600 hover:text-gray-400 border border-white/5 hover:border-white/10 transition-all"
                        title={isExpanded ? 'Hide variants' : 'Show variants'}
                      >
                        {isExpanded ? '▲' : '▼'}
                      </button>
                      {test.status === 'running' && (
                        <button
                          onClick={() => setShowGenerate(test)}
                          className="px-2 py-1 rounded text-[10px] font-mono text-violet-400 hover:text-violet-300 border border-violet-500/20 hover:border-violet-500/40 bg-violet-500/5 hover:bg-violet-500/10 transition-all"
                          title="Generate variants with ASH"
                        >
                          ✨
                        </button>
                      )}
                      <button
                        onClick={() => copyCookieSnippet(test)}
                        className="px-2 py-1 rounded text-[10px] font-mono text-gray-600 hover:text-gray-400 border border-white/5 hover:border-white/10 transition-all"
                        title="Copy tracking snippet"
                      >
                        {'</>'}
                      </button>
                      <button
                        onClick={() => deleteTest(test)}
                        className="px-2 py-1 rounded text-[10px] font-mono text-red-500 hover:text-red-400 border border-red-500/10 hover:border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-all"
                        title="Delete test"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// ─── WEBHOOKS PANEL ───────────────────────────────────────────────────────────

const ACTION_TYPE_META = {
  log_event:        { label: 'Log Event',        icon: '📋', color: 'text-blue-400',    bg: 'bg-blue-400/10',    border: 'border-blue-400/20' },
  run_ash_task:     { label: 'Run ASH Task',      icon: '🤖', color: 'text-violet-400',  bg: 'bg-violet-400/10',  border: 'border-violet-400/20' },
  send_email:       { label: 'Send Email',        icon: '✉',  color: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-400/20' },
  publish_content:  { label: 'Publish Content',   icon: '📤', color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
  connector_action: { label: 'Connector Action',  icon: '⚡', color: 'text-cyan-400',    bg: 'bg-cyan-400/10',    border: 'border-cyan-400/20' },
};

function webhookUrl(token) {
  return `${window.location.origin}/api/webhooks/${token}`;
}

function CopyBtn({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="px-2.5 py-1 rounded-lg text-[10px] font-mono bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 transition-all"
    >
      {copied ? '✓ Copied' : label}
    </button>
  );
}

function AddWebhookModal({ instanceId, onCreated, onClose }) {
  const [name, setName] = useState('');
  const [actionType, setActionType] = useState('log_event');
  const [description, setDescription] = useState('');
  const [prompt, setPrompt] = useState('');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [channel, setChannel] = useState('twitter');
  const [connectorId, setConnectorId] = useState('');
  const [connectorAction, setConnectorAction] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const buildActionConfig = () => {
    if (actionType === 'log_event')        return { description: description || undefined };
    if (actionType === 'run_ash_task')     return { prompt: prompt || undefined };
    if (actionType === 'send_email')       return { to, subject };
    if (actionType === 'publish_content')  return { channel };
    if (actionType === 'connector_action') return { connectorId, action: connectorAction };
    return {};
  };

  const handleCreate = async () => {
    if (!name.trim()) { setErr('Name is required'); return; }
    setLoading(true); setErr('');
    try {
      const token = localStorage.getItem('sbep_auth_token');
      const res = await fetch(`/api/system-instances/${instanceId}/webhooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ name: name.trim(), actionType, actionConfig: buildActionConfig(), enabled: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create');
      onCreated(data);
      onClose();
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-blue-500/20 bg-gray-900 p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <h3 className="text-base font-bold text-white mb-4 font-mono">New Webhook Trigger</h3>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-mono block mb-1">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Stripe payment received"
              className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-blue-500/50" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-mono block mb-1">When fired, do…</label>
            <select value={actionType} onChange={e => setActionType(e.target.value)}
              className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500/50">
              {Object.entries(ACTION_TYPE_META).map(([v, m]) => (
                <option key={v} value={v}>{m.icon} {m.label}</option>
              ))}
            </select>
          </div>
          {actionType === 'log_event' && (
            <div>
              <label className="text-[10px] uppercase tracking-widest text-gray-500 font-mono block mb-1">Log description (optional)</label>
              <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Webhook fired from Zapier"
                className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-blue-500/50" />
            </div>
          )}
          {actionType === 'run_ash_task' && (
            <div>
              <label className="text-[10px] uppercase tracking-widest text-gray-500 font-mono block mb-1">ASH prompt (optional)</label>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3}
                placeholder="A payment was received. Follow up with the customer and update the CRM."
                className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-blue-500/50 resize-none" />
            </div>
          )}
          {actionType === 'send_email' && (
            <>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-gray-500 font-mono block mb-1">To (email)</label>
                <input value={to} onChange={e => setTo(e.target.value)} placeholder="you@example.com"
                  className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-blue-500/50" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-gray-500 font-mono block mb-1">Subject</label>
                <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Webhook notification"
                  className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-blue-500/50" />
              </div>
            </>
          )}
          {actionType === 'publish_content' && (
            <div>
              <label className="text-[10px] uppercase tracking-widest text-gray-500 font-mono block mb-1">Channel</label>
              <select value={channel} onChange={e => setChannel(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500/50">
                {['twitter','instagram','mailchimp','convertkit','wordpress','ghost'].map(c => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
          )}
          {actionType === 'connector_action' && (
            <>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-gray-500 font-mono block mb-1">Connector ID</label>
                <input value={connectorId} onChange={e => setConnectorId(e.target.value)} placeholder="stripe"
                  className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-blue-500/50" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-gray-500 font-mono block mb-1">Action</label>
                <input value={connectorAction} onChange={e => setConnectorAction(e.target.value)} placeholder="create_invoice"
                  className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-blue-500/50" />
              </div>
            </>
          )}
          {err && <p className="text-xs text-red-400 font-mono">{err}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-white/10 text-gray-400 text-sm hover:text-white transition-colors">Cancel</button>
            <button onClick={handleCreate} disabled={loading}
              className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">
              {loading ? 'Creating…' : 'Create Webhook'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WebhookLogRow({ log }) {
  const [expanded, setExpanded] = useState(false);
  const isOk = log.responseStatus < 400;
  return (
    <div className="px-4 py-2 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => setExpanded(v => !v)}>
        <span className={`text-[10px] font-mono font-bold w-8 shrink-0 ${isOk ? 'text-emerald-400' : 'text-red-400'}`}>
          {log.responseStatus}
        </span>
        <span className="text-[10px] font-mono text-gray-400 flex-1 truncate">
          {log.responseBody ?? '—'}
        </span>
        <span className="text-[9px] text-gray-700 font-mono shrink-0 whitespace-nowrap">{timeAgo(log.receivedAt)}</span>
        {log.processingMs != null && (
          <span className="text-[9px] text-gray-700 font-mono shrink-0">{log.processingMs}ms</span>
        )}
        <span className="text-[9px] text-gray-700 ml-1">{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && log.payload && (
        <pre className="mt-2 text-[9px] font-mono text-gray-500 bg-black/60 rounded p-2 overflow-x-auto max-h-32">
          {JSON.stringify(log.payload, null, 2)}
        </pre>
      )}
    </div>
  );
}

function EditWebhookModal({ endpoint, instanceId, onUpdated, onClose }) {
  const [name, setName] = useState(endpoint.name);
  const [actionType, setActionType] = useState(endpoint.actionType);
  const cfg = endpoint.actionConfig ?? {};
  const [description, setDescription] = useState(cfg.description ?? '');
  const [prompt, setPrompt] = useState(cfg.prompt ?? '');
  const [to, setTo] = useState(cfg.to ?? '');
  const [subject, setSubject] = useState(cfg.subject ?? '');
  const [channel, setChannel] = useState(cfg.channel ?? 'twitter');
  const [connectorId, setConnectorId] = useState(cfg.connectorId ?? '');
  const [connectorAction, setConnectorAction] = useState(cfg.action ?? '');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const buildActionConfig = () => {
    if (actionType === 'log_event')        return { description: description || undefined };
    if (actionType === 'run_ash_task')     return { prompt: prompt || undefined };
    if (actionType === 'send_email')       return { to, subject };
    if (actionType === 'publish_content')  return { channel };
    if (actionType === 'connector_action') return { connectorId, action: connectorAction };
    return {};
  };

  const handleSave = async () => {
    if (!name.trim()) { setErr('Name is required'); return; }
    setLoading(true); setErr('');
    try {
      const token = localStorage.getItem('sbep_auth_token');
      const res = await fetch(`/api/system-instances/${instanceId}/webhooks/${endpoint.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ name: name.trim(), actionType, actionConfig: buildActionConfig() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to update');
      onUpdated(data);
      onClose();
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-blue-500/20 bg-gray-900 p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <h3 className="text-base font-bold text-white mb-4 font-mono">Edit Webhook</h3>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-mono block mb-1">Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500/50" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-mono block mb-1">Action</label>
            <select value={actionType} onChange={e => setActionType(e.target.value)}
              className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500/50">
              {Object.entries(ACTION_TYPE_META).map(([v, m]) => (
                <option key={v} value={v}>{m.icon} {m.label}</option>
              ))}
            </select>
          </div>
          {actionType === 'log_event' && (
            <div>
              <label className="text-[10px] uppercase tracking-widest text-gray-500 font-mono block mb-1">Log description (optional)</label>
              <input value={description} onChange={e => setDescription(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500/50" />
            </div>
          )}
          {actionType === 'run_ash_task' && (
            <div>
              <label className="text-[10px] uppercase tracking-widest text-gray-500 font-mono block mb-1">ASH prompt (optional)</label>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3}
                className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500/50 resize-none" />
            </div>
          )}
          {actionType === 'send_email' && (
            <>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-gray-500 font-mono block mb-1">To (email)</label>
                <input value={to} onChange={e => setTo(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500/50" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-gray-500 font-mono block mb-1">Subject</label>
                <input value={subject} onChange={e => setSubject(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500/50" />
              </div>
            </>
          )}
          {actionType === 'publish_content' && (
            <div>
              <label className="text-[10px] uppercase tracking-widest text-gray-500 font-mono block mb-1">Channel</label>
              <select value={channel} onChange={e => setChannel(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500/50">
                {['twitter','instagram','mailchimp','convertkit','wordpress','ghost'].map(c => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
          )}
          {actionType === 'connector_action' && (
            <>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-gray-500 font-mono block mb-1">Connector ID</label>
                <input value={connectorId} onChange={e => setConnectorId(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500/50" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-gray-500 font-mono block mb-1">Action</label>
                <input value={connectorAction} onChange={e => setConnectorAction(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500/50" />
              </div>
            </>
          )}
          {err && <p className="text-xs text-red-400 font-mono">{err}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-white/10 text-gray-400 text-sm hover:text-white transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={loading}
              className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WebhookEndpointCard({ endpoint, instanceId, onUpdated, onDeleted }) {
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const meta = ACTION_TYPE_META[endpoint.actionType] ?? ACTION_TYPE_META.log_event;
  const url = webhookUrl(endpoint.token);

  if (showEdit) {
    return (
      <EditWebhookModal
        endpoint={endpoint}
        instanceId={instanceId}
        onUpdated={(ep) => { onUpdated(ep); setShowEdit(false); }}
        onClose={() => setShowEdit(false)}
      />
    );
  }

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const token = localStorage.getItem('sbep_auth_token');
      const res = await fetch(`/api/system-instances/${instanceId}/webhooks/${endpoint.id}/logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setLogs(await res.json());
    } finally { setLoadingLogs(false); }
  };

  const toggleLogs = () => {
    if (!showLogs) loadLogs();
    setShowLogs(v => !v);
  };

  const handleTest = async () => {
    setTesting(true); setTestResult(null);
    try {
      const token = localStorage.getItem('sbep_auth_token');
      const res = await fetch(`/api/system-instances/${instanceId}/webhooks/${endpoint.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ test: true, source: 'sbep_ui' }),
      });
      const data = await res.json();
      setTestResult(data);
      if (data.ok) toast.success('Test webhook fired successfully');
      else toast.error(`Test failed: ${data.message}`);
    } catch (e) { toast.error(e.message); }
    finally { setTesting(false); }
  };

  const handleToggle = async () => {
    setToggling(true);
    try {
      const token = localStorage.getItem('sbep_auth_token');
      const res = await fetch(`/api/system-instances/${instanceId}/webhooks/${endpoint.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ enabled: !endpoint.enabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      onUpdated(data);
    } catch (e) { toast.error(e.message); }
    finally { setToggling(false); }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete webhook "${endpoint.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem('sbep_auth_token');
      const res = await fetch(`/api/system-instances/${instanceId}/webhooks/${endpoint.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete');
      onDeleted(endpoint.id);
      toast.success('Webhook deleted');
    } catch (e) { toast.error(e.message); }
    finally { setDeleting(false); }
  };

  const handleRegenerate = async () => {
    if (!confirm('Regenerate token? The old URL will stop working immediately.')) return;
    setRegenerating(true);
    try {
      const token = localStorage.getItem('sbep_auth_token');
      const res = await fetch(`/api/system-instances/${instanceId}/webhooks/${endpoint.id}/regenerate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      onUpdated(data);
      toast.success('Token regenerated — update your Zapier/Make webhook URL');
    } catch (e) { toast.error(e.message); }
    finally { setRegenerating(false); }
  };

  return (
    <div className={`rounded-xl border transition-all ${endpoint.enabled ? 'border-white/10 bg-black/60' : 'border-white/5 bg-black/40 opacity-60'}`}>
      {/* Header row */}
      <div className="px-4 py-3 flex items-start gap-3 flex-wrap">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${meta.bg} ${meta.border} border`}>
          {meta.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-white font-mono truncate">{endpoint.name}</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${meta.bg} ${meta.color} ${meta.border} border`}>
              {meta.label}
            </span>
            {endpoint.enabled
              ? <span className="text-[9px] font-mono text-emerald-400">● active</span>
              : <span className="text-[9px] font-mono text-gray-600">○ disabled</span>}
          </div>
          {/* URL row */}
          <div className="flex items-center gap-1.5 mt-1.5">
            <code className="text-[10px] font-mono text-gray-500 truncate max-w-[300px] sm:max-w-[420px] bg-black/60 rounded px-2 py-0.5 border border-white/5">
              {url}
            </code>
            <CopyBtn text={url} />
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[9px] font-mono text-gray-700">
              {endpoint.totalFires > 0
                ? `${endpoint.totalFires} fire${endpoint.totalFires !== 1 ? 's' : ''} · last ${timeAgo(endpoint.lastFiredAt)}`
                : 'Never fired'}
            </span>
          </div>
        </div>
        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0 flex-wrap">
          <button
            onClick={handleTest}
            disabled={testing || !endpoint.enabled}
            title="Send a test payload"
            className="px-2.5 py-1 rounded-lg text-[10px] font-mono bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/20 transition-all disabled:opacity-40"
          >
            {testing ? '…' : '▶ Test'}
          </button>
          <button
            onClick={() => setShowEdit(true)}
            title="Edit"
            className="px-2.5 py-1 rounded-lg text-[10px] font-mono bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 transition-all"
          >
            ✎ Edit
          </button>
          <button
            onClick={handleToggle}
            disabled={toggling}
            title={endpoint.enabled ? 'Disable' : 'Enable'}
            className="px-2.5 py-1 rounded-lg text-[10px] font-mono bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 transition-all disabled:opacity-40"
          >
            {toggling ? '…' : endpoint.enabled ? '⏸ Disable' : '▶ Enable'}
          </button>
          <button
            onClick={toggleLogs}
            title="View logs"
            className="px-2.5 py-1 rounded-lg text-[10px] font-mono bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 transition-all"
          >
            {showLogs ? '▲ Logs' : '▼ Logs'}
          </button>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            title="Regenerate token"
            className="px-2.5 py-1 rounded-lg text-[10px] font-mono bg-amber-500/5 hover:bg-amber-500/15 text-amber-500 border border-amber-500/10 transition-all disabled:opacity-40"
          >
            {regenerating ? '…' : '↺'}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            title="Delete"
            className="px-2 py-1 rounded-lg text-[10px] font-mono bg-red-500/5 hover:bg-red-500/15 text-red-500 border border-red-500/10 transition-all disabled:opacity-40"
          >
            {deleting ? '…' : '✕'}
          </button>
        </div>
      </div>

      {/* Test result banner */}
      {testResult && (
        <div className={`mx-4 mb-3 px-3 py-2 rounded-lg text-[10px] font-mono border ${testResult.ok ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-red-500/5 border-red-500/20 text-red-400'}`}>
          {testResult.ok ? '✓' : '✗'} {testResult.message}
          {testResult.processingMs != null && <span className="ml-2 text-gray-600">{testResult.processingMs}ms</span>}
        </div>
      )}

      {/* Logs panel */}
      {showLogs && (
        <div className="border-t border-white/5">
          <div className="px-4 py-2 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-gray-600 font-mono">Recent Logs</span>
            <button onClick={loadLogs} className="text-[10px] font-mono text-gray-600 hover:text-gray-400 transition-colors">↺ Refresh</button>
          </div>
          {loadingLogs ? (
            <div className="px-4 pb-4 text-center">
              <div className="w-4 h-4 border border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto" />
            </div>
          ) : logs.length === 0 ? (
            <p className="px-4 pb-4 text-[10px] font-mono text-gray-700">No logs yet — fire a test or call the URL from Zapier/Make.</p>
          ) : (
            <div className="max-h-48 overflow-y-auto">
              {logs.map(log => <WebhookLogRow key={log.id} log={log} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WebhooksPanel({ instanceId }) {
  const [endpoints, setEndpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('sbep_auth_token');
      const res = await fetch(`/api/system-instances/${instanceId}/webhooks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setEndpoints(await res.json());
    } finally { setLoading(false); }
  }, [instanceId]);

  useEffect(() => { load(); }, [load]);

  const handleCreated = (ep) => setEndpoints(prev => [ep, ...prev]);
  const handleUpdated = (ep) => setEndpoints(prev => prev.map(e => e.id === ep.id ? ep : e));
  const handleDeleted = (id) => setEndpoints(prev => prev.filter(e => e.id !== id));

  const exampleUrl = endpoints.length > 0 ? webhookUrl(endpoints[0].token) : `${window.location.origin}/api/webhooks/<token>`;

  return (
    <>
      {showAdd && (
        <AddWebhookModal instanceId={instanceId} onCreated={handleCreated} onClose={() => setShowAdd(false)} />
      )}

      <div className="rounded-xl border border-blue-500/20 bg-black/80 backdrop-blur-sm">
        <div className="border-b border-white/5 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            <span className="text-xs font-mono text-gray-300 uppercase tracking-widest">Webhook Triggers</span>
            <span className="text-xs text-gray-600 font-mono">{endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGuide(v => !v)}
              className="px-2.5 py-1 rounded-lg text-[10px] font-mono bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 transition-all"
            >
              {showGuide ? '▲ Guide' : '? Zapier/Make Guide'}
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="px-3 py-1 rounded-lg text-[10px] font-mono bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition-all"
            >
              + Add Webhook
            </button>
          </div>
        </div>

        {/* Zapier / Make integration guide */}
        {showGuide && (
          <div className="border-b border-white/5 px-4 py-4 space-y-3">
            <p className="text-xs font-semibold text-white font-mono">How to connect from Zapier, Make, or any HTTP tool</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                {
                  tool: 'Zapier',
                  icon: '⚡',
                  steps: [
                    'Create a new Zap → Choose a trigger (e.g. Stripe Payment, Typeform Submit)',
                    'Add an Action step → search "Webhooks by Zapier" → pick "POST"',
                    'Paste your webhook URL in the URL field',
                    'Set Payload Type to "JSON" and add any data fields',
                    'Test the Zap — you\'ll see it in the Logs below',
                  ],
                },
                {
                  tool: 'Make (Integromat)',
                  icon: '🔄',
                  steps: [
                    'Create a new Scenario → Add a trigger module',
                    'Add an HTTP module → "Make a request"',
                    'Paste your webhook URL as the URL',
                    'Set Method to POST, Body type to Raw, Content-type to application/json',
                    'Map fields from your trigger into the JSON body',
                  ],
                },
                {
                  tool: 'Any HTTP tool (curl)',
                  icon: '🖥',
                  steps: [
                    `curl -X POST \\`,
                    `  -H "Content-Type: application/json" \\`,
                    `  -d '{"event":"payment","amount":4900}' \\`,
                    `  "${exampleUrl}"`,
                  ],
                  isCurl: true,
                },
              ].map(({ tool, icon, steps, isCurl }) => (
                <div key={tool} className="rounded-lg bg-black/60 border border-white/10 p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span>{icon}</span>
                    <span className="text-xs font-semibold text-white font-mono">{tool}</span>
                  </div>
                  {isCurl ? (
                    <pre className="text-[9px] font-mono text-gray-400 whitespace-pre-wrap leading-relaxed">{steps.join('\n')}</pre>
                  ) : (
                    <ol className="space-y-1">
                      {steps.map((s, i) => (
                        <li key={i} className="text-[10px] text-gray-400 leading-snug flex gap-1.5">
                          <span className="text-gray-700 shrink-0">{i + 1}.</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-600 font-mono">
              ℹ Webhook payloads can contain any JSON. Access payload fields inside ASH prompts via the <code className="text-gray-500">payload</code> object.
            </p>
          </div>
        )}

        {loading ? (
          <div className="px-4 py-10 text-center">
            <div className="w-5 h-5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-gray-600 font-mono">Loading webhooks…</p>
          </div>
        ) : endpoints.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-3xl mb-2">🔗</p>
            <p className="text-sm font-medium text-white mb-1">No webhooks yet</p>
            <p className="text-xs text-gray-500 mb-4 max-w-xs mx-auto">
              Create a webhook URL and paste it into Zapier, Make, or any HTTP tool. When it fires, this system reacts.
            </p>
            <button onClick={() => setShowAdd(true)}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors font-mono">
              Create First Webhook
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {endpoints.map(ep => (
              <WebhookEndpointCard
                key={ep.id}
                endpoint={ep}
                instanceId={instanceId}
                onUpdated={handleUpdated}
                onDeleted={handleDeleted}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function UserSystemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const buildRevenueCents = location.state?.buildRevenueCents ?? 0;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [instance, setInstance] = useState(null);
  const [blueprint, setBlueprint] = useState(null);
  const [session, setSession] = useState(null);
  const [steps, setSteps] = useState([]);
  const [outputs, setOutputs] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const [allSessions, setAllSessions] = useState([]);
  const [storedCredKeys, setStoredCredKeys] = useState([]);
  const [runtimeConnectors, setRuntimeConnectors] = useState([]);
  const [runtimeJobs, setRuntimeJobs] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const [statusRes, sessionsRes, credsRes] = await Promise.all([
        fetch(`/api/build-engine/${id}/status`, { headers: authHeaders() }),
        fetch(`/api/build-sessions?systemInstanceId=${id}`, { headers: authHeaders() }),
        fetch('/api/user-credentials/summary', { headers: authHeaders() }),
      ]);

      if (!statusRes.ok) throw new Error('System not found');
      const statusData = await statusRes.json();
      setInstance(statusData.instance);
      setSession(statusData.session);
      setSteps(statusData.steps ?? []);

      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        setAllSessions(Array.isArray(sessionsData) ? sessionsData : []);
      }

      if (credsRes.ok) {
        const credsData = await credsRes.json();
        setStoredCredKeys(Array.isArray(credsData) ? credsData.map((c) => c.credentialKey) : []);
      }

      if (statusData.instance?.blueprintId) {
        const bpRes = await fetch(`/api/blueprints/${statusData.instance.blueprintId}`, { headers: authHeaders() });
        if (bpRes.ok) {
          const bpData = await bpRes.json();
          setBlueprint(bpData);
        }
      }

      if (statusData.session?.id) {
        const outRes = await fetch(`/api/build-outputs?buildSessionId=${statusData.session.id}`, { headers: authHeaders() });
        if (outRes.ok) {
          const outData = await outRes.json();
          setOutputs(Array.isArray(outData) ? outData : (outData.items ?? []));
        }
      }

      // Fetch runtime status (connectors + recent jobs)
      const [connRes, jobsRes] = await Promise.all([
        fetch(`/api/runtime/systems/${id}/connectors`, { headers: authHeaders() }),
        fetch(`/api/runtime/systems/${id}/jobs`, { headers: authHeaders() }),
      ]);
      if (connRes.ok) {
        const connData = await connRes.json();
        setRuntimeConnectors(Array.isArray(connData) ? connData : []);
      }
      if (jobsRes.ok) {
        const jobsData = await jobsRes.json();
        setRuntimeJobs(Array.isArray(jobsData) ? jobsData.slice(0, 20) : []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
    const LIVE_STATES = ['building', 'deploying', 'running', 'degraded'];
    const interval = setInterval(() => {
      if (LIVE_STATES.includes(instance?.buildStatus)) fetchData();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchData, instance?.buildStatus]);

  const patchStatus = async (buildStatus) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/system-instances/${id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ buildStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      const updated = await res.json();
      setInstance(updated);
      toast.success(`System ${buildStatus}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const runtimeAction = async (action) => {
    setActionLoading(true);
    const METHOD_MAP = { deploy: 'POST', pause: 'POST', restart: 'POST' };
    try {
      const res = await fetch(`/api/runtime/systems/${id}/${action}`, {
        method: METHOD_MAP[action] ?? 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Failed to ${action}`);
      toast.success(data.message ?? `System ${action} initiated`);
      setTimeout(fetchData, 800);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const deleteSystem = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/system-instances/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete system');
      toast.success('System deleted');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message);
      setActionLoading(false);
      setShowDelete(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-mono text-gray-500">Loading system…</p>
        </div>
      </div>
    );
  }

  if (error || !instance) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-4">⚠</p>
          <h2 className="text-lg font-bold text-white mb-2">System Not Found</h2>
          <p className="text-sm text-gray-400 mb-6">{error ?? 'This system could not be loaded.'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300 hover:text-white"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const statusMeta = BUILD_STATUS_META[instance.buildStatus] ?? BUILD_STATUS_META.pending;
  const healthMeta = HEALTH_META[instance.healthStatus] ?? HEALTH_META.unknown;

  return (
    <VideoBackground>
    <div className="min-h-screen text-white">
      {showDelete && (
        <DeleteModal
          systemName={instance.name}
          onConfirm={deleteSystem}
          onCancel={() => setShowDelete(false)}
          loading={actionLoading}
        />
      )}

      {/* ── Topbar ── */}
      <div className="border-b border-white/5 bg-black/40 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gray-500 hover:text-white transition-colors text-sm font-mono"
          >
            ← Dashboard
          </button>
          <span className="text-white/10">/</span>
          <span className="text-sm font-mono text-gray-400 truncate max-w-[200px]">{instance.name}</span>
          <span className="ml-auto flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${statusMeta.dot} ${statusMeta.pulse ? 'animate-pulse' : ''}`} />
            <span className={`text-xs font-mono ${statusMeta.color}`}>{statusMeta.label}</span>
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight">
                {instance.name}
              </h1>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono ring-1 ${statusMeta.bg} ${statusMeta.color} ${statusMeta.ring}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot} ${statusMeta.pulse ? 'animate-pulse' : ''}`} />
                {statusMeta.label}
              </span>
              <span className={`text-xs font-mono ${healthMeta.color}`}>
                {healthMeta.icon} {healthMeta.label}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] uppercase tracking-widest text-gray-600 font-mono">Build history</span>
              <HealthSparkline sessions={allSessions} />
            </div>
            {blueprint && (
              <p className="text-sm text-gray-500">
                Blueprint: <span className="text-gray-300">{blueprint.name}</span>
                {blueprint.category && <span className="text-gray-600"> · {blueprint.category}</span>}
              </p>
            )}
            <p className="text-xs text-gray-600 mt-1 font-mono">
              Created {formatDate(instance.createdAt)} · Last updated {timeAgo(instance.updatedAt)}
            </p>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Runtime engine controls */}
            {instance.buildStatus === 'built' && (
              <ControlBtn label="Deploy" icon="▶" variant="emerald" onClick={() => runtimeAction('deploy')} disabled={actionLoading} />
            )}
            {(instance.buildStatus === 'running' || instance.buildStatus === 'degraded') && (
              <ControlBtn label="Pause" icon="⏸" variant="amber" onClick={() => runtimeAction('pause')} disabled={actionLoading} />
            )}
            {(instance.buildStatus === 'paused' || instance.buildStatus === 'failed') && (
              <ControlBtn label="Restart" icon="⟳" variant="blue" onClick={() => runtimeAction('restart')} disabled={actionLoading} />
            )}
            {/* Legacy active/paused shim for older instances */}
            {instance.buildStatus === 'active' && (
              <ControlBtn label="Pause" icon="⏸" variant="amber" onClick={() => patchStatus('paused')} disabled={actionLoading} />
            )}
            {(instance.buildStatus === 'failed' || instance.buildStatus === 'completed') && (
              <ControlBtn
                label="Rebuild"
                icon="↻"
                variant="blue"
                onClick={async () => {
                  await patchStatus('pending');
                  navigate('/builder');
                }}
                disabled={actionLoading}
              />
            )}
            <ControlBtn label="Refresh" icon="⟳" variant="ghost" onClick={fetchData} disabled={loading} />
            <ControlBtn label="Delete" icon="✕" variant="red" onClick={() => setShowDelete(true)} disabled={actionLoading} />
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Status"
            value={statusMeta.label}
            sub={`Health: ${healthMeta.label}`}
            accent="blue"
          />
          <StatCard
            label="Uptime"
            value={uptimePercent(instance.createdAt, instance.buildStatus)}
            sub="Last 30 days"
            accent="emerald"
          />
          <StatCard
            label="Build Steps"
            value={steps.filter((s) => s.status === 'completed').length}
            sub={`of ${steps.length} total`}
            accent="purple"
          />
          <StatCard
            label="Last Activity"
            value={timeAgo(instance.updatedAt)}
            sub={formatDate(instance.updatedAt)}
            accent="amber"
          />
        </div>

        {/* ── Connected Tools Grid ── */}
        {blueprint?.requiredTools && blueprint.requiredTools.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-black/80 backdrop-blur-sm">
            <div className="border-b border-white/5 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-400"></span>
                <span className="text-xs font-mono text-gray-300 uppercase tracking-widest">Connected Tools</span>
              </div>
              <span className="text-xs text-gray-600">{storedCredKeys.length > 0 ? `${storedCredKeys.length} credential${storedCredKeys.length !== 1 ? 's' : ''} in vault` : 'No vault credentials yet'}</span>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {blueprint.requiredTools.map((tool) => {
                const toolKey = tool.toUpperCase().replace(/[^A-Z0-9]/g, '_') + '_API_KEY';
                const altKey = tool.toUpperCase().replace(/[^A-Z0-9]/g, '_') + '_ACCESS_TOKEN';
                const isStored = storedCredKeys.some((k) =>
                  k.includes(tool.toUpperCase().replace(/[^A-Z0-9]/g, '_')) ||
                  k === toolKey || k === altKey
                );
                return (
                  <div
                    key={tool}
                    className={`rounded-xl p-3 border transition-colors ${
                      isStored
                        ? 'border-emerald-500/20 bg-emerald-500/5'
                        : 'border-white/5 bg-white/2'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-white truncate">{tool}</span>
                      {isStored ? (
                        <span className="text-emerald-400 text-xs shrink-0">✓</span>
                      ) : (
                        <span
                          className="text-xs text-blue-400 cursor-pointer hover:underline shrink-0"
                          onClick={() => navigate('/connections')}
                        >
                          +
                        </span>
                      )}
                    </div>
                    <p className={`text-[10px] font-mono ${isStored ? 'text-emerald-600' : 'text-gray-600'}`}>
                      {isStored ? 'Configured' : 'Not set'}
                    </p>
                  </div>
                );
              })}
            </div>
            {storedCredKeys.length === 0 && (
              <div className="px-4 pb-4">
                <button
                  onClick={() => navigate('/connections')}
                  className="w-full py-2 rounded-lg border border-blue-500/20 bg-blue-500/5 text-xs text-blue-400 hover:bg-blue-500/10 transition-colors font-mono"
                >
                  Connect tools in Credential Vault →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Runtime Engine Panel ── */}
        {(runtimeConnectors.length > 0 || runtimeJobs.length > 0 || ['deploying','running','degraded','paused'].includes(instance.buildStatus)) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Connector Status */}
            <div className="rounded-xl border border-white/10 bg-black/80 backdrop-blur-sm">
              <div className="border-b border-white/5 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-violet-400"></span>
                  <span className="text-xs font-mono text-gray-300 uppercase tracking-widest">Connector Status</span>
                </div>
                <span className="text-xs text-gray-600 font-mono">{runtimeConnectors.length} connector{runtimeConnectors.length !== 1 ? 's' : ''}</span>
              </div>
              {runtimeConnectors.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-xs text-gray-600 font-mono">No connectors tested yet</p>
                  <p className="text-[10px] text-gray-700 mt-1">Deploy this system to run connector health checks</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {runtimeConnectors.map((conn) => {
                    const statusColors = {
                      connected: 'text-emerald-400',
                      testing:   'text-violet-400',
                      degraded:  'text-yellow-400',
                      error:     'text-red-400',
                      unconfigured: 'text-gray-500',
                    };
                    const statusIcons = {
                      connected: '●',
                      testing:   '◉',
                      degraded:  '⚠',
                      error:     '✗',
                      unconfigured: '○',
                    };
                    const col = statusColors[conn.status] ?? 'text-gray-500';
                    const ico = statusIcons[conn.status] ?? '?';
                    return (
                      <div key={conn.id} className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-sm shrink-0 ${col} ${conn.status === 'testing' ? 'animate-pulse' : ''}`}>{ico}</span>
                          <span className="text-xs font-mono text-gray-200 truncate">{conn.connector}</span>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <span className={`text-[10px] font-mono uppercase ${col}`}>{conn.status}</span>
                          {conn.lastTestedAt && (
                            <p className="text-[9px] text-gray-700 mt-0.5">{timeAgo(conn.lastTestedAt)}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Job Feed */}
            <div className="rounded-xl border border-white/10 bg-black/80 backdrop-blur-sm">
              <div className="border-b border-white/5 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  <span className="text-xs font-mono text-gray-300 uppercase tracking-widest">Job Queue</span>
                </div>
                <span className="text-xs text-gray-600 font-mono">{runtimeJobs.length} recent</span>
              </div>
              {runtimeJobs.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-xs text-gray-600 font-mono">No jobs yet</p>
                  <p className="text-[10px] text-gray-700 mt-1">Jobs appear here when the system is deployed</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
                  {runtimeJobs.map((job) => {
                    const jobColors = {
                      completed: 'text-emerald-400',
                      active:    'text-blue-400',
                      queued:    'text-gray-400',
                      retrying:  'text-yellow-400',
                      failed:    'text-red-400',
                      cancelled: 'text-gray-600',
                    };
                    const jobIcons = {
                      completed: '✓',
                      active:    '◉',
                      queued:    '○',
                      retrying:  '↻',
                      failed:    '✗',
                      cancelled: '–',
                    };
                    const jCol = jobColors[job.status] ?? 'text-gray-500';
                    const jIco = jobIcons[job.status] ?? '?';
                    return (
                      <div key={job.id} className="px-4 py-2.5 flex items-center gap-3">
                        <span className={`text-xs shrink-0 ${jCol} ${job.status === 'active' ? 'animate-pulse' : ''}`}>{jIco}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-mono text-gray-300 truncate">{job.jobType}</p>
                          {job.error && <p className="text-[9px] text-red-400 truncate">{job.error}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-[9px] font-mono uppercase ${jCol}`}>{job.status}</span>
                          <p className="text-[9px] text-gray-700">{timeAgo(job.queuedAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Blueprint Info + Build Logs (2-col) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Blueprint panel */}
          <div className="rounded-xl border border-white/10 bg-black/80 backdrop-blur-sm">
            <div className="border-b border-white/5 px-4 py-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span className="text-xs font-mono text-gray-300 uppercase tracking-widest">Blueprint</span>
            </div>
            <div className="p-4">
              {blueprint ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-base font-semibold text-white">{blueprint.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{blueprint.description ?? 'No description.'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {blueprint.difficulty && (
                      <div className="rounded-lg bg-black/60 border border-white/10 p-3">
                        <p className="text-[10px] uppercase tracking-widest text-gray-600 font-mono">Difficulty</p>
                        <p className="text-sm text-white mt-0.5">{blueprint.difficulty}</p>
                      </div>
                    )}
                    {blueprint.estimatedSetupTime && (
                      <div className="rounded-lg bg-black/60 border border-white/10 p-3">
                        <p className="text-[10px] uppercase tracking-widest text-gray-600 font-mono">Setup Time</p>
                        <p className="text-sm text-white mt-0.5">{blueprint.estimatedSetupTime}</p>
                      </div>
                    )}
                    {blueprint.estimatedMonthlyCost && (
                      <div className="rounded-lg bg-black/60 border border-white/10 p-3">
                        <p className="text-[10px] uppercase tracking-widest text-gray-600 font-mono">Monthly Cost</p>
                        <p className="text-sm text-white mt-0.5">{blueprint.estimatedMonthlyCost}</p>
                      </div>
                    )}
                    {blueprint.estimatedMonthlyRevenue && (
                      <div className="rounded-lg bg-black/60 border border-white/10 p-3">
                        <p className="text-[10px] uppercase tracking-widest text-gray-600 font-mono">Est. Revenue*</p>
                        <p className="text-sm text-emerald-400 font-semibold mt-0.5">{blueprint.estimatedMonthlyRevenue}</p>
                      </div>
                    )}
                  </div>
                  {blueprint.requiredTools && blueprint.requiredTools.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-gray-600 font-mono mb-2">Required Tools</p>
                      <div className="flex flex-wrap gap-1.5">
                        {blueprint.requiredTools.map((tool) => (
                          <span key={tool} className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-xs text-gray-300 font-mono">
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {blueprint.estimatedMonthlyRevenue && (
                    <p className="text-[10px] text-gray-600 leading-relaxed pt-1">
                      * Revenue figures are projections based on blueprint benchmarks — not guaranteed results. Individual outcomes vary.{' '}
                      <a href="/earnings-disclaimer" className="underline hover:text-gray-400 transition-colors">Earnings Disclaimer</a>
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-600 py-4 text-center">Blueprint details unavailable.</p>
              )}
            </div>
          </div>

          {/* Build log */}
          <BuildLogPanel steps={steps} session={session} />
        </div>

        {/* ── AI Outputs ── */}
        <OutputsPanel outputs={outputs} />

        {/* ── Activity Timeline ── */}
        <div className="rounded-xl border border-white/10 bg-black/80 backdrop-blur-sm">
          <div className="border-b border-white/5 px-4 py-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            <span className="text-xs font-mono text-gray-300 uppercase tracking-widest">Activity Timeline</span>
            <span className="ml-auto text-xs text-gray-600">{allSessions.length} session{allSessions.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="p-4 space-y-0 max-h-80 overflow-y-auto">
            {allSessions.length > 0 && [...allSessions].reverse().map((sess, sessIdx) => {
                const sessSteps = sess.id === session?.id ? steps : [];
                const sessStatus = sess.status ?? 'active';
                const sessionStatusColors = {
                  active: 'text-blue-400',
                  completed: 'text-emerald-400',
                  failed: 'text-red-400',
                };
                return (
                  <div key={sess.id} className="relative">
                    {sessIdx < allSessions.length - 1 && (
                      <div className="absolute left-[7px] top-6 bottom-0 w-px bg-white/5" />
                    )}
                    <div className="flex items-start gap-3 py-2">
                      <div className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 mt-0.5 ${
                        sessStatus === 'completed' ? 'border-emerald-400 bg-emerald-400/20' :
                        sessStatus === 'failed' ? 'border-red-400 bg-red-400/20' :
                        'border-blue-400 bg-blue-400/20'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white">
                            Build Session #{sess.id}
                          </span>
                          <span className={`text-xs font-mono capitalize ${sessionStatusColors[sessStatus] ?? 'text-gray-400'}`}>
                            {sessStatus}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 font-mono mt-0.5">
                          Started {formatDate(sess.startedAt)}
                          {sess.completedAt && ` · Completed ${timeAgo(sess.completedAt)}`}
                        </p>
                        {sessSteps.length > 0 && (
                          <div className="mt-2 space-y-1 pl-3 border-l border-white/5">
                            {sessSteps.slice(-4).map((step) => {
                              const meta = STEP_STATUS_META[step.status] ?? STEP_STATUS_META.pending;
                              return (
                                <div key={step.id} className="flex items-center gap-2 text-xs">
                                  <span className={meta.color}>{meta.icon}</span>
                                  <span className="text-gray-500">
                                    Step {step.stepNumber}
                                    {step.notes && ` — ${step.notes}`}
                                  </span>
                                  {step.completedAt && (
                                    <span className="text-gray-700 ml-auto">{timeAgo(step.completedAt)}</span>
                                  )}
                                </div>
                              );
                            })}
                            {sessSteps.length > 4 && (
                              <p className="text-xs text-gray-700 pl-4">+{sessSteps.length - 4} more steps</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* ── A/B Experiments ── */}
        <ExperimentsPanel instanceId={id} />

        {/* ── Webhook Triggers ── */}
        <WebhooksPanel instanceId={id} />

        {/* ── Automation Schedule ── */}
        <AutomationSchedulePanel instanceId={id} />

        {/* ── Live Revenue (real provider data) ── */}
        <RealRevenuePanel instanceId={id} />

        {/* ── Content Calendar (Published Content) ── */}
        <PublishedContentPanel instanceId={id} />

        {/* ── Revenue + Live Activity ── */}
        <RevenueSection instanceId={id} buildStatus={instance?.buildStatus} buildRevenueCents={buildRevenueCents} />

      </div>
    </div>
    </VideoBackground>
  );
}
