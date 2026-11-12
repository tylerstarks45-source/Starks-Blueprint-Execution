import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Crown, Building2, Coins, Archive, BadgeDollarSign, TrendingUp, ListChecks, Plus, RefreshCw, Activity, HeartPulse, Sparkles } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout.jsx';
import { Card, Stat, Badge, btn, btnPrimary, Spinner, ErrorBox } from '@/components/empire/ui.jsx';
import { useOverview } from '@/components/empire/useEmpireData.js';
import CreateBusinessDialog from '@/components/empire/CreateBusinessDialog.jsx';
import EmpireSearch from '@/components/empire/EmpireSearch.jsx';
import { centsUsd, usd } from '@/lib/empireApi.js';
import { askAsh } from '@/lib/ashGuide.js';
import { timeAgo } from '@/lib/ashApi.js';
import { useBusiness } from '@/contexts/BusinessContext.jsx';

export default function EmpirePage() {
  const { data, error, loading, reload } = useOverview();
  const { setActiveBusiness } = useBusiness();
  const [creating, setCreating] = useState(false);
  const t = data?.totals;

  return (
    <AuthLayout>
      <Helmet><title>Empire Command Center | Starks Global Group</title></Helmet>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Crown className="w-6 h-6 text-amber-300" /> Empire Command Center</h1>
            <p className="text-sm text-white/50 mt-1">Every business, income stream and asset you and ASH run, from live data.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <EmpireSearch />
            <button type="button" className={btn} onClick={reload}>{loading ? <Spinner /> : <RefreshCw className="w-3.5 h-3.5" />} Refresh</button>
            <button type="button" className={btnPrimary} onClick={() => setCreating(true)}><Plus className="w-3.5 h-3.5" /> New business</button>
          </div>
        </div>

        <ErrorBox>{error && `Couldn't load your empire: ${error}`}</ErrorBox>

        {t && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat icon={Building2} label="Businesses" value={t.businesses} hint={`${t.activeBusinesses} active`} />
              <Stat icon={Coins} label="Income streams" value={t.incomeStreams} hint={`${t.activeStreams} earning`} />
              <Stat icon={Archive} label="Assets" value={t.assets} hint={t.unassignedAssets ? `${t.unassignedAssets} not assigned to a business` : 'All assigned'} />
              <Stat icon={ListChecks} label="Waiting for you" value={t.pendingApprovals} hint="Approvals across businesses" />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Stat icon={BadgeDollarSign} tone="text-emerald-300" label="Verified revenue (30 days)"
                value={t.businessesWithRevenueTracking ? centsUsd(t.verifiedRevenueCents.last30) : 'Not tracked yet'}
                hint={t.businessesWithRevenueTracking
                  ? `${centsUsd(t.verifiedRevenueCents.lifetime)} all time, from recorded sales on ${t.businessesWithRevenueTracking} of ${t.businesses} businesses`
                  : 'Connect a store, payment or affiliate source to a business to record real sales.'} />
              <Stat icon={TrendingUp} tone="text-amber-200" label="Projected (per month)" value={usd(t.projectedMonthlyUsd)}
                hint="Estimates set on income streams. Never counted as earned." />
            </div>
          </>
        )}

        {data && data.businesses.length === 0 && (
          <Card>
            <div className="text-center py-8 space-y-3">
              <Crown className="w-10 h-10 text-amber-300/70 mx-auto" />
              <p className="text-white/80">Your empire is empty. Start your first business, or ask ASH to start one for you.</p>
              <div className="flex justify-center gap-2 flex-wrap">
                <button type="button" className={btnPrimary} onClick={() => setCreating(true)}><Plus className="w-3.5 h-3.5" /> New business</button>
                <button type="button" className={btn} onClick={() => askAsh('Start a new online business for me. Suggest the best type for my budget and skills, then create it.')}><Sparkles className="w-3.5 h-3.5" /> Ask ASH</button>
                <Link to="/business-import" className={btn}>Import an existing business</Link>
              </div>
            </div>
          </Card>
        )}

        {data && data.businesses.length > 0 && (
          <Card title="Businesses" icon={Building2} action={<Link to="/business-portfolio" className="text-xs text-cyan-300/80 hover:text-cyan-200">Portfolio view →</Link>}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-white/40 border-b border-white/10">
                    <th className="py-2 pr-3">Business</th><th className="py-2 pr-3">Type</th><th className="py-2 pr-3">Streams</th>
                    <th className="py-2 pr-3">Assets</th><th className="py-2 pr-3">Health</th><th className="py-2 pr-3">Verified 30d</th>
                    <th className="py-2 pr-3">Projected /mo</th><th className="py-2">Approvals</th>
                  </tr>
                </thead>
                <tbody>
                  {data.businesses.map((b) => (
                    <tr key={b.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                      <td className="py-2 pr-3">
                        <Link to={`/business/${b.id}`} onClick={() => setActiveBusiness({ id: b.id, name: b.name, businessType: b.typeKey })} className="text-white hover:underline font-medium">{b.name}</Link>
                        <span className="ml-2"><Badge tone={b.status === 'active' ? 'green' : 'slate'}>{b.status}</Badge></span>
                      </td>
                      <td className="py-2 pr-3 text-white/70">{b.typeName}</td>
                      <td className="py-2 pr-3 tabular-nums text-white/70">{b.activeStreams}/{b.incomeStreams}</td>
                      <td className="py-2 pr-3 tabular-nums text-white/70">{b.assets}</td>
                      <td className="py-2 pr-3 tabular-nums text-white/70">{b.health == null ? <span className="text-white/35">Not measured</span> : <span className="inline-flex items-center gap-1"><HeartPulse className="w-3 h-3" />{b.health}</span>}</td>
                      <td className="py-2 pr-3 tabular-nums">{b.verifiedRevenueCents ? <span className="text-emerald-300">{centsUsd(b.verifiedRevenueCents.last30)}</span> : <span className="text-white/35">{b.revenueTracked ? '$0.00' : 'Not tracked'}</span>}</td>
                      <td className="py-2 pr-3 tabular-nums text-amber-200/80">{b.projectedMonthlyUsd ? usd(b.projectedMonthlyUsd) : '—'}</td>
                      <td className="py-2 tabular-nums">{b.pendingApprovals ? <Badge tone="amber">{b.pendingApprovals}</Badge> : <span className="text-white/35">0</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {data && (
          <div className="grid lg:grid-cols-3 gap-4">
            <Card title="Recent activity" icon={Activity} className="lg:col-span-2">
              {data.recentActivity.length === 0 ? <p className="text-sm text-white/45">No activity recorded yet. Revenue, publishing and automation events from your businesses show up here.</p> : (
                <ul className="space-y-1.5">
                  {data.recentActivity.map((a, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Badge tone={a.eventType === 'revenue' ? 'green' : 'slate'}>{a.eventType}</Badge>
                      <span className="text-white/75 truncate">{a.description}</span>
                      {a.businessName && <span className="text-[11px] text-white/35 shrink-0">{a.businessName}</span>}
                      <span className="ml-auto text-[11px] text-white/35 shrink-0">{timeAgo(a.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title="Grow the empire" icon={Sparkles}>
              <div className="flex flex-col gap-2">
                {[
                  'Look at my empire and tell me which business to grow next, and how.',
                  'Add the best extra income stream to my strongest business.',
                  'Research a new online business I could start this month and create it.',
                ].map((p) => <button key={p} type="button" onClick={() => askAsh(p)} className="text-left text-xs text-cyan-200/80 hover:text-cyan-100 border border-white/10 rounded-lg px-3 py-2 hover:bg-white/5">→ {p}</button>)}
                <div className="flex gap-2 flex-wrap pt-1">
                  <Link to="/income-streams" className={btn}><Coins className="w-3.5 h-3.5" /> Income streams</Link>
                  <Link to="/asset-vault" className={btn}><Archive className="w-3.5 h-3.5" /> Asset Vault</Link>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
      {creating && <CreateBusinessDialog onClose={() => setCreating(false)} />}
    </AuthLayout>
  );
}
