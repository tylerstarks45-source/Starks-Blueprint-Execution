import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { toast } from 'sonner';
import { Target, Plus, Pause, Play, X, Inbox, SlidersHorizontal, CheckCircle2, Circle } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout.jsx';
import { Card, Badge, btn, btnPrimary, input, Spinner, ErrorBox, Field } from '@/components/empire/ui.jsx';
import { useEmpire, useOverview, notifyEmpireChanged } from '@/components/empire/useEmpireData.js';
import { controlApi, label } from '@/lib/empireApi.js';

const TONE = { planning: 'violet', running: 'cyan', waiting_approval: 'amber', waiting_owner: 'amber', paused: 'slate', completed: 'green', failed: 'amber', cancelled: 'slate' };
const STATUS_TEXT = { waiting_approval: 'Waiting for approval', waiting_owner: 'Needs you' };

function MissionCard({ m, businessName, onAction, busy }) {
  const [showLog, setShowLog] = useState(false);
  const done = m.steps.filter((s) => s.status === 'done').length;
  const can = (a) => ({ pause: ['planning', 'running', 'waiting_approval', 'waiting_owner'], resume: ['paused', 'waiting_owner', 'failed'], cancel: ['planning', 'running', 'waiting_approval', 'waiting_owner', 'paused', 'failed'] })[a].includes(m.status);
  return (
    <li className="rounded-xl border border-white/10 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-sm text-white font-medium break-words">{m.goal}</div>
          <div className="text-xs text-white/40 mt-1">{businessName ?? 'Whole empire'} · started {new Date(m.createdAt).toLocaleString()}</div>
        </div>
        <Badge tone={TONE[m.status] ?? 'slate'}>{STATUS_TEXT[m.status] ?? label(m.status)}</Badge>
      </div>
      {m.waitingFor && <p className="text-xs text-amber-200/90 bg-amber-400/5 border border-amber-400/20 rounded-lg px-3 py-2">{m.waitingFor}{m.status === 'waiting_approval' && <> · <Link to="/approvals" className="underline">Open Approvals</Link></>}</p>}
      {m.steps.length > 0 && (
        <div>
          <div className="text-xs text-white/50 mb-1">{done} of {m.steps.length} steps done</div>
          <ol className="space-y-1">
            {m.steps.map((s, i) => (
              <li key={i} className="text-xs flex gap-2 text-white/70">
                {s.status === 'done' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0 mt-0.5" /> : <Circle className="w-3.5 h-3.5 text-white/30 shrink-0 mt-0.5" />}
                <span><span className="text-white/90">{s.title}</span>{s.result && <span className="block text-white/45">{s.result}</span>}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {can('pause') && <button type="button" className={btn} disabled={busy} onClick={() => onAction(m, 'pause')}><Pause className="w-3.5 h-3.5" /> Pause</button>}
        {can('resume') && <button type="button" className={btnPrimary} disabled={busy} onClick={() => onAction(m, 'resume')}><Play className="w-3.5 h-3.5" /> {m.status === 'waiting_owner' ? "I've done it, resume" : 'Resume'}</button>}
        {can('cancel') && <button type="button" className={btn} disabled={busy} onClick={() => onAction(m, 'cancel')}><X className="w-3.5 h-3.5" /> Cancel</button>}
        <button type="button" className={btn} aria-expanded={showLog} onClick={() => setShowLog((v) => !v)}>{showLog ? 'Hide' : 'Show'} activity ({m.log.length})</button>
      </div>
      {showLog && (
        <ul className="text-[11px] text-white/55 space-y-1 max-h-64 overflow-y-auto border-t border-white/5 pt-2">
          {[...m.log].reverse().map((e, i) => <li key={i}><span className="text-white/30">{new Date(e.at).toLocaleString()} · {e.kind}</span> — {e.message}</li>)}
        </ul>
      )}
    </li>
  );
}

export default function MissionsPage() {
  const missions = useEmpire(() => controlApi.missions(), []);
  const overview = useOverview();
  const businesses = overview.data?.businesses ?? [];
  const [goal, setGoal] = useState('');
  const [businessId, setBusinessId] = useState('');
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(null);

  const create = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await controlApi.createMission({ goal, businessId: businessId ? Number(businessId) : null });
      setGoal(''); toast.success('Mission started. ASH plans it within a minute.'); missions.reload();
    } catch (err) { toast.error(err.message); } finally { setCreating(false); }
  };
  const act = async (m, action) => {
    let note;
    if (action === 'cancel' && !window.confirm('Cancel this mission? ASH stops working on it.')) return;
    if (action === 'resume' && m.status === 'waiting_owner') note = window.prompt('Anything ASH should know? (optional)') ?? undefined;
    setBusy(m.id);
    try { await controlApi.missionAction(m.id, action, note); missions.reload(); notifyEmpireChanged(); } catch (err) { toast.error(err.message); } finally { setBusy(null); }
  };
  const rows = missions.data ?? [];
  const active = rows.some((m) => ['planning', 'running', 'waiting_approval'].includes(m.status));
  const { reload } = missions;
  useEffect(() => {
    if (!active) return undefined;
    const t = setInterval(reload, 10000);
    return () => clearInterval(t);
  }, [active, reload]);
  const nameFor = (id) => businesses.find((b) => b.id === id)?.name;

  return (
    <AuthLayout>
      <Helmet><title>Missions | Starks Global Group</title></Helmet>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Target className="w-6 h-6 text-cyan-300" /> Missions</h1>
            <p className="text-sm text-white/50 mt-1">Give ASH a goal. She plans it and works on it in the background, step by step, even after you close the site.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/approvals" className={btn}><Inbox className="w-3.5 h-3.5" /> Approvals</Link>
            <Link to="/ash-control" className={btn}><SlidersHorizontal className="w-3.5 h-3.5" /> ASH Control</Link>
          </div>
        </div>
        <Card title="New mission" icon={Plus}>
          <form onSubmit={create} className="space-y-3">
            <Field label="Goal" hint="e.g. Build 3 income streams for my SaaS and save everything you make to the vault.">
              <textarea className={`${input} min-h-[80px]`} value={goal} onChange={(e) => setGoal(e.target.value)} maxLength={2000} required minLength={3} />
            </Field>
            <div className="flex gap-2 flex-wrap items-end">
              <Field label="Business">
                <select className={input} value={businessId} onChange={(e) => setBusinessId(e.target.value)}>
                  <option value="">Whole empire</option>
                  {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </Field>
              <button type="submit" className={btnPrimary} disabled={creating || goal.trim().length < 3}>{creating ? <Spinner /> : <Target className="w-3.5 h-3.5" />} Start mission</button>
            </div>
            <p className="text-[11px] text-white/35">Missions use your AI credits. Today ASH can research, plan, consult specialists and build inside your account (businesses, income streams, vault assets). Launching on outside sites is coming next; until then she prepares the work and asks you.</p>
          </form>
        </Card>
        {missions.error && <ErrorBox>{missions.error}</ErrorBox>}
        {missions.loading && !missions.data ? <div className="py-10 flex justify-center text-white/50"><Spinner className="w-5 h-5" /></div>
          : !rows.length ? <p className="text-sm text-white/50">No missions yet.</p>
          : <ul className="space-y-3">{rows.map((m) => <MissionCard key={m.id} m={m} businessName={nameFor(m.businessId)} onAction={act} busy={busy === m.id} />)}</ul>}
      </div>
    </AuthLayout>
  );
}
