import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { TrendingUp, Check, X, AlertTriangle } from 'lucide-react';
import { Card, Badge, btn, btnPrimary, input, Spinner, Field } from '@/components/empire/ui.jsx';
import { controlApi } from '@/lib/empireApi.js';

const CAP_TONE = { ready: 'green', connect: 'amber', manual: 'violet', missing: 'rose' };
export const CAP_LABEL = { ready: 'Ready', connect: 'Connect', manual: 'Your step', missing: "Can't do yet" };

/** What ASH can do for a plan or mission: ready, needs a connection, owner-only, or missing. */
export function CapabilityChecklist({ items }) {
  if (!items?.length) return null;
  const blocked = items.filter((c) => c.status !== 'ready').length;
  return (
    <div>
      <div className="text-xs text-white/50 mb-1">What ASH can do for this plan {blocked > 0 && <>· <Link to="/capabilities" className="text-cyan-300 hover:underline">{blocked} to sort out</Link></>}</div>
      <ul className="grid sm:grid-cols-2 gap-1 text-xs">
        {items.map((c) => (
          <li key={c.key} className="flex items-start gap-2" title={c.note}>
            <Badge tone={CAP_TONE[c.status]}>{CAP_LABEL[c.status]}</Badge>
            <span className="text-white/80">{c.name}{c.status === 'connect' && <span className="text-white/40"> · {c.providers.map((p) => p.name).join(' / ')}</span>}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const usd = (c) => (c == null ? '—' : `$${(c / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`);

export function IncomePlanCard({ plan, onDecided }) {
  const [busy, setBusy] = useState(false);
  const p = plan.plan;
  const o = plan.objective;
  const decide = async (action) => {
    if (action === 'approve' && !window.confirm('Approve this plan? ASH creates the business and starts the mission. Spending and launches still follow your ASH Control settings.')) return;
    setBusy(true);
    try { const r = await controlApi.decideIncomePlan(plan.id, action); toast.success(action === 'approve' ? 'Plan approved. ASH started the mission.' : 'Plan rejected.'); onDecided?.(r); } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };
  return (
    <Card title={`Income plan: ${p.businessName}`} icon={TrendingUp}>
      <div className="space-y-3 text-sm text-white/75">
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge tone={plan.status === 'approved' ? 'green' : plan.status === 'rejected' ? 'slate' : 'amber'}>{plan.status}</Badge>
          <span>Target {usd(o.targetMonthlyRevenueCents)}/mo</span><span>· Budget {usd(o.budgetCents)}</span>
          <span>· Startup ~{usd(p.startupCostCents)}</span><span>· Running ~{usd(p.monthlyCostCents)}/mo</span>
          {p.newType && <Badge tone="violet">New business type: {p.newType.name}</Badge>}
        </div>
        <div>
          <div className="text-xs text-white/50 mb-1">Opportunities ASH compared</div>
          <ul className="space-y-1">
            {plan.options.map((op, i) => (
              <li key={i} className={`text-xs rounded-lg border px-3 py-2 ${op.typeKey === p.typeKey && op.name ? 'border-cyan-400/30' : 'border-white/10'}`}>
                <span className="text-white/90 font-medium">{op.name}</span> · score {Math.round(op.score)} · startup ~{usd(op.startupCostCents)}{op.monthsToTarget != null && ` · ~${op.monthsToTarget} mo to target`}
                {op.why && <span className="block text-white/45">{op.why}</span>}
              </li>
            ))}
          </ul>
        </div>
        <p><span className="text-white/50">Market: </span>{p.market}</p>
        <p><span className="text-white/50">Strategy: </span>{p.strategy}</p>
        <p><span className="text-white/50">Timeline: </span>{p.timeline}</p>
        {p.risks.length > 0 && <p><span className="text-white/50">Risks: </span>{p.risks.join(' · ')}</p>}
        {p.permissions.length > 0 && <p><span className="text-white/50">You'll need to connect or approve: </span>{p.permissions.join(' · ')}</p>}
        <CapabilityChecklist items={plan.capabilityCheck} />
        <div><div className="text-xs text-white/50 mb-1">Milestones</div><ol className="list-decimal pl-5 text-xs space-y-0.5">{p.milestones.map((m, i) => <li key={i}>{m}</li>)}</ol></div>
        <p className="text-[11px] text-white/40">Estimates, not promises. Income isn't guaranteed; only revenue from connected payment providers counts as real.</p>
        {plan.status === 'draft' && (
          <div className="flex gap-2">
            <button type="button" className={btnPrimary} disabled={busy} onClick={() => decide('approve')}>{busy ? <Spinner /> : <Check className="w-3.5 h-3.5" />} Approve and start</button>
            <button type="button" className={btn} disabled={busy} onClick={() => decide('reject')}><X className="w-3.5 h-3.5" /> Reject</button>
          </div>
        )}
      </div>
    </Card>
  );
}

export function CreateIncomeMission({ onDrafted }) {
  const [goal, setGoal] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { const p = await controlApi.draftIncomePlan(goal); setGoal(''); onDrafted?.(p); } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };
  return (
    <Card title="Create income mission" icon={TrendingUp}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Income goal" hint="e.g. I want to make $5,000 a month. Find the best opportunity, build it and run it. I can invest $500.">
          <textarea className={`${input} min-h-[70px]`} value={goal} onChange={(e) => setGoal(e.target.value)} maxLength={2000} minLength={8} required />
        </Field>
        <button type="submit" className={btnPrimary} disabled={busy || goal.trim().length < 8}>{busy ? <><Spinner /> ASH is researching…</> : <><TrendingUp className="w-3.5 h-3.5" /> Research and plan</>}</button>
        <p className="text-[11px] text-white/35">ASH compares opportunities and shows you a plan. Nothing is built until you approve it.</p>
      </form>
    </Card>
  );
}

export function MissionDashboard({ missionId, refreshKey, onChanged }) {
  const [d, setD] = useState(null);
  const [reviewKey, setReviewKey] = useState(0);
  useEffect(() => { controlApi.missionDashboard(missionId).then(setD).catch(() => setD(null)); }, [missionId, refreshKey, reviewKey]);
  if (!d) return null;
  const r = d.revenue;
  const stat = (k, v) => <div className="rounded-lg border border-white/10 px-3 py-2"><div className="text-[10px] uppercase tracking-wide text-white/40">{k}</div><div className="text-sm text-white">{v}</div></div>;
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {stat('Verified revenue (30d)', r.revenueTracked ? usd(r.verifiedLast30Cents) : 'Not tracked')}
        {stat('Action spend (30d)', usd(r.recordedSpendLast30Cents))}
        {stat('Net (30d)', r.netLast30Cents == null ? '—' : usd(r.netLast30Cents))}
        {stat('Toward target', r.progressPct == null ? `Target ${usd(r.targetMonthlyRevenueCents)}/mo` : `${r.progressPct}% of ${usd(r.targetMonthlyRevenueCents)}`)}
      </div>
      <div className="text-xs text-white/55 flex flex-wrap gap-x-3">
        {d.business && <Link to={`/business/${d.business.id}`} className="underline">{d.business.name}</Link>}
        <span>{d.milestones.done}/{d.milestones.total} milestones</span>
        <Link to="/asset-vault" className="underline">{d.assets.length} assets</Link>
        {!r.revenueTracked && <span>Connect a payment provider to measure real revenue.</span>}
      </div>
      {d.blockers.length > 0 && <ul className="text-xs text-amber-200/90 space-y-0.5">{d.blockers.map((b, i) => <li key={i} className="flex gap-1"><AlertTriangle className="w-3.5 h-3.5 shrink-0" />{b}</li>)}</ul>}
      {d.nextActions.length > 0 && <div className="text-xs text-white/55">Next: {d.nextActions.join(' → ')}</div>}
      {d.team?.length > 0 && <div className="text-xs text-white/55">AI employees: {d.team.map((t) => `${t.title}${t.status === 'paused' ? ' (paused)' : t.lastTask ? ` (${t.lastTask.slice(0, 60)})` : ''}`).join(' · ')}</div>}
      {d.plan && <StrategyReview key={missionId} missionId={missionId} refreshKey={refreshKey} watch={d.mission.status !== 'cancelled'} onChanged={() => { setReviewKey((k) => k + 1); onChanged?.(); }} />}
    </div>
  );
}

const VERDICT = { on_track: ['green', 'On track'], behind: ['amber', 'Behind target'], no_data: ['slate', 'No verified revenue yet'] };

/** ASH's latest strategy review for an income mission, with apply/dismiss for proposed steps. */
function StrategyReview({ missionId, refreshKey, watch, onChanged }) {
  const [reviews, setReviews] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = () => controlApi.strategyReviews(missionId).then(setReviews).catch(() => setReviews([]));
  useEffect(() => { load(); }, [missionId, refreshKey]);
  useEffect(() => {
    if (!watch || busy) return undefined;
    const refresh = () => { if (!document.hidden) load(); };
    const t = setInterval(refresh, 60_000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [missionId, watch, busy]);
  const run = async (fn, ok) => {
    setBusy(true);
    try { await fn(); toast.success(ok); await load(); onChanged?.(); } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };
  if (!reviews) return null;
  const r = reviews[0];
  const awaitingDecision = r?.status === 'proposed' || r?.status === 'queued';
  return (
    <div className="rounded-lg border border-white/10 px-3 py-2 space-y-1.5 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="text-white/70 font-medium">Strategy review</span>
        <button type="button" className={btn} disabled={busy} onClick={() => run(() => controlApi.reviewStrategy(missionId), 'ASH reviewed the strategy.')}>{busy ? <Spinner /> : <TrendingUp className="w-3.5 h-3.5" />} Review now</button>
      </div>
      {!r ? <p className="text-white/45">ASH reviews results against the target every week. Run one now to get next steps.</p> : (
        <>
          <div className="flex items-center gap-2"><Badge tone={VERDICT[r.verdict]?.[0] ?? 'slate'}>{VERDICT[r.verdict]?.[1] ?? r.verdict}</Badge><span className="text-white/40">{new Date(r.createdAt).toLocaleDateString()}</span>{r.status !== 'proposed' && <span className="text-white/40">{r.status === 'queued' ? 'Queued to apply automatically' : r.status}</span>}</div>
          <p className="text-white/70">{r.summary}</p>
          {r.adjustments.length > 0 && <ul className="list-disc pl-4 text-white/60 space-y-0.5">{r.adjustments.map((a, i) => <li key={i}>{a}</li>)}</ul>}
          {awaitingDecision && r.adjustments.length > 0 && (
            <div className="flex gap-2">
              <button type="button" className={btnPrimary} disabled={busy} onClick={() => run(() => controlApi.decideStrategyReview(r.id, 'apply'), 'Steps added to the mission.')}><Check className="w-3.5 h-3.5" /> Add steps to mission</button>
              <button type="button" className={btn} disabled={busy} onClick={() => run(() => controlApi.decideStrategyReview(r.id, 'dismiss'), 'Review dismissed.')}><X className="w-3.5 h-3.5" /> Dismiss</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
