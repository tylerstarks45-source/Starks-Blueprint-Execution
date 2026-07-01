import React, { useEffect, useState, useCallback } from 'react';
import AuthLayout from '@/components/AuthLayout.jsx';
import { Helmet } from 'react-helmet';
import { toast } from 'sonner';
import {
  Globe2, Search, Loader2, CheckCircle2, XCircle, ShieldAlert,
  Trash2, Link2, Unlink, RefreshCw, ExternalLink, Sparkles,
} from 'lucide-react';

const API = '/api';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
};

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const EMPTY_REGISTRANT = {
  firstName: '', lastName: '', email: '', address1: '',
  city: '', stateProvince: '', postalCode: '', country: 'US', phone: '',
};

function PurchaseModal({ domain, price, onClose, onPurchased }) {
  const [registrant, setRegistrant] = useState(EMPTY_REGISTRANT);
  const [years, setYears] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const set = (key) => (e) => setRegistrant((r) => ({ ...r, [key]: e.target.value }));

  const submit = async () => {
    const required = ['firstName', 'lastName', 'email', 'address1', 'city', 'stateProvince', 'postalCode', 'phone'];
    const missing = required.filter((k) => !registrant[k]?.trim());
    if (missing.length) {
      toast.error('Please fill in all registrant fields');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/domains/purchase`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ domain, years, registrant }),
      });
      const data = await res.json();
      if (res.ok && data?.domain) {
        toast.success(`${domain} purchased!`);
        onPurchased(data);
        onClose();
      } else if (data?.success === false) {
        toast.error(data.message || 'Domain purchasing is not enabled yet.');
      } else {
        toast.error(data?.error || 'Purchase failed');
      }
    } catch {
      toast.error('Purchase failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0b0b0f] p-6 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white font-mono">Register {domain}</h3>
          <span className="text-sm text-emerald-400 font-mono">${price?.toFixed?.(2) ?? price}</span>
        </div>
        <p className="text-xs text-white/40">Registrant details are required by ICANN for domain registration.</p>

        <div className="grid grid-cols-2 gap-3">
          <input placeholder="First name" value={registrant.firstName} onChange={set('firstName')}
            className="bg-white/4 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder:text-white/25 focus:outline-none focus:border-primary/40" />
          <input placeholder="Last name" value={registrant.lastName} onChange={set('lastName')}
            className="bg-white/4 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder:text-white/25 focus:outline-none focus:border-primary/40" />
        </div>
        <input placeholder="Email" type="email" value={registrant.email} onChange={set('email')}
          className="w-full bg-white/4 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder:text-white/25 focus:outline-none focus:border-primary/40" />
        <input placeholder="Address" value={registrant.address1} onChange={set('address1')}
          className="w-full bg-white/4 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder:text-white/25 focus:outline-none focus:border-primary/40" />
        <div className="grid grid-cols-3 gap-3">
          <input placeholder="City" value={registrant.city} onChange={set('city')}
            className="bg-white/4 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder:text-white/25 focus:outline-none focus:border-primary/40" />
          <input placeholder="State" value={registrant.stateProvince} onChange={set('stateProvince')}
            className="bg-white/4 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder:text-white/25 focus:outline-none focus:border-primary/40" />
          <input placeholder="Postal code" value={registrant.postalCode} onChange={set('postalCode')}
            className="bg-white/4 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder:text-white/25 focus:outline-none focus:border-primary/40" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Phone" value={registrant.phone} onChange={set('phone')}
            className="bg-white/4 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder:text-white/25 focus:outline-none focus:border-primary/40" />
          <select value={years} onChange={(e) => setYears(Number(e.target.value))}
            className="bg-white/4 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-primary/40">
            {[1, 2, 3, 5, 10].map((y) => <option key={y} value={y}>{y} year{y > 1 ? 's' : ''}</option>)}
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 text-sm font-semibold hover:bg-white/5 transition-all">
            Cancel
          </button>
          <button onClick={submit} disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary text-sm font-bold transition-all disabled:opacity-40">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Complete Purchase
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DomainsPage() {
  const [status, setStatus] = useState(null);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState(null);
  const [searchMeta, setSearchMeta] = useState(null);
  const [myDomains, setMyDomains] = useState([]);
  const [loadingDomains, setLoadingDomains] = useState(true);
  const [purchaseTarget, setPurchaseTarget] = useState(null);
  const [landingPages, setLandingPages] = useState([]);
  const [verifying, setVerifying] = useState(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API}/domains/status`, { headers: authHeaders() });
      setStatus(await res.json());
    } catch {
      setStatus({ configured: false, message: 'Unable to reach the domains service.' });
    }
  }, []);

  const loadDomains = useCallback(async () => {
    setLoadingDomains(true);
    try {
      const res = await fetch(`${API}/domains`, { headers: authHeaders() });
      setMyDomains(res.ok ? await res.json() : []);
    } catch {
      setMyDomains([]);
    } finally {
      setLoadingDomains(false);
    }
  }, []);

  const loadLandingPages = useCallback(async () => {
    try {
      const res = await fetch(`${API}/landing-pages`, { headers: authHeaders() });
      setLandingPages(res.ok ? await res.json() : []);
    } catch {
      setLandingPages([]);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    loadDomains();
    loadLandingPages();
  }, [loadStatus, loadDomains, loadLandingPages]);

  const runSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setResults(null);
    try {
      const res = await fetch(`${API}/domains/search`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();
      setResults(data.results || []);
      setSearchMeta(data);
    } catch {
      toast.error('Domain search failed');
    } finally {
      setSearching(false);
    }
  };

  const linkDomain = async (domainId, pageId) => {
    try {
      const res = await fetch(`${API}/domains/${domainId}/link`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ pageId }),
      });
      if (res.ok) {
        toast.success(pageId ? 'Domain linked' : 'Domain unlinked');
        loadDomains();
      } else {
        toast.error('Failed to update link');
      }
    } catch {
      toast.error('Failed to update link');
    }
  };

  const verifyDns = async (domainId) => {
    setVerifying(domainId);
    try {
      const res = await fetch(`${API}/domains/${domainId}/verify-dns`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.verified) toast.success('DNS verified!');
      else toast.error('DNS not yet pointing to your platform. Check back after propagation.');
      loadDomains();
    } catch {
      toast.error('DNS verification failed');
    } finally {
      setVerifying(null);
    }
  };

  const deleteDomain = async (domainId, domainName) => {
    if (!window.confirm(`Remove ${domainName} from your account? This does not cancel the registration.`)) return;
    try {
      const res = await fetch(`${API}/domains/${domainId}`, { method: 'DELETE', headers: authHeaders() });
      if (res.ok || res.status === 204) {
        toast.success('Domain removed');
        loadDomains();
      } else {
        toast.error('Failed to remove domain');
      }
    } catch {
      toast.error('Failed to remove domain');
    }
  };

  const notConfigured = status && status.configured === false;

  return (
    <AuthLayout>
      <Helmet><title>Domains | Starks Global Group</title></Helmet>
      <div className="min-h-screen bg-[#050507]">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="mb-8 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Globe2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white font-mono tracking-tight">Domains</h1>
              <p className="text-sm text-white/40">Search, register, and connect custom domains to your landing pages.</p>
            </div>
          </div>

          {notConfigured && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3">
              <ShieldAlert className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-amber-300 font-semibold">Domain registration isn't fully activated yet</p>
                <p className="text-xs text-amber-300/70 mt-0.5">{status?.message} You can still search availability below — purchasing will be enabled once Namecheap credentials are configured.</p>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 mb-8">
            <label className="text-xs font-mono text-white/35 uppercase tracking-widest mb-2 block">Find a domain</label>
            <div className="flex gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && runSearch()}
                placeholder="yourbusinessname"
                className="flex-1 bg-white/4 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/80 placeholder:text-white/25 focus:outline-none focus:border-primary/40 font-mono"
              />
              <button
                onClick={runSearch}
                disabled={searching || !query.trim()}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary font-bold text-sm transition-all disabled:opacity-40"
              >
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Search
              </button>
            </div>

            {results && (
              <div className="mt-5 grid sm:grid-cols-2 gap-2.5">
                {results.map((r) => (
                  <div key={r.domain} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/4 border border-white/8">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {r.available ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-white/25 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white/80 truncate">{r.domain}</p>
                        {r.available && (
                          <p className="text-xs text-white/35">
                            {r.premium ? 'Premium · ' : ''}{r.price != null ? `$${Number(r.price).toFixed(2)}/yr` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    {r.available ? (
                      <button
                        onClick={() => (notConfigured
                          ? toast.error('Domain purchasing is not enabled yet. Contact support to activate it.')
                          : setPurchaseTarget(r))}
                        className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/25 text-emerald-300 text-xs font-bold transition-all"
                      >
                        Register
                      </button>
                    ) : (
                      <span className="shrink-0 text-xs text-white/25 font-mono">Taken</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* My domains */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-mono uppercase tracking-widest text-white/35">My Domains</h2>
            <button onClick={loadDomains} className="text-white/30 hover:text-white/60 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {loadingDomains ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-white/30" />
            </div>
          ) : myDomains.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 py-14 text-center">
              <Sparkles className="w-6 h-6 text-white/20 mx-auto mb-3" />
              <p className="text-sm text-white/35">No domains yet. Search above to register your first one.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {myDomains.map((d) => (
                <div key={d.id} className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3.5">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white/85 font-mono">{d.domain}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${
                          d.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/8 text-white/40'
                        }`}>
                          {d.status}
                        </span>
                        {d.dnsVerified && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide bg-cyan-500/15 text-cyan-300">
                            DNS verified
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/35 mt-1">
                        Expires {formatDate(d.expiresAt)}
                        {d.linkedPageTitle ? ` · Linked to "${d.linkedPageTitle}"` : ' · Not linked to a page'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={d.linkedPageId ?? ''}
                        onChange={(e) => linkDomain(d.id, e.target.value ? Number(e.target.value) : null)}
                        className="bg-white/4 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/60 focus:outline-none focus:border-primary/40 max-w-[160px]"
                      >
                        <option value="">Not linked</option>
                        {landingPages.map((p) => (
                          <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                      </select>
                      {d.linkedPageId && (
                        <button
                          onClick={() => verifyDns(d.id)}
                          disabled={verifying === d.id}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-300 text-xs font-semibold transition-all disabled:opacity-40"
                        >
                          {verifying === d.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />}
                          Verify DNS
                        </button>
                      )}
                      <button
                        onClick={() => deleteDomain(d.id, d.domain)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/25 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 flex items-center gap-2 text-xs text-white/25">
            <ExternalLink className="w-3 h-3" />
            <span>Domains registered through Namecheap. DNS points to your Starks Global Group landing pages automatically.</span>
          </div>
        </div>
      </div>

      {purchaseTarget && (
        <PurchaseModal
          domain={purchaseTarget.domain}
          price={purchaseTarget.price}
          onClose={() => setPurchaseTarget(null)}
          onPurchased={() => { loadDomains(); }}
        />
      )}
    </AuthLayout>
  );
}
