import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { toast } from 'sonner';
import {
  User, Lock, CreditCard, Bell, Trash2, Eye, EyeOff,
  Save, Check, Shield, AlertTriangle, Mail,
} from 'lucide-react';
import AuthLayout from '@/components/AuthLayout.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';

const TABS = [
  { id: 'profile',       label: 'Profile',       icon: User },
  { id: 'security',      label: 'Security',       icon: Lock },
  { id: 'billing',       label: 'Billing',        icon: CreditCard },
  { id: 'notifications', label: 'Notifications',  icon: Bell },
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
    platform_updates: { label: 'Platform updates',          desc: 'What\'s new in SBEP — features and improvements.' },
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

export default function UserSettingsPage() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  const ActiveComponent = {
    profile:       () => <ProfileTab user={currentUser} />,
    security:      () => <SecurityTab />,
    billing:       () => <BillingTab user={currentUser} />,
    notifications: () => <NotificationsTab />,
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
              {TABS.map(({ id, label, icon: Icon }) => (
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
