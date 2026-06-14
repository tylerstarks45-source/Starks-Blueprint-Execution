import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import VideoBackground from '@/components/VideoBackground.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { toast } from 'sonner';
import {
  ArrowLeft, Brain, Plus, Trash2, Edit3, Save, X,
  Loader2, Search, ChevronDown, ChevronRight, Wand2,
  Check, RefreshCw, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
};

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString();
}

const MEMORY_CATEGORIES = {
  business_profile: { label: 'Business Profile', color: 'text-violet-400', bg: 'bg-violet-500/8', border: 'border-violet-500/20' },
  preferences: { label: 'Preferences', color: 'text-sky-400', bg: 'bg-sky-500/8', border: 'border-sky-500/20' },
  context: { label: 'Context', color: 'text-emerald-400', bg: 'bg-emerald-500/8', border: 'border-emerald-500/20' },
  skills: { label: 'Skills & Tools', color: 'text-amber-400', bg: 'bg-amber-500/8', border: 'border-amber-500/20' },
  goals: { label: 'Goals', color: 'text-primary', bg: 'bg-primary/8', border: 'border-primary/20' },
  other: { label: 'Other', color: 'text-white/40', bg: 'bg-white/4', border: 'border-white/10' },
};

function categorize(key) {
  const k = (key || '').toLowerCase();
  if (k.includes('business') || k.includes('niche') || k.includes('industry') || k.includes('product')) return 'business_profile';
  if (k.includes('prefer') || k.includes('style') || k.includes('tone') || k.includes('mode')) return 'preferences';
  if (k.includes('skill') || k.includes('tool') || k.includes('tech') || k.includes('platform')) return 'skills';
  if (k.includes('goal') || k.includes('revenue') || k.includes('target') || k.includes('income')) return 'goals';
  if (k.includes('context') || k.includes('session') || k.includes('last') || k.includes('current')) return 'context';
  return 'other';
}

export default function MemoryPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [memory, setMemory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editKey, setEditKey] = useState('');
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [collapsed, setCollapsed] = useState({});

  const loadMemory = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/user-memory?userId=${currentUser.id}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : (data?.items ?? []);
        setMemory(items);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => { loadMemory(); }, [loadMemory]);

  const saveEdit = async () => {
    if (!editingId || !editKey.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/user-memory/${editingId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ key: editKey, value: editValue }),
      });
      if (res.ok) {
        const updated = await res.json();
        setMemory(prev => prev.map(m => m.id === editingId ? updated : m));
        setEditingId(null);
        toast.success('Memory updated');
      }
    } catch { toast.error('Update failed'); } finally { setSaving(false); }
  };

  const deleteEntry = async (id) => {
    try {
      await fetch(`/api/user-memory/${id}`, { method: 'DELETE', headers: authHeaders() });
      setMemory(prev => prev.filter(m => m.id !== id));
      toast.success('Memory deleted');
    } catch { toast.error('Delete failed'); }
  };

  const addEntry = async () => {
    if (!newKey.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/user-memory', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ key: newKey, value: newValue }),
      });
      if (res.ok) {
        const created = await res.json();
        setMemory(prev => [created, ...prev]);
        setNewKey('');
        setNewValue('');
        setAddingNew(false);
        toast.success('Memory added');
      }
    } catch { toast.error('Add failed'); } finally { setSaving(false); }
  };

  const filtered = memory.filter(m =>
    !search || (m.key ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (m.value ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filtered.reduce((acc, m) => {
    const cat = categorize(m.key);
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(m);
    return acc;
  }, {});

  return (
    <VideoBackground>
      <div className="h-screen flex flex-col overflow-hidden">

        {/* Top Bar */}
        <div className="h-11 flex items-center justify-between px-3 border-b border-white/8 bg-black/80 backdrop-blur-lg shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/builder')}
              className="flex items-center gap-1.5 text-white/40 hover:text-white transition-colors text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Builder
            </button>
            <span className="text-white/20 text-sm">/</span>
            <div className="flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm font-semibold text-white/80">ASH Memory</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadMemory}
              className="text-white/30 hover:text-white/60 transition-colors p-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setAddingNew(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/12 hover:bg-primary/22 border border-primary/22 text-primary text-xs font-bold transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Memory
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 max-w-3xl mx-auto w-full">

          {/* Info banner */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl border border-primary/15 bg-primary/5 mb-5">
            <Info className="w-4 h-4 text-primary/60 shrink-0 mt-0.5" />
            <p className="text-xs text-white/45 leading-relaxed">
              ASH uses this memory to personalize your builds. It automatically learns your business context, preferences, and goals as you chat — you can also add your own entries below.
            </p>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 flex items-center gap-2 bg-white/4 border border-white/10 rounded-xl px-3 py-2">
              <Search className="w-3.5 h-3.5 text-white/22 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search memory…"
                className="flex-1 bg-transparent text-xs text-white/55 placeholder:text-white/22 focus:outline-none font-mono"
              />
            </div>
            <span className="text-[10px] text-white/22 font-mono shrink-0">{filtered.length} entries</span>
          </div>

          {/* Add new entry */}
          {addingNew && (
            <div className="border border-primary/25 bg-primary/5 rounded-xl p-4 mb-4 space-y-3">
              <p className="text-[11px] font-mono text-primary font-bold">New Memory Entry</p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={newKey}
                  onChange={e => setNewKey(e.target.value)}
                  placeholder="Key (e.g. business_niche)"
                  className="bg-black/40 border border-white/12 rounded-lg px-3 py-2 text-xs font-mono text-white/65 placeholder:text-white/22 focus:outline-none focus:border-primary/40"
                />
                <input
                  value={newValue}
                  onChange={e => setNewValue(e.target.value)}
                  placeholder="Value"
                  className="bg-black/40 border border-white/12 rounded-lg px-3 py-2 text-xs font-mono text-white/65 placeholder:text-white/22 focus:outline-none focus:border-primary/40"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={addEntry} disabled={saving || !newKey.trim()} size="sm" className="h-8 text-xs">
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  Add
                </Button>
                <button onClick={() => setAddingNew(false)} className="px-3 h-8 text-xs text-white/35 hover:text-white/55 font-mono">Cancel</button>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-white/25" />
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-12">
              <Brain className="w-10 h-10 text-white/8 mx-auto mb-3" />
              <p className="text-white/25 text-sm font-mono">No memory entries yet</p>
              <p className="text-white/15 text-xs font-mono mt-1">Chat with ASH to build context automatically</p>
            </div>
          )}

          {/* Grouped entries */}
          {Object.entries(grouped).map(([cat, entries]) => {
            const catConfig = MEMORY_CATEGORIES[cat] ?? MEMORY_CATEGORIES.other;
            const isCollapsed = collapsed[cat];
            return (
              <div key={cat} className="mb-4">
                <button
                  onClick={() => setCollapsed(c => ({ ...c, [cat]: !c[cat] }))}
                  className="w-full flex items-center gap-2 mb-2 group"
                >
                  {isCollapsed ? <ChevronRight className="w-3 h-3 text-white/22" /> : <ChevronDown className="w-3 h-3 text-white/22" />}
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-widest ${catConfig.color}`}>{catConfig.label}</span>
                  <span className="text-[9px] text-white/20 font-mono ml-auto">{entries.length} entries</span>
                </button>

                {!isCollapsed && (
                  <div className="space-y-2 ml-5">
                    {entries.map(entry => (
                      <div key={entry.id} className={`rounded-xl border ${catConfig.border} ${catConfig.bg} p-3`}>
                        {editingId === entry.id ? (
                          <div className="space-y-2">
                            <input
                              value={editKey}
                              onChange={e => setEditKey(e.target.value)}
                              className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-1.5 text-xs font-mono text-white/70 focus:outline-none focus:border-primary/40"
                            />
                            <textarea
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              rows={3}
                              className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-1.5 text-xs font-mono text-white/65 resize-none focus:outline-none focus:border-primary/40"
                            />
                            <div className="flex gap-2">
                              <button onClick={saveEdit} disabled={saving} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all ${catConfig.color} ${catConfig.bg} border ${catConfig.border}`}>
                                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                Save
                              </button>
                              <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-white/28 text-[10px] font-mono hover:text-white/50 transition-colors">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <p className={`text-[10px] font-mono font-bold ${catConfig.color} mb-0.5`}>{entry.key}</p>
                              <p className="text-[11px] text-white/55 font-mono leading-relaxed break-words">{entry.value || '—'}</p>
                              {entry.updatedAt && (
                                <p className="text-[8px] text-white/18 font-mono mt-1">{formatTime(entry.updatedAt)}</p>
                              )}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <button
                                onClick={() => { setEditingId(entry.id); setEditKey(entry.key); setEditValue(entry.value ?? ''); }}
                                className="p-1.5 rounded text-white/20 hover:text-white/50 hover:bg-white/8 transition-all"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => deleteEntry(entry.id)}
                                className="p-1.5 rounded text-white/15 hover:text-rose-400/65 hover:bg-rose-500/8 transition-all"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </VideoBackground>
  );
}
