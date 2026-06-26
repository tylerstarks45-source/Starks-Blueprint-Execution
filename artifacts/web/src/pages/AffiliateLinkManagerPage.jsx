import { useState, useEffect } from 'react';

import AuthLayout from '@/components/AuthLayout.jsx';
import {
  Link2, Plus, Copy, Check, ExternalLink, Trash2, Edit2, BarChart3,
  Tag, Globe, AlertCircle, RefreshCw, Search, Filter, TrendingUp, Zap,
  X, ChevronDown, Code2, Percent, DollarSign, MousePointerClick, ShoppingCart
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

const CATEGORIES = ['All', 'Email', 'Tools', 'Courses', 'Social', 'E-commerce', 'Finance', 'Other'];

function fmtCents(cents) {
  if (!cents) return '$0';
  const d = cents / 100;
  if (d >= 1000) return `$${(d / 1000).toFixed(1)}k`;
  return `$${d.toFixed(2)}`;
}

function TrackingPixelDrawer({ link, onClose }) {
  const [copied, setCopied] = useState(null);
  const origin = window.location.origin;
  const conversionUrl = `${origin}/api/affiliate/${link.id}/conversion`;

  const jsPixel = `<!-- Affiliate Conversion Pixel: ${link.name} -->
<script>
(function() {
  var params = { amount: 0, currency: 'usd', orderId: '' };
  // Set amount and orderId from your checkout system before firing
  fetch('${conversionUrl}', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
})();
</script>`;

  const imgPixel = `<img src="${conversionUrl}?amount=0&currency=usd" width="1" height="1" style="display:none" alt="" />`;
  const postbackUrl = `${conversionUrl}?amount={AMOUNT}&currency={CURRENCY}&orderId={ORDER_ID}`;

  function copy(text, id) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  const CopyBtn = ({ text, id }) => (
    <button onClick={() => copy(text, id)} className="shrink-0 w-6 h-6 rounded flex items-center justify-center text-white/25 hover:text-white/60 transition-colors">
      {copied === id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );

  const NETWORKS = [
    { name: 'ShareASale', instruction: 'Go to Merchant > Links > Pixel Setup. Paste the Postback URL under "Server-to-Server Postback".' },
    { name: 'CJ Affiliate', instruction: 'In Account Manager > Programs > Integration. Add the Postback URL to your conversion pixel settings.' },
    { name: 'ClickBank', instruction: 'In Vendor Settings > My Site > IPN Settings. Set the URL to the Postback URL above.' },
    { name: 'Direct / Custom', instruction: 'Fire the JS Pixel on your order confirmation page, or call the Postback URL from your server with {AMOUNT} and {ORDER_ID} replaced.' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-xl rounded-2xl border border-white/12 bg-[#0d0d0d] shadow-2xl max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-white/8 flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-violet-500/12 border border-violet-500/20 flex items-center justify-center">
            <Code2 className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Tracking Setup</h2>
            <p className="text-[10px] text-white/35 font-mono truncate">{link.name}</p>
          </div>
          <button onClick={onClose} className="ml-auto w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/30 hover:text-white transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin">
          {/* Postback URL */}
          <div>
            <p className="text-[10px] font-mono font-bold text-violet-400/70 uppercase tracking-widest mb-2">Server Postback URL</p>
            <div className="flex items-start gap-2 p-3 rounded-xl bg-violet-500/5 border border-violet-500/15">
              <code className="text-[10px] font-mono text-white/55 flex-1 break-all leading-relaxed">{postbackUrl}</code>
              <CopyBtn text={postbackUrl} id="postback" />
            </div>
            <p className="text-[10px] text-white/25 mt-1 font-mono">Replace {'{AMOUNT}'}, {'{CURRENCY}'}, {'{ORDER_ID}'} with real values</p>
          </div>

          {/* JS Pixel */}
          <div>
            <p className="text-[10px] font-mono font-bold text-sky-400/70 uppercase tracking-widest mb-2">JavaScript Pixel</p>
            <div className="relative">
              <pre className="text-[9.5px] font-mono text-white/45 p-3 rounded-xl bg-sky-500/5 border border-sky-500/15 overflow-x-auto whitespace-pre-wrap leading-relaxed">{jsPixel}</pre>
              <div className="absolute top-2 right-2">
                <CopyBtn text={jsPixel} id="jspixel" />
              </div>
            </div>
          </div>

          {/* Image pixel */}
          <div>
            <p className="text-[10px] font-mono font-bold text-emerald-400/70 uppercase tracking-widest mb-2">1×1 Image Pixel (simple)</p>
            <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
              <code className="text-[10px] font-mono text-white/55 flex-1 break-all leading-relaxed">{imgPixel}</code>
              <CopyBtn text={imgPixel} id="imgpixel" />
            </div>
          </div>

          {/* Network instructions */}
          <div>
            <p className="text-[10px] font-mono font-bold text-white/35 uppercase tracking-widest mb-3">Setup by Network</p>
            <div className="space-y-2">
              {NETWORKS.map(n => (
                <div key={n.name} className="p-3 rounded-xl bg-white/2 border border-white/8">
                  <p className="text-[11px] font-bold text-white/65 mb-1">{n.name}</p>
                  <p className="text-[10px] text-white/35 leading-relaxed font-mono">{n.instruction}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LinkCard({ link, onDelete, onEdit, copied, onCopy, onTrackingSetup }) {
  const cloakedUrl = `${window.location.origin}/api/go/${link.cloakedSlug}`;
  const clicks = link.clickCount || 0;
  const conversions = link.conversionCount || 0;
  const convRate = clicks > 0 ? ((conversions / clicks) * 100).toFixed(1) : '0.0';
  const earned = link.earnedCents || 0;

  return (
    <div className={`rounded-xl border bg-white/2 p-4 transition-all hover:border-white/15 ${link.isActive ? 'border-white/8' : 'border-white/4 opacity-60'}`}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/15 flex items-center justify-center shrink-0">
          <Link2 className="w-4 h-4 text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-white/85">{link.name}</h3>
              {link.description && <p className="text-[10px] text-white/35 mt-0.5 line-clamp-1">{link.description}</p>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {link.category && (
                <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-mono text-white/35">{link.category}</span>
              )}
              <button onClick={() => onTrackingSetup(link)} className="w-7 h-7 rounded-lg bg-violet-500/8 hover:bg-violet-500/15 border border-violet-500/15 flex items-center justify-center transition-colors" title="Tracking Setup">
                <Code2 className="w-3 h-3 text-violet-400/60 hover:text-violet-400" />
              </button>
              <button onClick={() => onEdit(link)} className="w-7 h-7 rounded-lg bg-white/3 hover:bg-white/8 flex items-center justify-center transition-colors">
                <Edit2 className="w-3 h-3 text-white/35" />
              </button>
              <button onClick={() => onDelete(link)} className="w-7 h-7 rounded-lg bg-white/3 hover:bg-red-500/10 flex items-center justify-center transition-colors group">
                <Trash2 className="w-3 h-3 text-white/35 group-hover:text-red-400/70" />
              </button>
            </div>
          </div>

          <div className="mt-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono text-white/25 w-14 shrink-0">Cloaked</span>
              <div className="flex-1 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                <Globe className="w-3 h-3 text-emerald-400/60 shrink-0" />
                <span className="text-[10px] font-mono text-emerald-400/70 truncate flex-1">{cloakedUrl}</span>
                <button onClick={() => onCopy(cloakedUrl, `${link.id}-c`)} className="shrink-0 text-white/20 hover:text-emerald-400 transition-colors">
                  {copied === `${link.id}-c` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono text-white/25 w-14 shrink-0">Actual</span>
              <div className="flex-1 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/3 border border-white/8">
                <span className="text-[10px] font-mono text-white/30 truncate flex-1">{link.url}</span>
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-white/20 hover:text-violet-400 transition-colors">
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Conversion Funnel */}
          <div className="mt-3 grid grid-cols-4 gap-2">
            {[
              { label: 'Clicks', value: clicks.toLocaleString(), icon: MousePointerClick, color: 'text-sky-400' },
              { label: 'Conversions', value: conversions.toLocaleString(), icon: ShoppingCart, color: 'text-emerald-400' },
              { label: 'Conv. Rate', value: `${convRate}%`, icon: Percent, color: conversions > 0 ? 'text-amber-400' : 'text-white/20' },
              { label: 'Earned', value: fmtCents(earned), icon: DollarSign, color: earned > 0 ? 'text-emerald-400' : 'text-white/20' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="rounded-lg bg-white/3 border border-white/6 p-2 text-center">
                <Icon className={`w-2.5 h-2.5 mx-auto mb-0.5 ${color}`} />
                <p className={`text-[11px] font-bold font-mono ${color}`}>{value}</p>
                <p className="text-[8px] text-white/25 font-mono">{label}</p>
              </div>
            ))}
          </div>

          <div className="mt-2.5 flex items-center gap-4 text-[10px] font-mono text-white/30">
            <span>{new Date(link.createdAt).toLocaleDateString()}</span>
            <span className={link.isActive ? 'text-emerald-400/60' : 'text-red-400/50'}>{link.isActive ? '● Active' : '○ Inactive'}</span>
            {link.systemInstanceId && <span className="text-violet-400/50">● System #{link.systemInstanceId}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function LinkModal({ link, onClose, onSave }) {
  const isEdit = !!link;
  const [form, setForm] = useState({
    name: link?.name ?? '',
    url: link?.url ?? '',
    cloakedSlug: link?.cloakedSlug ?? '',
    description: link?.description ?? '',
    category: link?.category ?? '',
    isActive: link?.isActive ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const api = useApi();

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const body = { ...form };
      if (!form.cloakedSlug) delete body.cloakedSlug;
      if (!form.description) delete body.description;
      if (!form.category) delete body.category;
      const result = isEdit
        ? await api.patch(`/user-affiliate-links/${link.id}`, body)
        : await api.post('/user-affiliate-links', body);
      if (result.error) { setError(result.error); return; }
      onSave(result);
    } catch { setError('Failed to save link'); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/12 bg-[#0d0d0d] shadow-2xl">
        <div className="p-5 border-b border-white/8">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Link2 className="w-4 h-4 text-violet-400" />
            {isEdit ? 'Edit Affiliate Link' : 'Add Affiliate Link'}
          </h2>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3.5">
          {error && <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/8 border border-red-500/20 text-[11px] text-red-400"><AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}</div>}
          {[
            { label: 'Name *', key: 'name', placeholder: 'Beehiiv Newsletter Tool' },
            { label: 'Affiliate URL *', key: 'url', placeholder: 'https://beehiiv.com/?via=yourcode', type: 'url' },
            { label: 'Custom Slug', key: 'cloakedSlug', placeholder: 'beehiiv (auto-generated if empty)', mono: true },
            { label: 'Description', key: 'description', placeholder: 'Email newsletter platform' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-[11px] font-mono text-white/45 mb-1.5">{f.label}</label>
              <input
                value={form[f.key]} onChange={e => setForm(x => ({ ...x, [f.key]: e.target.value }))}
                type={f.type ?? 'text'}
                className={`w-full h-9 px-3 rounded-lg bg-white/5 border border-white/12 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 transition-colors ${f.mono ? 'font-mono' : ''}`}
                placeholder={f.placeholder}
                required={f.label.includes('*')}
              />
            </div>
          ))}
          <div>
            <label className="block text-[11px] font-mono text-white/45 mb-1.5">Category</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full h-9 px-3 rounded-lg bg-white/5 border border-white/12 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-colors">
              <option value="" className="bg-[#111]">None</option>
              {CATEGORIES.slice(1).map(c => <option key={c} value={c} className="bg-[#111]">{c}</option>)}
            </select>
          </div>
          {isEdit && (
            <label className="flex items-center gap-2.5 cursor-pointer">
              <div className={`w-8 h-4.5 rounded-full transition-colors ${form.isActive ? 'bg-emerald-500' : 'bg-white/15'}`}
                onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}>
                <div className={`w-3.5 h-3.5 mt-0.5 rounded-full bg-white transition-transform ${form.isActive ? 'translate-x-4 ml-0.5' : 'translate-x-0.5 ml-0'}`} />
              </div>
              <span className="text-[11px] font-mono text-white/45">{form.isActive ? 'Active' : 'Inactive'}</span>
            </label>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-9 rounded-lg bg-white/5 text-white/50 hover:text-white text-sm transition-colors">Cancel</button>
            <button type="submit" disabled={loading || !form.name || !form.url}
              className="flex-1 h-9 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Saving...</> : isEdit ? 'Save Changes' : 'Add Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AffiliateLinkManagerPage() {
  const api = useApi();

  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editLink, setEditLink] = useState(null);
  const [copied, setCopied] = useState(null);
  const [trackingLink, setTrackingLink] = useState(null);

  useEffect(() => { fetchLinks(); }, []);

  async function fetchLinks() {
    setLoading(true);
    try {
      const data = await api.get('/user-affiliate-links');
      if (Array.isArray(data)) setLinks(data);
    } finally { setLoading(false); }
  }

  async function handleDelete(link) {
    if (!confirm(`Delete "${link.name}"?`)) return;
    await api.del(`/user-affiliate-links/${link.id}`);
    setLinks(ls => ls.filter(l => l.id !== link.id));
  }

  function handleCopy(url, id) {
    navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  const filtered = links.filter(l => {
    const matchSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.url.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'All' || l.category === category;
    return matchSearch && matchCat;
  });

  const totalClicks = links.reduce((a, l) => a + (l.clickCount || 0), 0);
  const totalConversions = links.reduce((a, l) => a + (l.conversionCount || 0), 0);
  const totalEarned = links.reduce((a, l) => a + (l.earnedCents || 0), 0);

  return (
    <AuthLayout>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24">

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs text-violet-400 font-mono font-semibold mb-5">
            <Link2 className="w-3 h-3" /> AFFILIATE LINK MANAGER
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Your Affiliate Links</h1>
          <p className="text-white/50 text-base max-w-2xl mx-auto leading-relaxed">
            Add your affiliate links once. ASH automatically uses them when building landing pages and systems. Each link gets a clean cloaked URL, conversion tracking pixel, and funnel analytics.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Links', value: links.length, color: 'text-violet-400' },
            { label: 'Active', value: links.filter(l => l.isActive).length, color: 'text-emerald-400' },
            { label: 'Total Clicks', value: totalClicks.toLocaleString(), color: 'text-sky-400' },
            { label: 'Conversions', value: totalConversions.toLocaleString(), color: 'text-amber-400' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-white/8 bg-white/2 p-4 text-center">
              <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-white/35 font-mono mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {totalEarned > 0 && (
          <div className="mb-6 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-emerald-300">Total Affiliate Earnings Tracked</p>
              <p className="text-[10px] text-white/40 font-mono">From conversion pixels fired by your affiliate networks</p>
            </div>
            <p className="ml-auto text-xl font-black font-mono text-emerald-400">{fmtCents(totalEarned)}</p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet-500/40 transition-colors"
              placeholder="Search links..." />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={`h-8 px-3 rounded-lg text-[11px] font-mono transition-all ${category === c ? 'bg-violet-600/20 border border-violet-500/30 text-violet-400' : 'bg-white/4 border border-white/8 text-white/40 hover:text-white'}`}>
                {c}
              </button>
            ))}
          </div>
          <button onClick={() => { setEditLink(null); setShowModal(true); }}
            className="flex items-center gap-2 h-9 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors shrink-0">
            <Plus className="w-4 h-4" /> Add Link
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-36 rounded-xl bg-white/3 border border-white/6 animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Link2 className="w-10 h-10 text-white/12" />
            <h3 className="text-base font-semibold text-white/35">{links.length === 0 ? 'No affiliate links yet' : 'No links match your filter'}</h3>
            <p className="text-sm text-white/22 text-center max-w-sm font-mono">
              {links.length === 0 ? 'Add your first affiliate link. ASH will use them automatically when building your landing pages.' : 'Try clearing the search or category filter.'}
            </p>
            {links.length === 0 && (
              <button onClick={() => { setEditLink(null); setShowModal(true); }}
                className="flex items-center gap-2 h-9 px-5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors mt-2">
                <Plus className="w-4 h-4" /> Add First Link
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(link => (
              <LinkCard key={link.id} link={link}
                onDelete={handleDelete}
                onEdit={l => { setEditLink(l); setShowModal(true); }}
                copied={copied}
                onCopy={handleCopy}
                onTrackingSetup={l => setTrackingLink(l)}
              />
            ))}
          </div>
        )}
      </main>
      {showModal && (
        <LinkModal
          link={editLink}
          onClose={() => { setShowModal(false); setEditLink(null); }}
          onSave={result => {
            if (editLink) setLinks(ls => ls.map(l => l.id === result.id ? result : l));
            else setLinks(ls => [result, ...ls]);
            setShowModal(false); setEditLink(null);
          }}
        />
      )}
      {trackingLink && (
        <TrackingPixelDrawer link={trackingLink} onClose={() => setTrackingLink(null)} />
      )}
    </AuthLayout>
  );
}
