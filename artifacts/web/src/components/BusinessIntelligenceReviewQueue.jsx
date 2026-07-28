import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, HelpCircle, Loader2, Sparkles, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getAuthHeaders } from '@/lib/apiHeaders.js';

const headers = () => ({ ...getAuthHeaders(), 'Content-Type': 'application/json' });

export default function BusinessIntelligenceReviewQueue({ businessId }) {
  const [item, setItem] = useState(null);
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/review-queue`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Could not load reviews');
      const data = await res.json();
      setItem((data.items || [])[0] || null);
      setValue('');
    } catch {
      setItem(null);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => { load(); }, [load]);

  const resolve = async (status) => {
    if (!item) return;
    setSaving(true);
    try {
      if (item.kind === 'confirmation' && status === 'resolved') {
        const fieldKey = item.payload?.fieldKey;
        if (!fieldKey || !value.trim()) throw new Error('Please provide an answer before confirming.');
        const save = await fetch(`/api/businesses/${businessId}/dna/${fieldKey}`, {
          method: 'PUT', headers: headers(), body: JSON.stringify({ value: value.trim(), source: 'business_review_confirmation' }),
        });
        if (!save.ok) throw new Error('Could not save your answer');
      }
      const res = await fetch(`/api/businesses/${businessId}/review-queue/${item.id}/resolve`, {
        method: 'POST', headers: headers(), body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Could not update this review');
      toast.success(status === 'resolved' ? 'Business intelligence updated' : 'Review dismissed');
      await load();
    } catch (error) {
      toast.error(error.message || 'Could not update review');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 text-muted-foreground/40 animate-spin" /></div>;
  if (!item) return <p className="text-xs text-muted-foreground/50 py-3">No business intelligence reviews right now.</p>;

  const confirmation = item.kind === 'confirmation';
  return (
    <div className="rounded-xl border border-violet-400/20 bg-violet-400/5 p-3">
      <div className="flex gap-2">
        {confirmation ? <HelpCircle className="w-4 h-4 text-violet-300 mt-0.5 shrink-0" /> : <Sparkles className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground">{item.title}</p>
          <p className="text-[11px] leading-relaxed text-muted-foreground/70 mt-1">{item.description}</p>
          {confirmation && (
            <input value={value} onChange={(event) => setValue(event.target.value)} type={item.payload?.inputType || 'text'}
              placeholder="https://your-business.com" className="mt-3 w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-xs text-foreground outline-none focus:border-violet-400/50" />
          )}
          <div className="flex gap-2 mt-3">
            <button disabled={saving} onClick={() => resolve('resolved')} className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-2 py-1.5 text-[10px] font-medium text-emerald-300 hover:bg-emerald-400/20 disabled:opacity-50">
              <CheckCircle2 className="w-3 h-3" /> {confirmation ? 'Save answer' : 'Mark reviewed'}
            </button>
            <button disabled={saving} onClick={() => resolve('dismissed')} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1.5 text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-50">
              <XCircle className="w-3 h-3" /> Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}