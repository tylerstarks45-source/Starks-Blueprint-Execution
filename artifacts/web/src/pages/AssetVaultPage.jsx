import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { toast } from 'sonner';
import { Archive, Plus, ExternalLink, Share2, X } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout.jsx';
import { Card, Badge, btn, btnPrimary, input, Spinner, ErrorBox, Modal } from '@/components/empire/ui.jsx';
import { useEmpire, useOverview, useBusinessTypes, notifyEmpireChanged } from '@/components/empire/useEmpireData.js';
import AssetDialog from '@/components/empire/AssetDialog.jsx';
import { empireApi, label } from '@/lib/empireApi.js';
import { timeAgo } from '@/lib/ashApi.js';

const SOURCE = { landing_pages: 'Landing pages', user_domains: 'Domains', system_instances: 'Systems', email_lists: 'Email', manual: 'Added by you', ash: 'Made by ASH' };

function ShareDialog({ asset, businesses, onClose }) {
  const [busy, setBusy] = useState(null);
  const shared = new Set(asset.sharedWith ?? []);
  const toggle = async (b) => {
    setBusy(b.id);
    try {
      if (shared.has(b.id)) await empireApi.unshareAsset(asset.id, b.id); else await empireApi.shareAsset(asset.id, b.id);
      notifyEmpireChanged();
      onClose();
    } catch (e) { toast.error(e.message); } finally { setBusy(null); }
  };
  const others = businesses.filter((b) => b.id !== asset.businessId);
  return (
    <Modal title={`Share "${asset.name}"`} onClose={onClose}>
      <p className="text-sm text-white/60">Assets belong to one business. Sharing lets another business use it too. Nothing is shared unless you choose it here.</p>
      {others.length === 0 ? <p className="text-sm text-white/45">You have no other businesses to share with.</p> : (
        <ul className="space-y-1.5">
          {others.map((b) => (
            <li key={b.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 border border-white/10">
              <span className="text-sm text-white/85">{b.name}</span>
              <button type="button" className={shared.has(b.id) ? btn : btnPrimary} disabled={busy === b.id} onClick={() => toggle(b)}>
                {busy === b.id && <Spinner />}{shared.has(b.id) ? 'Stop sharing' : 'Share'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

export default function AssetVaultPage() {
  const [params, setParams] = useSearchParams();
  const businessId = params.get('businessId') || '';
  const classKey = params.get('classKey') || '';
  const overview = useOverview();
  const { data: typeData } = useBusinessTypes();
  const assets = useEmpire(() => empireApi.assets({ businessId: businessId || undefined, classKey: classKey || undefined }), [businessId, classKey]);
  const [adding, setAdding] = useState(false);
  const [sharing, setSharing] = useState(null);
  const businesses = overview.data?.businesses ?? [];
  const nameOf = (id) => businesses.find((b) => b.id === id)?.name;
  const setParam = (k, v) => { const next = Object.fromEntries(params); if (v) next[k] = v; else delete next[k]; setParams(next); };

  const assign = async (a, value) => {
    try { await empireApi.updateAsset(a.id, { businessId: value ? Number(value) : null }); notifyEmpireChanged(); } catch (e) { toast.error(e.message); }
  };

  return (
    <AuthLayout>
      <Helmet><title>Asset Vault | Starks Global Group</title></Helmet>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Archive className="w-6 h-6 text-violet-300" /> Asset Vault</h1>
            <p className="text-sm text-white/50 mt-1">Everything you and ASH have made: pages, domains, apps, lists, products, documents and more. New work is saved here automatically.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select className={`${input} !w-auto`} value={businessId} aria-label="Filter by business" onChange={(e) => setParam('businessId', e.target.value)}>
              <option value="">All businesses</option>
              {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select className={`${input} !w-auto`} value={classKey} aria-label="Filter by kind" onChange={(e) => setParam('classKey', e.target.value)}>
              <option value="">All kinds</option>
              {Object.entries(typeData?.assetClasses ?? {}).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <button type="button" className={btnPrimary} onClick={() => setAdding(true)}><Plus className="w-3.5 h-3.5" /> Add asset</button>
          </div>
        </div>
        <ErrorBox>{assets.error}</ErrorBox>
        <Card title={`${(assets.data ?? []).length} asset${(assets.data ?? []).length === 1 ? '' : 's'}`} icon={Archive}>
          {assets.loading && !assets.data ? <Spinner /> : (assets.data ?? []).length === 0 ? (
            <p className="text-sm text-white/45">Nothing here yet. Build a <Link to="/landing-pages" className="text-cyan-300 hover:underline">landing page</Link>, connect a <Link to="/domains" className="text-cyan-300 hover:underline">domain</Link>, or ask ASH to build something.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[10px] uppercase tracking-wider text-white/40 border-b border-white/10">
                  <th className="py-2 pr-3">Asset</th><th className="py-2 pr-3">Kind</th><th className="py-2 pr-3">Business</th>
                  <th className="py-2 pr-3">Source</th><th className="py-2 pr-3">Updated</th><th className="py-2" />
                </tr></thead>
                <tbody>
                  {assets.data.map((a) => (
                    <tr key={a.id} className="border-b border-white/5">
                      <td className="py-2 pr-3">
                        <span className="text-white">{a.name}</span> {a.status !== 'active' && <Badge tone="amber">{a.status}</Badge>}
                        {a.description && <p className="text-[11px] text-white/40 truncate max-w-xs">{a.description}</p>}
                      </td>
                      <td className="py-2 pr-3 text-white/70">{typeData?.assetClasses?.[a.classKey] ?? label(a.classKey)}</td>
                      <td className="py-2 pr-3">
                        <select className={`${input} !w-auto !py-1 text-xs`} value={a.businessId ?? ''} aria-label={`Business for ${a.name}`} onChange={(e) => assign(a, e.target.value)}>
                          <option value="">Not assigned</option>
                          {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                        {(a.sharedWith ?? []).length > 0 && <p className="text-[10px] text-violet-200/70 mt-0.5">Shared with {a.sharedWith.map(nameOf).filter(Boolean).join(', ')}</p>}
                      </td>
                      <td className="py-2 pr-3 text-white/50 text-xs">{SOURCE[a.builderSource] ?? label(a.builderSource)}</td>
                      <td className="py-2 pr-3 text-white/40 text-xs">{timeAgo(a.updatedAt)}</td>
                      <td className="py-2 text-right whitespace-nowrap">
                        {a.businessId && <button type="button" className="p-1.5 rounded hover:bg-white/10 text-white/50" aria-label={`Share ${a.name}`} title="Share with another business" onClick={() => setSharing(a)}><Share2 className="w-3.5 h-3.5" /></button>}
                        {a.externalUrl && <a href={a.externalUrl} target="_blank" rel="noopener noreferrer" className="inline-block p-1.5 rounded hover:bg-white/10 text-white/50" aria-label={`Open ${a.name}`}><ExternalLink className="w-3.5 h-3.5" /></a>}
                        {a.status !== 'archived' && <button type="button" className="p-1.5 rounded hover:bg-white/10 text-white/40" aria-label={`Archive ${a.name}`} title="Archive"
                          onClick={async () => { try { await empireApi.updateAsset(a.id, { status: 'archived' }); notifyEmpireChanged(); } catch (e) { toast.error(e.message); } }}><X className="w-3.5 h-3.5" /></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
      {adding && <AssetDialog businesses={businesses} businessId={businessId || undefined} onClose={() => setAdding(false)} />}
      {sharing && <ShareDialog asset={sharing} businesses={businesses} onClose={() => setSharing(null)} />}
    </AuthLayout>
  );
}
