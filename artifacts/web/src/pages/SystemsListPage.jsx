import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Layers, ArrowRight, RefreshCw, Zap, Clock, AlertTriangle,
  CheckCircle2, Pause, RotateCcw, Search, SlidersHorizontal,
  Server, Plus,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import VideoBackground from '@/components/VideoBackground.jsx';
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

const SystemRow = ({ system, onView, onRebuild }) => {
  const canRebuild = REBUILD_STATUSES.has((system.buildStatus || '').toLowerCase());
  const updatedAt = system.updatedAt || system.createdAt;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="group grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-5 py-4 rounded-xl border border-white/8 bg-black/40 backdrop-blur-md hover:bg-white/3 hover:border-white/15 transition-all"
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
    </motion.div>
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

const SystemsListPage = () => {
  const navigate = useNavigate();
  const [systems, setSystems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/system-instances', { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to load systems');
      const data = await res.json();
      setSystems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || 'Could not load systems');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = systems.filter(s => {
    const matchSearch = !search || (
      (s.systemName || s.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.blueprintName || '').toLowerCase().includes(search.toLowerCase())
    );
    const matchStatus = statusFilter === 'all' || (s.buildStatus || '').toLowerCase() === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleView = (system) => navigate(`/systems/${system.id}`);
  const handleRebuild = (system) => {
    const params = system.blueprintId ? `?blueprintId=${system.blueprintId}` : '';
    navigate(`/builder${params}`);
  };

  const totalActive = systems.filter(s => ['active', 'building', 'running', 'completed'].includes((s.buildStatus || '').toLowerCase())).length;

  return (
    <VideoBackground>
      <Helmet><title>My Systems | Starks Global Group</title></Helmet>
      <Header />
      <main className="flex-grow pt-8 pb-24 px-4 sm:px-6 lg:px-8 container mx-auto max-w-[1200px]">

        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
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
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/4 border border-white/8">
                <Server className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-lg font-bold font-mono text-emerald-400">{totalActive}</span>
                <span className="text-xs text-muted-foreground">active</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/4 border border-white/8">
                <Layers className="w-4 h-4 text-primary shrink-0" />
                <span className="text-lg font-bold font-mono text-foreground">{systems.length}</span>
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
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or blueprint…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/4 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:bg-white/6 transition-all"
              />
            </div>
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/4 border border-white/8 flex-wrap">
              {FILTER_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value)}
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
        ) : systems.length === 0 ? (
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
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 gap-3"
          >
            <Search className="w-8 h-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No systems match your filters.</p>
            <button
              onClick={() => { setSearch(''); setStatusFilter('all'); }}
              className="text-xs text-primary font-mono hover:underline"
            >
              Clear filters
            </button>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-5 py-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40">System</span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40">Status</span>
              <span className="hidden sm:block text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40">Updated</span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40 w-[76px]"></span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40"></span>
            </div>

            {filtered.map((system, i) => (
              <motion.div
                key={system.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <SystemRow
                  system={system}
                  onView={handleView}
                  onRebuild={handleRebuild}
                />
              </motion.div>
            ))}

            <p className="text-center text-xs text-muted-foreground/30 font-mono pt-4">
              {filtered.length} of {systems.length} system{systems.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </main>
      <Footer />
    </VideoBackground>
  );
};

export default SystemsListPage;
