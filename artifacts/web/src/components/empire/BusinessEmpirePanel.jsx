import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Coins, Archive, Plus, ExternalLink, Shapes } from 'lucide-react';
import { empireApi, usd, label } from '@/lib/empireApi.js';
import { Badge, btn, input, Spinner } from './ui.jsx';
import { useEmpire, useBusinessTypes, notifyEmpireChanged } from './useEmpireData.js';
import StreamDialog from './StreamDialog.jsx';
import AssetDialog from './AssetDialog.jsx';

const STATUS_TONE = { active: 'green', projected: 'amber', inactive: 'slate', archived: 'slate', draft: 'amber' };

// Business workspace view of the empire structure: type, income streams and vault assets for one business.
export default function BusinessEmpirePanel({ business }) {
  const streams = useEmpire(() => empireApi.streams(business.id), [business.id]);
  const assets = useEmpire(() => empireApi.assets({ businessId: business.id }), [business.id]);
  const { data: typeData } = useBusinessTypes();
  const [dialog, setDialog] = useState(null);
  const [savingType, setSavingType] = useState(false);
  const typeKey = business.typeKey ?? business.businessType;

  const changeType = async (e) => {
    setSavingType(true);
    try { await empireApi.setBusinessType(business.id, e.target.value); toast.success('Business type updated'); notifyEmpireChanged(); }
    catch (err) { toast.error(err.message); } finally { setSavingType(false); }
  };

  const projected = (streams.data ?? []).reduce((s, r) => s + (r.estimatedMonthlyRevenue ?? 0), 0);
  const me = [{ id: business.id, name: business.name }];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Shapes className="w-4 h-4 text-cyan-300" />
        <span className="text-xs text-white/50">Business type</span>
        <select className={`${input} !w-auto !py-1 text-xs`} value={typeKey} onChange={changeType} disabled={savingType || !typeData} aria-label="Business type">
          {(typeData?.types ?? [{ key: typeKey, name: label(typeKey) }]).map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
        </select>
        {savingType && <Spinner />}
        <Link to="/business-types" className="text-xs text-cyan-300/80 hover:text-cyan-200">Manage types →</Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-white/60"><Coins className="w-3.5 h-3.5 text-emerald-300" /> Income streams</p>
            <button type="button" className={btn} onClick={() => setDialog('stream')}><Plus className="w-3.5 h-3.5" /> Add</button>
          </div>
          {streams.loading && !streams.data ? <Spinner /> : (streams.data ?? []).length === 0 ? (
            <p className="text-sm text-white/45">No income streams yet. Add one, or ask ASH to set them up.</p>
          ) : (
            <ul className="space-y-1.5">
              {streams.data.map((s) => (
                <li key={s.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                  <button type="button" className="text-sm text-white/85 truncate text-left hover:underline" onClick={() => setDialog({ stream: s })}>{s.title}</button>
                  <span className="text-[10px] text-white/40">{label(s.streamType)}</span>
                  <span className="ml-auto flex items-center gap-2">
                    {s.estimatedMonthlyRevenue != null && <span className="text-[11px] text-amber-200/80 tabular-nums" title="Estimate, not earned">est. {usd(s.estimatedMonthlyRevenue)}/mo</span>}
                    <Badge tone={STATUS_TONE[s.status] ?? 'slate'}>{s.status}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {projected > 0 && <p className="mt-2 text-[11px] text-white/40">Projected total {usd(projected)}/mo. Estimates only, not verified revenue.</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-white/60"><Archive className="w-3.5 h-3.5 text-violet-300" /> Assets</p>
            <div className="flex gap-2">
              <Link to={`/asset-vault?businessId=${business.id}`} className={btn}>Vault</Link>
              <button type="button" className={btn} onClick={() => setDialog('asset')}><Plus className="w-3.5 h-3.5" /> Add</button>
            </div>
          </div>
          {assets.loading && !assets.data ? <Spinner /> : (assets.data ?? []).length === 0 ? (
            <p className="text-sm text-white/45">Nothing in the vault for this business yet. Pages, domains, systems and lists you create show up here automatically.</p>
          ) : (
            <ul className="space-y-1.5 max-h-64 overflow-y-auto ash-scroll">
              {assets.data.slice(0, 20).map((a) => (
                <li key={a.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-sm text-white/85 truncate">{a.name}</span>
                  <span className="text-[10px] text-white/40">{label(a.classKey)}</span>
                  {a.businessId !== business.id && <Badge tone="violet">shared</Badge>}
                  {a.externalUrl && <a href={a.externalUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-white/40 hover:text-white" aria-label={`Open ${a.name}`}><ExternalLink className="w-3.5 h-3.5" /></a>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {dialog === 'stream' && <StreamDialog businesses={me} businessId={business.id} onClose={() => setDialog(null)} />}
      {dialog?.stream && <StreamDialog businesses={me} stream={dialog.stream} onClose={() => setDialog(null)} />}
      {dialog === 'asset' && <AssetDialog businesses={me} businessId={business.id} onClose={() => setDialog(null)} />}
    </div>
  );
}
