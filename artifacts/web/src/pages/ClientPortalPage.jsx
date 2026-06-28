import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import PageMeta from '@/components/PageMeta.jsx';
import { motion } from 'framer-motion';
import { Loader2, Building2, Layers, Activity, DollarSign, AlertTriangle, CheckCircle2, Clock, Zap } from 'lucide-react';
import VideoBackground from '@/components/VideoBackground.jsx';

/**
 * Convert a hex color to an "H S% L%" triplet for use inside hsl().
 * Tailwind tokens use hsl(var(--primary)), so the variable must be a bare triplet.
 */
function hexToHslTriplet(hex) {
  const clean = hex.replace(/^#/, '');
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyWhiteLabelTheme(cfg) {
  if (!cfg) return;
  const root = document.documentElement;
  if (cfg.primaryColor) {
    root.style.setProperty('--wl-primary', cfg.primaryColor);
    root.style.setProperty('--primary', hexToHslTriplet(cfg.primaryColor));
  }
  if (cfg.accentColor) {
    root.style.setProperty('--wl-accent', cfg.accentColor);
    root.style.setProperty('--accent', hexToHslTriplet(cfg.accentColor));
  }
  if (cfg.brandName) document.title = `${cfg.brandName} — Client Portal`;
}

const STATUS_CONFIG = {
  complete:    { label: 'Live',         cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25', icon: CheckCircle2 },
  building:    { label: 'Building',     cls: 'bg-blue-500/15 text-blue-400 border-blue-500/25',          icon: Zap },
  pending:     { label: 'Pending',      cls: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25',          icon: Clock },
  failed:      { label: 'Failed',       cls: 'bg-rose-500/15 text-rose-400 border-rose-500/25',          icon: AlertTriangle },
  paused:      { label: 'Paused',       cls: 'bg-amber-500/15 text-amber-400 border-amber-500/25',       icon: Clock },
};

const SystemRow = ({ system }) => {
  const cfg = STATUS_CONFIG[system.buildStatus] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  const revenue = (system.lifetimeRevenueCents / 100).toFixed(2);

  return (
    <div className="flex items-center justify-between p-4 bg-muted/10 border border-border/30 rounded-xl hover:bg-muted/20 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
          <Layers className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{system.name}</p>
          <p className="text-xs text-muted-foreground">
            Updated {new Date(system.updatedAt).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-sm font-mono font-semibold text-emerald-400">${revenue}</span>
        <span className={`flex items-center gap-1 px-2 py-0.5 border rounded-full text-[10px] font-bold ${cfg.cls}`}>
          <Icon className="w-3 h-3" />
          {cfg.label}
        </span>
      </div>
    </div>
  );
};

const ClientPortalPage = () => {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [wlConfig, setWlConfig] = useState(null);

  useEffect(() => {
    if (!token) { setNotFound(true); setIsLoading(false); return; }
    fetch(`/api/portal/${token}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then(d => {
        if (!d) return;
        setData(d);
        // Fetch the agency's white-label config if they have a verified custom domain
        if (d.agencyUserId) {
          fetch(`/api/white-label/by-agency/${d.agencyUserId}`)
            .then(r => r.ok ? r.json() : null)
            .then(cfg => {
              if (cfg) {
                setWlConfig(cfg);
                applyWhiteLabelTheme(cfg);
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, [token]);

  if (isLoading) {
    return (
      <VideoBackground className="flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </VideoBackground>
    );
  }

  if (notFound || !data) {
    return (
      <VideoBackground className="flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">Portal Not Found</h1>
          <p className="text-muted-foreground text-sm">This portal link may have expired or been reset. Please contact your agency for an updated link.</p>
        </div>
      </VideoBackground>
    );
  }

  const { workspace, agencyName, systems } = data;
  const totalRevenue = systems.reduce((sum, s) => sum + (s.lifetimeRevenueCents || 0), 0);
  const liveSystems = systems.filter(s => s.buildStatus === 'complete').length;

  return (
    <VideoBackground>
      <PageMeta title={`${workspace.name} — Client Portal`} description={`View your AI systems managed by ${agencyName}.`} />

      {/* Header */}
      <div className="border-b border-border/30 bg-card/50 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {workspace.logoUrl ? (
              <img src={workspace.logoUrl} alt={workspace.name} className="w-10 h-10 rounded-xl object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-base font-bold text-foreground">{workspace.name}</h1>
              <p className="text-xs text-muted-foreground">Managed by {agencyName}</p>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary/60 border border-primary/20 rounded-full px-2 py-0.5">
            Read Only
          </span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Layers,      label: 'Total Systems',  value: systems.length,                       cls: 'text-foreground' },
            { icon: CheckCircle2, label: 'Live Systems',  value: liveSystems,                          cls: 'text-emerald-400' },
            { icon: DollarSign,  label: 'Total Revenue',  value: `$${(totalRevenue / 100).toFixed(2)}`, cls: 'text-emerald-400' },
          ].map(({ icon: Icon, label, value, cls }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border/50 rounded-xl p-4 text-center"
            >
              <Icon className={`w-5 h-5 mx-auto mb-2 ${cls}`} />
              <div className={`text-xl font-bold ${cls}`}>{value}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{label}</div>
            </motion.div>
          ))}
        </div>

        {/* Systems list */}
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <h2 className="font-bold text-foreground text-sm">Your Systems</h2>
            <span className="ml-auto text-xs text-muted-foreground">{systems.length} total</span>
          </div>
          {systems.length === 0 ? (
            <div className="py-12 text-center">
              <Layers className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No systems built yet. Your agency will add systems to this workspace.</p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {systems.map(s => <SystemRow key={s.id} system={s} />)}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground/60">
          Managed by {agencyName}
        </p>
      </div>
    </VideoBackground>
  );
};

export default ClientPortalPage;
