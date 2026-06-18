import { useState, useEffect } from 'react';
import {
  ShoppingBag, TrendingUp, Link2, Zap, BarChart2,
  RefreshCw, AlertCircle, ExternalLink, CheckCircle2, XCircle,
} from 'lucide-react';

function getAuthHeaders() {
  const token = localStorage.getItem('sbep_auth_token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

function StatCard({ icon: Icon, label, value, sub, color = 'violet' }) {
  const colors = {
    violet: 'from-violet-500/10 to-violet-500/5 border-violet-500/20 text-violet-400',
    emerald: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 text-emerald-400',
    cyan: 'from-cyan-500/10 to-cyan-500/5 border-cyan-500/20 text-cyan-400',
    amber: 'from-amber-500/10 to-amber-500/5 border-amber-500/20 text-amber-400',
  };
  return (
    <div className={`rounded-xl border bg-gradient-to-br p-5 ${colors[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground mb-1">{label}</p>
          <p className="text-3xl font-bold text-foreground font-mono">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className={`p-2 rounded-lg bg-current/10`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function MiniBar({ value, max }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground w-6 text-right">{value}</span>
    </div>
  );
}

export default function AdminMarketplaceToolsPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/marketplace-stats', { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
        <RefreshCw className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading marketplace stats…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-red-400">
        <AlertCircle className="w-8 h-8" />
        <p className="text-sm">{error}</p>
        <button onClick={load} className="text-xs px-4 py-2 rounded-lg border border-red-500/30 hover:bg-red-500/10 transition-colors">
          Retry
        </button>
      </div>
    );
  }

  const { tools = [], summary = {}, categoryBreakdown = {} } = data ?? {};
  const maxSelections = Math.max(...tools.map(t => t.selectionCount ?? 0), 1);
  const categories = Object.entries(categoryBreakdown);

  const allCategories = ['all', ...categories.map(([k]) => k)];
  const filtered = filter === 'all' ? tools : tools.filter(t => (t.categoryName ?? 'Uncategorized') === filter);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-violet-400" />
            Marketplace Tools
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tool adoption, usage in builds, and affiliate link tracking
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/40 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShoppingBag} label="Total Tools" value={summary.totalTools ?? 0} color="violet" />
        <StatCard icon={CheckCircle2} label="Active Tools" value={summary.activeTools ?? 0} sub={`${summary.totalTools ? Math.round((summary.activeTools / summary.totalTools) * 100) : 0}% of catalogue`} color="emerald" />
        <StatCard icon={Link2} label="With Affiliate Link" value={summary.toolsWithAffiliate ?? 0} color="cyan" />
        <StatCard icon={TrendingUp} label="Build Selections" value={summary.totalSelections ?? 0} sub="Times chosen in user builds" color="amber" />
      </div>

      {/* Category breakdown + Top tools */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Category breakdown */}
        <div className="rounded-xl border border-border/40 bg-white/2 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-cyan-400" />
            Category Breakdown
          </h3>
          {categories.length === 0 ? (
            <p className="text-xs text-muted-foreground">No category data yet.</p>
          ) : (
            <div className="space-y-3">
              {categories.sort((a, b) => b[1].selections - a[1].selections).map(([cat, info]) => (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-foreground/80 truncate">{cat}</span>
                    <span className="text-xs text-muted-foreground ml-2 shrink-0">{info.count} tools · {info.selections} uses</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500/60 to-violet-500/60"
                      style={{ width: `${Math.round((info.count / (summary.totalTools || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top tools by build usage */}
        <div className="rounded-xl border border-border/40 bg-white/2 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Top Tools by Build Usage
          </h3>
          {tools.length === 0 ? (
            <p className="text-xs text-muted-foreground">No tool selections yet.</p>
          ) : (
            <div className="space-y-2.5">
              {tools.slice(0, 8).map((t) => (
                <div key={t.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-foreground/80 truncate">{t.name}</span>
                    <span className="text-xs text-muted-foreground ml-2 shrink-0">{t.categoryName ?? '—'}</span>
                  </div>
                  <MiniBar value={t.selectionCount ?? 0} max={maxSelections} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Full tool table */}
      <div className="rounded-xl border border-border/40 bg-white/2 overflow-hidden">
        <div className="p-4 border-b border-border/30 flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-sm font-semibold text-foreground">All Marketplace Tools</h3>
          <div className="flex gap-1 flex-wrap">
            {allCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  filter === cat
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                }`}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/20 text-xs text-muted-foreground">
                <th className="px-4 py-3 text-left font-medium">Tool</th>
                <th className="px-4 py-3 text-left font-medium">Category</th>
                <th className="px-4 py-3 text-left font-medium">Pricing</th>
                <th className="px-4 py-3 text-center font-medium">Status</th>
                <th className="px-4 py-3 text-center font-medium">Build Uses</th>
                <th className="px-4 py-3 text-center font-medium">Affiliate</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-xs text-muted-foreground">
                    No tools found.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="border-b border-border/10 hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-foreground text-xs">{t.name}</p>
                        {t.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{t.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded text-xs bg-violet-500/10 text-violet-400 border border-violet-500/20">
                        {t.categoryName ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{t.pricing ?? '—'}</td>
                    <td className="px-4 py-3 text-center">
                      {t.activeStatus
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                        : <XCircle className="w-4 h-4 text-red-400/60 mx-auto" />}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-mono text-sm font-bold ${(t.selectionCount ?? 0) > 0 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                        {t.selectionCount ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {t.affiliateLink ? (
                        <a
                          href={t.affiliateLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                          onClick={e => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Link
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
