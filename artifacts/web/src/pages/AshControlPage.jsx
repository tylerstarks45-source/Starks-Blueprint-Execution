import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { toast } from 'sonner';
import { SlidersHorizontal, Save, RotateCcw, Building2, Inbox, Target } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout.jsx';
import { Card, Badge, btn, btnPrimary, input, Spinner, ErrorBox, Field } from '@/components/empire/ui.jsx';
import { useEmpire, notifyEmpireChanged } from '@/components/empire/useEmpireData.js';
import { controlApi, LEVELS, ACTION_KIND_LABELS, centsUsd } from '@/lib/empireApi.js';

const toForm = (s) => ({
  level: s.level,
  daily: s.dailySpendLimitCents ? String(s.dailySpendLimitCents / 100) : '',
  monthly: s.monthlySpendLimitCents ? String(s.monthlySpendLimitCents / 100) : '',
  approvalRequired: s.approvalRequired ?? [],
});
const toBody = (f) => ({
  level: f.level,
  dailySpendLimitCents: Math.round(Math.max(0, Number(f.daily) || 0) * 100),
  monthlySpendLimitCents: Math.round(Math.max(0, Number(f.monthly) || 0) * 100),
  approvalRequired: f.approvalRequired,
});

export function LevelPicker({ value, onChange, name = 'level' }) {
  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3" role="radiogroup" aria-label="ASH control level">
      {LEVELS.map((l) => (
        <label key={l.key} className={`cursor-pointer rounded-xl border p-3 transition ${value === l.key ? 'border-cyan-400/60 bg-cyan-400/10' : 'border-white/10 hover:border-white/25'}`}>
          <input type="radio" className="sr-only" name={name} value={l.key} checked={value === l.key} onChange={() => onChange(l.key)} />
          <div className="text-sm font-semibold text-white">{l.name}</div>
          <p className="text-xs text-white/50 mt-1">{l.blurb}</p>
        </label>
      ))}
    </div>
  );
}

function SettingsForm({ initial, onSave, onReset, resetLabel, saving, idPrefix }) {
  const [f, setF] = useState(() => toForm(initial));
  useEffect(() => setF(toForm(initial)), [initial]);
  const toggle = (k) => setF((x) => ({ ...x, approvalRequired: x.approvalRequired.includes(k) ? x.approvalRequired.filter((y) => y !== k) : [...x.approvalRequired, k] }));
  return (
    <div className="space-y-4">
      <LevelPicker value={f.level} onChange={(level) => setF((x) => ({ ...x, level }))} name={`${idPrefix}-level`} />
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Daily spending limit (USD)" hint="0 or blank = ASH never spends on her own.">
          <input className={input} type="number" min="0" step="1" inputMode="decimal" value={f.daily} onChange={(e) => setF((x) => ({ ...x, daily: e.target.value }))} />
        </Field>
        <Field label="Monthly spending limit (USD)" hint="Only used on Autopilot.">
          <input className={input} type="number" min="0" step="1" inputMode="decimal" value={f.monthly} onChange={(e) => setF((x) => ({ ...x, monthly: e.target.value }))} />
        </Field>
      </div>
      <fieldset>
        <legend className="text-xs text-white/60 mb-2">Always ask me first for:</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(ACTION_KIND_LABELS).map(([k, text]) => (
            <label key={k} className={`text-xs px-3 py-1.5 rounded-full border cursor-pointer ${f.approvalRequired.includes(k) ? 'border-amber-400/50 bg-amber-400/10 text-amber-100' : 'border-white/10 text-white/60'}`}>
              <input type="checkbox" className="sr-only" checked={f.approvalRequired.includes(k)} onChange={() => toggle(k)} />{text}
            </label>
          ))}
        </div>
        <p className="text-[11px] text-white/35 mt-2">Legal and identity steps always need you, whatever you pick here.</p>
      </fieldset>
      <div className="flex gap-2">
        <button type="button" className={btnPrimary} disabled={saving} onClick={() => onSave(toBody(f))}>{saving ? <Spinner /> : <Save className="w-3.5 h-3.5" />} Save</button>
        {onReset && <button type="button" className={btn} disabled={saving} onClick={onReset}><RotateCcw className="w-3.5 h-3.5" /> {resetLabel}</button>}
      </div>
    </div>
  );
}

export default function AshControlPage() {
  const data = useEmpire(() => controlApi.get(), []);
  const [saving, setSaving] = useState(null);
  const [open, setOpen] = useState(null);
  const d = data.data;

  const run = async (key, fn, msg) => {
    setSaving(key);
    try { await fn(); toast.success(msg); notifyEmpireChanged(); } catch (e) { toast.error(e.message); } finally { setSaving(null); }
  };

  return (
    <AuthLayout>
      <Helmet><title>ASH Control | Starks Global Group</title></Helmet>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2"><SlidersHorizontal className="w-6 h-6 text-cyan-300" /> ASH Control</h1>
            <p className="text-sm text-white/50 mt-1">Choose how much ASH does on her own. Change it any time, for your whole empire or one business.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/missions" className={btn}><Target className="w-3.5 h-3.5" /> Missions</Link>
            <Link to="/approvals" className={btn}><Inbox className="w-3.5 h-3.5" /> Approvals</Link>
          </div>
        </div>
        {data.error && <ErrorBox>{data.error}</ErrorBox>}
        {!d ? <div className="py-10 flex justify-center text-white/50"><Spinner className="w-5 h-5" /></div> : (
          <>
            <Card title="Whole empire" action={d.isDefault ? <Badge tone="slate">Default</Badge> : null}>
              <SettingsForm idPrefix="account" initial={d.account} saving={saving === 'account'}
                onSave={(body) => run('account', () => controlApi.saveAccount(body).then(data.reload), 'ASH Control saved')} />
              <p className="text-xs text-white/40 mt-4">ASH has spent {centsUsd(d.spend.todayCents)} today and {centsUsd(d.spend.monthCents)} this month on your behalf. None of ASH's current tools spend money yet; these limits apply as paid actions are added.</p>
            </Card>
            <Card title="Per-business overrides" icon={Building2}>
              {!d.businesses.length ? <p className="text-sm text-white/50">No businesses yet.</p> : (
                <ul className="divide-y divide-white/5">
                  {d.businesses.map((b) => (
                    <li key={b.businessId} className="py-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="text-sm text-white">{b.name}{' '}
                          {b.override ? <Badge tone="cyan">{LEVELS.find((l) => l.key === b.override.level)?.name}</Badge> : <Badge tone="slate">Uses empire setting</Badge>}
                        </div>
                        <button type="button" className={btn} aria-expanded={open === b.businessId} onClick={() => setOpen(open === b.businessId ? null : b.businessId)}>
                          {open === b.businessId ? 'Close' : b.override ? 'Edit override' : 'Override'}
                        </button>
                      </div>
                      {open === b.businessId && (
                        <div className="mt-3">
                          <SettingsForm idPrefix={`biz-${b.businessId}`} initial={b.override ?? d.account} saving={saving === b.businessId}
                            onSave={(body) => run(b.businessId, () => controlApi.saveBusiness(b.businessId, body).then(data.reload), `Saved for ${b.name}`)}
                            onReset={b.override ? () => run(b.businessId, () => controlApi.clearBusiness(b.businessId).then(data.reload), `${b.name} uses the empire setting again`) : null}
                            resetLabel="Use empire setting" />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
