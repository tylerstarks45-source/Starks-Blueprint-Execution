import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  User, Lock, CreditCard, Bell, Trash2, Eye, EyeOff,
  Save, Check, Shield, AlertTriangle, Palette, Globe,
  CheckCircle2, XCircle, Loader2, Crown, Upload, ExternalLink,
  Volume2, Mic, Play, Code, Key, Copy, RotateCcw, Zap, Activity, BarChart2,
} from 'lucide-react';
import AuthLayout from '@/components/AuthLayout.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';

const TABS = [
  { id: 'profile',       label: 'Profile',       icon: User },
  { id: 'security',      label: 'Security',       icon: Lock },
  { id: 'billing',       label: 'Billing',        icon: CreditCard },
  { id: 'notifications', label: 'Notifications',  icon: Bell },
  { id: 'voice',         label: 'Voice',          icon: Volume2 },
  { id: 'branding',      label: 'Branding',       icon: Palette, empireOnly: true },
  { id: 'developer',     label: 'Developer',      icon: Code,    empireOnly: true },
  { id: 'danger',        label: 'Danger Zone',    icon: AlertTriangle },
];

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
};

function ProfileTab({ user }) {
  const [name, setName]   = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ name }),
      });
      if (res.ok) toast.success('Profile updated');
      else toast.error('Failed to update profile');
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white font-mono mb-1">Profile</h2>
        <p className="text-sm text-white/40">Your personal information shown across the platform.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-mono text-white/50 mb-1.5 uppercase tracking-widest">Display Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50 transition-colors"
            placeholder="Your name"
          />
        </div>
        <div>
          <label className="block text-xs font-mono text-white/50 mb-1.5 uppercase tracking-widest">Email</label>
          <input
            value={user?.email ?? ''}
            readOnly
            className="w-full bg-white/3 border border-white/6 rounded-lg px-3 py-2.5 text-sm text-white/40 cursor-not-allowed"
          />
          <p className="text-xs text-white/25 mt-1">Email cannot be changed. Contact support if needed.</p>
        </div>
        <div>
          <label className="block text-xs font-mono text-white/50 mb-1.5 uppercase tracking-widest">Account Tier</label>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-full bg-violet-500/15 border border-violet-500/25 text-xs text-violet-300 font-mono font-semibold uppercase tracking-wide">
              {user?.subscriptionTier ?? 'Free'}
            </span>
            <a href="/credits" className="text-xs text-violet-400 hover:text-violet-300 transition-colors font-mono">Upgrade →</a>
          </div>
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
      >
        {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
        Save Profile
      </button>
    </div>
  );
}

function SecurityTab() {
  const [current,  setCurrent]  = useState('');
  const [next,     setNext]     = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [saving,   setSaving]   = useState(false);

  const save = async () => {
    if (next !== confirm) { toast.error('Passwords do not match'); return; }
    if (next.length < 8)  { toast.error('Password must be at least 8 characters'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      if (res.ok) {
        toast.success('Password updated successfully');
        setCurrent(''); setNext(''); setConfirm('');
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? 'Failed to update password');
      }
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white font-mono mb-1">Security</h2>
        <p className="text-sm text-white/40">Manage your password and account access.</p>
      </div>

      <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-start gap-3">
        <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-emerald-300">JWT Authentication</p>
          <p className="text-xs text-emerald-400/70 mt-0.5">Your session is secured with a 7-day signed token stored locally.</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-white/70 font-mono uppercase tracking-wider">Change Password</h3>
        {[
          { label: 'Current Password', value: current, set: setCurrent },
          { label: 'New Password',     value: next,    set: setNext    },
          { label: 'Confirm Password', value: confirm, set: setConfirm },
        ].map(({ label, value, set }) => (
          <div key={label}>
            <label className="block text-xs font-mono text-white/50 mb-1.5 uppercase tracking-widest">{label}</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={value}
                onChange={e => set(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 pr-10 text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50 transition-colors"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={save}
        disabled={saving || !current || !next || !confirm}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors disabled:opacity-40"
      >
        {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Lock className="w-4 h-4" />}
        Update Password
      </button>
    </div>
  );
}

function BillingTab({ user }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white font-mono mb-1">Billing</h2>
        <p className="text-sm text-white/40">Manage your subscription and credits.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-white/10 bg-white/3">
          <p className="text-xs font-mono text-white/40 uppercase tracking-widest mb-1">Current Plan</p>
          <p className="text-2xl font-black font-mono text-white capitalize">{user?.subscriptionTier ?? 'Free'}</p>
        </div>
        <div className="p-4 rounded-xl border border-white/10 bg-white/3">
          <p className="text-xs font-mono text-white/40 uppercase tracking-widest mb-1">AI Credits</p>
          <p className="text-2xl font-black font-mono text-violet-400">{user?.aiCredits ?? 0}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <a
          href="/credits"
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors"
        >
          <CreditCard className="w-4 h-4" /> Upgrade Plan
        </a>
        <a
          href="/credits"
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-white/15 bg-white/5 text-white/70 hover:text-white text-sm font-semibold transition-colors"
        >
          Buy Credits
        </a>
      </div>
    </div>
  );
}

const NOTIF_DEFAULTS = {
  system_failures:    true,
  weekly_digest:      true,
  ab_test_complete:   true,
  new_blueprints:     false,
  platform_updates:   true,
};

function NotificationsTab() {
  const [prefs, setPrefs] = useState(NOTIF_DEFAULTS);
  const [saved, setSaved]  = useState(false);

  const toggle = (key) => setPrefs(p => ({ ...p, [key]: !p[key] }));

  const save = () => {
    setSaved(true);
    toast.success('Notification preferences saved');
    setTimeout(() => setSaved(false), 2000);
  };

  const LABELS = {
    system_failures:  { label: 'System failure alerts',    desc: 'Get notified when a scheduled task or system fails.' },
    weekly_digest:    { label: 'Weekly performance digest', desc: 'A summary of your systems\' performance every Monday.' },
    ab_test_complete: { label: 'A/B test conclusions',      desc: 'Notified when an experiment picks a winner.' },
    new_blueprints:   { label: 'New blueprints available',  desc: 'Announcements when new AI system blueprints launch.' },
    platform_updates: { label: 'Platform updates',          desc: 'What\'s new in Starks Global Group — features and improvements.' },
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white font-mono mb-1">Notifications</h2>
        <p className="text-sm text-white/40">Control which notifications you receive.</p>
      </div>

      <div className="space-y-3">
        {Object.entries(LABELS).map(([key, { label, desc }]) => (
          <div key={key} className="flex items-center justify-between p-4 rounded-xl border border-white/8 bg-white/3 hover:bg-white/5 transition-colors">
            <div>
              <p className="text-sm font-semibold text-white">{label}</p>
              <p className="text-xs text-white/40 mt-0.5">{desc}</p>
            </div>
            <button
              onClick={() => toggle(key)}
              className={`relative w-10 h-5.5 rounded-full border transition-all duration-200 shrink-0 ml-4 ${
                prefs[key]
                  ? 'bg-violet-500/80 border-violet-500/50'
                  : 'bg-white/10 border-white/15'
              }`}
              style={{ minWidth: '40px', height: '22px' }}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200 ${
                  prefs[key] ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={save}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors"
      >
        {saved ? <Check className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
        {saved ? 'Saved!' : 'Save Preferences'}
      </button>
    </div>
  );
}

// ── Logo Upload widget ─────────────────────────────────────────────────────
function LogoUpload({ logoUrl, onUploaded, authHeaders }) {
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 512 * 1024) {
      toast.error('Image must be under 512 KB');
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const token = localStorage.getItem('sbep_auth_token');
      const res = await fetch('/api/white-label/logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ dataUrl }),
      });
      const data = await res.json();
      if (res.ok) {
        onUploaded(data.logoUrl);
        toast.success('Logo uploaded');
      } else {
        toast.error(data.error ?? 'Upload failed');
      }
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-4">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt="logo preview"
          className="w-14 h-14 rounded-xl object-cover border border-white/15 shrink-0"
          onError={e => { e.currentTarget.style.display = 'none'; }}
        />
      ) : (
        <div className="w-14 h-14 rounded-xl border border-dashed border-white/20 flex items-center justify-center shrink-0">
          <span className="text-white/25 text-xl">?</span>
        </div>
      )}
      <div className="flex-1 space-y-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
          className="hidden"
          onChange={handleFile}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="px-4 py-2 rounded-lg bg-white/8 border border-white/15 text-sm text-white/80 hover:bg-white/12 hover:text-white transition-colors disabled:opacity-50"
        >
          {uploading ? 'Uploading…' : logoUrl ? 'Replace Logo' : 'Upload Logo'}
        </button>
        {logoUrl && (
          <button
            type="button"
            onClick={() => onUploaded(null)}
            className="block text-xs text-white/30 hover:text-red-400 transition-colors"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

// ── Branding Tab (Empire tier) ─────────────────────────────────────────────
function BrandingTab({ user }) {
  const tier = (user?.membershipTier || user?.subscriptionTier || 'free').toLowerCase();
  const isEmpire = tier === 'empire' || tier === 'operator' || user?.role === 'SUPER_ADMIN' || user?.role === 'FOUNDER_ADMIN' || user?.role === 'ADMIN';

  const [config, setConfig]         = useState(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [verifying, setVerifying]   = useState(false);

  const [brandName, setBrandName]       = useState('');
  const [logoUrl, setLogoUrl]           = useState('');
  const [primaryColor, setPrimaryColor] = useState('#1A8CFF');
  const [accentColor, setAccentColor]   = useState('#00E5E5');
  const [customDomain, setCustomDomain] = useState('');

  const authHeaders = useCallback(() => {
    const token = localStorage.getItem('sbep_auth_token');
    return token
      ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      : { 'Content-Type': 'application/json' };
  }, []);

  useEffect(() => {
    if (!isEmpire) { setLoading(false); return; }
    fetch('/api/white-label/config', { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setConfig(data);
          setBrandName(data.brandName || '');
          setLogoUrl(data.logoUrl || '');
          setPrimaryColor(data.primaryColor || '#1A8CFF');
          setAccentColor(data.accentColor || '#00E5E5');
          setCustomDomain(data.customDomain || '');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isEmpire, authHeaders]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/white-label/config', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          brandName: brandName || undefined,
          logoUrl: logoUrl || null,
          primaryColor,
          accentColor,
          customDomain: customDomain || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        toast.success('Branding settings saved');
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? 'Failed to save branding');
      }
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  };

  const verifyDomain = async () => {
    setVerifying(true);
    try {
      const res = await fetch('/api/white-label/verify-domain', {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.verified) {
        setConfig(c => ({ ...c, domainVerified: true }));
        toast.success('Domain verified! White-label is now live.');
      } else {
        toast.error('DNS not yet propagated. Try again in a few hours.');
      }
    } catch { toast.error('Verification failed'); }
    finally { setVerifying(false); }
  };

  if (!isEmpire) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-white font-mono mb-1">White-Label Branding</h2>
          <p className="text-sm text-white/40">Brand the entire platform with your own logo, colors, and domain.</p>
        </div>
        <div className="p-6 rounded-2xl border border-yellow-500/25 bg-yellow-500/5 text-center space-y-4">
          <Crown className="w-10 h-10 text-yellow-400 mx-auto" />
          <div>
            <p className="text-base font-bold text-yellow-300 font-mono">Empire Tier Required</p>
            <p className="text-sm text-white/50 mt-1.5 max-w-sm mx-auto">
              White-label branding is exclusive to Empire tier. Upgrade to brand the platform with your
              own logo, custom colors, and a domain your clients will never question.
            </p>
          </div>
          <a
            href="/credits"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/30 text-sm font-semibold transition-colors"
          >
            <Crown className="w-4 h-4" /> Upgrade to Empire
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-white font-mono mb-1">White-Label Branding</h2>
        <p className="text-sm text-white/40">
          Brand the platform for your clients. Changes apply on your custom domain.
        </p>
      </div>

      {/* ── Live Preview ──────────────────────────────────────────────── */}
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-white/8 bg-white/3 flex items-center justify-between">
          <span className="text-xs font-mono text-white/40 uppercase tracking-widest">Live Preview</span>
          <span className="text-[10px] text-white/25 font-mono">{customDomain || 'your-domain.com'}</span>
        </div>
        <div
          className="p-5"
          style={{ background: 'linear-gradient(135deg, #0F1217 0%, #13161d 100%)' }}
        >
          {/* Fake navbar */}
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl border mb-4"
            style={{
              borderColor: `${primaryColor}30`,
              background: `${primaryColor}08`,
            }}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="logo"
                className="w-7 h-7 rounded-lg object-cover"
                onError={e => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white"
                style={{ background: primaryColor }}
              >
                {(brandName || 'B').charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm font-bold text-white font-mono">
              {brandName || 'Your Brand'}
            </span>
            <div className="ml-auto flex items-center gap-2">
              {['Dashboard', 'Systems', 'Settings'].map(label => (
                <span
                  key={label}
                  className="text-[10px] text-white/40 font-mono hidden sm:block"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
          {/* Accent strip */}
          <div className="flex items-center gap-2">
            <div className="h-1 rounded-full flex-1" style={{ background: primaryColor }} />
            <div className="h-1 rounded-full flex-1 opacity-60" style={{ background: accentColor }} />
          </div>
        </div>
      </div>

      {/* ── Brand Identity ─────────────────────────────────────────────── */}
      <div className="space-y-5">
        <h3 className="text-sm font-semibold text-white/60 font-mono uppercase tracking-wider">Brand Identity</h3>

        <div>
          <label className="block text-xs font-mono text-white/50 mb-1.5 uppercase tracking-widest">Brand Name</label>
          <input
            value={brandName}
            onChange={e => setBrandName(e.target.value)}
            maxLength={80}
            placeholder="My Agency"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50 transition-colors"
          />
          <p className="text-xs text-white/25 mt-1">Shown in the navbar and browser tab title.</p>
        </div>

        <div>
          <label className="block text-xs font-mono text-white/50 mb-1.5 uppercase tracking-widest">Logo</label>
          <LogoUpload
            logoUrl={logoUrl}
            onUploaded={url => setLogoUrl(url)}
            authHeaders={authHeaders}
          />
          <p className="text-xs text-white/25 mt-1">PNG, JPEG, GIF, WebP or SVG. Max 512 KB. 40×40 px recommended.</p>
        </div>

        {/* Color pickers */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono text-white/50 mb-1.5 uppercase tracking-widest">Primary Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={e => setPrimaryColor(e.target.value)}
                className="w-9 h-9 rounded-lg border border-white/15 bg-transparent cursor-pointer shrink-0"
              />
              <input
                value={primaryColor}
                onChange={e => setPrimaryColor(e.target.value)}
                maxLength={7}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-violet-500/50 transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-mono text-white/50 mb-1.5 uppercase tracking-widest">Accent Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={accentColor}
                onChange={e => setAccentColor(e.target.value)}
                className="w-9 h-9 rounded-lg border border-white/15 bg-transparent cursor-pointer shrink-0"
              />
              <input
                value={accentColor}
                onChange={e => setAccentColor(e.target.value)}
                maxLength={7}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-violet-500/50 transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Custom Domain ──────────────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-white/60 font-mono uppercase tracking-wider">Custom Domain</h3>

        <div>
          <label className="block text-xs font-mono text-white/50 mb-1.5 uppercase tracking-widest">Domain</label>
          <input
            value={customDomain}
            onChange={e => setCustomDomain(e.target.value)}
            placeholder="app.youragency.com"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50 transition-colors"
          />
        </div>

        {customDomain && (
          <div className="p-4 rounded-xl border border-white/8 bg-white/3 space-y-3">
            <p className="text-xs font-semibold text-white/60 font-mono uppercase tracking-wider">DNS Setup Instructions</p>
            <p className="text-xs text-white/40">
              Add these CNAME records in your domain registrar, then click Verify:
            </p>
            <div className="space-y-2">
              {[
                { host: '@', value: window.location.hostname },
                { host: 'www', value: window.location.hostname },
              ].map(({ host, value }) => (
                <div key={host} className="grid grid-cols-[40px_1fr] gap-3 text-xs font-mono">
                  <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white/60 text-center">{host}</span>
                  <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white/40 truncate">{value}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                {config?.domainVerified ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs text-emerald-400 font-semibold">Verified</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-white/30" />
                    <span className="text-xs text-white/40">Not verified</span>
                  </>
                )}
              </div>
              <button
                onClick={verifyDomain}
                disabled={verifying}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/80 hover:bg-violet-600 text-white text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {verifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Globe className="w-3 h-3" />}
                {verifying ? 'Checking…' : 'Verify DNS'}
              </button>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save Branding
      </button>
    </div>
  );
}

const VOICE_PRESETS = [
  { id: 'warm narrator',    label: 'Warm Narrator',   desc: 'Calm, professional male voice' },
  { id: 'rachel',           label: 'Rachel',          desc: 'Clear, articulate female voice' },
  { id: 'adam',             label: 'Adam',            desc: 'Deep, authoritative male voice' },
  { id: 'bella',            label: 'Bella',           desc: 'Friendly, energetic female voice' },
  { id: 'josh',             label: 'Josh',            desc: 'Young, conversational male voice' },
];

function VoiceTab() {
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    try { return localStorage.getItem('sbep_voice_enabled') === 'true'; } catch { return false; }
  });
  const [selectedVoice, setSelectedVoice] = useState(() => {
    try { return localStorage.getItem('sbep_voice_preset') ?? 'warm narrator'; } catch { return 'warm narrator'; }
  });
  const [speed, setSpeed] = useState(() => {
    try { return parseFloat(localStorage.getItem('sbep_voice_speed') ?? '1'); } catch { return 1; }
  });
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = () => {
    try {
      localStorage.setItem('sbep_voice_enabled', String(voiceEnabled));
      localStorage.setItem('sbep_voice_preset', selectedVoice);
      localStorage.setItem('sbep_voice_speed', String(speed));
    } catch { /* ignore */ }
    setSaved(true);
    toast.success('Voice preferences saved');
    setTimeout(() => setSaved(false), 2000);
  };

  const testVoice = async () => {
    setTesting(true);
    try {
      const token = localStorage.getItem('sbep_auth_token');
      const res = await fetch('/api/media-gen/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ text: "Hello! I'm ASH, your AI system builder. Voice responses are now active.", voice: selectedVoice }),
      });
      const data = await res.json();
      if (data.audioBase64) {
        const audio = new Audio(`data:${data.mimeType ?? 'audio/mpeg'};base64,${data.audioBase64}`);
        audio.onended = () => setTesting(false);
        audio.onerror = () => setTesting(false);
        await audio.play();
      } else if (data.status === 'needs_credentials') {
        toast.error('Connect ElevenLabs in the Connections Hub to enable voice');
        setTesting(false);
      } else {
        toast.error('TTS preview unavailable');
        setTesting(false);
      }
    } catch {
      toast.error('Preview failed');
      setTesting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-white font-mono mb-1">Voice Settings</h2>
        <p className="text-sm text-white/40">Configure ASH voice input and spoken responses.</p>
      </div>

      {/* ── Voice input toggle ──────────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-white/60 font-mono uppercase tracking-wider">Voice Input</h3>
        <div className="flex items-center justify-between p-4 rounded-xl border border-white/8 bg-white/3">
          <div className="flex items-start gap-3">
            <Mic className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-white">Microphone Input</p>
              <p className="text-xs text-white/40 mt-0.5">Use the mic button in ASH chat to speak your messages. Requires browser microphone permission.</p>
            </div>
          </div>
          <div className="shrink-0 ml-4 flex items-center gap-2">
            <span className="text-xs font-mono text-white/40">Always available</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* ── TTS responses ───────────────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-white/60 font-mono uppercase tracking-wider">Voice Responses</h3>
        <div className="flex items-center justify-between p-4 rounded-xl border border-white/8 bg-white/3 hover:bg-white/5 transition-colors">
          <div>
            <p className="text-sm font-semibold text-white">ASH speaks responses aloud</p>
            <p className="text-xs text-white/40 mt-0.5">
              After each ASH reply, the text is converted to speech and auto-played. Requires ElevenLabs connected in{' '}
              <a href="/connections" className="text-violet-400 hover:text-violet-300 underline">Connections Hub</a>.
            </p>
          </div>
          <button
            onClick={() => setVoiceEnabled(v => !v)}
            className={`relative shrink-0 ml-4 rounded-full border transition-all duration-200`}
            style={{ width: 40, height: 22, minWidth: 40, backgroundColor: voiceEnabled ? 'rgba(139,92,246,0.7)' : 'rgba(255,255,255,0.1)', borderColor: voiceEnabled ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.15)' }}
          >
            <span
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200"
              style={{ left: voiceEnabled ? '20px' : '2px' }}
            />
          </button>
        </div>

        {voiceEnabled && (
          <div className="space-y-5 pl-0">
            {/* Voice preset */}
            <div>
              <label className="block text-xs font-mono text-white/50 mb-2 uppercase tracking-widest">Voice Preset</label>
              <div className="space-y-2">
                {VOICE_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => setSelectedVoice(preset.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                      selectedVoice === preset.id
                        ? 'border-violet-500/40 bg-violet-500/10'
                        : 'border-white/8 bg-white/2 hover:bg-white/5'
                    }`}
                  >
                    <div>
                      <p className={`text-sm font-semibold ${selectedVoice === preset.id ? 'text-violet-300' : 'text-white/70'}`}>
                        {preset.label}
                      </p>
                      <p className="text-xs text-white/35 mt-0.5">{preset.desc}</p>
                    </div>
                    {selectedVoice === preset.id && <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Speech speed */}
            <div>
              <label className="block text-xs font-mono text-white/50 mb-2 uppercase tracking-widest">
                Speech Speed — {speed === 1 ? 'Normal' : speed < 1 ? 'Slower' : 'Faster'} ({speed.toFixed(1)}×)
              </label>
              <input
                type="range"
                min="0.6"
                max="1.5"
                step="0.1"
                value={speed}
                onChange={e => setSpeed(parseFloat(e.target.value))}
                className="w-full accent-violet-500"
              />
              <div className="flex justify-between text-[10px] font-mono text-white/25 mt-1">
                <span>0.6× slow</span>
                <span>1.0× normal</span>
                <span>1.5× fast</span>
              </div>
            </div>

            {/* Test button */}
            <button
              onClick={testVoice}
              disabled={testing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-violet-500/15 border border-violet-500/30 text-violet-300 hover:bg-violet-500/25 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {testing ? 'Playing preview…' : 'Test Voice Preview'}
            </button>
          </div>
        )}
      </div>

      <button
        onClick={save}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors"
      >
        {saved ? <Check className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        {saved ? 'Saved!' : 'Save Voice Settings'}
      </button>
    </div>
  );
}

function DeveloperTab({ user }) {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [revealedKey, setRevealedKey] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [usage, setUsage] = useState(null);

  const headers = authHeaders();

  const loadKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/developer/keys', { headers });
      if (res.ok) setKeys(await res.json());
      else toast.error('Failed to load API keys');
    } catch { toast.error('Network error'); }
    finally { setLoading(false); }
  }, []);

  const loadUsage = useCallback(async () => {
    try {
      const res = await fetch('/api/developer/usage', { headers });
      if (res.ok) setUsage(await res.json());
    } catch { /* non-fatal */ }
  }, []);

  useEffect(() => { loadKeys(); loadUsage(); }, [loadKeys, loadUsage]);

  const createKey = async () => {
    if (!newKeyName.trim()) { toast.error('Enter a key name'); return; }
    setCreating(true);
    try {
      const res = await fetch('/api/developer/keys', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setRevealedKey({ id: data.id, rawKey: data.rawKey, name: data.name });
        setNewKeyName('');
        toast.success('API key created — copy it now!');
        loadKeys();
        loadUsage();
      } else {
        toast.error(data.error ?? 'Failed to create key');
      }
    } catch { toast.error('Network error'); }
    finally { setCreating(false); }
  };

  const revokeKey = async (keyId, keyName) => {
    if (!window.confirm(`Revoke "${keyName}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/developer/keys/${keyId}`, { method: 'DELETE', headers });
      if (res.ok) { toast.success('Key revoked'); loadKeys(); loadUsage(); }
      else { const d = await res.json(); toast.error(d.error ?? 'Failed to revoke key'); }
    } catch { toast.error('Network error'); }
  };

  const rotateKey = async (keyId, keyName) => {
    if (!window.confirm(`Rotate "${keyName}"? The old key will be revoked immediately and a new one issued.`)) return;
    try {
      const res = await fetch(`/api/developer/keys/${keyId}/rotate`, { method: 'POST', headers });
      const d = await res.json();
      if (res.ok) {
        toast.success('Key rotated — copy your new key!');
        setRevealedKey({ rawKey: d.rawKey, name: keyName });
        loadKeys();
        loadUsage();
      } else {
        toast.error(d.error ?? 'Failed to rotate key');
      }
    } catch { toast.error('Network error'); }
  };

  const copyText = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const activeKeys = keys.filter(k => !k.revokedAt);
  const revokedKeys = keys.filter(k => k.revokedAt);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-white font-mono mb-1">Developer API</h2>
        <p className="text-sm text-white/40">
          Manage API keys for programmatic access to SBEP.{' '}
          <Link to="/developer" className="text-violet-400 hover:text-violet-300 underline">
            View API docs <ExternalLink className="inline w-3 h-3" />
          </Link>
        </p>
      </div>

      {/* Analytics section */}
      {usage && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { label: 'This Month', value: (usage.totalMonthlyCallCount ?? 0).toLocaleString(), icon: Zap, color: 'text-violet-400' },
              { label: 'Tokens (30d)', value: (usage.totalTokenUsage30d ?? 0).toLocaleString(), icon: Activity, color: 'text-blue-400' },
              { label: 'Rate Limit', value: `${usage.rateLimit}/min`, icon: Shield, color: 'text-emerald-400' },
              { label: 'Active Keys', value: activeKeys.length, icon: Key, color: 'text-amber-400' },
              { label: 'Incidents', value: (usage.rateLimitIncidents30d ?? 0).toLocaleString(), icon: AlertTriangle, color: (usage.rateLimitIncidents30d ?? 0) > 0 ? 'text-red-400' : 'text-white/30' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="p-3 rounded-xl border border-white/8 bg-white/2 text-center">
                <Icon className={`w-4 h-4 ${color} mx-auto mb-1.5`} />
                <p className="text-[9px] font-mono text-white/35 uppercase tracking-widest leading-tight">{label}</p>
                <p className="text-sm font-bold text-white font-mono mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {/* Calls/day bar chart */}
          {usage.dailyUsage?.length > 0 && (
            <div className="p-4 rounded-xl border border-white/8 bg-white/2">
              <div className="flex items-center gap-2 mb-3">
                <BarChart2 className="w-3.5 h-3.5 text-violet-400" />
                <h3 className="text-xs font-mono text-white/40 uppercase tracking-wider">Calls per Day — Last 30 Days</h3>
                <div className="ml-auto flex items-center gap-3 text-[10px] font-mono text-white/30">
                  <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-violet-500/60" />calls</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-red-500/60" />incidents</span>
                </div>
              </div>
              {(() => {
                const data = usage.dailyUsage;
                const maxVal = Math.max(...data.map(d => d.count), 1);
                const H = 56;
                const barW = Math.max(2, Math.floor(460 / data.length) - 1);
                const total = 460;
                return (
                  <svg viewBox={`0 0 ${total} ${H + 14}`} className="w-full h-auto" aria-label="Calls per day chart">
                    {data.map((d, i) => {
                      const h = Math.max(2, Math.round((d.count / maxVal) * H));
                      const ih = (d.incidents > 0) ? Math.max(2, Math.round((d.incidents / maxVal) * H)) : 0;
                      const x = i * (barW + 1);
                      return (
                        <g key={d.date}>
                          <rect x={x} y={H - h} width={barW} height={h} fill="rgba(139,92,246,0.45)" rx={1} />
                          {ih > 0 && <rect x={x} y={H - ih} width={barW} height={ih} fill="rgba(239,68,68,0.55)" rx={1} />}
                        </g>
                      );
                    })}
                    {/* X axis date labels — first, middle, last */}
                    {[0, Math.floor(data.length / 2), data.length - 1].map(idx => (
                      <text
                        key={idx}
                        x={idx * (barW + 1) + barW / 2}
                        y={H + 11}
                        textAnchor="middle"
                        fontSize={7}
                        fill="rgba(255,255,255,0.25)"
                        fontFamily="monospace"
                      >
                        {data[idx]?.date?.slice(5)}
                      </text>
                    ))}
                  </svg>
                );
              })()}
            </div>
          )}

          {/* Top endpoints */}
          {usage.topEndpoints?.length > 0 && (
            <div className="p-4 rounded-xl border border-white/8 bg-white/2">
              <h3 className="text-xs font-mono text-white/40 uppercase tracking-wider mb-3">Top Endpoints (30d)</h3>
              <div className="space-y-2">
                {usage.topEndpoints.slice(0, 6).map((ep, i) => {
                  const maxCount = usage.topEndpoints[0]?.count ?? 1;
                  const pct = Math.round((ep.count / maxCount) * 100);
                  return (
                    <div key={i} className="space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <code className="text-[11px] font-mono text-white/55 truncate flex-1">{ep.endpoint}</code>
                        <span className="text-[11px] font-mono text-white/35 shrink-0">{ep.count.toLocaleString()}</span>
                      </div>
                      <div className="h-0.5 rounded-full bg-white/5">
                        <div className="h-0.5 rounded-full bg-violet-500/50" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Revealed key banner */}
      {revealedKey && (
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/8 space-y-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-emerald-300">"{revealedKey.name}" created — copy it now</p>
              <p className="text-xs text-emerald-400/70 mt-0.5">This key will not be shown again.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-black/40 rounded-lg border border-emerald-500/20 px-3 py-2.5">
            <code className="flex-1 text-xs font-mono text-emerald-300 break-all">{revealedKey.rawKey}</code>
            <button
              onClick={() => copyText(revealedKey.rawKey, 'revealed')}
              className="shrink-0 p-1.5 rounded-md hover:bg-white/10 text-emerald-400 transition-colors"
            >
              {copiedId === 'revealed' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <button
            onClick={() => setRevealedKey(null)}
            className="text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            I've saved it — dismiss
          </button>
        </div>
      )}

      {/* Create new key */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-white/60 font-mono uppercase tracking-wider">Generate API Key</h3>
        <div className="flex gap-3">
          <input
            value={newKeyName}
            onChange={e => setNewKeyName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createKey()}
            placeholder="Key name (e.g. Production, CI/CD)"
            maxLength={80}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50 transition-colors"
          />
          <button
            onClick={createKey}
            disabled={creating || !newKeyName.trim() || activeKeys.length >= 5}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors disabled:opacity-40 shrink-0"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
            Generate
          </button>
        </div>
        {activeKeys.length >= 5 && (
          <p className="text-xs text-amber-400/80 font-mono">Maximum of 5 active keys. Revoke one to create another.</p>
        )}
      </div>

      {/* Active keys list */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white/60 font-mono uppercase tracking-wider">Active Keys ({activeKeys.length}/5)</h3>
        {loading ? (
          <div className="flex items-center gap-2 text-white/30 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
          </div>
        ) : activeKeys.length === 0 ? (
          <div className="p-6 rounded-xl border border-white/8 bg-white/2 text-center">
            <Code className="w-8 h-8 text-white/20 mx-auto mb-2" />
            <p className="text-sm text-white/40">No active API keys. Generate one above to get started.</p>
          </div>
        ) : (
          activeKeys.map(key => (
            <div key={key.id} className="flex items-center gap-4 p-4 rounded-xl border border-white/8 bg-white/2">
              <Key className="w-4 h-4 text-violet-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{key.name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <code className="text-xs font-mono text-white/40">sbep_{key.keyPrefix}••••••••</code>
                  <span className="text-[10px] text-white/25 font-mono">{key.monthlyCallCount.toLocaleString()} calls</span>
                  {key.lastUsedAt && (
                    <span className="text-[10px] text-white/25">
                      Last used {new Date(key.lastUsedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => copyText(`sbep_${key.keyPrefix}`, key.id)}
                  className="p-1.5 rounded-md hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
                  title="Copy prefix"
                >
                  {copiedId === key.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => rotateKey(key.id, key.name)}
                  className="p-1.5 rounded-md hover:bg-amber-500/15 text-amber-400/40 hover:text-amber-400 transition-colors"
                  title="Rotate key (revokes old, issues new)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => revokeKey(key.id, key.name)}
                  className="p-1.5 rounded-md hover:bg-red-500/15 text-red-400/50 hover:text-red-400 transition-colors"
                  title="Revoke key"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Revoked keys */}
      {revokedKeys.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-white/30 font-mono uppercase tracking-wider">Revoked Keys</h3>
          {revokedKeys.map(key => (
            <div key={key.id} className="flex items-center gap-4 p-3 rounded-xl border border-white/5 bg-white/1 opacity-50">
              <Key className="w-4 h-4 text-white/20 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/40 line-through">{key.name}</p>
                <code className="text-xs font-mono text-white/20">sbep_{key.keyPrefix}••••••••</code>
              </div>
              <span className="text-[10px] font-mono text-white/25 shrink-0">
                Revoked {new Date(key.revokedAt).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Docs link */}
      <div className="p-4 rounded-xl border border-violet-500/15 bg-violet-500/5 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-violet-300">API Documentation</p>
          <p className="text-xs text-white/40 mt-0.5">Authentication, endpoints, rate limits, and code examples.</p>
        </div>
        <Link
          to="/developer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/80 hover:bg-violet-600 text-white text-xs font-semibold transition-colors shrink-0"
        >
          <ExternalLink className="w-3 h-3" /> View Docs
        </Link>
      </div>
    </div>
  );
}

function DangerZoneTab({ user }) {
  const [confirm, setConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const { logout } = useAuth();

  const deleteAccount = async () => {
    if (confirm !== 'DELETE') { toast.error('Type DELETE to confirm'); return; }
    setDeleting(true);
    try {
      const res = await fetch(`/api/users/${user?.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.ok || res.status === 204) {
        toast.success('Account deleted');
        logout();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? 'Failed to delete account');
      }
    } catch { toast.error('Network error'); }
    finally { setDeleting(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-red-400 font-mono mb-1">Danger Zone</h2>
        <p className="text-sm text-white/40">Irreversible actions. Proceed with extreme caution.</p>
      </div>

      <div className="p-5 rounded-xl border border-red-500/30 bg-red-500/5 space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-300">Delete Account</p>
            <p className="text-xs text-red-400/70 mt-1">
              Permanently deletes your account, all systems, credentials, and data. This cannot be undone.
            </p>
          </div>
        </div>
        <div>
          <label className="block text-xs font-mono text-red-400/70 mb-1.5 uppercase tracking-widest">Type DELETE to confirm</label>
          <input
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="DELETE"
            className="w-full bg-red-500/5 border border-red-500/25 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-red-500/50 transition-colors"
          />
        </div>
        <button
          onClick={deleteAccount}
          disabled={deleting || confirm !== 'DELETE'}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600/80 hover:bg-red-600 border border-red-500/30 text-white text-sm font-semibold transition-colors disabled:opacity-40"
        >
          {deleting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
          Delete My Account
        </button>
      </div>
    </div>
  );
}

export default function UserSettingsPage({ defaultTab = 'profile' }) {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState(defaultTab);

  const ActiveComponent = {
    profile:       () => <ProfileTab user={currentUser} />,
    security:      () => <SecurityTab />,
    billing:       () => <BillingTab user={currentUser} />,
    notifications: () => <NotificationsTab />,
    voice:         () => <VoiceTab />,
    branding:      () => <BrandingTab user={currentUser} />,
    developer:     () => <DeveloperTab user={currentUser} />,
    danger:        () => <DangerZoneTab user={currentUser} />,
  }[activeTab] ?? (() => null);

  return (
    <AuthLayout>
      <Helmet><title>Settings | Starks Global Group</title></Helmet>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs text-violet-400 font-mono font-semibold mb-3">
            <User className="w-3 h-3" /> ACCOUNT SETTINGS
          </div>
          <h1 className="text-3xl font-extrabold text-white font-mono tracking-tight">Settings</h1>
          <p className="text-white/40 text-sm mt-1">Manage your profile, security, and preferences.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar tabs */}
          <aside className="md:w-52 shrink-0">
            <nav className="space-y-1">
              {TABS.filter(t => !t.empireOnly || (
                ['empire','operator'].includes((currentUser?.membershipTier || '').toLowerCase()) ||
                ['SUPER_ADMIN','FOUNDER_ADMIN','ADMIN'].includes(currentUser?.role || '')
              )).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={[
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left',
                    id === 'danger' ? (
                      activeTab === id
                        ? 'bg-red-500/15 border border-red-500/25 text-red-300'
                        : 'text-red-400/60 hover:text-red-400 hover:bg-red-500/8 border border-transparent'
                    ) : (
                      activeTab === id
                        ? 'bg-violet-500/12 border border-violet-500/20 text-violet-300'
                        : 'text-white/45 hover:text-white/80 hover:bg-white/5 border border-transparent'
                    ),
                  ].join(' ')}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${id === 'danger' ? (activeTab === id ? 'text-red-400' : 'text-red-400/50') : (activeTab === id ? 'text-violet-400' : 'text-white/35')}`} />
                  {label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <div className="flex-1 min-w-0 bg-white/3 border border-white/8 rounded-2xl p-6">
            <ActiveComponent />
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
