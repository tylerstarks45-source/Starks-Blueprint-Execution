import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers, ArrowRight, RefreshCw, Zap, Clock, AlertTriangle,
  CheckCircle2, Pause, RotateCcw, Search, SlidersHorizontal,
  Server, Plus, MoreVertical, Pencil, Play, Trash2, X, Check,
  ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight,
  DollarSign,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AuthLayout from '@/components/AuthLayout.jsx';
import { Helmet } from 'react-helmet';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const STATUS_META = {
  active:     { label: 'Active',    dot: 'bg-emerald-400', badge: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20', pulse: true },
  building:   { label: 'Building',  dot: 'bg-blue-400',    badge: 'bg-blue-400/10 text-blue-400 border-blue-400/20', pulse: true },
  completed:  { label: 'Live',      dot: 'bg-emerald-400', badge: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  paused:     { label: 'Paused',    dot: 'bg-amber-400',   badge: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
  failed:     { label: 'Failed',    dot: 'bg-rose-400',    badge: 'bg-rose-400/10 text-rose-400 border-rose-400/20' },
  pending:    { label: 'Pending',   dot: 'bg-zinc-400',    badge: 'bg-zinc-400/10 text-zinc-400 border-zinc-400/20' },
};

const getStatusMeta = (s) => STATUS_META[(s || '').toLowerCase()] ?? STATUS_META.pending;

const REBUILD_STATUSES = new Set(['failed', 'paused']);

function formatUpdated(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatRevenueCents(cents) {
  if (!cents || cents <= 0) return null;
  const dollars = cents / 100;
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return `$${dollars.toFixed(dollars < 1 ? 2 : 0)}`;
}

const StatusBadge = ({ status }) => {
  const meta = getStatusMeta(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-mono font-semibold uppercase tracking-wider ${meta.badge}`}>
      <span className={`relative flex h-1.5 w-1.5 shrink-0`}>
        {meta.pulse && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${meta.dot} opacity-60`} />
        )}
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${meta.dot}`} />
      </span>
      {meta.label}
    </span>
  );
};

const OverflowMenu = ({ system, onRename, onTogglePause, onDelete, busy }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const isPaused = (system.buildStatus || '').toLowerCase() === 'paused';

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const act = (fn) => { setOpen(false); fn(); };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        disabled={busy}
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all disabled:opacity-40"
        aria-label="System actions"
      >
        <MoreVertical className="w-3.5 h-3.5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.1 }}
            className="absolute right-0 top-full mt-1.5 z-50 min-w-[160px] rounded-xl bg-zinc-900 border border-white/10 shadow-xl shadow-black/40 overflow-hidden"
          >
            <button
              onClick={() => act(onRename)}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-white/6 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
              Rename
            </button>
            <button
              onClick={() => act(onTogglePause)}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-white/6 transition-colors"
            >
              {isPaused
                ? <><Play className="w-3.5 h-3.5 text-emerald-400" />Resume</>
                : <><Pause className="w-3.5 h-3.5 text-amber-400" />Pause</>
              }
            </button>
            <div className="mx-3 my-1 h-px bg-white/8" />
            <button
              onClick={() => act(onDelete)}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-400/8 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SystemRow = ({ system, lifetimeCents, onView, onRebuild, onRename, onTogglePause, onDelete, busy }) => {
  const canRebuild = REBUILD_STATUSES.has((system.buildStatus || '').toLowerCase());
  const updatedAt = system.updatedAt || system.createdAt;
  const revenueDisplay = formatRevenueCents(lifetimeCents);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="group grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] items-center gap-4 px-5 py-4 rounded-xl border border-white/10 bg-black/80 backdrop-blur-sm hover:bg-black/90 hover:border-white/20 transition-all"
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
          {system.systemName || system.name || 'Untitled System'}
        </p>
        <p className="text-xs text-muted-foreground/60 font-mono truncate mt-0.5">
          {system.blueprintName || system.blueprint?.name || `Blueprint #${system.blueprintId}`}
        </p>
      </div>

      <StatusBadge status={system.buildStatus} />

      <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground/50 font-mono whitespace-nowrap">
        <Clock className="w-3 h-3 shrink-0" />
        {formatUpdated(updatedAt)}
      </div>

      <div className="hidden md:flex items-center justify-end min-w-[64px]">
        {lifetimeCents === undefined ? (
          <span className="text-xs font-mono text-muted-foreground/30">…</span>
        ) : revenueDisplay ? (
          <span className="text-xs font-mono font-semibold text-emerald-400">{revenueDisplay}</span>
        ) : (
          <span className="text-xs font-mono text-muted-foreground/30">—</span>
        )}
      </div>

      {canRebuild ? (
        <button
          onClick={() => onRebuild(system)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs font-semibold font-mono hover:bg-amber-400/20 active:scale-[0.97] transition-all whitespace-nowrap"
        >
          <RotateCcw className="w-3 h-3" />
          Rebuild
        </button>
      ) : (
        <div className="w-[76px]" />
      )}

      <button
        onClick={() => onView(system)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-foreground text-xs font-semibold hover:bg-white/10 hover:text-primary active:scale-[0.97] transition-all whitespace-nowrap"
      >
        View
        <ArrowRight className="w-3 h-3" />
      </button>

      <OverflowMenu
        system={system}
        onRename={() => onRename(system)}
        onTogglePause={() => onTogglePause(system)}
        onDelete={() => onDelete(system)}
        busy={busy}
      />
    </motion.div>
  );
};

const RenameModal = ({ system, onClose, onSave }) => {
  const [value, setValue] = useState(system.systemName || system.name || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);

  const handleSave = async () => {
    const trimmed = value.trim();
    if (!trimmed) { setError('Name cannot be empty'); return; }
    if (trimmed === (system.systemName || system.name || '')) { onClose(); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/system-instances/${system.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ systemName: trimmed }),
      });
      if (!res.ok) throw new Error('Failed to rename');
      const updated = await res.json();
      onSave(updated);
    } catch (e) {
      setError(e.message || 'Could not rename system');
      setSaving(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        className="relative w-full max-w-sm rounded-2xl bg-zinc-900 border border-white/10 p-6 shadow-2xl shadow-black/60"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold font-mono text-foreground">Rename System</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => { setValue(e.target.value); setError(''); }}
          onKeyDown={handleKey}
          maxLength={100}
          placeholder="System name…"
          className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:bg-white/8 transition-all mb-3"
        />
        {error && <p className="text-xs text-rose-400 font-mono mb-3">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-muted-foreground hover:text-foreground transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Save
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const DeleteConfirmModal = ({ system, onClose, onConfirm }) => {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setDeleting(true);
    setError('');
    try {
      const res = await fetch(`/api/system-instances/${system.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok && res.status !== 204) throw new Error('Failed to delete');
      onConfirm(system.id);
    } catch (e) {
      setError(e.message || 'Could not delete system');
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        className="relative w-full max-w-sm rounded-2xl bg-zinc-900 border border-white/10 p-6 shadow-2xl shadow-black/60"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-rose-400/10 border border-rose-400/20 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h3 className="text-base font-bold font-mono text-foreground">Delete System</h3>
            <p className="text-xs text-muted-foreground mt-0.5">This action cannot be undone.</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Are you sure you want to delete{' '}
          <span className="text-foreground font-semibold">
            {system.systemName || system.name || 'this system'}
          </span>
          ? All activity and data for this system will be permanently removed.
        </p>
        {error && <p className="text-xs text-rose-400 font-mono mb-3">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-muted-foreground hover:text-foreground transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 disabled:opacity-50 transition-all"
          >
            {deleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const FILTER_OPTIONS = [
  { value: 'all',      label: 'All' },
  { value: 'active',   label: 'Active' },
  { value: 'building', label: 'Building' },
  { value: 'paused',   label: 'Paused' },
  { value: 'failed',   label: 'Failed' },
  { value: 'completed',label: 'Live' },
];

const PAGE_SIZE = 20;

const SystemsListPage = () => {
  const navigate = useNavigate();
  const [systems, setSystems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const [sortCol, setSortCol] = useState('updatedAt');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(0);
  const [revenues, setRevenues] = useState({});

  const [renameTarget, setRenameTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        sort: sortCol,
        order: sortDir,
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/system-instances?${params}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to load systems');
      const data = await res.json();
      const headerTotal = parseInt(res.headers.get('X-Total-Count') || '0', 10);
      setSystems(Array.isArray(data) ? data : []);
      setTotal(headerTotal || (Array.isArray(data) ? data.length : 0));
    } catch (e) {
      setError(e.message || 'Could not load systems');
    } finally {
      setLoading(false);
    }
  }, [sortCol, sortDir, page, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (systems.length === 0) return;
    const ids = systems.map(s => s.id);
    // Mark all as loading (undefined = pending)
    setRevenues(prev => {
      const next = { ...prev };
      ids.forEach(id => { if (!(id in next)) next[id] = undefined; });
      return next;
    });
    // Single batch request — one DB round-trip for all systems on the page
    fetch('/api/system-instances/revenue-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ ids }),
    })
      .then(r => r.ok ? r.json() : {})
      .then(map => {
        setRevenues(prev => {
          const next = { ...prev };
          ids.forEach(id => { next[id] = map[String(id)] ?? 0; });
          return next;
        });
      })
      .catch(() => {
        setRevenues(prev => {
          const next = { ...prev };
          ids.forEach(id => { next[id] = 0; });
          return next;
        });
      });
  }, [systems]);

  const handleSort = (col) => {
    if (col === sortCol) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
    setPage(0);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleView = (system) => navigate(`/systems/${system.id}`);
  const handleRebuild = (system) => {
    const params = system.blueprintId ? `?blueprintId=${system.blueprintId}` : '';
    navigate(`/builder${params}`);
  };

  const handleTogglePause = async (system) => {
    const isPaused = (system.buildStatus || '').toLowerCase() === 'paused';
    const newStatus = isPaused ? 'active' : 'paused';
    setBusyId(system.id);
    try {
      const res = await fetch(`/api/system-instances/${system.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ buildStatus: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      const updated = await res.json();
      setSystems(prev => prev.map(s => s.id === system.id ? { ...s, ...updated } : s));
    } catch {
    } finally {
      setBusyId(null);
    }
  };

  const handleRenameSave = (updated) => {
    setSystems(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s));
    setRenameTarget(null);
  };

  const handleDeleteConfirm = (deletedId) => {
    setSystems(prev => prev.filter(s => s.id !== deletedId));
    setDeleteTarget(null);
  };

  const SortIcon = ({ col }) => {
    if (col !== sortCol) return <ChevronsUpDown className="w-3 h-3 ml-1 opacity-30" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 ml-1 text-primary" />
      : <ChevronDown className="w-3 h-3 ml-1 text-primary" />;
  };

  return (
    <AuthLayout>
      <Helmet><title>My Systems | Starks Global Group</title></Helmet>
      <main className="pt-6 pb-24 px-4 sm:px-6 lg:px-8 container mx-auto max-w-[1200px]">

        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground/60 hover:text-foreground transition-colors mb-4"
              >
                ← Return to Dashboard
              </button>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center">
                  <Layers className="w-4 h-4 text-primary" />
                </div>
                <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground/60">System Registry</span>
              </div>
              <h1 className="text-3xl font-extrabold font-mono text-foreground">My Systems</h1>
              <p className="text-sm text-muted-foreground mt-1">
                All your automated income systems in one place.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black/70 border border-white/10">
                <Server className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-lg font-bold font-mono text-emerald-400">
                  {systems.filter(s => ['active', 'building', 'running', 'completed'].includes((s.buildStatus || '').toLowerCase())).length}
                </span>
                <span className="text-xs text-muted-foreground">active (page)</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black/70 border border-white/10">
                <Layers className="w-4 h-4 text-primary shrink-0" />
                <span className="text-lg font-bold font-mono text-foreground">{total}</span>
                <span className="text-xs text-muted-foreground">total</span>
              </div>
              <Button
                onClick={() => navigate('/builder')}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
              >
                <Plus className="w-4 h-4" />
                New System
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
                placeholder="Search by name or blueprint…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-black/70 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:bg-black/80 transition-all"
              />
            </div>
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/70 border border-white/10 flex-wrap">
              {FILTER_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setStatusFilter(opt.value); setPage(0); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                    statusFilter === opt.value
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              onClick={load}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/4 border border-white/8 text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-white/8 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </motion.div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground font-mono">Loading systems…</p>
          </div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 gap-4"
          >
            <AlertTriangle className="w-8 h-8 text-rose-400" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={load}>Try again</Button>
          </motion.div>
        ) : systems.length === 0 && !search && statusFilter === 'all' ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 gap-5"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Zap className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold font-mono text-foreground mb-1">No systems yet</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Build your first automated income system with STARK and it will appear here.
              </p>
            </div>
            <Button onClick={() => navigate('/builder')} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
              <Zap className="w-4 h-4 mr-2" />
              Build Your First System
            </Button>
          </motion.div>
        ) : systems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 gap-3"
          >
            <Search className="w-8 h-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No systems match your filters.</p>
            <button
              onClick={() => { setSearch(''); setStatusFilter('all'); setPage(0); }}
              className="text-xs text-primary font-mono hover:underline"
            >
              Clear filters
            </button>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] items-center gap-4 px-5 py-2">
              <button
                onClick={() => handleSort('name')}
                className="flex items-center text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40 hover:text-muted-foreground transition-colors select-none"
              >
                System<SortIcon col="name" />
              </button>
              <button
                onClick={() => handleSort('buildStatus')}
                className="flex items-center text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40 hover:text-muted-foreground transition-colors select-none"
              >
                Status<SortIcon col="buildStatus" />
              </button>
              <button
                onClick={() => handleSort('updatedAt')}
                className="hidden sm:flex items-center text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40 hover:text-muted-foreground transition-colors select-none"
              >
                Updated<SortIcon col="updatedAt" />
              </button>
              <span className="hidden md:flex items-center justify-end text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40 gap-1 min-w-[64px]">
                <DollarSign className="w-3 h-3" />Revenue
              </span>
              <span className="w-[76px]" />
              <span />
              <span />
            </div>

            {systems.map((system, i) => (
              <motion.div
                key={system.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <SystemRow
                  system={system}
                  lifetimeCents={revenues[system.id]}
                  onView={handleView}
                  onRebuild={handleRebuild}
                  onRename={setRenameTarget}
                  onTogglePause={handleTogglePause}
                  onDelete={setDeleteTarget}
                  busy={busyId === system.id}
                />
              </motion.div>
            ))}

            {/* Pagination controls */}
            <div className="flex items-center justify-between pt-4 px-1">
              <p className="text-xs text-muted-foreground/40 font-mono">
                {total > 0
                  ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} of ${total} system${total !== 1 ? 's' : ''}`
                  : `${systems.length} system${systems.length !== 1 ? 's' : ''}`}
              </p>
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/4 border border-white/8 text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-white/8 disabled:opacity-30 disabled:pointer-events-none transition-all"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Prev
                  </button>
                  <span className="text-xs font-mono text-muted-foreground/50 px-1">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/4 border border-white/8 text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-white/8 disabled:opacity-30 disabled:pointer-events-none transition-all"
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <AnimatePresence>
        {renameTarget && (
          <RenameModal
            key="rename"
            system={renameTarget}
            onClose={() => setRenameTarget(null)}
            onSave={handleRenameSave}
          />
        )}
        {deleteTarget && (
          <DeleteConfirmModal
            key="delete"
            system={deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onConfirm={handleDeleteConfirm}
          />
        )}
      </AnimatePresence>
    </AuthLayout>
  );
};

export default SystemsListPage;
