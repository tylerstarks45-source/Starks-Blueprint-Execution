import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
};

// ─── SERVICE DEFINITIONS ─────────────────────────────────────────────────────

const SERVICES = [
  {
    key: 'OPENROUTER_API_KEY',
    name: 'OpenRouter',
    label: 'API Key',
    description: 'Powers the STARK AI agent. Required for all blueprint execution.',
    icon: '🤖',
    accent: 'blue',
    placeholder: 'sk-or-v1-…',
    docsUrl: 'https://openrouter.ai/keys',
  },
  {
    key: 'STRIPE_SECRET_KEY',
    name: 'Stripe',
    label: 'Secret Key',
    description: 'Payment processing for e-commerce and subscription blueprints.',
    icon: '💳',
    accent: 'violet',
    placeholder: 'sk_live_…',
    docsUrl: 'https://dashboard.stripe.com/apikeys',
  },
  {
    key: 'RESEND_API_KEY',
    name: 'Resend',
    label: 'API Key',
    description: 'Transactional email for lead-nurture and drip campaign blueprints.',
    icon: '📧',
    accent: 'orange',
    placeholder: 're_…',
    docsUrl: 'https://resend.com/api-keys',
  },
  {
    key: 'TIKTOK_ACCESS_TOKEN',
    name: 'TikTok',
    label: 'Access Token',
    description: 'Content automation and analytics for TikTok growth blueprints.',
    icon: '🎵',
    accent: 'pink',
    placeholder: 'Access token…',
    docsUrl: 'https://developers.tiktok.com/',
  },
  {
    key: 'META_ACCESS_TOKEN',
    name: 'Meta',
    label: 'Access Token',
    description: 'Facebook & Instagram automation for social media blueprints.',
    icon: '👥',
    accent: 'blue',
    placeholder: 'EAAr…',
    docsUrl: 'https://developers.facebook.com/tools/accesstoken/',
  },
  {
    key: 'YOUTUBE_API_KEY',
    name: 'YouTube',
    label: 'API Key',
    description: 'YouTube Data API for content and channel management blueprints.',
    icon: '▶',
    accent: 'red',
    placeholder: 'AIza…',
    docsUrl: 'https://console.developers.google.com/',
  },
  {
    key: 'SHOPIFY_API_KEY',
    name: 'Shopify',
    label: 'API Key',
    description: 'Store management and dropshipping blueprint automation.',
    icon: '🛍',
    accent: 'emerald',
    placeholder: 'shpat_…',
    docsUrl: 'https://admin.shopify.com/store/apps/private',
  },
  {
    key: 'GMAIL_REFRESH_TOKEN',
    name: 'Gmail',
    label: 'Refresh Token',
    description: 'Gmail API access for email outreach and cold-email blueprints.',
    icon: '✉',
    accent: 'red',
    placeholder: '1//…',
    docsUrl: 'https://developers.google.com/oauthplayground',
  },
  {
    key: 'CLOUDFLARE_API_KEY',
    name: 'Cloudflare',
    label: 'API Key',
    description: 'DNS, Workers, and CDN configuration for deployment blueprints.',
    icon: '☁',
    accent: 'amber',
    placeholder: 'Global API Key…',
    docsUrl: 'https://dash.cloudflare.com/profile/api-tokens',
  },
];

// ─── ACCENT COLOR MAP ─────────────────────────────────────────────────────────

const ACCENT = {
  blue:   { border: 'border-blue-500/20',   glow: 'from-blue-500/10',   badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',   icon: 'bg-blue-500/10 text-blue-400',   ring: 'ring-blue-400' },
  violet: { border: 'border-violet-500/20', glow: 'from-violet-500/10', badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20', icon: 'bg-violet-500/10 text-violet-400', ring: 'ring-violet-400' },
  orange: { border: 'border-orange-500/20', glow: 'from-orange-500/10', badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20', icon: 'bg-orange-500/10 text-orange-400', ring: 'ring-orange-400' },
  pink:   { border: 'border-pink-500/20',   glow: 'from-pink-500/10',   badge: 'bg-pink-500/10 text-pink-400 border-pink-500/20',   icon: 'bg-pink-500/10 text-pink-400',   ring: 'ring-pink-400' },
  red:    { border: 'border-red-500/20',    glow: 'from-red-500/10',    badge: 'bg-red-500/10 text-red-400 border-red-500/20',    icon: 'bg-red-500/10 text-red-400',    ring: 'ring-red-400' },
  emerald:{ border: 'border-emerald-500/20',glow: 'from-emerald-500/10',badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: 'bg-emerald-500/10 text-emerald-400', ring: 'ring-emerald-400' },
  amber:  { border: 'border-amber-500/20',  glow: 'from-amber-500/10',  badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',  icon: 'bg-amber-500/10 text-amber-400',  ring: 'ring-amber-400' },
};

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── ADD/UPDATE SLIDE-OVER ────────────────────────────────────────────────────

function CredentialSlideOver({ service, existingData, userId, onClose, onSaved }) {
  const [value, setValue] = useState('');
  const [showValue, setShowValue] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleSave = async () => {
    if (!value.trim()) { toast.error('Please enter a value'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/user-credentials', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          userId,
          credentialKey: service.key,
          encryptedValue: btoa(value.trim()),
        }),
      });
      if (!res.ok) throw new Error('Failed to save credential');
      toast.success(`${service.name} ${existingData ? 'updated' : 'connected'}`);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const ac = ACCENT[service.accent] ?? ACCENT.blue;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-gray-950 border-l border-white/5 h-full overflow-y-auto shadow-2xl flex flex-col">

        {/* Header */}
        <div className="border-b border-white/5 px-6 py-5 flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${ac.icon}`}>
            {service.icon}
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">
              {existingData ? 'Update' : 'Connect'} {service.name}
            </h2>
            <p className="text-xs text-gray-500">{service.label}</p>
          </div>
          <button onClick={onClose} className="ml-auto text-gray-600 hover:text-white text-xl">×</button>
        </div>

        {/* Body */}
        <div className="flex-1 px-6 py-6 space-y-6">
          <p className="text-sm text-gray-400 leading-relaxed">{service.description}</p>

          {existingData && (
            <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/15 p-4 flex items-center gap-3">
              <span className="text-emerald-400">✓</span>
              <div>
                <p className="text-xs font-semibold text-emerald-400">Currently Connected</p>
                <p className="text-xs text-gray-500">Last updated {timeAgo(existingData.updatedAt)}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono uppercase tracking-widest text-gray-500 mb-2">
              {service.label}
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type={showValue ? 'text' : 'password'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                placeholder={service.placeholder}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-gray-700 focus:outline-none focus:ring-1 focus:ring-white/20 pr-12"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowValue((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors text-sm"
              >
                {showValue ? '🙈' : '👁'}
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-1.5">
              Stored encrypted in your credential vault. Never exposed in API responses.
            </p>
          </div>

          <div className="rounded-xl bg-white/2 border border-white/5 p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-300">Where to find your {service.label}</p>
            <a
              href={service.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:underline flex items-center gap-1"
            >
              {service.docsUrl} ↗
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/5 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !value.trim()}
            className="flex-1 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : existingData ? 'Update' : 'Connect'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SERVICE CARD ─────────────────────────────────────────────────────────────

function ServiceCard({ service, existingData, onOpenSlideOver }) {
  const isConnected = !!existingData;
  const ac = ACCENT[service.accent] ?? ACCENT.blue;

  return (
    <div
      className={`relative rounded-2xl border ${ac.border} bg-gradient-to-br ${ac.glow} to-transparent overflow-hidden group hover:scale-[1.01] transition-transform duration-200 cursor-pointer`}
      onClick={() => onOpenSlideOver(service)}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${ac.icon}`}>
            {service.icon}
          </div>
          {isConnected ? (
            <span className={`px-2 py-0.5 rounded-full text-xs border font-mono bg-emerald-500/10 text-emerald-400 border-emerald-500/20`}>
              ● Connected
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-xs border font-mono bg-white/5 text-gray-500 border-white/10">
              ○ Not Set
            </span>
          )}
        </div>

        <h3 className="font-bold text-white text-sm">{service.name}</h3>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{service.description}</p>

        {isConnected && (
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-600">
            <span>Updated {timeAgo(existingData.updatedAt)}</span>
            <span>{existingData.usedBySystemsCount > 0 ? `${existingData.usedBySystemsCount} system${existingData.usedBySystemsCount !== 1 ? 's' : ''}` : 'Ready to use'}</span>
          </div>
        )}
      </div>

      <div className="border-t border-white/5 px-5 py-3 flex items-center justify-between opacity-60 group-hover:opacity-100 transition-opacity">
        <span className="text-xs font-mono text-gray-500">{service.key}</span>
        <span className="text-xs text-gray-400">{isConnected ? 'Update →' : 'Connect →'}</span>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function CredentialVaultPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [storedCreds, setStoredCreds] = useState([]);
  const [slideOver, setSlideOver] = useState(null); // { service, existingData }
  const [userId, setUserId] = useState(null);

  // Decode userId from JWT
  useEffect(() => {
    try {
      const token = localStorage.getItem('sbep_auth_token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserId(Number(payload.sub));
      }
    } catch {}
  }, []);

  const fetchCredentials = useCallback(async () => {
    try {
      const res = await fetch('/api/user-credentials/summary', { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setStoredCreds(Array.isArray(data) ? data : []);
      }
    } catch {}
    finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCredentials(); }, [fetchCredentials]);

  // Build a map of credentialKey → storedData for quick lookup
  const credMap = Object.fromEntries(storedCreds.map((c) => [c.credentialKey, c]));

  const connectedCount = SERVICES.filter((s) => credMap[s.key]).length;

  return (
    <div className="min-h-screen bg-background text-white">
      {slideOver && (
        <CredentialSlideOver
          service={slideOver.service}
          existingData={slideOver.existingData}
          userId={userId}
          onClose={() => setSlideOver(null)}
          onSaved={fetchCredentials}
        />
      )}

      {/* ── Topbar ── */}
      <div className="border-b border-white/5 bg-black/40 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gray-500 hover:text-white transition-colors text-sm font-mono"
          >
            ← Dashboard
          </button>
          <span className="text-white/10">/</span>
          <span className="text-sm font-mono text-gray-400">Connections</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* ── Header ── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight">
              Credential Vault
            </h1>
            <span className="px-2.5 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-mono">
              {connectedCount}/{SERVICES.length} connected
            </span>
          </div>
          <p className="text-sm text-gray-500 max-w-lg">
            Connect your service credentials once. STARK will use them automatically across all your blueprints — no need to re-enter keys during builds.
          </p>
        </div>

        {/* ── Security Notice ── */}
        <div className="mb-6 rounded-xl border border-blue-500/15 bg-blue-500/5 px-4 py-3 flex items-start gap-3">
          <span className="text-blue-400 mt-0.5">🔒</span>
          <div>
            <p className="text-xs font-semibold text-blue-300">Vault Security</p>
            <p className="text-xs text-gray-500 mt-0.5">
              All credentials are base64-encoded at rest and never returned in plain text via API. Values are write-only — you can update but not retrieve them.
            </p>
          </div>
        </div>

        {/* ── Cards Grid ── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-white/5 bg-white/2 h-40 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SERVICES.map((service) => (
              <ServiceCard
                key={service.key}
                service={service}
                existingData={credMap[service.key] ?? null}
                onOpenSlideOver={(svc) =>
                  setSlideOver({ service: svc, existingData: credMap[svc.key] ?? null })
                }
              />
            ))}

            {/* Custom API Key card */}
            <div
              className="rounded-2xl border border-white/5 bg-white/2 overflow-hidden group hover:border-white/10 hover:bg-white/3 transition-all cursor-pointer flex flex-col items-center justify-center p-6 text-center"
              onClick={() =>
                setSlideOver({
                  service: {
                    key: 'CUSTOM_API_KEY',
                    name: 'Custom API Key',
                    label: 'API Key / Token',
                    description: 'Store any additional API key or secret not listed above.',
                    icon: '🔑',
                    accent: 'blue',
                    placeholder: 'Your key or token…',
                    docsUrl: 'https://docs.starksglobalgroup.net/',
                  },
                  existingData: credMap['CUSTOM_API_KEY'] ?? null,
                })
              }
            >
              <div className="w-10 h-10 rounded-xl border border-white/10 flex items-center justify-center text-xl mb-3">
                🔑
              </div>
              <p className="text-sm font-semibold text-gray-400 group-hover:text-white transition-colors">Custom Key</p>
              <p className="text-xs text-gray-600 mt-1">Store any other secret</p>
            </div>
          </div>
        )}

        {/* ── Additional Stored Credentials (not in SERVICES list) ── */}
        {(() => {
          const serviceKeys = new Set([...SERVICES.map((s) => s.key), 'CUSTOM_API_KEY']);
          const extras = storedCreds.filter((c) => !serviceKeys.has(c.credentialKey));
          if (extras.length === 0) return null;
          return (
            <div className="mt-10">
              <h2 className="text-xs font-mono uppercase tracking-widest text-gray-500 mb-4">
                Other Stored Credentials
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {extras.map((cred) => (
                  <div
                    key={cred.id}
                    className="rounded-2xl border border-white/5 bg-white/2 p-4 hover:border-white/10 transition-colors cursor-pointer"
                    onClick={() =>
                      setSlideOver({
                        service: {
                          key: cred.credentialKey,
                          name: cred.credentialKey,
                          label: 'Value',
                          description: 'Stored credential key.',
                          icon: '🔑',
                          accent: 'blue',
                          placeholder: '…',
                          docsUrl: '',
                        },
                        existingData: cred,
                      })
                    }
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-mono text-white">{cred.credentialKey}</p>
                      <span className="text-xs text-emerald-400">● Connected</span>
                    </div>
                    <p className="text-xs text-gray-600">Updated {timeAgo(cred.updatedAt)}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
}
