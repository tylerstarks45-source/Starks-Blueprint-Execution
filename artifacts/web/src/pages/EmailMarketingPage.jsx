import { useState, useEffect } from 'react';

import AuthLayout from '@/components/AuthLayout.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import {
  Mail, Users, Plus, Trash2, ChevronRight, ChevronDown,
  Upload, Sparkles, RefreshCw, Search, Send, List,
  BarChart3, Check, X, Eye, Megaphone, Play, AlertCircle,
  TrendingUp, MousePointer, Ban, CheckCheck, UserMinus
} from 'lucide-react';

const API = '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('sbep_auth_token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

function useApi() {
  const get = (url) => fetch(`${API}${url}`, { headers: getAuthHeaders() }).then(r => r.json());
  const post = (url, body) => fetch(`${API}${url}`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body) }).then(r => r.json());
  const patch = (url, body) => fetch(`${API}${url}`, { method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify(body) }).then(r => r.json());
  const del = (url) => fetch(`${API}${url}`, { method: 'DELETE', headers: getAuthHeaders() });
  return { get, post, patch, del };
}

// ── Stats pill ────────────────────────────────────────────────────────────────
function StatPill({ icon: Icon, value, label, color = 'text-white/40' }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/4 border border-white/8">
      <Icon className={`w-3 h-3 ${color}`} />
      <span className={`text-[11px] font-mono font-semibold ${color}`}>{value}</span>
      <span className="text-[10px] text-white/25">{label}</span>
    </div>
  );
}

// ── List Card ────────────────────────────────────────────────────────────────
function ListCard({ list, isOpen, onToggle, onDelete, onAddSubscriber, subscribers, subsLoading, onDeleteSub, api }) {
  const [subForm, setSubForm] = useState({ email: '', firstName: '', lastName: '' });
  const [addLoading, setAddLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  async function addSub(e) {
    e.preventDefault();
    setAddLoading(true);
    try {
      const result = await api.post(`/email/lists/${list.id}/subscribers`, subForm);
      if (!result.error) { onAddSubscriber(list.id, result); setSubForm({ email: '', firstName: '', lastName: '' }); }
    } finally { setAddLoading(false); }
  }

  async function bulkImport() {
    if (!importText.trim()) return;
    setImportLoading(true);
    try {
      const subs = importText.split('\n').filter(Boolean).map(line => {
        const [email, firstName, lastName] = line.split(',').map(s => s.trim());
        return { email, firstName, lastName };
      }).filter(s => s.email && s.email.includes('@'));
      await api.post(`/email/lists/${list.id}/subscribers/bulk`, { subscribers: subs });
      setImportText(''); setShowImport(false);
      onToggle(list.id);
    } finally { setImportLoading(false); }
  }

  const filtered = (subscribers || []).filter(s =>
    !search ||
    s.email.includes(search) ||
    `${s.firstName ?? ''} ${s.lastName ?? ''}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="rounded-2xl border border-white/8 bg-white/2 overflow-hidden">
      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/2 transition-colors" onClick={() => onToggle(list.id)}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/15 flex items-center justify-center">
            <Mail className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white/85">{list.name}</h3>
            {list.description && <p className="text-[10px] text-white/35 mt-0.5">{list.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/8 border border-violet-500/15 text-[11px] font-mono text-violet-400">
            <Users className="w-3 h-3" /> {list.subscriberCount}
          </span>
          <button onClick={e => { e.stopPropagation(); onDelete(list); }} className="w-7 h-7 rounded-lg bg-white/3 hover:bg-red-500/10 flex items-center justify-center transition-colors group">
            <Trash2 className="w-3 h-3 text-white/30 group-hover:text-red-400/70" />
          </button>
          {isOpen ? <ChevronDown className="w-4 h-4 text-white/30" /> : <ChevronRight className="w-4 h-4 text-white/30" />}
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-white/6">
          <div className="p-4 border-b border-white/6 bg-white/1">
            <form onSubmit={addSub} className="flex gap-2 flex-wrap">
              <input value={subForm.email} onChange={e => setSubForm(f => ({ ...f, email: e.target.value }))}
                className="flex-1 min-w-36 h-8 px-3 rounded-lg bg-white/5 border border-white/12 text-xs text-white placeholder-white/25 focus:outline-none focus:border-violet-500/40 transition-colors"
                placeholder="email@example.com" type="email" required />
              <input value={subForm.firstName} onChange={e => setSubForm(f => ({ ...f, firstName: e.target.value }))}
                className="w-28 h-8 px-3 rounded-lg bg-white/5 border border-white/12 text-xs text-white placeholder-white/25 focus:outline-none focus:border-violet-500/40 transition-colors"
                placeholder="First name" />
              <input value={subForm.lastName} onChange={e => setSubForm(f => ({ ...f, lastName: e.target.value }))}
                className="w-28 h-8 px-3 rounded-lg bg-white/5 border border-white/12 text-xs text-white placeholder-white/25 focus:outline-none focus:border-violet-500/40 transition-colors"
                placeholder="Last name" />
              <button type="submit" disabled={addLoading}
                className="h-8 px-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5">
                {addLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Add
              </button>
              <button type="button" onClick={() => setShowImport(v => !v)}
                className="h-8 px-3 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-white text-xs font-mono transition-colors flex items-center gap-1.5">
                <Upload className="w-3 h-3" /> Import CSV
              </button>
            </form>
            {showImport && (
              <div className="mt-3 space-y-2">
                <p className="text-[10px] text-white/30 font-mono">One per line: email, firstName, lastName</p>
                <textarea value={importText} onChange={e => setImportText(e.target.value)} rows={4}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/12 text-xs text-white/70 font-mono placeholder-white/20 focus:outline-none focus:border-violet-500/40 transition-colors resize-none"
                  placeholder={`alice@example.com, Alice, Smith\nbob@example.com, Bob`} />
                <button onClick={bulkImport} disabled={importLoading || !importText.trim()}
                  className="h-7 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5">
                  {importLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} Import
                </button>
              </div>
            )}
          </div>

          <div className="px-4 py-2 border-b border-white/4">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/25" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                className="w-full h-7 pl-7 pr-3 rounded-lg bg-white/4 border border-white/8 text-xs text-white placeholder-white/20 focus:outline-none focus:border-violet-500/30 transition-colors"
                placeholder="Search subscribers..." />
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {subsLoading ? (
              <div className="flex items-center justify-center py-8 text-white/25 text-xs font-mono">
                <RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" />Loading...
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-white/20 text-xs font-mono">No subscribers yet</div>
            ) : filtered.map(sub => (
              <div key={sub.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-white/4 last:border-0 hover:bg-white/2 transition-colors group">
                <div className="w-7 h-7 rounded-full bg-violet-500/15 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-violet-400">{(sub.email[0] || '?').toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white/70 font-mono truncate">{sub.email}</div>
                  {(sub.firstName || sub.lastName) && (
                    <div className="text-[10px] text-white/30">{[sub.firstName, sub.lastName].filter(Boolean).join(' ')}</div>
                  )}
                </div>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                  sub.status === 'active' ? 'text-emerald-400 bg-emerald-500/8' :
                  sub.status === 'unsubscribed' ? 'text-white/25 bg-white/4' : 'text-red-400/60 bg-red-500/8'
                }`}>{sub.status}</span>
                <button onClick={() => onDeleteSub(list.id, sub.id)} className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded flex items-center justify-center hover:bg-red-500/10 transition-all">
                  <X className="w-3 h-3 text-red-400/60" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sequence Card ─────────────────────────────────────────────────────────────
function SequenceCard({ seq, api, onDelete, lists }) {
  const [steps, setSteps] = useState(null);
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genForm, setGenForm] = useState({ niche: '', goal: '', tone: 'professional', numberOfEmails: 5 });
  const [showGenForm, setShowGenForm] = useState(false);
  const [stats, setStats] = useState(null);
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [activating, setActivating] = useState(false);
  const [currentSeq, setCurrentSeq] = useState(seq);

  useEffect(() => {
    api.get(`/email/sequences/${seq.id}/stats`).then(d => { if (!d.error) setStats(d); }).catch(() => {});
  }, [seq.id]);

  async function loadSteps() {
    const data = await api.get(`/email/sequences/${seq.id}/steps`);
    if (Array.isArray(data)) setSteps(data);
  }

  function toggle() {
    if (!open && steps === null) loadSteps();
    setOpen(v => !v);
  }

  async function generate(e) {
    e.preventDefault();
    setGenerating(true);
    try {
      const result = await api.post('/email/sequences/generate', { sequenceId: seq.id, ...genForm });
      if (result.steps) { setSteps(result.steps); setShowGenForm(false); setOpen(true); }
    } finally { setGenerating(false); }
  }

  async function sendBroadcast() {
    if (!confirm('Send step 1 to all active subscribers now?')) return;
    setBroadcasting(true); setBroadcastMsg(null);
    try {
      const r = await api.post(`/email/sequences/${seq.id}/broadcast`, { stepNumber: 1 });
      if (r.error) setBroadcastMsg({ ok: false, text: r.error });
      else setBroadcastMsg({ ok: true, text: `Sending to ${r.queued ?? 0} subscribers in background…` });
    } catch { setBroadcastMsg({ ok: false, text: 'Send failed' }); }
    finally { setBroadcasting(false); }
  }

  async function sendPreview() {
    setPreviewing(true);
    try {
      const r = await api.post(`/email/sequences/${seq.id}/preview`, { stepNumber: 1 });
      if (r.error) alert(r.error);
      else alert(`Preview sent to ${r.sentTo}`);
    } finally { setPreviewing(false); }
  }

  async function toggleActive() {
    setActivating(true);
    const newStatus = currentSeq.status === 'active' ? 'paused' : 'active';
    try {
      const r = await api.patch(`/email/sequences/${seq.id}`, { status: newStatus });
      if (!r.error) setCurrentSeq(r);
    } finally { setActivating(false); }
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-white/2 overflow-hidden">
      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/2 transition-colors" onClick={toggle}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/15 flex items-center justify-center">
            <Send className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white/85">{currentSeq.name}</h3>
            {currentSeq.description && <p className="text-[10px] text-white/35">{currentSeq.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono border ${
            currentSeq.status === 'active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
            'bg-white/4 border-white/10 text-white/30'
          }`}>{currentSeq.status}</span>
          {stats && stats.sent > 0 && (
            <>
              <StatPill icon={Send} value={stats.sent} label="sent" color="text-sky-400" />
              {stats.delivered > 0 && <StatPill icon={CheckCheck} value={stats.delivered} label="delivered" color="text-teal-400" />}
              <StatPill icon={Eye} value={`${stats.openRate}%`} label="open" color="text-emerald-400" />
              <StatPill icon={MousePointer} value={`${stats.clickRate}%`} label="click" color="text-violet-400" />
              {stats.unsubRate > 0 && <StatPill icon={UserMinus} value={`${stats.unsubRate}%`} label="unsub" color="text-orange-400" />}
            </>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-2 px-4 pb-3 flex-wrap" onClick={e => e.stopPropagation()}>
        <button onClick={e => { e.stopPropagation(); setShowGenForm(v => !v); }}
          className="flex items-center gap-1 h-7 px-2.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-mono hover:bg-violet-500/20 transition-colors">
          <Sparkles className="w-3 h-3" /> Generate
        </button>
        <button onClick={e => { e.stopPropagation(); toggleActive(); }} disabled={activating}
          className={`flex items-center gap-1 h-7 px-2.5 rounded-lg text-[10px] font-mono transition-colors border ${
            currentSeq.status === 'active'
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
          }`}>
          {activating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
          {currentSeq.status === 'active' ? 'Pause' : 'Activate'}
        </button>
        <button onClick={e => { e.stopPropagation(); sendPreview(); }} disabled={previewing}
          className="flex items-center gap-1 h-7 px-2.5 rounded-lg bg-white/5 border border-white/10 text-white/40 text-[10px] font-mono hover:text-white transition-colors">
          {previewing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />} Preview
        </button>
        <button onClick={e => { e.stopPropagation(); sendBroadcast(); }} disabled={broadcasting}
          className="flex items-center gap-1 h-7 px-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[10px] font-mono hover:bg-sky-500/20 transition-colors">
          {broadcasting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Megaphone className="w-3 h-3" />} Blast Now
        </button>
        <button onClick={e => { e.stopPropagation(); onDelete(seq); }}
          className="w-7 h-7 rounded-lg bg-white/3 hover:bg-red-500/10 flex items-center justify-center transition-colors group ml-auto">
          <Trash2 className="w-3 h-3 text-white/30 group-hover:text-red-400/70" />
        </button>
      </div>

      {broadcastMsg && (
        <div className={`mx-4 mb-3 px-3 py-2 rounded-lg text-[11px] font-mono flex items-center gap-2 ${
          broadcastMsg.ok
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}>
          {broadcastMsg.ok ? <Check className="w-3 h-3 shrink-0" /> : <AlertCircle className="w-3 h-3 shrink-0" />}
          {broadcastMsg.text}
        </div>
      )}

      {showGenForm && (
        <div className="px-4 pb-4 border-t border-white/6 bg-white/1">
          <form onSubmit={generate} className="pt-4 space-y-3">
            <p className="text-[10px] text-white/35 font-mono">ASH will write a full email sequence using GPT-4o.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-white/40 mb-1">Niche / Topic</label>
                <input value={genForm.niche} onChange={e => setGenForm(f => ({ ...f, niche: e.target.value }))}
                  className="w-full h-8 px-2.5 rounded-lg bg-white/5 border border-white/12 text-xs text-white placeholder-white/20 focus:outline-none focus:border-violet-500/40 transition-colors"
                  placeholder="TikTok affiliate marketing" required />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-white/40 mb-1">Goal</label>
                <input value={genForm.goal} onChange={e => setGenForm(f => ({ ...f, goal: e.target.value }))}
                  className="w-full h-8 px-2.5 rounded-lg bg-white/5 border border-white/12 text-xs text-white placeholder-white/20 focus:outline-none focus:border-violet-500/40 transition-colors"
                  placeholder="Drive affiliate link clicks" required />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-white/40 mb-1">Tone</label>
                <select value={genForm.tone} onChange={e => setGenForm(f => ({ ...f, tone: e.target.value }))}
                  className="w-full h-8 px-2.5 rounded-lg bg-white/5 border border-white/12 text-xs text-white focus:outline-none focus:border-violet-500/40 transition-colors">
                  {['professional', 'casual', 'urgent', 'educational', 'inspirational'].map(t =>
                    <option key={t} value={t} className="bg-[#111]">{t}</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-white/40 mb-1">Number of Emails</label>
                <input type="number" min={3} max={10} value={genForm.numberOfEmails}
                  onChange={e => setGenForm(f => ({ ...f, numberOfEmails: parseInt(e.target.value) }))}
                  className="w-full h-8 px-2.5 rounded-lg bg-white/5 border border-white/12 text-xs text-white focus:outline-none focus:border-violet-500/40 transition-colors" />
              </div>
            </div>
            <button type="submit" disabled={generating || !genForm.niche || !genForm.goal}
              className="h-8 px-4 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5">
              {generating
                ? <><RefreshCw className="w-3 h-3 animate-spin" />Generating...</>
                : <><Sparkles className="w-3 h-3" />Generate Sequence</>
              }
            </button>
          </form>
        </div>
      )}

      {open && (
        <div className="border-t border-white/6">
          {steps === null ? (
            <div className="flex items-center justify-center py-6 text-white/25 text-xs font-mono">
              <RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" />Loading steps...
            </div>
          ) : steps.length === 0 ? (
            <div className="flex items-center justify-center py-6 text-white/20 text-xs font-mono">
              No emails yet. Use Generate to create them.
            </div>
          ) : (
            <div className="divide-y divide-white/4">
              {steps.map(step => (
                <div key={step.id} className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-violet-500/15 border border-violet-500/20 flex items-center justify-center text-[9px] font-mono text-violet-400 shrink-0">
                      {step.stepNumber}
                    </span>
                    <span className="text-xs font-semibold text-white/70">{step.subject}</span>
                    <span className="ml-auto text-[9px] font-mono text-white/25">Day {step.delayDays}</span>
                  </div>
                  <p className="text-[10px] text-white/30 leading-relaxed line-clamp-2 pl-7">{step.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Campaign Card ─────────────────────────────────────────────────────────────
function CampaignCard({ camp, lists, api, onDelete }) {
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (camp.status === 'sent') {
      api.get(`/email/campaigns/${camp.id}/stats`).then(d => { if (!d.error) setStats(d); }).catch(() => {});
    }
  }, [camp.id, camp.status]);

  async function send() {
    if (!confirm(`Send "${camp.name}" to all active subscribers now? This cannot be undone.`)) return;
    setSending(true); setMsg(null);
    try {
      const r = await api.post(`/email/campaigns/${camp.id}/send`, {});
      if (r.error) setMsg({ ok: false, text: r.error });
      else setMsg({ ok: true, text: `Sending to ${r.queued ?? 0} subscribers in background…` });
    } catch { setMsg({ ok: false, text: 'Send failed' }); }
    finally { setSending(false); }
  }

  const listName = lists.find(l => l.id === camp.listId)?.name ?? '—';

  return (
    <div className="rounded-2xl border border-white/8 bg-white/2 p-4">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/15 flex items-center justify-center shrink-0">
            <Megaphone className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white/85">{camp.name}</h3>
            <p className="text-[10px] text-white/35 font-mono mt-0.5 truncate max-w-xs">{camp.subject}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono border ${
            camp.status === 'sent' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
            camp.status === 'sending' ? 'bg-sky-500/10 border-sky-500/20 text-sky-400' :
            'bg-white/4 border-white/10 text-white/30'
          }`}>{camp.status}</span>
          <button onClick={() => onDelete(camp)} className="w-7 h-7 rounded-lg bg-white/3 hover:bg-red-500/10 flex items-center justify-center transition-colors group">
            <Trash2 className="w-3 h-3 text-white/30 group-hover:text-red-400/70" />
          </button>
        </div>
      </div>

      {/* Stats row for sent campaigns */}
      {camp.status === 'sent' && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <StatPill icon={Send} value={camp.sentCount} label="sent" color="text-sky-400" />
          {stats && <>
            {stats.delivered > 0 && <StatPill icon={CheckCheck} value={stats.delivered} label="delivered" color="text-teal-400" />}
            <StatPill icon={Eye} value={`${stats.openRate}%`} label="open rate" color="text-emerald-400" />
            <StatPill icon={MousePointer} value={`${stats.clickRate}%`} label="click rate" color="text-violet-400" />
            {stats.unsubRate > 0 && <StatPill icon={UserMinus} value={`${stats.unsubRate}%`} label="unsub rate" color="text-orange-400" />}
            {stats.bounced > 0 && <StatPill icon={Ban} value={stats.bounced} label="bounced" color="text-red-400" />}
          </>}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-white/30 font-mono flex items-center gap-1">
          <List className="w-3 h-3" /> {listName}
        </span>
        {camp.status === 'draft' && (
          <button onClick={send} disabled={sending}
            className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-mono hover:bg-amber-500/20 transition-colors disabled:opacity-50">
            {sending ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Send Campaign
          </button>
        )}
      </div>

      {msg && (
        <div className={`mt-3 px-3 py-2 rounded-lg text-[11px] font-mono flex items-center gap-2 ${
          msg.ok
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}>
          {msg.ok ? <Check className="w-3 h-3 shrink-0" /> : <AlertCircle className="w-3 h-3 shrink-0" />}
          {msg.text}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function EmailMarketingPage() {
  const api = useApi();

  const [tab, setTab] = useState('lists');
  const [lists, setLists] = useState([]);
  const [sequences, setSequences] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openListId, setOpenListId] = useState(null);
  const [subscribers, setSubscribers] = useState({});
  const [subsLoading, setSubsLoading] = useState({});

  const [showCreateList, setShowCreateList] = useState(false);
  const [showCreateSeq, setShowCreateSeq] = useState(false);
  const [showCreateCamp, setShowCreateCamp] = useState(false);
  const [listForm, setListForm] = useState({ name: '', description: '' });
  const [seqForm, setSeqForm] = useState({ name: '', description: '', listId: '' });
  const [campForm, setCampForm] = useState({ name: '', subject: '', body: '', fromName: '', listId: '' });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [listsData, seqsData, campsData] = await Promise.all([
        api.get('/email/lists'),
        api.get('/email/sequences'),
        api.get('/email/campaigns'),
      ]);
      if (Array.isArray(listsData)) setLists(listsData);
      if (Array.isArray(seqsData)) setSequences(seqsData);
      if (Array.isArray(campsData)) setCampaigns(campsData);
    } finally { setLoading(false); }
  }

  async function toggleList(listId) {
    if (openListId === listId) { setOpenListId(null); return; }
    setOpenListId(listId);
    if (!subscribers[listId]) {
      setSubsLoading(s => ({ ...s, [listId]: true }));
      const data = await api.get(`/email/lists/${listId}/subscribers`);
      if (Array.isArray(data)) setSubscribers(s => ({ ...s, [listId]: data }));
      setSubsLoading(s => ({ ...s, [listId]: false }));
    }
  }

  async function createList(e) {
    e.preventDefault(); setFormLoading(true);
    try {
      const result = await api.post('/email/lists', listForm);
      if (!result.error) { setLists(ls => [result, ...ls]); setShowCreateList(false); setListForm({ name: '', description: '' }); }
    } finally { setFormLoading(false); }
  }

  async function createSeq(e) {
    e.preventDefault(); setFormLoading(true);
    try {
      const body = { ...seqForm, listId: seqForm.listId ? parseInt(seqForm.listId) : undefined };
      const result = await api.post('/email/sequences', body);
      if (!result.error) { setSequences(ss => [result, ...ss]); setShowCreateSeq(false); setSeqForm({ name: '', description: '', listId: '' }); }
    } finally { setFormLoading(false); }
  }

  async function createCamp(e) {
    e.preventDefault(); setFormLoading(true);
    try {
      const body = { ...campForm, listId: campForm.listId ? parseInt(campForm.listId) : undefined };
      const result = await api.post('/email/campaigns', body);
      if (!result.error) { setCampaigns(cs => [result, ...cs]); setShowCreateCamp(false); setCampForm({ name: '', subject: '', body: '', fromName: '', listId: '' }); }
    } finally { setFormLoading(false); }
  }

  async function deleteList(list) {
    if (!confirm(`Delete list "${list.name}" and all subscribers?`)) return;
    await api.del(`/email/lists/${list.id}`);
    setLists(ls => ls.filter(l => l.id !== list.id));
  }

  async function deleteSeq(seq) {
    if (!confirm(`Delete sequence "${seq.name}"?`)) return;
    await api.del(`/email/sequences/${seq.id}`);
    setSequences(ss => ss.filter(s => s.id !== seq.id));
  }

  async function deleteCamp(camp) {
    if (!confirm(`Delete campaign "${camp.name}"?`)) return;
    await api.del(`/email/campaigns/${camp.id}`);
    setCampaigns(cs => cs.filter(c => c.id !== camp.id));
  }

  function handleAddSubscriber(listId, sub) {
    setSubscribers(s => ({ ...s, [listId]: [sub, ...(s[listId] || [])] }));
    setLists(ls => ls.map(l => l.id === listId ? { ...l, subscriberCount: l.subscriberCount + 1 } : l));
  }

  async function handleDeleteSub(listId, subId) {
    await api.del(`/email/subscribers/${subId}`);
    setSubscribers(s => ({ ...s, [listId]: (s[listId] || []).filter(x => x.id !== subId) }));
    setLists(ls => ls.map(l => l.id === listId ? { ...l, subscriberCount: Math.max(0, l.subscriberCount - 1) } : l));
  }

  const totalSubs = lists.reduce((a, l) => a + l.subscriberCount, 0);
  const totalSent = campaigns.reduce((a, c) => a + (c.sentCount || 0), 0);

  const inputCls = "w-full h-8 px-2.5 rounded-lg bg-white/5 border border-white/12 text-xs text-white placeholder-white/20 focus:outline-none focus:border-violet-500/40 transition-colors";
  const textareaCls = "w-full px-3 py-2 rounded-lg bg-white/5 border border-white/12 text-xs text-white/70 placeholder-white/20 focus:outline-none focus:border-violet-500/40 transition-colors resize-none";

  return (
    <AuthLayout>
      {/* Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <iframe
          src="https://www.youtube.com/embed/hSB6nnzNRGU?autoplay=1&mute=1&loop=1&playlist=hSB6nnzNRGU&controls=0&modestbranding=1&rel=0&vq=hd1080&hd=1&quality=hd1080"
          allow="autoplay; encrypted-media"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width: 'max(100vw, 177.78vh)', height: 'max(100vh, 56.25vw)', border: 'none' }}
          title="bg"
        />
        <div className="absolute inset-0 bg-black/78" />
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-xs text-sky-400 font-mono font-semibold mb-5">
            <Mail className="w-3 h-3" /> EMAIL MARKETING ENGINE
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Email Marketing</h1>
          <p className="text-white/50 text-base max-w-2xl mx-auto leading-relaxed">
            Build subscriber lists, launch drip sequences, and blast campaigns — powered by your SendGrid account.
          </p>
        </div>

        {/* SendGrid setup banner */}
        <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-300 mb-0.5">Connect SendGrid to enable real sending</p>
            <p className="text-[11px] text-amber-400/70 leading-relaxed">
              Add your <span className="font-mono bg-amber-500/10 px-1 py-0.5 rounded">SENDGRID_API_KEY</span> and optionally{' '}
              <span className="font-mono bg-amber-500/10 px-1 py-0.5 rounded">SENDGRID_FROM_EMAIL</span> in the{' '}
              <a href="/connections" className="underline hover:text-amber-300 transition-colors">Connections Hub</a>.
              Then point your SendGrid Event Webhook to{' '}
              <span className="font-mono bg-amber-500/10 px-1 py-0.5 rounded">/api/email/webhooks/sendgrid</span> for open/click tracking.
            </p>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Lists', value: lists.length, icon: List, color: 'text-sky-400' },
            { label: 'Subscribers', value: totalSubs.toLocaleString(), icon: Users, color: 'text-violet-400' },
            { label: 'Sequences', value: sequences.length, icon: Send, color: 'text-emerald-400' },
            { label: 'Emails Sent', value: totalSent.toLocaleString(), icon: TrendingUp, color: 'text-amber-400' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-white/8 bg-white/2 p-4 text-center">
              <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-white/35 font-mono mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/8 mb-6">
          {[
            { id: 'lists', label: 'Subscriber Lists', icon: List },
            { id: 'sequences', label: 'Email Sequences', icon: Send },
            { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-mono border-b-2 -mb-px transition-all ${
                tab === t.id ? 'border-violet-500 text-violet-400' : 'border-transparent text-white/35 hover:text-white/60'
              }`}>
              <t.icon className="w-4 h-4" />{t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-2xl bg-white/3 border border-white/6 p-4 flex items-center gap-4">
                <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-1/3" />
                  <Skeleton className="h-2.5 w-1/4" />
                </div>
                <Skeleton className="h-7 w-20 rounded-lg shrink-0" />
              </div>
            ))}
          </div>

        ) : tab === 'lists' ? (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => setShowCreateList(v => !v)}
                className="flex items-center gap-2 h-9 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold transition-colors">
                <Plus className="w-4 h-4" /> New List
              </button>
            </div>

            {showCreateList && (
              <form onSubmit={createList} className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 space-y-3">
                <h3 className="text-sm font-bold text-white/80">Create Subscriber List</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono text-white/40 mb-1">List Name *</label>
                    <input value={listForm.name} onChange={e => setListForm(f => ({ ...f, name: e.target.value }))}
                      className={inputCls} placeholder="My Subscribers" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-white/40 mb-1">Description</label>
                    <input value={listForm.description} onChange={e => setListForm(f => ({ ...f, description: e.target.value }))}
                      className={inputCls} placeholder="Optional description" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={formLoading || !listForm.name}
                    className="h-8 px-4 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5">
                    {formLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Create List
                  </button>
                  <button type="button" onClick={() => setShowCreateList(false)}
                    className="h-8 px-3 rounded-lg bg-white/5 text-white/40 text-xs hover:text-white transition-colors">Cancel</button>
                </div>
              </form>
            )}

            {lists.length === 0 ? (
              <div className="text-center py-16 text-white/20 text-sm font-mono">No lists yet — create your first one above</div>
            ) : lists.map(list => (
              <ListCard key={list.id} list={list} isOpen={openListId === list.id} onToggle={toggleList}
                onDelete={deleteList} onAddSubscriber={handleAddSubscriber}
                subscribers={subscribers[list.id]} subsLoading={subsLoading[list.id]}
                onDeleteSub={handleDeleteSub} api={api} />
            ))}
          </div>

        ) : tab === 'sequences' ? (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => setShowCreateSeq(v => !v)}
                className="flex items-center gap-2 h-9 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors">
                <Plus className="w-4 h-4" /> New Sequence
              </button>
            </div>

            {showCreateSeq && (
              <form onSubmit={createSeq} className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-3">
                <h3 className="text-sm font-bold text-white/80">Create Email Sequence</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono text-white/40 mb-1">Sequence Name *</label>
                    <input value={seqForm.name} onChange={e => setSeqForm(f => ({ ...f, name: e.target.value }))}
                      className={inputCls} placeholder="Welcome Series" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-white/40 mb-1">Link to List</label>
                    <select value={seqForm.listId} onChange={e => setSeqForm(f => ({ ...f, listId: e.target.value }))}
                      className={inputCls}>
                      <option value="" className="bg-[#111]">No list (manual broadcast only)</option>
                      {lists.map(l => <option key={l.id} value={l.id} className="bg-[#111]">{l.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-mono text-white/40 mb-1">Description</label>
                    <input value={seqForm.description} onChange={e => setSeqForm(f => ({ ...f, description: e.target.value }))}
                      className={inputCls} placeholder="Optional description" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={formLoading || !seqForm.name}
                    className="h-8 px-4 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5">
                    {formLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Create Sequence
                  </button>
                  <button type="button" onClick={() => setShowCreateSeq(false)}
                    className="h-8 px-3 rounded-lg bg-white/5 text-white/40 text-xs hover:text-white transition-colors">Cancel</button>
                </div>
              </form>
            )}

            {sequences.length === 0 ? (
              <div className="text-center py-16 text-white/20 text-sm font-mono">No sequences yet — create your first one above</div>
            ) : sequences.map(seq => (
              <SequenceCard key={seq.id} seq={seq} api={api} onDelete={deleteSeq} lists={lists} />
            ))}
          </div>

        ) : (
          // ── Campaigns tab ──────────────────────────────────────────────────────
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => setShowCreateCamp(v => !v)}
                className="flex items-center gap-2 h-9 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-colors">
                <Plus className="w-4 h-4" /> New Campaign
              </button>
            </div>

            {showCreateCamp && (
              <form onSubmit={createCamp} className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
                <h3 className="text-sm font-bold text-white/80">Create Blast Campaign</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono text-white/40 mb-1">Campaign Name *</label>
                    <input value={campForm.name} onChange={e => setCampForm(f => ({ ...f, name: e.target.value }))}
                      className={inputCls} placeholder="Black Friday Promo" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-white/40 mb-1">From Name</label>
                    <input value={campForm.fromName} onChange={e => setCampForm(f => ({ ...f, fromName: e.target.value }))}
                      className={inputCls} placeholder="Your Name / Brand" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-mono text-white/40 mb-1">Subject Line *</label>
                    <input value={campForm.subject} onChange={e => setCampForm(f => ({ ...f, subject: e.target.value }))}
                      className={inputCls} placeholder="🔥 Exclusive deal inside..." required />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-mono text-white/40 mb-1">Email Body *</label>
                    <textarea value={campForm.body} onChange={e => setCampForm(f => ({ ...f, body: e.target.value }))} rows={6}
                      className={textareaCls} placeholder={`Hey {{firstName}},\n\nYour email body here...`} required />
                    <p className="text-[9px] text-white/25 mt-1 font-mono">
                      Use {'{{firstName}}'}, {'{{lastName}}'}, {'{{email}}'} for personalization
                    </p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-mono text-white/40 mb-1">Send to List</label>
                    <select value={campForm.listId} onChange={e => setCampForm(f => ({ ...f, listId: e.target.value }))}
                      className={inputCls}>
                      <option value="" className="bg-[#111]">No list selected</option>
                      {lists.map(l =>
                        <option key={l.id} value={l.id} className="bg-[#111]">{l.name} ({l.subscriberCount} subs)</option>
                      )}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={formLoading || !campForm.name || !campForm.subject || !campForm.body}
                    className="h-8 px-4 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5">
                    {formLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Save Campaign
                  </button>
                  <button type="button" onClick={() => setShowCreateCamp(false)}
                    className="h-8 px-3 rounded-lg bg-white/5 text-white/40 text-xs hover:text-white transition-colors">Cancel</button>
                </div>
              </form>
            )}

            {campaigns.length === 0 ? (
              <div className="text-center py-16 text-white/20 text-sm font-mono">
                No campaigns yet — create a blast campaign above
              </div>
            ) : campaigns.map(camp => (
              <CampaignCard key={camp.id} camp={camp} lists={lists} api={api} onDelete={deleteCamp} />
            ))}
          </div>
        )}
      </main>
    </AuthLayout>
  );
}
