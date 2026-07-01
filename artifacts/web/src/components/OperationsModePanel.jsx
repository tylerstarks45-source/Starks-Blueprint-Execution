import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Lock, ShieldCheck, Loader2, ArrowRight, Eye, PenLine, CalendarClock, Wrench, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAuthHeaders } from '@/lib/apiHeaders.js';

const authHeaders = () => getAuthHeaders();

const PERMISSION_META = [
  { key: 'monitorOnly', label: 'Monitor only', description: 'ASH watches performance and health, no changes.', icon: Eye, risk: 'low' },
  { key: 'draftContent', label: 'Draft content', description: 'ASH drafts posts/copy for your review.', icon: PenLine, risk: 'low' },
  { key: 'schedulePosts', label: 'Schedule posts', description: 'ASH schedules and publishes approved content.', icon: CalendarClock, risk: 'low' },
  { key: 'autoFixLowRisk', label: 'Auto-fix low-risk issues', description: 'ASH resolves minor issues automatically (e.g. broken links, metadata).', icon: Wrench, risk: 'low' },
  { key: 'autoFixHighRisk', label: 'Auto-fix high-risk issues', description: 'ASH can make significant changes (pricing, integrations). Always requires approval.', icon: ShieldAlert, risk: 'high' },
];

export default function OperationsModePanel({ businessId }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locked, setLocked] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState('');
  const [settings, setSettings] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/operations-settings`, { headers: authHeaders() });
      if (res.status === 403) {
        const body = await res.json().catch(() => ({}));
        setLocked(true);
        setUpgradeMessage(body.error || 'ASH Operations Mode requires the Operator or Empire plan.');
        return;
      }
      if (!res.ok) throw new Error('Failed to load operations settings');
      setLocked(false);
      setSettings(await res.json());
    } catch (err) {
      toast.error(err.message || 'Failed to load operations settings');
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => { load(); }, [load]);

  const save = async (patch) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/operations-settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(patch),
      });
      if (res.status === 403) {
        const body = await res.json().catch(() => ({}));
        setLocked(true);
        setUpgradeMessage(body.error || 'ASH Operations Mode requires the Operator or Empire plan.');
        return;
      }
      if (!res.ok) throw new Error('Failed to save operations settings');
      setSettings(await res.json());
      toast.success('Operations Mode settings updated');
    } catch (err) {
      toast.error(err.message || 'Failed to save operations settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-4 h-4 text-muted-foreground/40 animate-spin" />
      </div>
    );
  }

  if (locked) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/3 p-5 text-center space-y-3">
        <div className="flex justify-center">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Lock className="w-5 h-5 text-primary" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground/70 leading-relaxed">{upgradeMessage}</p>
        <button
          onClick={() => navigate('/pricing')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          Upgrade to Operator or Empire <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    );
  }

  if (!settings) return null;

  const permissions = settings.permissions;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/3 p-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${settings.enabled ? 'bg-emerald-400/10 border-emerald-400/20' : 'bg-white/5 border-white/10'}`}>
            <ShieldCheck className={`w-4.5 h-4.5 ${settings.enabled ? 'text-emerald-400' : 'text-muted-foreground/50'}`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Operations Mode</p>
            <p className="text-[11px] text-muted-foreground/60">ASH continuously monitors, drafts, and schedules for this business.</p>
          </div>
        </div>
        <button
          role="switch"
          aria-checked={settings.enabled}
          disabled={saving}
          onClick={() => save({ enabled: !settings.enabled })}
          className={`relative shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${settings.enabled ? 'bg-emerald-500' : 'bg-white/15'}`}
        >
          <span className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white transition-transform ${settings.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      <div className="space-y-2">
        {PERMISSION_META.map(({ key, label, description, icon: Icon, risk }) => (
          <label
            key={key}
            className={`flex items-start gap-3 rounded-xl border border-white/10 bg-black/40 p-3 cursor-pointer transition-opacity ${!settings.enabled ? 'opacity-50' : ''}`}
          >
            <input
              type="checkbox"
              checked={!!permissions[key]}
              disabled={saving || !settings.enabled}
              onChange={(e) => save({ permissions: { ...permissions, [key]: e.target.checked } })}
              className="mt-0.5 w-4 h-4 rounded accent-primary"
            />
            <Icon className="w-4 h-4 text-muted-foreground/50 mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-foreground">{label}</p>
                {risk === 'high' && (
                  <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-rose-400/10 text-rose-400 border border-rose-400/20">
                    High risk
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">{description}</p>
            </div>
          </label>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground/40 leading-relaxed">
        Low-risk approved categories run automatically. High-risk actions and anything not explicitly granted always land in your Approval Queue first.
      </p>
    </div>
  );
}
