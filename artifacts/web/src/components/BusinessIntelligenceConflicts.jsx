import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Check, Clock, Loader2, Pencil, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { getAuthHeaders } from '@/lib/apiHeaders.js';

const headers = () => ({ ...getAuthHeaders(), 'Content-Type': 'application/json' });

const TRUST_META = {
  user_confirmed: { label: 'Confirmed by you', className: 'text-emerald-300 border-emerald-400/20 bg-emerald-400/10' },
  verified_system_data: { label: 'Verified from your data', className: 'text-blue-300 border-blue-400/20 bg-blue-400/10' },
  high_confidence_inference: { label: 'High-confidence inference', className: 'text-violet-300 border-violet-400/20 bg-violet-400/10' },
  low_confidence_inference: { label: 'Low-confidence inference', className: 'text-amber-300 border-amber-400/20 bg-amber-400/10' },
};

const ACTION_META = {
  accept_new: { label: 'Accept new', icon: Check, className: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20' },
  edit_value: { label: 'Edit value', icon: Pencil, className: 'border-violet-400/20 bg-violet-400/10 text-violet-300 hover:bg-violet-400/20' },
  keep_current: { label: 'Keep current', icon: ShieldCheck, className: 'border-white/10 text-muted-foreground hover:text-foreground' },
  defer: { label: 'Decide later', icon: Clock, className: 'border-white/10 text-muted-foreground hover:text-foreground' },
};
const ACTION_ORDER = ['accept_new', 'edit_value', 'keep_current', 'defer'];

function prettifyFieldKey(key) {
  return String(key || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

// Business DNA conflicts: when new evidence disagrees with what's already on
// file, this shows both values side by side with their trust levels, why it
// matters (impactReason), the system's recommended action, and the four
// decisions the spec calls for (keep current / accept new / edit / decide
// later) — never auto-resolved, always a business-owner decision.
export default function BusinessIntelligenceConflicts({ businessId }) {
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/conflicts`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Could not load conflicts');
      const data = await res.json();
      setConflicts(data.conflicts || []);
    } catch {
      setConflicts([]);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => { load(); }, [load]);

  const decide = async (conflict, action, value) => {
    setSavingId(conflict.id);
    try {
      const body = value !== undefined ? { action, value } : { action };
      const res = await fetch(`/api/businesses/${businessId}/conflicts/${conflict.id}/decision`, {
        method: 'POST', headers: headers(), body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Could not record your decision');
      toast.success('Business DNA updated');
      setEditingId(null);
      setEditValue('');
      await load();
    } catch (error) {
      toast.error(error.message || 'Could not record your decision');
    } finally {
      setSavingId(null);
    }
  };

  const handleAction = (conflict, action) => {
    if (action === 'edit_value') {
      const prefill = formatValue(conflict.incomingValue);
      setEditingId(conflict.id);
      setEditValue(prefill === '—' ? '' : prefill);
      return;
    }
    decide(conflict, action);
  };

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 text-muted-foreground/40 animate-spin" /></div>;
  if (conflicts.length === 0) return <p className="text-xs text-muted-foreground/50 py-3">No open Business DNA conflicts.</p>;

  return (
    <div className="space-y-3">
      {conflicts.map((conflict) => {
        const currentTrust = TRUST_META[conflict.currentTrustLevel] ?? TRUST_META.low_confidence_inference;
        const incomingTrust = TRUST_META[conflict.incomingTrustLevel] ?? TRUST_META.low_confidence_inference;
        const saving = savingId === conflict.id;
        const isEditing = editingId === conflict.id;
        return (
          <div key={conflict.id} className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
            <div className="flex gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground">{prettifyFieldKey(conflict.fieldKey)}</p>
                <p className="text-[11px] leading-relaxed text-muted-foreground/70 mt-1">{conflict.impactReason}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                  <div className="rounded-lg border border-white/10 bg-black/30 p-2 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50">Current</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium whitespace-nowrap ${currentTrust.className}`}>{currentTrust.label}</span>
                    </div>
                    <p className="text-xs text-foreground/90 break-words">{formatValue(conflict.currentValue)}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/30 p-2 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50">New</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium whitespace-nowrap ${incomingTrust.className}`}>{incomingTrust.label}</span>
                    </div>
                    <p className="text-xs text-foreground/90 break-words">{formatValue(conflict.incomingValue)}</p>
                  </div>
                </div>

                {conflict.recommendedAction && (
                  <p className="text-[11px] text-violet-300/90 mt-2">
                    <span className="font-semibold">Recommended:</span> {ACTION_META[conflict.recommendedAction.action]?.label ?? conflict.recommendedAction.action} — {conflict.recommendedAction.reason}
                  </p>
                )}

                {isEditing ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <input
                      value={editValue}
                      onChange={(event) => setEditValue(event.target.value)}
                      placeholder="Enter the correct value"
                      className="flex-1 min-w-[10rem] rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-xs text-foreground outline-none focus:border-violet-400/50"
                    />
                    <button
                      disabled={saving || !editValue.trim()}
                      onClick={() => decide(conflict, 'edit_value', editValue.trim())}
                      className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1.5 text-[10px] font-medium text-emerald-300 hover:bg-emerald-400/20 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      disabled={saving}
                      onClick={() => { setEditingId(null); setEditValue(''); }}
                      className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {ACTION_ORDER.map((action) => {
                      const meta = ACTION_META[action];
                      const Icon = meta.icon;
                      return (
                        <button
                          key={action}
                          disabled={saving}
                          onClick={() => handleAction(conflict, action)}
                          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-medium disabled:opacity-50 ${meta.className}`}
                        >
                          <Icon className="w-3 h-3" /> {meta.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
