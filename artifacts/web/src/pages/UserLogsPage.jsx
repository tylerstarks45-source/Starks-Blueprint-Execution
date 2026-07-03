import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '@/components/AuthLayout.jsx';
import { ScrollText, Search, X, RefreshCw, ChevronDown, Building2, Layers } from 'lucide-react';
import { getAuthHeaders } from '@/lib/apiHeaders';

const LOG_CATEGORIES = [
  'all', 'build', 'deploy', 'automation', 'browser', 'connection',
  'hosting', 'api', 'error', 'recovery', 'maintenance', 'optimization', 'scaling',
];
const LOG_SEVERITIES = ['all', 'info', 'warning', 'error', 'critical'];

const SEVERITY_META = {
  info:     { label: 'Info',     bg: 'bg-sky-400/10',     text: 'text-sky-300',     dot: 'bg-sky-400' },
  warning:  { label: 'Warn',     bg: 'bg-amber-400/10',   text: 'text-amber-300',   dot: 'bg-amber-400' },
  error:    { label: 'Error',    bg: 'bg-red-400/10',     text: 'text-red-300',     dot: 'bg-red-400' },
  critical: { label: 'Critical', bg: 'bg-fuchsia-400/10', text: 'text-fuchsia-300', dot: 'bg-fuchsia-400' },
};

const CATEGORY_COLOR = {
  build:        'text-blue-300 bg-blue-400/10',
  deploy:       'text-violet-300 bg-violet-400/10',
  automation:   'text-emerald-300 bg-emerald-400/10',
  browser:      'text-cyan-300 bg-cyan-400/10',
  connection:   'text-teal-300 bg-teal-400/10',
  hosting:      'text-indigo-300 bg-indigo-400/10',
  api:          'text-purple-300 bg-purple-400/10',
  error:        'text-red-300 bg-red-400/10',
  recovery:     'text-amber-300 bg-amber-400/10',
  maintenance:  'text-gray-300 bg-gray-400/10',
  optimization: 'text-lime-300 bg-lime-400/10',
  scaling:      'text-pink-300 bg-pink-400/10',
};

function formatTs(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function SeverityBadge({ severity }) {
  const meta = SEVERITY_META[severity] ?? SEVERITY_META.info;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider shrink-0 ${meta.bg} ${meta.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function CategoryBadge({ category }) {
  const cls = CATEGORY_COLOR[category] ?? 'text-gray-300 bg-gray-400/10';
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider shrink-0 ${cls}`}>
      {category}
    </span>
  );
}

function OriginLabel({ item }) {
  if (item.systemName || item.systemInstanceId) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-violet-400/70 shrink-0">
        <Layers className="w-2.5 h-2.5" />
        {item.systemName ?? `System #${item.systemInstanceId}`}
      </span>
    );
  }
  if (item.businessName || item.businessId) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400/70 shrink-0">
        <Building2 className="w-2.5 h-2.5" />
        {item.businessName ?? `Business #${item.businessId}`}
      </span>
    );
  }
  return null;
}

function LogRow({ item, expanded, onToggle, onNavigate }) {
  const isExpanded = expanded === item.id;
  const hasDetail = item.component || item.action || (item.metadata && Object.keys(item.metadata).length > 0);
  const navTarget = item.systemInstanceId
    ? `/systems/${item.systemInstanceId}`
    : item.businessId
    ? `/business/${item.businessId}`
    : null;

  return (
    <div className="border-b border-white/5">
      {/* Primary row — click navigates to system/business */}
      <div
        className={`flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 px-4 py-3 transition-colors ${navTarget ? 'cursor-pointer hover:bg-white/[0.02]' : ''}`}
        onClick={navTarget ? () => onNavigate(navTarget) : undefined}
      >
        {/* Badges */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          <SeverityBadge severity={item.severity} />
          <CategoryBadge category={item.category} />
        </div>

        {/* Message + origin */}
        <div className="flex-1 min-w-0 space-y-0.5">
          <p className="text-sm text-white/80 font-mono leading-snug break-words">
            {item.message}
          </p>
          <OriginLabel item={item} />
        </div>

        {/* Right: timestamp + expand button */}
        <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0 self-start">
          <span className="text-xs font-mono text-white/30 whitespace-nowrap" title={item.createdAt}>
            {formatTs(item.createdAt)}
          </span>
          {hasDetail && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggle(); }}
              className="p-0.5 rounded hover:bg-white/10 transition-colors"
              aria-label="Show details"
            >
              <ChevronDown
                className={`w-3.5 h-3.5 text-white/30 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              />
            </button>
          )}
        </div>
      </div>

      {/* Expanded detail — click doesn't navigate */}
      {isExpanded && (
        <div className="px-4 pb-3 space-y-2 border-t border-white/5 bg-black/20">
          <div className="flex flex-wrap gap-x-6 gap-y-1 pt-2 text-xs font-mono text-white/40">
            {item.component && (
              <span>component: <span className="text-white/60">{item.component}</span></span>
            )}
            {item.action && (
              <span>action: <span className="text-white/60">{item.action}</span></span>
            )}
          </div>
          {item.metadata && Object.keys(item.metadata).length > 0 && (
            <pre className="text-[11px] font-mono text-white/40 bg-black/40 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words max-h-48">
              {JSON.stringify(item.metadata, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export default function UserLogsPage() {
  const navigate = useNavigate();
  const [category, setCategory]       = useState('all');
  const [severity, setSeverity]       = useState('all');
  const [search, setSearch]           = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [items, setItems]             = useState([]);
  const [nextCursor, setNextCursor]   = useState(null);
  const [hasMore, setHasMore]         = useState(false);
  const [loading, setLoading]         = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]             = useState(null);
  const [expanded, setExpanded]       = useState(null);
  const searchRef                     = useRef(null);

  const fetchLogs = useCallback(async ({ cursor = null, replace = true } = {}) => {
    replace ? setLoading(true) : setLoadingMore(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (category && category !== 'all') qs.set('category', category);
      if (severity  && severity  !== 'all') qs.set('severity', severity);
      if (appliedSearch) qs.set('q', appliedSearch);
      if (cursor) qs.set('cursor', String(cursor));
      const res = await fetch(`/api/logs/me?${qs.toString()}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`Failed to load logs (${res.status})`);
      const json = await res.json();
      if (replace) {
        setItems(json.items ?? []);
      } else {
        setItems((prev) => [...prev, ...(json.items ?? [])]);
      }
      setNextCursor(json.nextCursor ?? null);
      setHasMore(json.hasMore ?? false);
    } catch (e) {
      setError(e.message || 'Failed to load logs');
    } finally {
      replace ? setLoading(false) : setLoadingMore(false);
    }
  }, [category, severity, appliedSearch]);

  useEffect(() => {
    setExpanded(null);
    fetchLogs({ replace: true });
  }, [fetchLogs]);

  const handleSearch = (e) => { e.preventDefault(); setAppliedSearch(search); };
  const clearSearch  = () => { setSearch(''); setAppliedSearch(''); };
  const loadMore     = () => { if (nextCursor && !loadingMore) fetchLogs({ cursor: nextCursor, replace: false }); };
  const toggleExpanded = (id) => setExpanded((prev) => (prev === id ? null : id));
  const hasActiveFilters = category !== 'all' || severity !== 'all' || appliedSearch;

  return (
    <AuthLayout>
      <div className="min-h-screen text-white">
        {/* Page header */}
        <div className="border-b border-white/5 bg-black/40 backdrop-blur-sm sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                <ScrollText className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <h1 className="text-base font-bold font-mono text-white tracking-tight leading-tight">Activity Logs</h1>
                <p className="text-xs text-white/30 font-mono">All events across your systems &amp; businesses</p>
              </div>
            </div>
            <button
              onClick={() => fetchLogs({ replace: true })}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-gray-400 hover:text-white border border-white/10 hover:border-white/20 transition-all disabled:opacity-40"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
          {/* Filter bar */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-sm p-4 space-y-3">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search log messages…"
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-black/40 border border-white/10 text-sm font-mono text-white/80 placeholder-white/20 focus:outline-none focus:border-violet-500/40 transition-colors"
                />
                {search && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="px-3 py-2 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-300 text-xs font-mono hover:bg-violet-600/30 transition-colors"
              >
                Search
              </button>
            </form>

            {/* Category chips */}
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest mr-1">Category</span>
              {LOG_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all capitalize ${
                    category === cat
                      ? 'bg-violet-600/30 border border-violet-500/50 text-violet-300'
                      : 'bg-white/5 border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20'
                  }`}
                >
                  {cat === 'all' ? 'All' : cat}
                </button>
              ))}
            </div>

            {/* Severity chips */}
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest mr-1">Severity</span>
              {LOG_SEVERITIES.map((sev) => {
                const meta = SEVERITY_META[sev];
                const isActive = severity === sev;
                return (
                  <button
                    key={sev}
                    onClick={() => setSeverity(sev)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all ${
                      isActive
                        ? sev === 'all'
                          ? 'bg-violet-600/30 border border-violet-500/50 text-violet-300'
                          : `${meta.bg} border border-current/30 ${meta.text}`
                        : 'bg-white/5 border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20'
                    }`}
                  >
                    {sev === 'all' ? 'All' : (meta?.label ?? sev)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Log feed */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-sm overflow-hidden">
            {/* Feed header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-black/20">
              <span className="text-xs font-mono text-white/40">
                {loading ? 'Loading…' : `${items.length}${hasMore ? '+' : ''} ${items.length === 1 ? 'entry' : 'entries'}`}
              </span>
              {hasActiveFilters && (
                <button
                  onClick={() => { setCategory('all'); setSeverity('all'); setSearch(''); setAppliedSearch(''); }}
                  className="text-[11px] font-mono text-white/30 hover:text-white/60 transition-colors flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Clear filters
                </button>
              )}
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <p className="text-sm font-mono text-red-400">{error}</p>
                <button
                  onClick={() => fetchLogs({ replace: true })}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono text-white/50 hover:text-white border border-white/10 hover:border-white/20 transition-all"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Empty */}
            {!loading && !error && items.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <ScrollText className="w-6 h-6 text-white/20" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-mono text-white/40 font-semibold">No activity yet</p>
                  <p className="text-xs font-mono text-white/20">
                    {hasActiveFilters
                      ? 'No entries match these filters'
                      : 'Events will appear here as your systems and businesses run'}
                  </p>
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={() => { setCategory('all'); setSeverity('all'); setSearch(''); setAppliedSearch(''); }}
                    className="text-xs font-mono text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}

            {/* Rows */}
            {!loading && !error && items.length > 0 && (
              <div>
                {items.map((item) => (
                  <LogRow
                    key={item.id}
                    item={item}
                    expanded={expanded}
                    onToggle={() => toggleExpanded(item.id)}
                    onNavigate={navigate}
                  />
                ))}

                {/* Load more */}
                {hasMore && (
                  <div className="flex justify-center py-4 border-t border-white/5">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-white/50 hover:text-white hover:border-white/20 transition-all disabled:opacity-40"
                    >
                      {loadingMore
                        ? <><div className="w-3 h-3 border border-white/30 border-t-transparent rounded-full animate-spin" /> Loading…</>
                        : <>Load more entries</>
                      }
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Hint */}
          {!loading && !error && items.length > 0 && (
            <p className="text-xs font-mono text-white/20 text-center">
              Click a row to open the system or business it belongs to
            </p>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}
