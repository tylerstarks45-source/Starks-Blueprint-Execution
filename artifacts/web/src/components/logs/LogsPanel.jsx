import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getAuthHeaders } from '@/lib/apiHeaders';

const LOG_CATEGORIES = [
  'build', 'deploy', 'automation', 'browser', 'connection', 'hosting',
  'api', 'error', 'recovery', 'maintenance', 'optimization', 'scaling',
];
const LOG_SEVERITIES = ['info', 'warning', 'error', 'critical'];

const SEVERITY_META = {
  info:     { label: 'Info',     color: 'text-sky-300',     bg: 'bg-sky-400/10',     ring: 'ring-sky-400/30',     dot: 'bg-sky-400' },
  warning:  { label: 'Warning',  color: 'text-amber-300',   bg: 'bg-amber-400/10',   ring: 'ring-amber-400/30',   dot: 'bg-amber-400' },
  error:    { label: 'Error',    color: 'text-red-300',     bg: 'bg-red-400/10',     ring: 'ring-red-400/30',     dot: 'bg-red-400' },
  critical: { label: 'Critical', color: 'text-fuchsia-300', bg: 'bg-fuchsia-400/10', ring: 'ring-fuchsia-400/30', dot: 'bg-fuchsia-400' },
};

const CATEGORY_COLOR = {
  build: 'text-blue-300', deploy: 'text-violet-300', automation: 'text-emerald-300',
  browser: 'text-cyan-300', connection: 'text-teal-300', hosting: 'text-indigo-300',
  api: 'text-purple-300', error: 'text-red-300', recovery: 'text-amber-300',
  maintenance: 'text-gray-300', optimization: 'text-lime-300', scaling: 'text-pink-300',
};

function formatTs(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

const EMPTY_FILTERS = { category: '', severity: '', component: '', action: '', q: '', from: '', to: '' };

/**
 * Reusable unified-logs viewer: filter bar + table + pagination.
 * `endpoint` is the base URL, e.g. `/api/system-instances/12/logs`,
 * `/api/businesses/4/logs`, or `/api/admin/logs`.
 */
export default function LogsPanel({ endpoint, title = 'Activity Logs', pageSize = 25 }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ logs: [], total: 0, page: 1, pageSize });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    if (!endpoint) return;
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      Object.entries(applied).forEach(([k, v]) => { if (v) qs.set(k, v); });
      qs.set('page', String(page));
      qs.set('pageSize', String(pageSize));
      const res = await fetch(`${endpoint}?${qs.toString()}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`Failed to load logs (${res.status})`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e.message || 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, [endpoint, applied, page, pageSize]);

  useEffect(() => { load(); }, [load]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((data.total || 0) / (data.pageSize || pageSize))),
    [data.total, data.pageSize, pageSize],
  );

  const applyFilters = () => { setPage(1); setApplied(filters); };
  const resetFilters = () => { setFilters(EMPTY_FILTERS); setApplied(EMPTY_FILTERS); setPage(1); };
  const hasActiveFilters = Object.values(applied).some(Boolean);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-mono font-bold text-white tracking-tight">{title}</h2>
          <span className="text-[10px] font-mono text-gray-600">
            {data.total} {data.total === 1 ? 'entry' : 'entries'}
          </span>
        </div>
        <button
          onClick={load}
          className="px-2.5 py-1 rounded-lg text-[11px] font-mono text-gray-400 hover:text-white border border-white/10 hover:border-white/20 transition-all"
        >
          ↺ Refresh
        </button>
      </div>

      {/* Filter bar */}
      <div className="px-5 py-4 border-b border-white/5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
        <input
          value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
          onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
          placeholder="Search message…"
          className="lg:col-span-2 px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-white placeholder:text-gray-600 focus:outline-none focus:border-white/25"
        />
        <select
          value={filters.category}
          onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
          className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-white/25"
        >
          <option value="">All categories</option>
          {LOG_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={filters.severity}
          onChange={(e) => setFilters((f) => ({ ...f, severity: e.target.value }))}
          className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-white/25"
        >
          <option value="">All severities</option>
          {LOG_SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input
          value={filters.component}
          onChange={(e) => setFilters((f) => ({ ...f, component: e.target.value }))}
          onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
          placeholder="Component"
          className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-white placeholder:text-gray-600 focus:outline-none focus:border-white/25"
        />
        <input
          value={filters.action}
          onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
          onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
          placeholder="Action"
          className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-white placeholder:text-gray-600 focus:outline-none focus:border-white/25"
        />
        <label className="flex items-center gap-1.5 lg:col-span-1">
          <span className="text-[10px] uppercase tracking-widest text-gray-600 font-mono shrink-0">From</span>
          <input
            type="datetime-local"
            value={filters.from}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            className="w-full px-2 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-white/25"
          />
        </label>
        <label className="flex items-center gap-1.5 lg:col-span-1">
          <span className="text-[10px] uppercase tracking-widest text-gray-600 font-mono shrink-0">To</span>
          <input
            type="datetime-local"
            value={filters.to}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            className="w-full px-2 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-white/25"
          />
        </label>
        <div className="flex gap-2 lg:col-span-2">
          <button
            onClick={applyFilters}
            className="flex-1 px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-white/90 text-black hover:bg-white transition-all"
          >
            Apply
          </button>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="px-3 py-1.5 rounded-lg text-xs font-mono text-gray-400 hover:text-white border border-white/10 transition-all"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {error ? (
          <div className="px-5 py-10 text-center text-sm font-mono text-red-400">{error}</div>
        ) : loading && data.logs.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm font-mono text-gray-500">Loading…</div>
        ) : data.logs.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <p className="text-sm font-mono text-gray-500">No log entries found.</p>
            {hasActiveFilters && (
              <p className="text-xs font-mono text-gray-600 mt-1">Try clearing your filters.</p>
            )}
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-gray-600 font-mono border-b border-white/5">
                <th className="px-5 py-2.5 font-medium">Time</th>
                <th className="px-3 py-2.5 font-medium">Severity</th>
                <th className="px-3 py-2.5 font-medium">Category</th>
                <th className="px-3 py-2.5 font-medium hidden md:table-cell">Component</th>
                <th className="px-3 py-2.5 font-medium hidden lg:table-cell">Action</th>
                <th className="px-5 py-2.5 font-medium">Message</th>
              </tr>
            </thead>
            <tbody>
              {data.logs.map((log) => {
                const sev = SEVERITY_META[log.severity] || SEVERITY_META.info;
                const hasMeta = log.metadata && Object.keys(log.metadata).length > 0;
                const isOpen = expanded === log.id;
                return (
                  <React.Fragment key={log.id}>
                    <tr
                      className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${hasMeta ? 'cursor-pointer' : ''}`}
                      onClick={() => hasMeta && setExpanded(isOpen ? null : log.id)}
                    >
                      <td className="px-5 py-3 text-[11px] font-mono text-gray-500 whitespace-nowrap">{formatTs(log.createdAt)}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono ring-1 ${sev.bg} ${sev.color} ${sev.ring}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />
                          {sev.label}
                        </span>
                      </td>
                      <td className={`px-3 py-3 text-xs font-mono ${CATEGORY_COLOR[log.category] || 'text-gray-300'}`}>{log.category}</td>
                      <td className="px-3 py-3 text-xs font-mono text-gray-400 hidden md:table-cell">{log.component || '—'}</td>
                      <td className="px-3 py-3 text-xs font-mono text-gray-400 hidden lg:table-cell">{log.action || '—'}</td>
                      <td className="px-5 py-3 text-xs text-gray-200 max-w-md">
                        <div className="flex items-center gap-2">
                          <span className="truncate">{log.message}</span>
                          {hasMeta && <span className="text-gray-600 text-[10px] shrink-0">{isOpen ? '▲' : '▼'}</span>}
                        </div>
                      </td>
                    </tr>
                    {isOpen && hasMeta && (
                      <tr className="border-b border-white/5 bg-black/30">
                        <td colSpan={6} className="px-5 py-3">
                          <pre className="text-[11px] font-mono text-gray-400 whitespace-pre-wrap break-all">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data.total > 0 && (
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-white/5">
          <span className="text-[11px] font-mono text-gray-600">
            Page {data.page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={data.page <= 1 || loading}
              className="px-3 py-1 rounded-lg text-xs font-mono text-gray-400 border border-white/10 hover:text-white hover:border-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={data.page >= totalPages || loading}
              className="px-3 py-1 rounded-lg text-xs font-mono text-gray-400 border border-white/10 hover:text-white hover:border-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
