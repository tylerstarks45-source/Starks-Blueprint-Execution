import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import AuthLayout from '@/components/AuthLayout.jsx';
import {
  Globe, Plus, Eye, Edit2, Trash2, ExternalLink, Copy, Check, ChevronRight,
  LayoutTemplate, Sparkles, Share2, TrendingUp, MoreHorizontal, AlertCircle,
  RefreshCw, FileCode, Zap, Lock, Unlock, BarChart3, PenTool,
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

function PageCard({ page, onEdit, onDelete, onPublishToggle, onPreview, copied, onCopy, onCanvas }) {
  const publicUrl = `${window.location.origin}/api/pages/${page.slug}`;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={`relative rounded-2xl border bg-white/2 transition-all group ${page.isPublished ? 'border-emerald-500/20' : 'border-white/8'}`}>
      {page.isPublished && <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-emerald-500/0 via-emerald-400/60 to-emerald-500/0 rounded-t-2xl" />}

      {/* Preview thumbnail */}
      <div
        className="h-36 rounded-t-2xl bg-gradient-to-br from-violet-900/20 to-black border-b border-white/6 overflow-hidden relative cursor-pointer"
        onClick={() => onPreview(page)}
      >
        {page.htmlContent ? (
          <iframe
            srcDoc={page.htmlContent}
            className="w-full h-full scale-50 origin-top-left pointer-events-none"
            style={{ width: '200%', height: '200%' }}
            title="preview"
            sandbox="allow-same-origin"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <LayoutTemplate className="w-8 h-8 text-white/15" />
            <span className="text-[10px] text-white/25 font-mono">No content yet</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-xs text-white font-mono">
            <Eye className="w-3 h-3" /> Preview
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <h3 className="text-sm font-bold text-white/85 leading-tight">{page.title}</h3>
            <p className="text-[10px] text-white/35 font-mono mt-0.5">{page.slug}</p>
            {page.systemName && (
              <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-mono text-violet-400/70 bg-violet-500/8 border border-violet-500/15 rounded px-1.5 py-0.5">
                <Zap className="w-2 h-2" />{page.systemName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider ${
              page.isPublished ? 'bg-emerald-500/12 text-emerald-400 border border-emerald-500/20' : 'bg-white/5 text-white/30 border border-white/10'
            }`}>
              {page.isPublished ? 'Live' : 'Draft'}
            </span>
            <div className="relative">
              <button onClick={() => setMenuOpen(m => !m)} className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                <MoreHorizontal className="w-3.5 h-3.5 text-white/40" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-8 z-20 w-36 rounded-xl border border-white/12 bg-[#111] shadow-2xl py-1" onMouseLeave={() => setMenuOpen(false)}>
                  {[
                    { icon: PenTool, label: 'Canvas Editor', onClick: () => { onCanvas(page); setMenuOpen(false); }, className: 'text-violet-400' },
                    { icon: Eye, label: 'Preview', onClick: () => { onPreview(page); setMenuOpen(false); } },
                    { icon: Edit2, label: 'Edit HTML', onClick: () => { onEdit(page); setMenuOpen(false); } },
                    { icon: page.isPublished ? Lock : Unlock, label: page.isPublished ? 'Unpublish' : 'Publish', onClick: () => { onPublishToggle(page); setMenuOpen(false); } },
                    { icon: Trash2, label: 'Delete', onClick: () => { onDelete(page); setMenuOpen(false); }, className: 'text-red-400/70' },
                  ].map(item => (
                    <button key={item.label} onClick={item.onClick}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-[11px] text-white/55 hover:text-white hover:bg-white/5 transition-colors ${item.className ?? ''}`}>
                      <item.icon className="w-3.5 h-3.5" />{item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {page.description && <p className="text-[10px] text-white/35 leading-relaxed mb-3 line-clamp-2">{page.description}</p>}

        <div className="flex items-center gap-3 text-[10px] text-white/30 font-mono mb-3">
          <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" />{page.pageViews} views</span>
          <span className="text-white/12">·</span>
          <span>{new Date(page.updatedAt).toLocaleDateString()}</span>
        </div>

        {page.isPublished && (
          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-white/3 border border-white/8">
            <Globe className="w-3 h-3 text-emerald-400/60 shrink-0" />
            <span className="text-[9px] font-mono text-white/40 truncate flex-1">{publicUrl}</span>
            <button onClick={() => onCopy(publicUrl, page.id)} className="shrink-0 text-white/30 hover:text-white/70 transition-colors">
              {copied === page.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-white/30 hover:text-violet-400 transition-colors">
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Canvas Editor CTA */}
        <button
          onClick={() => onCanvas(page)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 mt-1 rounded-xl border border-violet-500/25 bg-violet-500/6 text-violet-400 text-[11px] font-medium hover:bg-violet-500/12 hover:border-violet-500/40 transition-all"
        >
          <PenTool className="w-3.5 h-3.5" />
          Open Canvas Designer
        </button>
      </div>
    </div>
  );
}

function CreateModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ title: '', description: '', slug: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const api = useApi();

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const data = { title: form.title, description: form.description || undefined };
      if (form.slug) data.slug = form.slug;
      const result = await api.post('/landing-pages', data);
      if (result.error) { setError(result.error); return; }
      onCreate(result);
    } catch (err) {
      setError('Failed to create page');
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/12 bg-[#0d0d0d] shadow-2xl">
        <div className="p-6 border-b border-white/8">
          <h2 className="text-base font-bold text-white flex items-center gap-2"><Plus className="w-4 h-4 text-violet-400" /> New Landing Page</h2>
          <p className="text-[11px] text-white/40 mt-1 font-mono">Create a page — then have ASH generate the content.</p>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {error && <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/8 border border-red-500/20 text-[11px] text-red-400"><AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}</div>}
          <div>
            <label className="block text-[11px] font-mono text-white/50 mb-1.5">Page Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full h-9 px-3 rounded-lg bg-white/5 border border-white/12 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 transition-colors"
              placeholder="My TikTok Affiliate Store" required />
          </div>
          <div>
            <label className="block text-[11px] font-mono text-white/50 mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/12 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 transition-colors resize-none"
              placeholder="Landing page for my affiliate marketing system..." rows={2} />
          </div>
          <div>
            <label className="block text-[11px] font-mono text-white/50 mb-1.5">Custom Slug <span className="text-white/25">(optional)</span></label>
            <div className="flex items-center gap-0">
              <span className="text-[10px] text-white/25 font-mono pr-2">/pages/</span>
              <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                className="flex-1 h-9 px-3 rounded-lg bg-white/5 border border-white/12 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 transition-colors font-mono"
                placeholder="my-page-name" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-9 rounded-lg bg-white/5 text-white/50 hover:text-white text-sm transition-colors">Cancel</button>
            <button type="submit" disabled={loading || !form.title} className="flex-1 h-9 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Creating...</> : 'Create Page'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GenerateModal({ page, onClose, onGenerated }) {
  const [form, setForm] = useState({ prompt: '', pageType: 'affiliate', affiliateLinks: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const api = useApi();

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const affiliateLinks = form.affiliateLinks.trim()
        ? form.affiliateLinks.split('\n').filter(Boolean).map(line => {
            const [name, ...rest] = line.split('|');
            return { name: name?.trim() || 'Product', url: rest[0]?.trim() || line.trim() };
          })
        : undefined;
      const result = await api.post('/landing-pages/generate', {
        pageId: page.id,
        prompt: form.prompt,
        pageType: form.pageType,
        affiliateLinks,
      });
      if (result.error) { setError(result.error); return; }
      onGenerated(result);
    } catch (err) {
      setError('ASH failed to generate the page. Please try again.');
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-violet-500/20 bg-[#0d0d0d] shadow-2xl">
        <div className="p-6 border-b border-white/8">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            ASH: Generate "{page.title}"
          </h2>
          <p className="text-[11px] text-white/40 mt-1 font-mono">ASH will write the full HTML landing page using GPT-4o.</p>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {error && <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/8 border border-red-500/20 text-[11px] text-red-400"><AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}</div>}
          <div>
            <label className="block text-[11px] font-mono text-white/50 mb-1.5">Page Type</label>
            <select value={form.pageType} onChange={e => setForm(f => ({ ...f, pageType: e.target.value }))}
              className="w-full h-9 px-3 rounded-lg bg-white/5 border border-white/12 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-colors">
              {['affiliate', 'product', 'lead-capture', 'sales-funnel', 'portfolio', 'blog', 'service'].map(t => (
                <option key={t} value={t} className="bg-[#111]">{t.charAt(0).toUpperCase() + t.slice(1).replace('-', ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-mono text-white/50 mb-1.5">Describe What You're Selling / Promoting *</label>
            <textarea value={form.prompt} onChange={e => setForm(f => ({ ...f, prompt: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/12 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 transition-colors resize-none"
              placeholder="I'm promoting 5 AI tools for content creators. This page should show each tool, the benefits, and why creators need them. High-energy, FOMO-driven copy." rows={3} required />
          </div>
          <div>
            <label className="block text-[11px] font-mono text-white/50 mb-1.5">Affiliate Links <span className="text-white/25">(one per line: Name | URL)</span></label>
            <textarea value={form.affiliateLinks} onChange={e => setForm(f => ({ ...f, affiliateLinks: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/12 text-xs text-white/70 placeholder-white/20 focus:outline-none focus:border-violet-500/50 transition-colors resize-none font-mono"
              placeholder={`Beehiiv | https://beehiiv.com/?via=yourcode\nCapcut | https://capcut.com/?ref=yourcode`} rows={3} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-9 rounded-lg bg-white/5 text-white/50 hover:text-white text-sm transition-colors">Cancel</button>
            <button type="submit" disabled={loading || !form.prompt}
              className="flex-1 h-9 rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading
                ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Generating (~30s)...</>
                : <><Sparkles className="w-3.5 h-3.5" /> Generate with ASH</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PreviewModal({ page, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-3 bg-[#111] border-b border-white/8 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-white">{page.title}</span>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${page.isPublished ? 'bg-emerald-500/12 text-emerald-400 border border-emerald-500/20' : 'bg-white/5 text-white/30 border border-white/10'}`}>
            {page.isPublished ? 'Live' : 'Draft'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {page.isPublished && (
            <a href={`/api/pages/${page.slug}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 h-7 px-3 text-[11px] font-mono text-violet-400 hover:text-violet-300 bg-violet-500/10 border border-violet-500/20 rounded-lg transition-colors">
              <ExternalLink className="w-3 h-3" /> Open Live
            </a>
          )}
          <button onClick={onClose} className="h-7 px-3 text-[11px] font-mono text-white/40 hover:text-white bg-white/5 rounded-lg transition-colors">Close</button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {page.htmlContent
          ? <iframe srcDoc={page.htmlContent} className="w-full h-full border-0" title="Page Preview" sandbox="allow-scripts allow-same-origin" />
          : <div className="flex items-center justify-center h-full text-white/25 font-mono text-sm">No content yet. Use ASH to generate this page.</div>}
      </div>
    </div>
  );
}

export default function LandingPagesPage() {
  const navigate = useNavigate();
  const api = useApi();

  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [generatePage, setGeneratePage] = useState(null);
  const [previewPage, setPreviewPage] = useState(null);
  const [copied, setCopied] = useState(null);

  useEffect(() => { fetchPages(); }, []);

  async function fetchPages() {
    setLoading(true);
    try {
      const data = await api.get('/landing-pages');
      if (Array.isArray(data)) setPages(data);
    } finally { setLoading(false); }
  }

  async function handlePublishToggle(page) {
    const result = await api.patch(`/landing-pages/${page.id}`, { isPublished: !page.isPublished });
    if (!result.error) setPages(ps => ps.map(p => p.id === page.id ? result : p));
  }

  async function handleDelete(page) {
    if (!confirm(`Delete "${page.title}"? This cannot be undone.`)) return;
    await api.del(`/landing-pages/${page.id}`);
    setPages(ps => ps.filter(p => p.id !== page.id));
  }

  function handleCopy(url, id) {
    navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <AuthLayout>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24">

        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs text-violet-400 font-mono font-semibold mb-5">
            <Globe className="w-3 h-3" /> ASH LANDING PAGE BUILDER
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Landing Page Builder</h1>
          <p className="text-white/50 text-base max-w-2xl mx-auto leading-relaxed">
            ASH generates complete, hosted landing pages for your systems. Affiliate stores, lead capture pages, product sales funnels — all built and published at your URL instantly.
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Pages', value: pages.length, color: 'text-violet-400' },
            { label: 'Published', value: pages.filter(p => p.isPublished).length, color: 'text-emerald-400' },
            { label: 'Total Views', value: pages.reduce((a, p) => a + (p.pageViews || 0), 0).toLocaleString(), color: 'text-sky-400' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-white/8 bg-white/2 p-4 text-center">
              <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-white/35 font-mono mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-bold text-white/60 uppercase tracking-widest font-mono">Your Pages</h2>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 h-9 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors">
            <Plus className="w-4 h-4" /> New Page
          </button>
        </div>

        {/* Pages grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {[1, 2, 3].map(i => <div key={i} className="h-72 rounded-2xl bg-white/3 border border-white/6 animate-pulse" />)}
          </div>
        ) : pages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <LayoutTemplate className="w-12 h-12 text-white/12" />
            <h3 className="text-base font-semibold text-white/40">No pages yet</h3>
            <p className="text-sm text-white/25 text-center max-w-sm font-mono">Create your first landing page and let ASH build it for you. Published pages go live instantly at your URL.</p>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 h-9 px-5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors mt-2">
              <Plus className="w-4 h-4" /> Create First Page
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {pages.map(page => (
              <PageCard key={page.id} page={page}
                onEdit={(p) => setGeneratePage(p)}
                onDelete={handleDelete}
                onPublishToggle={handlePublishToggle}
                onPreview={setPreviewPage}
                copied={copied}
                onCopy={handleCopy}
                onCanvas={(p) => navigate(`/landing-pages/${p.id}/canvas`)}
              />
            ))}
            {/* Add new card */}
            <button onClick={() => setShowCreate(true)}
              className="h-full min-h-[280px] rounded-2xl border-2 border-dashed border-white/8 bg-white/1 hover:border-violet-500/30 hover:bg-violet-500/5 transition-all group flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 group-hover:bg-violet-500/15 border border-white/8 group-hover:border-violet-500/25 flex items-center justify-center transition-all">
                <Plus className="w-5 h-5 text-white/30 group-hover:text-violet-400 transition-colors" />
              </div>
              <span className="text-[11px] text-white/30 group-hover:text-violet-400/70 font-mono transition-colors">New Page</span>
            </button>
          </div>
        )}

        {/* How it works */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { icon: <Plus className="w-5 h-5 text-violet-400" />, step: '01', title: 'Create', desc: 'Give your page a title and pick a type — affiliate store, lead magnet, sales funnel, etc.' },
            { icon: <Sparkles className="w-5 h-5 text-emerald-400" />, step: '02', title: 'Generate', desc: "ASH writes the full HTML/CSS landing page using GPT-4o. Paste your affiliate links and she builds around them." },
            { icon: <Globe className="w-5 h-5 text-sky-400" />, step: '03', title: 'Publish', desc: 'Hit publish and your page is live instantly. Share the link anywhere — social posts, bio, email, ads.' },
          ].map(s => (
            <div key={s.step} className="rounded-2xl border border-white/8 bg-white/2 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center">{s.icon}</div>
                <span className="text-[10px] font-mono text-white/25 font-bold">{s.step}</span>
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">{s.title}</h3>
              <p className="text-xs text-white/40 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={p => { setPages(ps => [p, ...ps]); setShowCreate(false); setGeneratePage(p); }} />}
      {generatePage && <GenerateModal page={generatePage} onClose={() => setGeneratePage(null)} onGenerated={p => { setPages(ps => ps.map(x => x.id === p.id ? p : x)); setGeneratePage(null); }} />}
      {previewPage && <PreviewModal page={previewPage} onClose={() => setPreviewPage(null)} />}
    </AuthLayout>
  );
}
