import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { toast } from 'sonner';
import { Coins, Plus, Trash2, Pencil, Sparkles } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout.jsx';
import { Card, Badge, btn, btnPrimary, input, Spinner, ErrorBox } from '@/components/empire/ui.jsx';
import { useEmpire, useOverview, notifyEmpireChanged } from '@/components/empire/useEmpireData.js';
import StreamDialog from '@/components/empire/StreamDialog.jsx';
import { empireApi, usd, label } from '@/lib/empireApi.js';
import { askAsh } from '@/lib/ashGuide.js';

const TONE = { active: 'green', projected: 'amber', inactive: 'slate', archived: 'slate' };

export default function IncomeStreamsPage() {
  const [params, setParams] = useSearchParams();
  const businessId = params.get('businessId') || '';
  const overview = useOverview();
  const streams = useEmpire(() => empireApi.streams(businessId || undefined), [businessId]);
  const [dialog, setDialog] = useState(null);
  const businesses = overview.data?.businesses ?? [];
  const rows = streams.data ?? [];
  const projected = rows.reduce((s, r) => s + (r.estimatedMonthlyRevenue ?? 0), 0);

  const remove = async (s) => {
    if (!window.confirm(`Delete income stream "${s.title}"?`)) return;
    try { await empireApi.deleteStream(s.id); toast.success('Income stream deleted'); notifyEmpireChanged(); } catch (e) { toast.error(e.message); }
  };

  return (
    <AuthLayout>
      <Helmet><title>Income Streams | Starks Global Group</title></Helmet>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Coins className="w-6 h-6 text-emerald-300" /> Income Streams</h1>
            <p className="text-sm text-white/50 mt-1">Every way each business makes money. Estimates stay separate from verified revenue.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select className={`${input} !w-auto`} value={businessId} aria-label="Filter by business"
              onChange={(e) => setParams(e.target.value ? { businessId: e.target.value } : {})}>
              <option value="">All businesses</option>
              {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <button type="button" className={btn} onClick={() => askAsh('Suggest and add new income streams for my businesses.')}><Sparkles className="w-3.5 h-3.5" /> Ask ASH</button>
            <button type="button" className={btnPrimary} disabled={!businesses.length} onClick={() => setDialog('new')}><Plus className="w-3.5 h-3.5" /> New stream</button>
          </div>
        </div>
        <ErrorBox>{streams.error}</ErrorBox>
        {overview.data && !businesses.length && (
          <Card><p className="text-sm text-white/60">Create a business first. <Link to="/empire" className="text-cyan-300 hover:underline">Go to the Empire Command Center →</Link></p></Card>
        )}
        <Card title={`${rows.length} stream${rows.length === 1 ? '' : 's'}`} icon={Coins}
          action={projected > 0 && <span className="text-xs text-amber-200/80">Projected {usd(projected)}/mo (estimates)</span>}>
          {streams.loading && !streams.data ? <Spinner /> : rows.length === 0 ? <p className="text-sm text-white/45">No income streams yet.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[10px] uppercase tracking-wider text-white/40 border-b border-white/10">
                  <th className="py-2 pr-3">Stream</th><th className="py-2 pr-3">Business</th><th className="py-2 pr-3">Kind</th>
                  <th className="py-2 pr-3">Status</th><th className="py-2 pr-3">Estimate /mo</th><th className="py-2" />
                </tr></thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.id} className="border-b border-white/5">
                      <td className="py-2 pr-3 text-white">{s.title}{s.metadata?.notes && <p className="text-[11px] text-white/40 truncate max-w-xs">{s.metadata.notes}</p>}</td>
                      <td className="py-2 pr-3">{s.businessId ? <Link to={`/business/${s.businessId}`} className="text-white/70 hover:underline">{s.businessName}</Link> : '—'}</td>
                      <td className="py-2 pr-3 text-white/70">{label(s.streamType)}</td>
                      <td className="py-2 pr-3"><Badge tone={TONE[s.status] ?? 'slate'}>{s.status}</Badge></td>
                      <td className="py-2 pr-3 tabular-nums text-amber-200/80">{s.estimatedMonthlyRevenue != null ? usd(s.estimatedMonthlyRevenue) : '—'}</td>
                      <td className="py-2 text-right whitespace-nowrap">
                        <button type="button" className="p-1.5 rounded hover:bg-white/10 text-white/50" aria-label={`Edit ${s.title}`} onClick={() => setDialog({ stream: s })}><Pencil className="w-3.5 h-3.5" /></button>
                        <button type="button" className="p-1.5 rounded hover:bg-red-500/10 text-white/50 hover:text-red-300" aria-label={`Delete ${s.title}`} onClick={() => remove(s)}><Trash2 className="w-3.5 h-3.5" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <p className="text-xs text-white/35">Verified revenue per business is on the <Link to="/empire" className="text-cyan-300/80 hover:underline">Empire Command Center</Link>. It comes only from sales synced from connected payment providers (Stripe, Gumroad, PayPal).</p>
      </div>
      {dialog === 'new' && <StreamDialog businesses={businesses} businessId={businessId || undefined} onClose={() => setDialog(null)} />}
      {dialog?.stream && <StreamDialog businesses={businesses} stream={dialog.stream} onClose={() => setDialog(null)} />}
    </AuthLayout>
  );
}
