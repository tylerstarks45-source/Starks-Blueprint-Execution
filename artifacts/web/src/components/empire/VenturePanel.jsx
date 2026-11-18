import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Check, Circle, Trash2, Plus } from 'lucide-react';
import { empireApi, centsUsd, label } from '@/lib/empireApi.js';
import { Badge, btn, btnPrimary, input, Spinner, ErrorBox } from './ui.jsx';

const CATEGORIES = ['software', 'advertising', 'contractors', 'inventory', 'fees', 'hosting', 'other'];

// Venture Factory view for one business: setup checklist, AI employee team, ledger and missions.
export default function VenturePanel({ businessId }) {
  const [v, setV] = useState(null);
  const [err, setErr] = useState(null);
  const [form, setForm] = useState({ amount: '', category: 'software', description: '' });
  const load = useCallback(() => empireApi.venture(businessId).then((d) => { setV(d); setErr(null); }).catch((e) => setErr(e.message)), [businessId]);
  useEffect(() => { load(); }, [load]);
  if (err) return <ErrorBox message={err} />;
  if (!v) return <Spinner />;
  const l = v.ledger;
  const stat = (k, val) => <div className="rounded-lg border border-white/10 px-3 py-2"><div className="text-[10px] uppercase tracking-wide text-white/40">{k}</div><div className="text-sm text-white">{val}</div></div>;
  const toggle = async (m) => {
    try { await empireApi.setTeamMember(businessId, m.role, m.status === 'paused' ? 'active' : 'paused'); load(); } catch (e) { toast.error(e.message); }
  };
  const add = async (e) => {
    e.preventDefault();
    const amountCents = Math.round(Number(form.amount) * 100);
    if (!(amountCents > 0) || !form.description.trim()) { toast.error('Enter an amount and a description'); return; }
    try { await empireApi.addExpense(businessId, { amountCents, category: form.category, description: form.description.trim() }); setForm((f) => ({ ...f, amount: '', description: '' })); load(); } catch (e2) { toast.error(e2.message); }
  };
  const remove = async (id) => { try { await empireApi.deleteExpense(businessId, id); load(); } catch (e) { toast.error(e.message); } };
  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(v.setup).map(([k, ok]) => (
          <span key={k} className={`flex items-center gap-1 ${ok ? 'text-emerald-300' : 'text-white/40'}`}>{ok ? <Check className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}{label(k)}</span>
        ))}
        {!v.setup.mission && <Link to="/missions" className="text-cyan-300 hover:underline">Start a mission</Link>}
      </div>

      <div>
        <div className="text-xs uppercase tracking-wide text-white/40 mb-1">AI employees</div>
        <ul className="divide-y divide-white/5">
          {v.team.map((m) => (
            <li key={m.role} className="py-2 flex items-center justify-between gap-2">
              <div>
                <span className="text-white">{m.title}</span> <Badge tone={m.status === 'paused' ? 'slate' : 'green'}>{m.status}</Badge>
                <div className="text-[11px] text-white/45">{m.focus}{m.lastTask ? ` · Last: ${m.lastTask}` : ' · No work yet'}</div>
              </div>
              <button type="button" className={btn} onClick={() => toggle(m)}>{m.status === 'paused' ? 'Resume' : 'Pause'}</button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wide text-white/40 mb-1">Ledger (last 30 days)</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {stat('Verified revenue', l.revenueTracked ? centsUsd(l.verifiedRevenueLast30Cents) : 'Not tracked')}
          {stat('ASH spend', centsUsd(l.ashSpendLast30Cents))}
          {stat('Expenses', centsUsd(l.expensesLast30Cents))}
          {stat('Net', l.netLast30Cents == null ? '—' : centsUsd(l.netLast30Cents))}
        </div>
        {!l.revenueTracked && <p className="text-[11px] text-white/45 mt-1">Revenue only counts from a connected payment provider (Stripe, Gumroad, PayPal). <Link to="/connections" className="text-cyan-300 hover:underline">Connect one</Link>.</p>}
        <form onSubmit={add} className="flex flex-wrap gap-2 mt-3">
          <input className={`${input} w-28`} type="number" min="0" step="0.01" placeholder="Amount $" value={form.amount} onChange={(e) => { const amount = e.target.value; setForm((f) => ({ ...f, amount })); }} aria-label="Expense amount" />
          <select className={`${input} w-36`} value={form.category} onChange={(e) => { const category = e.target.value; setForm((f) => ({ ...f, category })); }} aria-label="Expense category">
            {CATEGORIES.map((c) => <option key={c} value={c}>{label(c)}</option>)}
          </select>
          <input className={`${input} flex-1 min-w-[10rem]`} placeholder="What was it for?" value={form.description} onChange={(e) => { const description = e.target.value; setForm((f) => ({ ...f, description })); }} aria-label="Expense description" />
          <button type="submit" className={btnPrimary}><Plus className="w-3.5 h-3.5" /> Add expense</button>
        </form>
        {l.expenses.length > 0 && (
          <ul className="mt-2 divide-y divide-white/5">
            {l.expenses.map((x) => (
              <li key={x.id} className="py-1.5 flex items-center justify-between text-xs">
                <span className="text-white/70">{new Date(x.occurredAt).toLocaleDateString()} · {label(x.category)} · {x.description}</span>
                <span className="flex items-center gap-2 text-white">{centsUsd(x.amountCents)}<button type="button" className="text-white/40 hover:text-rose-300" onClick={() => remove(x.id)} aria-label="Delete expense"><Trash2 className="w-3.5 h-3.5" /></button></span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {v.missions.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wide text-white/40 mb-1">Missions</div>
          <ul className="space-y-1 text-xs">
            {v.missions.map((m) => <li key={m.id}><Link to="/missions" className="text-cyan-300 hover:underline">{m.goal}</Link> <span className="text-white/45">· {label(m.status)} · {m.done}/{m.total}</span></li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
