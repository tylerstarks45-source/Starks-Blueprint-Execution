import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { toast } from 'sonner';
import { Banknote, ExternalLink, RefreshCw, Wallet } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout.jsx';
import { Card, Stat, Badge, btn, btnPrimary, Spinner, ErrorBox } from '@/components/empire/ui.jsx';
import { payoutApi, centsUsd, label } from '@/lib/empireApi.js';

const EARNING_TONE = { pending: 'amber', available: 'green', paid: 'cyan', reversed: 'rose' };
const PAYOUT_TONE = { processing: 'amber', paid: 'green', failed: 'rose' };

export default function CreatorPayoutsPage() {
  const [params] = useSearchParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async (refresh = false) => {
    try {
      setError('');
      setData(refresh ? await payoutApi.refresh() : await payoutApi.get());
    } catch (e) { setError(e.message); }
  }, []);

  // Coming back from Stripe onboarding: re-check the account so the status is current.
  useEffect(() => { load(Boolean(params.get('onboarding'))); }, [load, params]);

  const run = async (key, fn) => {
    setBusy(key);
    try { await fn(); } catch (e) { toast.error(e.message); } finally { setBusy(''); }
  };
  const onboard = () => run('onboard', async () => { const { url } = await payoutApi.onboard(); window.location.assign(url); });
  const withdraw = () => run('withdraw', async () => {
    const res = await payoutApi.withdraw();
    setData(res.summary);
    toast.success(`${centsUsd(res.payout.amountCents)} sent to your bank via Stripe`);
  });

  const a = data?.account;
  const b = data?.balances;
  const canWithdraw = a?.payoutsEnabled && b && b.availableCents >= data.minimumCents;

  return (
    <AuthLayout>
      <Helmet><title>Creator Payouts | STARKS</title></Helmet>
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><Banknote className="w-5 h-5 text-cyan-300" /> Creator Payouts</h1>
          <p className="text-sm text-white/50">Real money from card sales of your marketplace blueprints. You keep {70}% of each sale. Earnings are held {data?.holdDays ?? 14} days for refunds, then you can withdraw to your bank through Stripe.</p>
        </div>
        {error && <ErrorBox>{error}</ErrorBox>}
        {!data && !error && <Spinner className="w-5 h-5" />}
        {data && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Stat icon={Wallet} label="Available" value={centsUsd(b.availableCents)} tone="text-emerald-300" hint={`Minimum withdrawal ${centsUsd(data.minimumCents)}`} />
              <Stat icon={Wallet} label="Pending (refund window)" value={centsUsd(b.pendingCents)} tone="text-amber-300" />
              <Stat icon={Banknote} label="Paid out" value={centsUsd(b.paidCents)} tone="text-cyan-300" />
            </div>

            <Card title="Payout account" icon={Banknote} action={
              a.connected && <button className={btn} onClick={() => run('refresh', () => load(true))} disabled={!!busy}>
                {busy === 'refresh' ? <Spinner /> : <RefreshCw className="w-3.5 h-3.5" />} Check status
              </button>
            }>
              {!a.connected && <p className="text-sm text-white/60 mb-3">Connect a Stripe account to receive payouts. Stripe asks for your identity and bank details on its own secure page. Only you can do this step.</p>}
              {a.connected && !a.payoutsEnabled && <p className="text-sm text-amber-200/80 mb-3">Stripe still needs some details before it can send you money.</p>}
              {a.payoutsEnabled && <p className="text-sm text-emerald-200/80 mb-3">Your payout account is ready.</p>}
              <div className="flex flex-wrap gap-2">
                {!a.payoutsEnabled && (
                  <button className={btnPrimary} onClick={onboard} disabled={!!busy}>
                    {busy === 'onboard' ? <Spinner /> : <ExternalLink className="w-3.5 h-3.5" />} {a.connected ? 'Finish setup with Stripe' : 'Connect with Stripe'}
                  </button>
                )}
                <button className={btnPrimary} onClick={withdraw} disabled={!canWithdraw || !!busy}>
                  {busy === 'withdraw' ? <Spinner /> : <Banknote className="w-3.5 h-3.5" />} Withdraw {centsUsd(b.availableCents)}
                </button>
              </div>
            </Card>

            <Card title="Earnings" icon={Wallet}>
              {data.earnings.length === 0
                ? <p className="text-sm text-white/50">No card sales yet. <Link className="text-cyan-300 hover:underline" to="/blueprints/submit">List a blueprint</Link> in the marketplace to start earning.</p>
                : (
                  <div className="divide-y divide-white/5">
                    {data.earnings.map((e) => (
                      <div key={e.id} className="flex items-center justify-between py-2 text-sm">
                        <div className="min-w-0">
                          <p className="text-white/80 truncate">{e.note || 'Sale'}{e.blueprintId ? ` · blueprint #${e.blueprintId}` : ''}</p>
                          <p className="text-[11px] text-white/40">{new Date(e.createdAt).toLocaleDateString()}{e.status === 'pending' ? ` · available ${new Date(e.availableAt).toLocaleDateString()}` : ''}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={e.amountCents < 0 ? 'text-rose-300' : 'text-white'}>{centsUsd(e.amountCents)}</span>
                          <Badge tone={EARNING_TONE[e.status] ?? 'slate'}>{label(e.status)}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </Card>

            {data.payouts.length > 0 && (
              <Card title="Payout history" icon={Banknote}>
                <div className="divide-y divide-white/5">
                  {data.payouts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-2 text-sm">
                      <span className="text-white/60">{new Date(p.createdAt).toLocaleString()}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white">{centsUsd(p.amountCents)}</span>
                        <Badge tone={PAYOUT_TONE[p.status] ?? 'slate'}>{label(p.status)}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </AuthLayout>
  );
}
