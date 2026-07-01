import React, { useEffect, useState, useCallback } from 'react';
import { Activity, RefreshCw, AlertTriangle, Wrench, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const DIMENSIONS = [
  { key: 'connectionScore', label: 'Connection' },
  { key: 'hostingScore', label: 'Hosting' },
  { key: 'apiScore', label: 'API' },
  { key: 'seoScore', label: 'SEO' },
  { key: 'performanceScore', label: 'Performance' },
  { key: 'securityScore', label: 'Security' },
  { key: 'revenueScore', label: 'Revenue' },
  { key: 'automationScore', label: 'Automation' },
];

const STATUS_META = {
  healthy: { label: 'Healthy', dot: 'bg-emerald-400', text: 'text-emerald-400', ring: 'ring-emerald-400/30' },
  degraded: { label: 'Degraded', dot: 'bg-amber-400', text: 'text-amber-400', ring: 'ring-amber-400/30' },
  critical: { label: 'Critical', dot: 'bg-rose-400', text: 'text-rose-400', ring: 'ring-rose-400/30' },
};

const SEVERITY_META = {
  low: 'text-zinc-400',
  medium: 'text-amber-400',
  high: 'text-rose-400',
  critical: 'text-rose-500',
};

function scoreColor(score) {
  if (score == null) return 'text-zinc-500';
  if (score >= 70) return 'text-emerald-400';
  if (score >= 40) return 'text-amber-400';
  return 'text-rose-400';
}

// Renders the per-dimension monitoring health for either a system instance
// or a business, backed by the /monitoring endpoints (distinct from the
// AI-driven /health endpoints surfaced by HealthScoreCard).
export default function HealthDashboardCard({ systemInstanceId, businessId, className = '' }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const basePath = systemInstanceId != null
    ? `/api/system-instances/${systemInstanceId}/monitoring`
    : `/api/businesses/${businessId}/monitoring`;

  const load = useCallback(async () => {
    try {
      const res = await fetch(basePath, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to load monitoring data');
      setData(await res.json());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [basePath]);

  useEffect(() => { load(); }, [load]);

  const recompute = useCallback(async (e) => {
    e?.stopPropagation?.();
    setRecomputing(true);
    try {
      const res = await fetch(`${basePath}/recompute`, { method: 'POST', headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to recompute health');
      const result = await res.json();
      if (result.selfHealActionsTaken > 0) {
        toast.success(`Health recomputed — ${result.selfHealActionsTaken} self-heal action(s) applied.`);
      } else {
        toast.success('Health recomputed.');
      }
      await load();
    } catch (err) {
      toast.error(err.message || 'Failed to recompute health');
    } finally {
      setRecomputing(false);
    }
  }, [basePath, load]);

  if (loading) {
    return (
      <div className={`flex items-center gap-2 text-xs text-muted-foreground/50 font-mono ${className}`}>
        <RefreshCw className="w-3 h-3 animate-spin" /> Loading monitoring…
      </div>
    );
  }

  const latest = data?.latest ?? null;
  const statusMeta = STATUS_META[latest?.status] ?? { label: 'Unknown', dot: 'bg-zinc-500', text: 'text-zinc-400', ring: 'ring-zinc-500/30' };
  const issues = latest?.issues ?? [];

  return (
    <div className={`rounded-2xl border border-white/10 bg-black/70 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Monitoring &amp; Self-Healing</h2>
        </div>
        <button
          onClick={recompute}
          disabled={recomputing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-foreground hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-3 h-3 ${recomputing ? 'animate-spin' : ''}`} />
          {recomputing ? 'Checking…' : 'Check now'}
        </button>
      </div>

      {!latest && (
        <p className="text-sm text-muted-foreground/60 py-2">No monitoring data yet. Click Check now to run the first health scan.</p>
      )}

      {latest && (
        <>
          <div className="flex items-center gap-4 mb-5">
            <div className={`w-16 h-16 rounded-2xl border flex flex-col items-center justify-center ring-1 ${statusMeta.ring} border-white/10 bg-white/5`}>
              <span className={`text-lg font-bold font-mono ${scoreColor(latest.overallScore)}`}>{latest.overallScore}%</span>
            </div>
            <div className="min-w-0">
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold font-mono ${statusMeta.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} /> {statusMeta.label}
              </span>
              <p className="text-[11px] text-muted-foreground/50 mt-1 font-mono">
                Last checked {new Date(latest.computedAt).toLocaleString()}
              </p>
              {!data.canAutoFix && (
                <p className="text-[11px] text-amber-400/80 mt-1">Self-healing disabled — enable Operations Mode auto-fix permissions.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-4">
            {DIMENSIONS.map((d) => (
              <div key={d.key} className="text-center">
                <div className={`text-sm font-bold font-mono ${scoreColor(latest[d.key])}`}>{latest[d.key]}</div>
                <div className="text-[9px] text-muted-foreground/50 font-mono mt-0.5 leading-tight">{d.label}</div>
              </div>
            ))}
          </div>

          {issues.length > 0 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline mb-2"
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {expanded ? 'Hide issues' : `Show ${issues.length} issue${issues.length > 1 ? 's' : ''}`}
            </button>
          )}

          {expanded && issues.length > 0 && (
            <ul className="space-y-1.5 pt-2 border-t border-white/10">
              {issues.map((issue, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  {issue.autoFixed ? (
                    <Wrench className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${SEVERITY_META[issue.severity] ?? 'text-zinc-400'}`} />
                  )}
                  <span className="text-foreground/80">
                    <span className="text-muted-foreground/50 font-mono text-[10px] uppercase mr-1.5">{issue.dimension}</span>
                    {issue.message}
                    {issue.autoFixed && <span className="text-emerald-400 text-[11px] ml-1.5">(auto-fixed)</span>}
                    {issue.autoFixable && !issue.autoFixed && <span className="text-amber-400 text-[11px] ml-1.5">(pending approval)</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
