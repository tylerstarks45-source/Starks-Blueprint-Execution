import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AuthLayout from '@/components/AuthLayout.jsx';
import {
  Sparkles, Eye, Save, Globe, ArrowLeft, RefreshCw, AlertCircle,
  Monitor, Smartphone, Palette, Layout, ChevronDown, ChevronUp,
  CheckSquare, Square, Loader2, Copy, Check, ExternalLink, Wand2,
  Type, Image, Users, Star, HelpCircle, PhoneCall, DollarSign,
  Zap, LayoutTemplate, Send, Link2, Mail, ArrowRight, BarChart3, TrendingUp, Code2, Edit2,
} from 'lucide-react';

const API = '/api';
function authHeaders() {
  const t = localStorage.getItem('sbep_auth_token');
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

const PAGE_TYPES = [
  { value: 'affiliate', label: 'Affiliate Page' },
  { value: 'product', label: 'Product Page' },
  { value: 'lead-capture', label: 'Lead Capture' },
  { value: 'sales-funnel', label: 'Sales Funnel' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'blog', label: 'Blog / Content' },
  { value: 'service', label: 'Service Page' },
];

const SECTIONS = [
  { id: 'hero', icon: Layout, label: 'Hero Banner', desc: 'Big headline + CTA' },
  { id: 'features', icon: Zap, label: 'Features / Benefits', desc: 'Key value props' },
  { id: 'social-proof', icon: Star, label: 'Social Proof', desc: 'Testimonials & reviews' },
  { id: 'about', icon: Users, label: 'About / Story', desc: 'Build trust & credibility' },
  { id: 'pricing', icon: DollarSign, label: 'Pricing', desc: 'Plans & comparison' },
  { id: 'faq', icon: HelpCircle, label: 'FAQ', desc: 'Answer objections' },
  { id: 'cta', icon: PhoneCall, label: 'Call to Action', desc: 'Final conversion push' },
];

const PRESETS = [
  { primary: '#8B5CF6', secondary: '#06B6D4', label: 'Violet / Cyan' },
  { primary: '#F59E0B', secondary: '#EF4444', label: 'Amber / Red' },
  { primary: '#10B981', secondary: '#3B82F6', label: 'Emerald / Blue' },
  { primary: '#EC4899', secondary: '#8B5CF6', label: 'Pink / Violet' },
  { primary: '#F97316', secondary: '#FBBF24', label: 'Orange / Gold' },
  { primary: '#14B8A6', secondary: '#6366F1', label: 'Teal / Indigo' },
];

export default function UserLandingPageCanvas() {
  const { id } = useParams();
  const navigate = useNavigate();
  const iframeRef = useRef(null);

  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [viewport, setViewport] = useState('desktop');
  const [sectionOpen, setSectionOpen] = useState(true);
  const [brandOpen, setBrandOpen] = useState(false);
  const [promptOpen, setPromptOpen] = useState(true);
  const [toast, setToast] = useState(null);
  const [funnelOpen, setFunnelOpen] = useState(false);
  const [emailLists, setEmailLists] = useState([]);
  const [allPages, setAllPages] = useState([]);
  const [savingFunnel, setSavingFunnel] = useState(false);
  const [funnelEmailListId, setFunnelEmailListId] = useState(null);
  const [funnelNextPageId, setFunnelNextPageId] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorHtml, setEditorHtml] = useState('');
  const [savingEditor, setSavingEditor] = useState(false);

  const [prompt, setPrompt] = useState('');
  const [pageType, setPageType] = useState('affiliate');
  const [primaryColor, setPrimaryColor] = useState('#8B5CF6');
  const [secondaryColor, setSecondaryColor] = useState('#06B6D4');
  const [enabledSections, setEnabledSections] = useState(
    Object.fromEntries(SECTIONS.map(s => [s.id, true]))
  );

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function loadPage() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/landing-pages/${id}`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPage(data);
      if (data.htmlContent && iframeRef.current) {
        iframeRef.current.srcdoc = data.htmlContent;
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadPage(); }, [id]);

  useEffect(() => {
    if (page?.htmlContent && iframeRef.current) {
      iframeRef.current.srcdoc = page.htmlContent;
    }
  }, [page?.htmlContent]);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`${API}/landing-pages/email-lists`, { headers: authHeaders() }).then(r => r.ok ? r.json() : []),
      fetch(`${API}/landing-pages`, { headers: authHeaders() }).then(r => r.ok ? r.json() : []),
    ]).then(([lists, pages]) => {
      setEmailLists(Array.isArray(lists) ? lists : []);
      setAllPages(Array.isArray(pages) ? pages.filter(p => p.id !== parseInt(id, 10)) : []);
    }).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (page) {
      setFunnelEmailListId(page.emailListId ?? null);
      setFunnelNextPageId(page.nextPageId ?? null);
      if (page.htmlContent && !editorHtml) setEditorHtml(page.htmlContent);
    }
  }, [page?.emailListId, page?.nextPageId, page?.id]);

  function buildPromptWithSections() {
    const active = SECTIONS.filter(s => enabledSections[s.id]).map(s => s.label);
    const sectionNote = active.length > 0
      ? `\n\nInclude these sections in order: ${active.join(', ')}.`
      : '';
    return prompt + sectionNote;
  }

  async function handleGenerate() {
    if (!prompt.trim()) {
      showToast('Please describe your business or page goal first.', 'error');
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch(`${API}/landing-pages/generate`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          pageId: parseInt(id, 10),
          prompt: buildPromptWithSections(),
          pageType,
          brandColors: { primary: primaryColor, secondary: secondaryColor },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      const updated = await res.json();
      setPage(updated);
      showToast('Page generated! ✨ Looking great.');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`${API}/landing-pages/${id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ htmlContent: page?.htmlContent }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = await res.json();
      setPage(updated);
      showToast('Saved!');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handlePublishToggle() {
    setPublishing(true);
    try {
      const res = await fetch(`${API}/landing-pages/${id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ isPublished: !page?.isPublished }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = await res.json();
      setPage(updated);
      showToast(updated.isPublished ? 'Page published! 🎉' : 'Page unpublished.');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setPublishing(false);
    }
  }

  function handleCopyLink() {
    const url = page?.publicUrl
      ? `${window.location.origin}${page.publicUrl}`
      : `${window.location.origin}/api/pages/${page?.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSaveHtml() {
    setSavingEditor(true);
    try {
      const res = await fetch(`${API}/landing-pages/${id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ htmlContent: editorHtml }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = await res.json();
      setPage(updated);
      if (iframeRef.current) iframeRef.current.srcdoc = editorHtml;
      showToast('Page saved!');
    } catch (e) {
      showToast(e.message, 'error');
    } finally { setSavingEditor(false); }
  }

  async function handleSaveFunnelSettings() {
    setSavingFunnel(true);
    try {
      const body = {
        emailListId: funnelEmailListId ?? null,
        nextPageId: funnelNextPageId ?? null,
      };
      const res = await fetch(`${API}/landing-pages/${id}`, {
        method: 'PATCH', headers: authHeaders(), body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = await res.json();
      setPage(updated);
      showToast('Funnel settings saved!');
    } catch (e) {
      showToast(e.message, 'error');
    } finally { setSavingFunnel(false); }
  }

  function toggleSection(id) {
    setEnabledSections(prev => ({ ...prev, [id]: !prev[id] }));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center gap-3 text-white/50">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>Loading canvas…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 text-red-400">
        <AlertCircle className="w-10 h-10" />
        <p>{error}</p>
        <button onClick={() => navigate('/landing-pages')} className="text-sm text-white/60 hover:text-white">
          ← Back to Pages
        </button>
      </div>
    );
  }

  const hasContent = page?.htmlContent && page.htmlContent.length > 50;

  return (
    <AuthLayout>
    <div className="min-h-screen bg-[#050508] text-white flex flex-col overflow-hidden" style={{ fontFamily: "'Outfit', sans-serif" }}>

      {/* Top bar */}
      <div className="relative z-20 flex items-center justify-between px-4 py-3 border-b border-white/8 bg-black/60 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/landing-pages')}
            className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Pages
          </button>
          <span className="text-white/20">/</span>
          <div className="flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-medium text-white truncate max-w-48">{page?.title}</span>
          </div>
          {page?.isPublished && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              Live
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Viewport toggle */}
          <div className="flex gap-1 p-0.5 rounded-lg bg-white/5 border border-white/10">
            <button
              onClick={() => setViewport('desktop')}
              className={`p-1.5 rounded-md transition-colors ${viewport === 'desktop' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewport('mobile')}
              className={`p-1.5 rounded-md transition-colors ${viewport === 'mobile' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>

          {page?.isPublished && (
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-white/60 hover:text-white hover:border-white/20 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={saving || !hasContent}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-white/70 hover:text-white hover:border-white/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save
          </button>

          <button
            onClick={handlePublishToggle}
            disabled={publishing || !hasContent}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              page?.isPublished
                ? 'bg-white/10 text-white/70 hover:bg-white/15'
                : 'bg-gradient-to-r from-violet-600 to-cyan-600 text-white hover:from-violet-500 hover:to-cyan-500 shadow-lg shadow-violet-500/20'
            }`}
          >
            {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
            {page?.isPublished ? 'Unpublish' : 'Publish'}
          </button>
        </div>
      </div>

      {/* Main canvas area */}
      <div className="relative z-10 flex flex-1 overflow-hidden">

        {/* Left control panel */}
        <div className="w-80 shrink-0 border-r border-white/8 bg-black/40 backdrop-blur-lg flex flex-col overflow-y-auto">

          {/* AI Generator */}
          <div className="border-b border-white/8">
            <button
              onClick={() => setPromptOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-white/80 hover:text-white hover:bg-white/3 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-violet-400" />
                AI Generator
              </span>
              {promptOpen ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
            </button>
            {promptOpen && (
              <div className="px-4 pb-4 space-y-3">
                <div>
                  <label className="block text-xs text-white/40 mb-1.5">Describe your business / page goal</label>
                  <textarea
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="e.g. I sell AI automation courses for entrepreneurs. I want a high-converting sales page with a $997 offer..."
                    className="w-full bg-white/4 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 resize-none focus:outline-none focus:border-violet-500/50 transition-colors"
                    rows={4}
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1.5">Page Type</label>
                  <select
                    value={pageType}
                    onChange={e => setPageType(e.target.value)}
                    className="w-full bg-white/4 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-colors"
                  >
                    {PAGE_TYPES.map(pt => (
                      <option key={pt.value} value={pt.value} className="bg-gray-900">{pt.label}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={generating || !prompt.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white text-sm font-medium transition-all hover:from-violet-500 hover:to-cyan-500 shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      {hasContent ? 'Regenerate Page' : 'Generate Page'}
                    </>
                  )}
                </button>
                {hasContent && (
                  <p className="text-xs text-center text-white/30">
                    Regenerating will replace all current content
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Section controls */}
          <div className="border-b border-white/8">
            <button
              onClick={() => setSectionOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-white/80 hover:text-white hover:bg-white/3 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Layout className="w-4 h-4 text-cyan-400" />
                Canvas Sections
              </span>
              {sectionOpen ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
            </button>
            {sectionOpen && (
              <div className="px-4 pb-4 space-y-1.5">
                <p className="text-xs text-white/30 mb-2">Toggle which sections AI includes</p>
                {SECTIONS.map(s => {
                  const Icon = s.icon;
                  const on = enabledSections[s.id];
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleSection(s.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                        on
                          ? 'border-violet-500/30 bg-violet-500/8 text-white'
                          : 'border-white/6 bg-white/2 text-white/35 hover:text-white/60 hover:border-white/12'
                      }`}
                    >
                      <div className={`shrink-0 ${on ? 'text-violet-400' : 'text-white/20'}`}>
                        {on ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </div>
                      <Icon className={`w-4 h-4 shrink-0 ${on ? 'text-cyan-400' : 'text-white/20'}`} />
                      <div className="text-left">
                        <p className="text-xs font-medium leading-tight">{s.label}</p>
                        <p className="text-xs opacity-50 leading-tight">{s.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Brand colors */}
          <div className="border-b border-white/8">
            <button
              onClick={() => setBrandOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-white/80 hover:text-white hover:bg-white/3 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-amber-400" />
                Brand Colors
              </span>
              {brandOpen ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
            </button>
            {brandOpen && (
              <div className="px-4 pb-4 space-y-3">
                <div className="grid grid-cols-3 gap-1.5">
                  {PRESETS.map(p => (
                    <button
                      key={p.label}
                      onClick={() => { setPrimaryColor(p.primary); setSecondaryColor(p.secondary); }}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs transition-all ${
                        primaryColor === p.primary && secondaryColor === p.secondary
                          ? 'border-white/30 bg-white/8'
                          : 'border-white/6 bg-white/2 hover:border-white/15'
                      }`}
                    >
                      <div className="flex gap-0.5">
                        <div className="w-3 h-3 rounded-full" style={{ background: p.primary }} />
                        <div className="w-3 h-3 rounded-full" style={{ background: p.secondary }} />
                      </div>
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-white/40 mb-1">Primary</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={e => setPrimaryColor(e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                      />
                      <span className="text-xs font-mono text-white/50">{primaryColor}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 mb-1">Secondary</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={e => setSecondaryColor(e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                      />
                      <span className="text-xs font-mono text-white/50">{secondaryColor}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Funnel settings */}
          <div className="border-b border-white/8">
            <button
              onClick={() => setFunnelOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-white/80 hover:text-white hover:bg-white/3 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-rose-400" />
                Funnel Settings
                {page?.optins > 0 && (
                  <span className="text-xs bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded-full">
                    {page.optins} opt-ins
                  </span>
                )}
              </span>
              {funnelOpen ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
            </button>
            {funnelOpen && (
              <div className="px-4 pb-4 space-y-4">
                {/* Analytics mini row */}
                {page && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white/4 rounded-xl p-2.5 text-center">
                      <p className="text-lg font-mono font-bold text-white">{page.pageViews ?? 0}</p>
                      <p className="text-xs text-white/30 flex items-center justify-center gap-1 mt-0.5"><BarChart3 className="w-3 h-3"/>Views</p>
                    </div>
                    <div className="bg-white/4 rounded-xl p-2.5 text-center">
                      <p className="text-lg font-mono font-bold text-rose-300">{page.optins ?? 0}</p>
                      <p className="text-xs text-white/30 flex items-center justify-center gap-1 mt-0.5"><Mail className="w-3 h-3"/>Opt-ins</p>
                    </div>
                    <div className="bg-white/4 rounded-xl p-2.5 text-center">
                      <p className="text-lg font-mono font-bold text-emerald-300">
                        {page.pageViews > 0 ? `${((page.optins ?? 0) / page.pageViews * 100).toFixed(1)}%` : '—'}
                      </p>
                      <p className="text-xs text-white/30 flex items-center justify-center gap-1 mt-0.5"><TrendingUp className="w-3 h-3"/>CVR</p>
                    </div>
                  </div>
                )}

                {/* Public link */}
                {page?.isPublished && (page?.publicUrl ?? page?.slug) && (
                  <div>
                    <p className="text-xs text-white/40 mb-1.5">Public URL</p>
                    <div className="flex items-center gap-2 bg-white/4 rounded-xl px-3 py-2">
                      <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-xs text-white/50 font-mono truncate flex-1">
                        {page.publicUrl ?? `/api/pages/${page.slug}`}
                      </span>
                      <button
                        onClick={() => {
                          const url = page.publicUrl
                            ? `${window.location.origin}${page.publicUrl}`
                            : `${window.location.origin}/api/pages/${page.slug}`;
                          navigator.clipboard.writeText(url);
                          showToast('Copied!');
                        }}
                        className="shrink-0 text-white/30 hover:text-white/70 transition-colors"
                      ><Copy className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                )}

                {/* Email list */}
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3 h-3" /> Capture leads to Email List
                  </label>
                  <select
                    value={funnelEmailListId ?? ''}
                    onChange={e => setFunnelEmailListId(e.target.value ? parseInt(e.target.value, 10) : null)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/80 focus:outline-none focus:border-violet-500/50"
                  >
                    <option value="">— None —</option>
                    {emailLists.map(l => (
                      <option key={l.id} value={l.id}>{l.name} ({l.subscriberCount ?? 0} subs)</option>
                    ))}
                  </select>
                </div>

                {/* Next page */}
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 flex items-center gap-1.5">
                    <ArrowRight className="w-3 h-3" /> After submit, go to page
                  </label>
                  <select
                    value={funnelNextPageId ?? ''}
                    onChange={e => setFunnelNextPageId(e.target.value ? parseInt(e.target.value, 10) : null)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/80 focus:outline-none focus:border-violet-500/50"
                  >
                    <option value="">— Stay on page (show thank-you inline) —</option>
                    {allPages.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleSaveFunnelSettings}
                  disabled={savingFunnel}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium hover:bg-rose-500/25 transition-all disabled:opacity-50"
                >
                  {savingFunnel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save Funnel Settings
                </button>
              </div>
            )}
          </div>

          {/* HTML editor */}
          <div className="border-b border-white/8">
            <button
              onClick={() => { setEditorOpen(v => !v); if (!editorOpen && page?.htmlContent) setEditorHtml(page.htmlContent); }}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-white/80 hover:text-white hover:bg-white/3 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-indigo-400" />
                Edit HTML
              </span>
              {editorOpen ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
            </button>
            {editorOpen && (
              <div className="px-4 pb-4 space-y-3">
                <p className="text-xs text-white/30">Edit the page HTML directly. Changes update the live preview.</p>
                <textarea
                  value={editorHtml}
                  onChange={e => { setEditorHtml(e.target.value); if (iframeRef.current) iframeRef.current.srcdoc = e.target.value; }}
                  className="w-full h-64 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white/70 focus:outline-none focus:border-violet-500/50 resize-none"
                  placeholder="<!DOCTYPE html>..."
                  spellCheck={false}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveHtml}
                    disabled={savingEditor || !editorHtml}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-medium hover:bg-indigo-500/25 transition-all disabled:opacity-50"
                  >
                    {savingEditor ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save HTML
                  </button>
                  <button
                    onClick={() => { if (page?.htmlContent) { setEditorHtml(page.htmlContent); if (iframeRef.current) iframeRef.current.srcdoc = page.htmlContent; } }}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-white/10 text-white/40 hover:text-white/70 text-xs transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Reset
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Page stats */}
          {page && (
            <div className="px-4 py-3 space-y-2">
              <p className="text-xs text-white/30 uppercase tracking-wider">Page Info</p>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/40">Status</span>
                  <span className={page.isPublished ? 'text-emerald-400' : 'text-white/30'}>
                    {page.isPublished ? '🟢 Published' : '⚫ Draft'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Page Views</span>
                  <span className="text-white/70 font-mono">{page.pageViews ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Content Size</span>
                  <span className="text-white/70 font-mono">
                    {page.htmlContent ? `${(page.htmlContent.length / 1024).toFixed(1)} KB` : '—'}
                  </span>
                </div>
                {page.slug && (
                  <div className="flex justify-between items-center">
                    <span className="text-white/40">Slug</span>
                    <span className="text-white/50 font-mono truncate ml-2">/{page.slug}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Canvas Preview */}
        <div className="flex-1 flex flex-col bg-[#0a0a0f] overflow-hidden">

          {/* Preview toolbar */}
          <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-white/6 bg-black/30">
            <div className="flex items-center gap-2 text-xs text-white/30">
              <Eye className="w-3.5 h-3.5" />
              <span>Live Preview</span>
              {generating && (
                <span className="flex items-center gap-1 text-violet-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  AI is building your page…
                </span>
              )}
            </div>
            {hasContent && (
              <div className="flex items-center gap-2">
                {page?.isPublished && page?.publicUrl && (
                  <a
                    href={page.publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs text-emerald-400/70 hover:text-emerald-400 transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    Live URL
                  </a>
                )}
                <button
                  onClick={() => window.open(`/api/landing-pages/${id}/preview-html`, '_blank')}
                  className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Preview
                </button>
              </div>
            )}
          </div>

          {/* Iframe canvas */}
          <div className="flex-1 flex items-start justify-center p-4 overflow-auto">
            {!hasContent && !generating ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-6 min-h-64 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/15 to-cyan-500/15 border border-violet-500/20 flex items-center justify-center">
                  <Sparkles className="w-9 h-9 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Your canvas is empty</h3>
                  <p className="text-sm text-white/40 max-w-xs">
                    Describe your business in the left panel and click{' '}
                    <span className="text-violet-400">Generate Page</span> to create a professional landing page with AI.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 max-w-xs">
                  {['Hero', 'Features', 'Testimonials', 'Pricing', 'FAQ', 'CTA'].map(s => (
                    <div key={s} className="px-2 py-1.5 rounded-lg bg-white/4 border border-white/8 text-xs text-white/40 text-center">{s}</div>
                  ))}
                </div>
              </div>
            ) : generating ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 min-h-64">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
                  <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-violet-400" />
                </div>
                <div className="text-center">
                  <p className="text-white font-medium">ASH is designing your page…</p>
                  <p className="text-xs text-white/40 mt-1">This usually takes 15–30 seconds</p>
                </div>
                <div className="flex gap-1.5">
                  {['Crafting copy', 'Building layout', 'Styling sections', 'Optimizing for conversions'].map((s, i) => (
                    <div
                      key={s}
                      className="px-2 py-1 rounded-full text-xs bg-violet-500/10 text-violet-400 border border-violet-500/20 animate-pulse"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    >
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div
                className={`bg-white rounded-lg overflow-hidden shadow-2xl transition-all duration-300 ${
                  viewport === 'mobile' ? 'w-[390px]' : 'w-full max-w-5xl'
                }`}
                style={{ minHeight: '600px' }}
              >
                <iframe
                  ref={iframeRef}
                  srcDoc={page?.htmlContent ?? ''}
                  className="w-full border-0"
                  style={{ height: '80vh', minHeight: '600px' }}
                  title="Landing Page Canvas Preview"
                  sandbox="allow-same-origin allow-scripts"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium transition-all ${
          toast.type === 'error'
            ? 'bg-red-500/90 text-white border border-red-400/30'
            : 'bg-emerald-500/90 text-white border border-emerald-400/30'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </div>
    </AuthLayout>
  );
}
