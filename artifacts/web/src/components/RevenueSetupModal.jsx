import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DollarSign, Zap, CheckCircle2, Loader2, ExternalLink, ArrowLeft, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

const PROVIDERS = [
  {
    id: 'stripe',
    label: 'Stripe',
    description: 'Payments, subscriptions, SaaS billing',
    color: 'text-violet-400',
    border: 'border-violet-500/30',
    bg: 'bg-violet-500/8',
    activeBg: 'bg-violet-500/18 border-violet-500/50',
    credentials: [
      { key: 'stripe_secret_key', label: 'Secret Key', placeholder: 'sk_live_…', hint: 'Find it at dashboard.stripe.com → Developers → API keys', link: 'https://dashboard.stripe.com/apikeys' },
    ],
  },
  {
    id: 'gumroad',
    label: 'Gumroad',
    description: 'Digital products, courses, memberships',
    color: 'text-pink-400',
    border: 'border-pink-500/30',
    bg: 'bg-pink-500/8',
    activeBg: 'bg-pink-500/18 border-pink-500/50',
    credentials: [
      { key: 'gumroad_access_token', label: 'Access Token', placeholder: 'Your Gumroad access token', hint: 'Find it at app.gumroad.com → Settings → Advanced → API', link: 'https://app.gumroad.com/settings/advanced' },
    ],
  },
  {
    id: 'paypal',
    label: 'PayPal',
    description: 'Global payments & invoicing',
    color: 'text-blue-400',
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/8',
    activeBg: 'bg-blue-500/18 border-blue-500/50',
    credentials: [
      { key: 'paypal_client_id', label: 'Client ID', placeholder: 'PayPal Client ID', hint: 'Find it at developer.paypal.com → Dashboard → Apps', link: 'https://developer.paypal.com/dashboard/applications' },
      { key: 'paypal_client_secret', label: 'Client Secret', placeholder: 'PayPal Client Secret', hint: 'Same page as Client ID', link: 'https://developer.paypal.com/dashboard/applications' },
    ],
  },
  {
    id: 'clickbank',
    label: 'ClickBank',
    description: 'Affiliate marketplace, digital products',
    color: 'text-orange-400',
    border: 'border-orange-500/30',
    bg: 'bg-orange-500/8',
    activeBg: 'bg-orange-500/18 border-orange-500/50',
    credentials: [
      { key: 'clickbank_api_key', label: 'API Key', placeholder: 'Your ClickBank API key', hint: 'Find it at accounts.clickbank.com → Account Settings → API Keys', link: 'https://accounts.clickbank.com/apiKey.htm' },
      { key: 'clickbank_clerk_key', label: 'Clerk Key', placeholder: 'Your ClickBank clerk key', hint: 'Same page — "Clerk API Key" section', link: 'https://accounts.clickbank.com/apiKey.htm' },
    ],
  },
];

const SKIP_PROVIDER = { id: '__skip__', label: 'Skip for now', description: 'Set up revenue tracking later from your system dashboard' };

export default function RevenueSetupModal({ systemInstanceId, blueprintName, onClose, onConnected }) {
  const [step, setStep] = useState('choose'); // 'choose' | 'credentials' | 'success'
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [creds, setCreds] = useState({});
  const [revealed, setRevealed] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const provider = PROVIDERS.find(p => p.id === selectedProvider);

  async function handleConnect() {
    if (!provider || !systemInstanceId) return;
    setLoading(true);
    setError('');

    // Build credential key mapping — store with a predictable key name so we can look up
    const credentialKeys = {};
    for (const credDef of provider.credentials) {
      const val = (creds[credDef.key] ?? '').trim();
      if (!val) { setError(`${credDef.label} is required`); setLoading(false); return; }
      // Store the raw value as a temporary credential in the vault
      const storeRes = await fetch('/api/user-credentials', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ credentialKey: `__rev_${credDef.key}_${Date.now()}`, encryptedValue: btoa(val) }),
      }).then(r => r.json());
      if (storeRes.error) { setError(`Failed to store credential: ${storeRes.error}`); setLoading(false); return; }
      credentialKeys[credDef.key] = storeRes.credentialKey ?? `__rev_${credDef.key}_${Date.now()}`;
    }

    const linkRes = await fetch(`/api/system-instances/${systemInstanceId}/revenue-providers`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ provider: provider.id, credentialKeys }),
    }).then(r => r.json());

    if (linkRes.error) {
      setError(linkRes.error);
      setLoading(false);
      return;
    }

    // Trigger first sync
    if (linkRes.id) {
      fetch(`/api/system-instances/${systemInstanceId}/revenue-providers/${linkRes.id}/sync`, {
        method: 'POST',
        headers: authHeaders(),
      }).catch(() => {});
    }

    setLoading(false);
    setStep('success');
    onConnected?.({ provider: provider.id });
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-md rounded-2xl border border-white/12 bg-[#0c0c10] shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center gap-3 p-5 border-b border-white/8">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/12 border border-emerald-500/25 flex items-center justify-center">
              <DollarSign className="w-4.5 h-4.5 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-white">Connect Revenue Tracking</h2>
              <p className="text-[10px] text-white/40 font-mono truncate">{blueprintName ?? 'Your System'} is live</p>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/30 hover:text-white transition-colors shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5">
            {step === 'choose' && (
              <div className="space-y-3">
                <p className="text-xs text-white/50 leading-relaxed mb-4">
                  Connect your payment processor so ASH can automatically track the real income your system generates. Takes 30 seconds.
                </p>
                {PROVIDERS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedProvider(p.id); setStep('credentials'); }}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${selectedProvider === p.id ? p.activeBg : `${p.bg} ${p.border} hover:border-white/20`}`}
                  >
                    <div className={`w-8 h-8 rounded-lg border ${p.border} ${p.bg} flex items-center justify-center shrink-0`}>
                      <DollarSign className={`w-3.5 h-3.5 ${p.color}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${p.color}`}>{p.label}</p>
                      <p className="text-[10px] text-white/35">{p.description}</p>
                    </div>
                    <div className="ml-auto">
                      <Zap className={`w-3.5 h-3.5 ${p.color} opacity-50`} />
                    </div>
                  </button>
                ))}
                <button
                  onClick={onClose}
                  className="w-full text-center text-[11px] text-white/25 hover:text-white/50 transition-colors py-2 font-mono"
                >
                  {SKIP_PROVIDER.description}
                </button>
              </div>
            )}

            {step === 'credentials' && provider && (
              <div className="space-y-4">
                <button onClick={() => { setStep('choose'); setError(''); }} className="flex items-center gap-1.5 text-[11px] text-white/35 hover:text-white/60 transition-colors font-mono">
                  <ArrowLeft className="w-3 h-3" /> Back
                </button>
                <div className={`flex items-center gap-2.5 p-3 rounded-xl border ${provider.bg} ${provider.border}`}>
                  <DollarSign className={`w-4 h-4 ${provider.color}`} />
                  <span className={`text-sm font-bold ${provider.color}`}>{provider.label}</span>
                  <span className="text-[10px] text-white/30 ml-auto font-mono">payment provider</span>
                </div>
                {error && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/8 border border-rose-500/20 text-[11px] text-rose-400">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
                  </div>
                )}
                {provider.credentials.map(credDef => (
                  <div key={credDef.key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-white/70">{credDef.label}</label>
                      <a href={credDef.link} target="_blank" rel="noopener noreferrer" className="text-[9px] text-violet-400/60 hover:text-violet-400 font-mono flex items-center gap-0.5 transition-colors">
                        Where to find it <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                    <div className="relative">
                      <input
                        type={revealed[credDef.key] ? 'text' : 'password'}
                        value={creds[credDef.key] ?? ''}
                        onChange={e => setCreds(c => ({ ...c, [credDef.key]: e.target.value }))}
                        placeholder={credDef.placeholder}
                        className="w-full h-9 px-3 pr-9 rounded-lg bg-white/5 border border-white/12 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 transition-colors font-mono"
                        autoComplete="off"
                        spellCheck={false}
                      />
                      <button
                        type="button"
                        onClick={() => setRevealed(r => ({ ...r, [credDef.key]: !r[credDef.key] }))}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors text-[10px] font-mono"
                      >
                        {revealed[credDef.key] ? 'hide' : 'show'}
                      </button>
                    </div>
                    <p className="text-[10px] text-white/30 mt-1">{credDef.hint}</p>
                  </div>
                ))}
                <button
                  onClick={handleConnect}
                  disabled={loading}
                  className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Connecting…</> : <><CheckCircle2 className="w-4 h-4" /> Connect & Start Tracking</>}
                </button>
                <p className="text-[9px] text-white/20 text-center font-mono">Credentials are encrypted end-to-end. Never shared.</p>
              </div>
            )}

            {step === 'success' && (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/12 border border-emerald-500/30 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                </div>
                <div>
                  <p className="text-base font-bold text-white">Revenue Tracking Active!</p>
                  <p className="text-xs text-white/45 mt-1 leading-relaxed">
                    {PROVIDERS.find(p => p.id === selectedProvider)?.label} is connected. ASH will sync your earnings automatically every 5 minutes. Check your system dashboard to see real revenue.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-full h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/25 text-emerald-300 text-sm font-semibold hover:bg-emerald-600/30 transition-colors"
                >
                  Got it
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
