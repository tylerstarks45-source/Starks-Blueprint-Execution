import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Loader2, Sparkles, Check, X, RefreshCw, AlertTriangle } from 'lucide-react';
import { getAuthHeaders } from '@/lib/apiHeaders.js';

const authHeaders = () => getAuthHeaders();

const CATEGORY_META = {
  conversion: { label: 'Conversion', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  seo: { label: 'SEO', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  marketing: { label: 'Marketing', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
  automation: { label: 'Automation', color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20' },
  revenue: { label: 'Revenue', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  content: { label: 'Content', color: 'text-pink-400 bg-pink-400/10 border-pink-400/20' },
  risk: { label: 'Risk', color: 'text-rose-400 bg-rose-400/10 border-rose-400/20' },
};

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

export default function GrowthRecommendationsPanel({ businessId }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [resolvingId, setResolvingId] = useState(null);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/recommendations?status=new`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setItems(data.recommendations ?? []);
      }
    } catch {
      // non-critical section — fail silently, panel just shows empty state
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => { load(); }, [load]);

  const resolve = async (id, action) => {
    setResolvingId(id);
    try {
      const res = await fetch(`/api/businesses/${businessId}/recommendations/${id}/${action}`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(`Failed to ${action}`);
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success(action === 'apply' ? 'Marked as applied' : 'Dismissed');
    } catch (err) {
      toast.error(err.message || `Failed to ${action}`);
    } finally {
      setResolvingId(null);
    }
  };

  const runImprovementPass = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/recommendations/generate`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to start improvement pass');
      toast.success('ASH is analyzing your business — new recommendations will appear shortly.');
      setTimeout(load, 8000);
    } catch (err) {
      toast.error(err.message || 'Failed to start improvement pass');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-end mb-3">
        <button
          onClick={runImprovementPass}
          disabled={generating}
          className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider px-2.5 py-1.5 rounded-lg bg-white/5 text-foreground/70 border border-white/10 hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          Run improvement pass
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-4 h-4 text-muted-foreground/40 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground/60 inline-flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" /> No recommendations yet — run an improvement pass to get growth suggestions from ASH.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((item) => {
            const meta = CATEGORY_META[item.category] ?? { label: item.category, color: 'text-foreground/70 bg-white/5 border-white/10' };
            return (
              <div key={item.id} className="rounded-xl border border-white/10 bg-black/40 p-3">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${meta.color}`}>
                    {meta.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground/40 font-mono shrink-0">{item.confidence}% confidence</span>
                </div>
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-amber-400 shrink-0" /> {item.title}
                </p>
                {item.description && (
                  <p className="text-[11px] text-muted-foreground/60 mt-1">{item.description}</p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[10px] text-muted-foreground/40 font-mono">{timeAgo(item.createdAt)}</p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      disabled={resolvingId === item.id}
                      onClick={() => resolve(item.id, 'apply')}
                      className="p-1.5 rounded-lg bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-400/20 transition-colors disabled:opacity-50"
                      title="Mark as applied"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={resolvingId === item.id}
                      onClick={() => resolve(item.id, 'dismiss')}
                      className="p-1.5 rounded-lg bg-white/5 text-muted-foreground/60 border border-white/10 hover:bg-white/10 transition-colors disabled:opacity-50"
                      title="Dismiss"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
