import React, { useEffect, useState } from 'react';
import { Building2, HeartPulse, Zap, Globe2, AlertTriangle, ShoppingCart, Hammer, LifeBuoy, X } from 'lucide-react';
import adminApi from '@/lib/adminApi.js';
import { num, pct, relativeTime } from '@/lib/adminFormat.js';

function fmtSeconds(s) {
  if (s === null || s === undefined) return '—';
  const n = Number(s);
  if (n < 60) return `${Math.round(n)}s`;
  if (n < 3600) return `${(n / 60).toFixed(1)}m`;
  return `${(n / 3600).toFixed(1)}h`;
}

function StatTile({ icon: Icon, label, value, sub, accent = 'text-primary' }) {
  return (
    <div className="rounded-xl border border-border/40 bg-muted/10 p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <Icon className={`w-3.5 h-3.5 ${accent}`} />
        {label}
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

export default function AdminBusinessOpsCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [businessId, setBusinessId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    adminApi
      .getBusinessOpsAnalytics(businessId ? { businessId } : {})
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load business ops analytics');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  if (loading && !data) {
    return (
      <div className="rounded-xl border border-border/40 bg-card/40 p-6 animate-pulse">
        <div className="h-5 w-48 bg-muted/30 rounded mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted/20 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Failed to load business operations analytics: {error}
      </div>
    );
  }

  if (!data) return null;

  const selectedBusiness = businessId ? data.businesses.find((b) => b.id === businessId) : null;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/40 bg-card/40 p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Building2 className="w-4.5 h-4.5 text-primary" />
              Business Operations
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Platform-wide health, automation, and self-healing metrics
              {selectedBusiness ? (
                <>
                  {' — '}
                  scoped to <span className="text-foreground font-medium">{selectedBusiness.name}</span>
                </>
              ) : null}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {selectedBusiness && (
              <button
                onClick={() => setBusinessId(null)}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
              >
                <X className="w-3 h-3" />
                Clear filter
              </button>
            )}
            <select
              value={businessId ?? ''}
              onChange={(e) => setBusinessId(e.target.value ? Number(e.target.value) : null)}
              className="text-xs px-3 py-1.5 rounded-lg border border-border/40 bg-background text-foreground"
            >
              <option value="">All businesses</option>
              {data.businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.origin})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatTile
            icon={Building2}
            label="Total Businesses"
            value={num(data.totals.total)}
            sub={`${num(data.totals.built)} built · ${num(data.totals.imported)} imported`}
          />
          <StatTile
            icon={HeartPulse}
            label="Avg Health Score"
            value={data.avgHealthScore !== null ? data.avgHealthScore.toFixed(1) : '—'}
            accent="text-emerald-500"
          />
          <StatTile
            icon={Zap}
            label="Automation Success Rate"
            value={pct(data.automationSuccessRate)}
            sub={`${num(data.automationEventCount)} self-heal events`}
            accent="text-yellow-500"
          />
          <StatTile
            icon={Globe2}
            label="Browser/Research Usage"
            value={num(data.browserResearchUsageCount)}
            sub={`${pct(data.browserResearchSuccessRate)} research success`}
            accent="text-sky-500"
          />
          <StatTile
            icon={ShoppingCart}
            label="Marketplace Conversions"
            value={num(data.marketplaceConversions)}
            accent="text-violet-500"
          />
          <StatTile
            icon={Hammer}
            label="Avg Build Time"
            value={fmtSeconds(data.avgBuildTimeSeconds)}
            accent="text-orange-500"
          />
          <StatTile
            icon={LifeBuoy}
            label="Avg Recovery Time"
            value={fmtSeconds(data.avgRecoveryTimeSeconds)}
            accent="text-rose-500"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border/40 bg-card/40 p-6">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Most Common Errors (Logging Center)
        </h3>
        {data.mostCommonErrors.length === 0 ? (
          <p className="text-xs text-muted-foreground">No errors recorded{selectedBusiness ? ' for this business' : ''}.</p>
        ) : (
          <div className="space-y-2">
            {data.mostCommonErrors.map((e, i) => (
              <div
                key={`${e.component}-${e.message}-${i}`}
                className="flex items-center justify-between gap-4 rounded-lg border border-border/30 bg-muted/10 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="text-xs font-medium text-foreground truncate">{e.message}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {e.component ?? 'unknown'} · {e.severity} · last seen {relativeTime(e.lastSeenAt)}
                  </div>
                </div>
                <div className="text-sm font-bold text-foreground shrink-0">{num(e.count)}×</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
