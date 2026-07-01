import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Loader2, Inbox } from 'lucide-react';
import { getAuthHeaders } from '@/lib/apiHeaders.js';

const authHeaders = () => getAuthHeaders();

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

export default function ApprovalsQueue({ businessId }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [resolvingId, setResolvingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/approvals?businessId=${businessId}&status=pending`, { headers: authHeaders() });
      if (res.ok) setItems(await res.json());
    } catch {
      // silently ignore — this section is non-critical on the command center
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => { load(); }, [load]);

  const resolve = async (id, action) => {
    setResolvingId(id);
    try {
      const res = await fetch(`/api/approvals/${id}/${action}`, { method: 'POST', headers: authHeaders() });
      if (!res.ok) throw new Error(`Failed to ${action}`);
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success(action === 'approve' ? 'Approved' : 'Rejected');
    } catch (err) {
      toast.error(err.message || `Failed to ${action}`);
    } finally {
      setResolvingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-4 h-4 text-muted-foreground/40 animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
        <Inbox className="w-5 h-5 text-muted-foreground/30" />
        <p className="text-xs text-muted-foreground/50">No pending approvals right now.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="rounded-xl border border-white/10 bg-black/40 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs font-semibold text-foreground">{item.title}</p>
                {item.riskLevel === 'high' && (
                  <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-rose-400/10 text-rose-400 border border-rose-400/20">
                    High risk
                  </span>
                )}
              </div>
              {item.description && (
                <p className="text-[11px] text-muted-foreground/60 mt-1">{item.description}</p>
              )}
              <p className="text-[10px] text-muted-foreground/40 mt-1 font-mono">{timeAgo(item.createdAt)}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                disabled={resolvingId === item.id}
                onClick={() => resolve(item.id, 'approve')}
                className="p-1.5 rounded-lg bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-400/20 transition-colors disabled:opacity-50"
                title="Approve"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={resolvingId === item.id}
                onClick={() => resolve(item.id, 'reject')}
                className="p-1.5 rounded-lg bg-rose-400/10 text-rose-400 border border-rose-400/20 hover:bg-rose-400/20 transition-colors disabled:opacity-50"
                title="Reject"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
