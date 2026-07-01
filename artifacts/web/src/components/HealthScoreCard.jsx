import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Activity, RefreshCw, TrendingUp, AlertTriangle, Plug, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const SUB_SCORES = [
  { key: 'automationScore', label: 'Automation' },
  { key: 'growthScore', label: 'Growth' },
  { key: 'marketingScore', label: 'Marketing' },
  { key: 'seoScore', label: 'SEO' },
  { key: 'contentScore', label: 'Content' },
];

function badgeForScore(score) {
  if (score == null) return { label: 'Unknown', dot: 'bg-zinc-500', text: 'text-zinc-400', ring: 'ring-zinc-500/30' };
  if (score >= 70) return { label: 'Healthy', dot: 'bg-emerald-400', text: 'text-emerald-400', ring: 'ring-emerald-400/30' };
  if (score >= 40) return { label: 'Needs attention', dot: 'bg-amber-400', text: 'text-amber-400', ring: 'ring-amber-400/30' };
  return { label: 'At risk', dot: 'bg-rose-400', text: 'text-rose-400', ring: 'ring-rose-400/30' };
}

// Reused on the Portfolio card, the business detail page, and (later) the
// dashboard. `compact` renders a smaller badge-only version for cards;
// full mode renders the score breakdown + opportunities/risks/recommendations.
export default function HealthScoreCard({ businessId, compact = false, className = '' }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const pollRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/businesses/${businessId}/health`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to load health score');
      const json = await res.json();
      setData(json);
      setAnalyzing(!!json.analyzing);
      return json;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!analyzing) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(async () => {
      const json = await load();
      if (json && !json.analyzing) {
        clearInterval(pollRef.current);
      }
    }, 4000);
    return () => clearInterval(pollRef.current);
  }, [analyzing, load]);

  const reanalyze = useCallback(async (e) => {
    e?.stopPropagation?.();
    try {
      const res = await fetch(`/api/businesses/${businessId}/health/analyze`, { method: 'POST', headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to start analysis');
      setAnalyzing(true);
      toast.success('ASH is re-analyzing this business…');
    } catch (err) {
      toast.error(err.message || 'Failed to start analysis');
    }
  }, [businessId]);

  const latest = data?.latest ?? null;
  const badge = badgeForScore(latest?.overallHealth);

  if (loading) {
    return (
      <div className={`flex items-center gap-2 text-xs text-muted-foreground/50 font-mono ${className}`}>
        <RefreshCw className="w-3 h-3 animate-spin" /> Loading health score…
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`flex flex-col gap-1 min-w-0 ${className}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          {analyzing ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] font-mono text-muted-foreground/70">
              <RefreshCw className="w-3 h-3 animate-spin" /> Analyzing…
            </span>
          ) : latest ? (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-mono font-semibold ring-1 ${badge.ring} border-white/10 ${badge.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
              {latest.overallHealth}% Health
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] font-mono text-muted-foreground/50">
              No score yet
            </span>
          )}
        </div>
        {latest?.summary && !analyzing && (
          <p className="text-[11px] text-muted-foreground/60 leading-snug truncate" title={latest.summary}>
            {latest.summary}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-white/10 bg-black/70 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Business Health Score</h2>
        </div>
        <button
          onClick={reanalyze}
          disabled={analyzing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-foreground hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-3 h-3 ${analyzing ? 'animate-spin' : ''}`} />
          {analyzing ? 'Analyzing…' : 'Re-analyze'}
        </button>
      </div>

      {analyzing && !latest && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground/70 py-6 justify-center">
          <RefreshCw className="w-4 h-4 animate-spin" /> ASH is running the first analysis pass…
        </div>
      )}

      {!analyzing && !latest && (
        <p className="text-sm text-muted-foreground/60 py-2">No health score yet. Click Re-analyze to have ASH score this business.</p>
      )}

      {latest && (
        <>
          <div className="flex items-center gap-4 mb-5">
            <div className={`w-16 h-16 rounded-2xl border flex flex-col items-center justify-center ring-1 ${badge.ring} border-white/10 bg-white/5`}>
              <span className={`text-lg font-bold font-mono ${badge.text}`}>{latest.overallHealth}%</span>
            </div>
            <div className="min-w-0">
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold font-mono ${badge.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} /> {badge.label}
              </span>
              {latest.summary && <p className="text-sm text-foreground/80 mt-1.5">{latest.summary}</p>}
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2 mb-4">
            {SUB_SCORES.map((s) => (
              <div key={s.key} className="text-center">
                <div className="text-sm font-bold font-mono text-foreground">{latest[s.key]}</div>
                <div className="text-[10px] text-muted-foreground/50 font-mono mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline mb-2"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? 'Hide details' : 'Show opportunities, risks & recommendations'}
          </button>

          {expanded && (
            <div className="space-y-4 pt-2 border-t border-white/10">
              {latest.revenueOpportunities?.length > 0 && (
                <Section icon={TrendingUp} color="text-emerald-400" title="Revenue opportunities" items={latest.revenueOpportunities} />
              )}
              {latest.operationalRisks?.length > 0 && (
                <Section icon={AlertTriangle} color="text-rose-400" title="Operational risks" items={latest.operationalRisks} />
              )}
              {latest.missingIntegrations?.length > 0 && (
                <Section icon={Plug} color="text-blue-400" title="Missing integrations" items={latest.missingIntegrations} />
              )}
              {latest.recommendations?.length > 0 && (
                <Section icon={Sparkles} color="text-amber-400" title="ASH recommends" items={latest.recommendations} />
              )}
              {latest.estimatedGrowthPotential && (
                <div className="text-xs text-muted-foreground/60">
                  <span className="font-semibold text-foreground/80">Estimated growth potential:</span> {latest.estimatedGrowthPotential}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Section({ icon: Icon, color, title, items }) {
  return (
    <div>
      <div className={`flex items-center gap-1.5 text-xs font-semibold mb-1.5 ${color}`}>
        <Icon className="w-3.5 h-3.5" /> {title}
      </div>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-foreground/80 pl-1">• {item}</li>
        ))}
      </ul>
    </div>
  );
}
