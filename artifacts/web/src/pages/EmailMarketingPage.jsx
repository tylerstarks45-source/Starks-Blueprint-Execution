import { useState, useEffect } from 'react';

import AuthLayout from '@/components/AuthLayout.jsx';
import {
  Mail, Users, Plus, Trash2, Edit2, ChevronRight, ChevronDown,
  Upload, Download, Sparkles, AlertCircle, RefreshCw, Search,
  MailOpen, Send, List, BarChart3, Zap, Check, X
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
      onToggle(list.id); // refresh
    } finally { setImportLoading(false); }
  }

  const filtered = (subscribers || []).filter(s => !search || s.email.includes(search) || `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="rounded-2xl border border-white/8 bg-white/2 overflow-hidden">
      {/* List header */}
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

      {/* Expanded content */}
      {isOpen && (
        <div className="border-t border-white/6">
          {/* Add subscriber form */}
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
                  placeholder="alice@example.com, Alice, Smith&#10;bob@example.com, Bob" />
                <button onClick={bulkImport} disabled={importLoading || !importText.trim()}
                  className="h-7 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5">
                  {importLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} Import
                </button>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="px-4 py-2 border-b border-white/4">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/25" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                className="w-full h-7 pl-7 pr-3 rounded-lg bg-white/4 border border-white/8 text-xs text-white placeholder-white/20 focus:outline-none focus:border-violet-500/30 transition-colors"
                placeholder="Search subscribers..." />
            </div>
          </div>

          {/* Subscribers list */}
          <div className="max-h-80 overflow-y-auto">
            {subsLoading ? (
              <div className="flex items-center justify-center py-8 text-white/25 text-xs font-mono"><RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" />Loading...</div>
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
function SequenceCard({ seq, api, onDelete }) {
  const [steps, setSteps] = useState(null);
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genForm, setGenForm] = useState({ niche: '', goal: '', tone: 'professional', numberOfEmails: 5 });
  const [showGenForm, setShowGenForm] = useState(false);

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

  return (
    <div className="rounded-2xl border border-white/8 bg-white/2 overflow-hidden">
      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/2 transition-colors" onClick={toggle}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/15 flex items-center justify-center">
            <Send className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white/85">{seq.name}</h3>
            {seq.description && <p className="text-[10px] text-white/35">{seq.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono border ${seq.status === 'active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/4 border-white/10 text-white/30'}`}>
            {seq.status}
          </span>
          <button onClick={e => { e.stopPropagation(); setShowGenForm(v => !v); }}
            className="flex items-center gap-1 h-7 px-2.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-mono hover:bg-violet-500/20 transition-colors">
            <Sparkles className="w-3 h-3" /> Generate
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(seq); }}
            className="w-7 h-7 rounded-lg bg-white/3 hover:bg-red-500/10 flex items-center justify-center transition-colors group">
            <Trash2 className="w-3 h-3 text-white/30 group-hover:text-red-400/70" />
          </button>
          {open ? <ChevronDown className="w-4 h-4 text-white/30" /> : <ChevronRight className="w-4 h-4 text-white/30" />}
        </div>
      </div>

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
                  {['professional', 'casual', 'urgent', 'educational', 'inspirational'].map(t => <option key={t} value={t} className="bg-[#111]">{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-white/40 mb-1">Number of Emails</label>
                <input type="number" min={3} max={10} value={genForm.numberOfEmails} onChange={e => setGenForm(f => ({ ...f, numberOfEmails: parseInt(e.target.value) }))}
                  className="w-full h-8 px-2.5 rounded-lg bg-white/5 border border-white/12 text-xs text-white focus:outline-none focus:border-violet-500/40 transition-colors" />
              </div>
            </div>
            <button type="submit" disabled={generating || !genForm.niche || !genForm.goal}
              className="h-8 px-4 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5">
              {generating ? <><RefreshCw className="w-3 h-3 animate-spin" />Generating ({genForm.numberOfEmails} emails)...</> : <><Sparkles className="w-3 h-3" />Generate Sequence</>}
            </button>
          </form>
        </div>
      )}

      {open && (
        <div className="border-t border-white/6">
          {steps === null ? (
            <div className="flex items-center justify-center py-6 text-white/25 text-xs font-mono"><RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" />Loading steps...</div>
          ) : steps.length === 0 ? (
            <div className="flex items-center justify-center py-6 text-white/20 text-xs font-mono">No emails yet. Use ASH to generate them.</div>
          ) : (
            <div className="divide-y divide-white/4">
              {steps.map(step => (
                <div key={step.id} className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-violet-500/15 border border-violet-500/20 flex items-center justify-center text-[9px] font-mono text-violet-400 shrink-0">{step.stepNumber}</span>
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

export default function EmailMarketingPage() {
  const api = useApi();

  const [tab, setTab] = useState('lists');
  const [lists, setLists] = useState([]);
  const [sequences, setSequences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openListId, setOpenListId] = useState(null);
  const [subscribers, setSubscribers] = useState({});
  const [subsLoading, setSubsLoading] = useState({});

  const [showCreateList, setShowCreateList] = useState(false);
  const [showCreateSeq, setShowCreateSeq] = useState(false);
  const [listForm, setListForm] = useState({ name: '', description: '' });
  const [seqForm, setSeqForm] = useState({ name: '', description: '' });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [listsData, seqsData] = await Promise.all([api.get('/email/lists'), api.get('/email/sequences')]);
      if (Array.isArray(listsData)) setLists(listsData);
      if (Array.isArray(seqsData)) setSequences(seqsData);
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
      const result = await api.post('/email/sequences', seqForm);
      if (!result.error) { setSequences(ss => [result, ...ss]); setShowCreateSeq(false); setSeqForm({ name: '', description: '' }); }
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

  return (
    <AuthLayout>
      {/* ── YouTube video background ── */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <iframe
          src="https://www.youtube.com/embed/DZLlw5BNQ3g?autoplay=1&mute=1&loop=1&playlist=DZLlw5BNQ3g&controls=0&showinfo=0&rel=0&modestbranding=1&disablekb=1&iv_load_policy=3"
          allow="autoplay; encrypted-media"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width: 'max(100vw, 177.78vh)', height: 'max(100vh, 56.25vw)', border: 'none' }}
          title="bg"
        />
        <div className="absolute inset-0 bg-black/78" />
      </div>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24">

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-xs text-sky-400 font-mono font-semibold mb-5">
            <Mail className="w-3 h-3" /> EMAIL MARKETING ENGINE
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Email Marketing</h1>
          <p className="text-white/50 text-base max-w-2xl mx-auto leading-relaxed">
            Build subscriber lists for every system you create. ASH writes complete email sequences — welcome series, affiliate promotions, product launches — using GPT-4o.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Lists', value: lists.length, icon: List, color: 'text-sky-400' },
            { label: 'Total Subscribers', value: totalSubs.toLocaleString(), icon: Users, color: 'text-violet-400' },
            { label: 'Sequences', value: sequences.length, icon: Send, color: 'text-emerald-400' },
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
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-mono border-b-2 -mb-px transition-all ${
                tab === t.id ? 'border-violet-500 text-violet-400' : 'border-transparent text-white/35 hover:text-white/60'}`}>
              <t.icon className="w-4 h-4" />{t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-20 rounded-2xl bg-white/3 border border-white/6 animate-pulse" />)}</div>
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
                <h3 className="text-sm font-bold text-white/80">Create New List</h3>
                <input value={listForm.name} onChange={e => setListForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg bg-white/5 border border-white/12 text-sm text-white placeholder-white/20 focus:outline-none focus:border-sky-500/50 transition-colors"
                  placeholder="List name (e.g. TikTok Audience)" required />
                <input value={listForm.description} onChange={e => setListForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg bg-white/5 border border-white/12 text-sm text-white placeholder-white/20 focus:outline-none focus:border-sky-500/50 transition-colors"
                  placeholder="Description (optional)" />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowCreateList(false)} className="h-8 px-4 rounded-lg bg-white/5 text-white/40 hover:text-white text-xs transition-colors">Cancel</button>
                  <button type="submit" disabled={formLoading}
                    className="h-8 px-4 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5">
                    {formLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Create
                  </button>
                </div>
              </form>
            )}
            {lists.length === 0 && !showCreateList ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Mail className="w-10 h-10 text-white/12" />
                <h3 className="text-base font-semibold text-white/35">No subscriber lists</h3>
                <p className="text-sm text-white/22 text-center max-w-sm font-mono">Create a list for each system you build. Collect subscribers and ASH will write the emails.</p>
                <button onClick={() => setShowCreateList(true)} className="flex items-center gap-2 h-9 px-5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold transition-colors mt-2">
                  <Plus className="w-4 h-4" /> Create First List
                </button>
              </div>
            ) : (
              lists.map(list => (
                <ListCard key={list.id} list={list} isOpen={openListId === list.id}
                  onToggle={toggleList} onDelete={deleteList}
                  onAddSubscriber={handleAddSubscriber}
                  subscribers={subscribers[list.id]}
                  subsLoading={subsLoading[list.id]}
                  onDeleteSub={handleDeleteSub}
                  api={api}
                />
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => setShowCreateSeq(v => !v)}
                className="flex items-center gap-2 h-9 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors">
                <Plus className="w-4 h-4" /> New Sequence
              </button>
            </div>
            {showCreateSeq && (
              <form onSubmit={createSeq} className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-3">
                <h3 className="text-sm font-bold text-white/80">Create New Sequence</h3>
                <input value={seqForm.name} onChange={e => setSeqForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg bg-white/5 border border-white/12 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 transition-colors"
                  placeholder="Sequence name (e.g. Affiliate Welcome Series)" required />
                <input value={seqForm.description} onChange={e => setSeqForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg bg-white/5 border border-white/12 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 transition-colors"
                  placeholder="Description (optional)" />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowCreateSeq(false)} className="h-8 px-4 rounded-lg bg-white/5 text-white/40 hover:text-white text-xs transition-colors">Cancel</button>
                  <button type="submit" disabled={formLoading}
                    className="h-8 px-4 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5">
                    {formLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Create
                  </button>
                </div>
              </form>
            )}
            {sequences.length === 0 && !showCreateSeq ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Send className="w-10 h-10 text-white/12" />
                <h3 className="text-base font-semibold text-white/35">No email sequences</h3>
                <p className="text-sm text-white/22 text-center max-w-sm font-mono">Create a sequence and let ASH write 5–10 high-converting emails for your niche.</p>
                <button onClick={() => setShowCreateSeq(true)} className="flex items-center gap-2 h-9 px-5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors mt-2">
                  <Plus className="w-4 h-4" /> Create Sequence
                </button>
              </div>
            ) : (
              sequences.map(seq => <SequenceCard key={seq.id} seq={seq} api={api} onDelete={deleteSeq} />)
            )}
          </div>
        )}
      </main>
    </AuthLayout>
  );
}
