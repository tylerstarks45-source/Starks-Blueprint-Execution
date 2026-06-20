import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Wand2, FolderOpen, Image, Upload, Trash2, Plus,
  ChevronRight, ChevronDown, FileText, FileJson2, Folder,
  X, Download, Eye, Search, Grid3x3, List, Clock, Zap,
  BookOpen, Save, AlertCircle, BarChart2, DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext.jsx';
import AuthLayout from '@/components/AuthLayout.jsx';

// ─── File Tree Node ───────────────────────────────────────────────────────────
const FileNode = ({ node, depth = 0 }) => {
  const [open, setOpen] = useState(depth < 2);
  if (!node) return null;
  const isFolder = node.type === 'folder' || Array.isArray(node.children);
  const indent = depth * 16;

  return (
    <div>
      <div
        className={`flex items-center gap-1.5 py-0.5 px-2 rounded hover:bg-white/5 cursor-pointer group`}
        style={{ paddingLeft: 8 + indent }}
        onClick={() => isFolder && setOpen(o => !o)}
      >
        {isFolder ? (
          <>
            {open
              ? <ChevronDown className="w-3 h-3 text-white/30 shrink-0" />
              : <ChevronRight className="w-3 h-3 text-white/30 shrink-0" />}
            {open
              ? <FolderOpen className="w-3.5 h-3.5 text-amber-400/70 shrink-0" />
              : <Folder className="w-3.5 h-3.5 text-amber-400/50 shrink-0" />}
          </>
        ) : (
          <>
            <span className="w-3 shrink-0" />
            {node.name?.endsWith('.json') || node.name?.endsWith('.yaml')
              ? <FileJson2 className="w-3.5 h-3.5 text-blue-400/60 shrink-0" />
              : <FileText className="w-3.5 h-3.5 text-white/40 shrink-0" />}
          </>
        )}
        <span className="text-xs text-white/70 font-mono truncate">{node.name}</span>
        {node.size && <span className="text-[10px] text-white/20 ml-auto font-mono">{node.size}</span>}
      </div>
      {isFolder && open && node.children?.map((child, i) => (
        <FileNode key={i} node={child} depth={depth + 1} />
      ))}
    </div>
  );
};

// ─── Image Lightbox ───────────────────────────────────────────────────────────
const Lightbox = ({ image, onClose }) => (
  <motion.div
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
    onClick={onClose}
  >
    <div className="relative max-w-4xl max-h-[90vh] mx-4" onClick={e => e.stopPropagation()}>
      <button
        onClick={onClose}
        className="absolute -top-10 right-0 text-white/50 hover:text-white transition-colors"
      >
        <X className="w-6 h-6" />
      </button>
      <img src={image.dataUrl} alt={image.name} className="max-w-full max-h-[85vh] rounded-xl object-contain" />
      <p className="text-center text-white/40 text-xs font-mono mt-3">{image.name}</p>
    </div>
  </motion.div>
);

const getAuthHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {};
};

const fmtRevenue = (cents) =>
  '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Project Card ─────────────────────────────────────────────────────────────
const ProjectCard = ({ system, onOpen, onUpdate, onDelete }) => {
  const [tab, setTab] = useState('images');
  const [lightbox, setLightbox] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const fileInputRef = useRef(null);
  const images = system.savedImages || [];
  const fileTree = system.fileTree || null;

  useEffect(() => {
    if (tab !== 'stats' || statsData) return;
    setStatsLoading(true);
    fetch(`/api/system-instances/${system.id}/revenue`, { headers: getAuthHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => setStatsData(d))
      .catch(() => setStatsData(null))
      .finally(() => setStatsLoading(false));
  }, [tab, system.id, statsData]);

  const handleImageUpload = useCallback((e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const newImg = { name: file.name, dataUrl: reader.result, createdAt: new Date().toISOString() };
        onUpdate(system.id, {
          savedImages: [...images, newImg],
        });
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  }, [images, onUpdate, system.id]);

  const deleteImage = (idx) => {
    const updated = images.filter((_, i) => i !== idx);
    onUpdate(system.id, { savedImages: updated });
  };

  const statusColor = {
    active: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    building: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    pending: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    error: 'text-red-400 bg-red-500/10 border-red-500/20',
  }[system.buildStatus] || 'text-white/40 bg-white/5 border-white/10';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="cinematic-card flex flex-col overflow-hidden"
    >
      {/* Card header */}
      <div className="p-5 border-b border-white/8">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white truncate">{system.name}</h3>
            <p className="text-xs text-white/40 font-mono mt-0.5">
              Created {new Date(system.createdAt).toLocaleDateString()}
            </p>
          </div>
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border shrink-0 ${statusColor}`}>
            {system.buildStatus}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => onOpen(system)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-primary/15 hover:bg-primary/25 border border-primary/30 text-primary text-xs font-bold transition-colors"
          >
            <Wand2 className="w-3.5 h-3.5" />
            Open in Builder
          </button>
          <button
            onClick={() => onDelete(system.id)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/10 hover:border-red-500/30 hover:text-red-400 text-white/30 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/8 shrink-0">
        {[
          { id: 'images', label: 'Images', icon: Image, count: images.length },
          { id: 'filetree', label: 'Files', icon: FolderOpen, count: fileTree ? 1 : 0 },
          { id: 'stats', label: 'Stats', icon: BarChart2, count: 0 },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-mono transition-colors ${
              tab === t.id
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-white/35 hover:text-white/60'
            }`}
          >
            <t.icon className="w-3 h-3" />
            {t.label}
            {t.count > 0 && (
              <span className="text-[9px] bg-white/10 rounded-full px-1.5">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto min-h-0" style={{ maxHeight: 260 }}>
        {tab === 'images' && (
          <div className="p-3">
            {images.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Image className="w-8 h-8 text-white/15 mb-2" />
                <p className="text-xs text-white/30">No images saved yet</p>
                <p className="text-[10px] text-white/20 mt-0.5">Upload screenshots or diagrams</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {images.map((img, i) => (
                  <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-white/10 bg-white/5">
                    <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setLightbox(img)}
                        className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-white" />
                      </button>
                      <button
                        onClick={() => deleteImage(i)}
                        className="w-7 h-7 rounded-lg bg-red-500/20 hover:bg-red-500/30 flex items-center justify-center transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full mt-2 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-white/15 hover:border-primary/40 hover:text-primary text-white/30 text-xs transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Image
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>
        )}

        {tab === 'filetree' && (
          <div className="p-2">
            {!fileTree ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FolderOpen className="w-8 h-8 text-white/15 mb-2" />
                <p className="text-xs text-white/30">No file tree saved</p>
                <p className="text-[10px] text-white/20 mt-0.5">Save from the Builder page</p>
              </div>
            ) : (
              <div className="font-mono text-xs">
                {Array.isArray(fileTree)
                  ? fileTree.map((node, i) => <FileNode key={i} node={node} depth={0} />)
                  : <FileNode node={fileTree} depth={0} />}
              </div>
            )}
          </div>
        )}

        {tab === 'stats' && (
          <div className="p-4">
            {statsLoading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-white/30">
                <div className="w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                <span className="text-xs font-mono">Loading stats…</span>
              </div>
            ) : !statsData ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <BarChart2 className="w-8 h-8 text-white/15 mb-2" />
                <p className="text-xs text-white/30">No stats available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { label: 'Today', value: statsData.todayCents ?? 0 },
                  { label: 'This Week', value: statsData.weekCents ?? 0 },
                  { label: 'This Month', value: statsData.monthCents ?? 0 },
                  { label: 'Lifetime', value: statsData.lifetimeCents ?? 0 },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-3 h-3 text-white/25 shrink-0" />
                      <span className="text-xs text-white/50 font-mono">{label}</span>
                    </div>
                    <span className={`text-sm font-bold font-mono ${value > 0 ? 'text-emerald-400' : 'text-white/25'}`}>
                      {fmtRevenue(value)}
                    </span>
                  </div>
                ))}
                <p className="text-[10px] text-white/20 font-mono pt-1 text-center">
                  Revenue events logged by your system
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {lightbox && <Lightbox image={lightbox} onClose={() => setLightbox(null)} />}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const LibraryPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [systems, setSystems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const authHeaders = useCallback(() => {
    const token = localStorage.getItem('sbep_auth_token');
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  }, []);

  const loadSystems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/system-instances', { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setSystems(data.items || data || []);
    } catch {
      toast.error('Failed to load your library');
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => { loadSystems(); }, [loadSystems]);

  const handleUpdate = useCallback(async (id, updates) => {
    try {
      const res = await fetch(`/api/system-instances/${id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update');
      const updated = await res.json();
      setSystems(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
      toast.success('Saved');
    } catch {
      toast.error('Failed to save changes');
    }
  }, [authHeaders]);

  const handleDelete = useCallback(async (id) => {
    if (!confirm('Delete this project from your library?')) return;
    try {
      const res = await fetch(`/api/system-instances/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error();
      setSystems(prev => prev.filter(s => s.id !== id));
      toast.success('Project deleted');
    } catch {
      toast.error('Failed to delete');
    }
  }, [authHeaders]);

  const handleOpen = useCallback((system) => {
    navigate(`/builder?systemId=${system.id}`);
  }, [navigate]);

  const filtered = systems.filter(s => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || s.buildStatus === filter;
    return matchSearch && matchFilter;
  });

  return (
    <AuthLayout>
      <div className="min-h-screen flex flex-col">

        {/* Top bar */}
        <div className="h-11 flex items-center justify-between px-4 border-b border-white/8 bg-black/80 backdrop-blur-lg shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/builder')}
              className="flex items-center gap-1.5 text-muted-foreground/50 hover:text-foreground transition-colors text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Builder
            </button>
            <ChevronRight className="w-3 h-3 text-white/20" />
            <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <BookOpen className="w-3.5 h-3.5 text-primary" />
              My Library
            </span>
          </div>
          <button
            onClick={() => navigate('/builder')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/15 hover:bg-primary/25 border border-primary/30 text-primary text-xs font-bold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Project
          </button>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-1">
                Project Library
              </h1>
              <p className="text-sm text-white/40">
                All your saved systems — open, manage images and file trees.
              </p>
            </div>

            {/* Search + filter bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search projects..."
                  className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/25 focus:outline-none focus:border-primary/40 focus:bg-white/8"
                />
              </div>
              <div className="flex gap-2">
                {['all', 'active', 'building', 'pending', 'error'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                      filter === f
                        ? 'bg-primary/20 border border-primary/30 text-primary'
                        : 'bg-white/5 border border-white/10 text-white/40 hover:text-white/60'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {[
                { label: 'Total Projects', value: systems.length, icon: Grid3x3 },
                { label: 'Active', value: systems.filter(s => s.buildStatus === 'active').length, icon: Zap },
                { label: 'With Images', value: systems.filter(s => s.savedImages?.length > 0).length, icon: Image },
                { label: 'With File Trees', value: systems.filter(s => s.fileTree).length, icon: FolderOpen },
              ].map(stat => (
                <div key={stat.label} className="cinematic-card p-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <stat.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-extrabold text-white">{stat.value}</p>
                    <p className="text-[10px] text-white/35 font-mono">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Projects grid */}
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="flex items-center gap-3 text-white/40">
                  <div className="w-5 h-5 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                  <span className="text-sm font-mono">Loading library...</span>
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <BookOpen className="w-12 h-12 text-white/10 mb-4" />
                <p className="text-white/30 text-sm font-mono">
                  {search || filter !== 'all' ? 'No projects match your filters' : 'No projects yet'}
                </p>
                {!search && filter === 'all' && (
                  <button
                    onClick={() => navigate('/builder')}
                    className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/15 border border-primary/30 text-primary text-sm font-bold hover:bg-primary/25 transition-colors"
                  >
                    <Wand2 className="w-4 h-4" />
                    Start Building
                  </button>
                )}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filtered.map(system => (
                  <ProjectCard
                    key={system.id}
                    system={system}
                    onOpen={handleOpen}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

export default LibraryPage;
