import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, Zap, CheckCircle2, AlertTriangle, Clock, Server,
  Brain, Cpu, Database, CreditCard, RefreshCw, ChevronRight,
  TrendingUp, BarChart3, Settings2, Wifi, Play, Pause, RotateCcw,
  Trash2, Wrench, DollarSign, Calendar, CircleDot, ExternalLink,
  KeyRound, Globe, ShoppingCart, Mail, Video, Radio, Lock,
  MoreHorizontal, Plus
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {};
};

// ─── Primitives ───────────────────────────────────────────────────────────────

const StatusDot = ({ status }) => {
  const map = {
    operational: 'bg-emerald-500', connected: 'bg-emerald-500',
    degraded: 'bg-amber-400', warning: 'bg-amber-400',
    not_configured: 'bg-zinc-600', disconnected: 'bg-zinc-600',
    offline: 'bg-rose-500',
  };
  const pulse = status === 'operational' || status === 'connected';
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      {pulse && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${map[status] ?? 'bg-zinc-600'}`} />
    </span>
  );
};

const StatusLabel = ({ status }) => {
  const map = {
    operational: ['text-emerald-400', 'Connected'],
    connected: ['text-emerald-400', 'Connected'],
    degraded: ['text-amber-400', 'Degraded'],
    warning: ['text-amber-400', 'Warning'],
    not_configured: ['text-zinc-500', 'Not Set Up'],
    disconnected: ['text-zinc-500', 'Not Set Up'],
    offline: ['text-rose-400', 'Offline'],
  };
  const [cls, label] = map[status] ?? ['text-zinc-500', 'Unknown'];
  return <span className={`text-xs font-medium ${cls}`}>{label}</span>;
};

const StatCard = ({ icon: Icon, label, value, sub, color = 'text-primary', accent = 'bg-primary/10', onClick }) => (
  <div
    onClick={onClick}
    className={`rounded-xl border border-white/10 bg-black/40 backdrop-blur-md p-5 flex items-start gap-4 ${onClick ? 'cursor-pointer hover:bg-white/5 transition-colors' : ''}`}
  >
    <div className={`w-10 h-10 rounded-xl ${accent} flex items-center justify-center shrink-0`}>
      <Icon className={`w-5 h-5 ${color}`} />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-0.5">{label}</p>
      <p className={`text-2xl font-bold leading-none font-mono ${color}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  </div>
);

const SectionHeader = ({ icon: Icon, title, sub, action }) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
    {action}
  </div>
);

const BuildBadge = ({ buildStatus, healthStatus }) => {
  if (healthStatus === 'healthy' || buildStatus === 'active') return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-[10px]">Active</Badge>;
  if (buildStatus === 'building') return <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/20 text-[10px]">Building</Badge>;
  if (buildStatus === 'paused') return <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20 text-[10px]">Paused</Badge>;
  if (healthStatus === 'unhealthy') return <Badge className="bg-rose-500/15 text-rose-400 border-rose-500/20 text-[10px]">Failed</Badge>;
  if (buildStatus === 'completed') return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-[10px]">Live</Badge>;
  return <Badge className="bg-zinc-500/15 text-zinc-400 border-zinc-500/20 text-[10px]">Pending</Badge>;
};

// ─── KNOWN TOOL DEFINITIONS ──────────────────────────────────────────────────

const KNOWN_TOOLS = [
  { name: 'OpenRouter', keys: ['OPENROUTER_API_KEY', 'openrouter_api_key'], icon: Brain, desc: 'AI engine for all systems', category: 'AI' },
  { name: 'Stripe', keys: ['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY', 'stripe_secret_key'], icon: CreditCard, desc: 'Payments & subscriptions', category: 'Commerce' },
  { name: 'Resend', keys: ['RESEND_API_KEY', 'resend_api_key'], icon: Mail, desc: 'Transactional email delivery', category: 'Email' },
  { name: 'TikTok', keys: ['TIKTOK_ACCESS_TOKEN', 'tiktok_cookie', 'TIKTOK_COOKIE'], icon: Video, desc: 'TikTok content & traffic', category: 'Social' },
  { name: 'YouTube', keys: ['YOUTUBE_API_KEY', 'youtube_api_key', 'YOUTUBE_OAUTH_TOKEN'], icon: Video, desc: 'YouTube automation', category: 'Social' },
  { name: 'Meta', keys: ['META_ACCESS_TOKEN', 'meta_access_token', 'FACEBOOK_ACCESS_TOKEN'], icon: Radio, desc: 'Facebook & Instagram', category: 'Social' },
  { name: 'Shopify', keys: ['SHOPIFY_API_KEY', 'shopify_api_key', 'SHOPIFY_STORE_URL'], icon: ShoppingCart, desc: 'eCommerce automation', category: 'Commerce' },
  { name: 'Gmail', keys: ['GMAIL_REFRESH_TOKEN', 'gmail_refresh_token', 'GMAIL_CLIENT_ID'], icon: Mail, desc: 'Gmail outreach & automation', category: 'Email' },
  { name: 'Cloudflare', keys: ['CLOUDFLARE_API_TOKEN', 'cloudflare_api_token'], icon: Globe, desc: 'DNS & edge deployment', category: 'Infrastructure' },
  { name: 'Make.com', keys: ['MAKE_API_KEY', 'make_api_key', 'MAKE_WEBHOOK_URL'], icon: Settings2, desc: 'Workflow automation', category: 'Automation' },
  { name: 'Database', keys: ['DATABASE_URL'], icon: Database, desc: 'PostgreSQL data storage', category: 'Infrastructure' },
];

// ─── ACTIVITY FEED HELPERS ───────────────────────────────────────────────────

function deriveActivity(systems) {
  const events = [];
  systems.forEach(s => {
    if (s.createdAt) events.push({
      id: `created-${s.id}`,
      type: 'system_created',
      label: 'System created',
      detail: s.name,
      ts: new Date(s.createdAt),
      color: 'text-blue-400',
      icon: Plus,
    });
    if (s.buildStatus === 'building') events.push({
      id: `building-${s.id}`,
      type: 'build_started',
      label: 'Build started',
      detail: s.name,
      ts: new Date(s.updatedAt || s.createdAt),
      color: 'text-primary',
      icon: Zap,
    });
    if (s.buildStatus === 'completed' || s.healthStatus === 'healthy') events.push({
      id: `complete-${s.id}`,
      type: 'build_complete',
      label: 'System deployed',
      detail: s.name,
      ts: new Date(s.updatedAt || s.createdAt),
      color: 'text-emerald-400',
      icon: CheckCircle2,
    });
  });
  return events.sort((a, b) => b.ts - a.ts).slice(0, 12);
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

const SystemCommandCenterPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [credits, setCredits] = useState(null);
  const [storedKeys, setStoredKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);
  const [controlLoading, setControlLoading] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const user = JSON.parse(localStorage.getItem('sbep_auth_user') || '{}');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [statsResp, revenueResp, creditsResp, credsResp] = await Promise.all([
        fetch('/api/ai-orchestrator/platform-stats', { headers: authHeaders() }),
        fetch('/api/dashboard/revenue-summary', { headers: authHeaders() }),
        fetch('/api/credits/me', { headers: authHeaders() }),
        fetch(`/api/user-credentials?userId=${user.id ?? ''}`, { headers: authHeaders() }),
      ]);
      if (!statsResp.ok) throw new Error('Failed to load platform stats');
      const [statsData, revData, credData, credsData] = await Promise.all([
        statsResp.json(),
        revenueResp.ok ? revenueResp.json() : null,
        creditsResp.ok ? creditsResp.json() : null,
        credsResp.ok ? credsResp.json() : [],
      ]);
      setData(statsData);
      setRevenue(revData);
      setCredits(credData);
      setStoredKeys(Array.isArray(credsData) ? credsData.map(c => c.credentialKey?.toLowerCase()) : []);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  const patchSystem = useCallback(async (id, body) => {
    setControlLoading(prev => ({ ...prev, [id]: true }));
    try {
      const resp = await fetch(`/api/system-instances/${id}`, {
        method: 'PATCH', headers: authHeaders(), body: JSON.stringify(body),
      });
      if (resp.ok) await load();
    } finally {
      setControlLoading(prev => ({ ...prev, [id]: false }));
    }
  }, [load]);

  const deleteSystem = useCallback(async (id) => {
    setControlLoading(prev => ({ ...prev, [id]: true }));
    try {
      await fetch(`/api/system-instances/${id}`, { method: 'DELETE', headers: authHeaders() });
      setDeleteConfirm(null);
      await load();
    } finally {
      setControlLoading(prev => ({ ...prev, [id]: false }));
    }
  }, [load]);

  // ── Tool connection status derived from stored credentials ────────────────
  const toolStatus = KNOWN_TOOLS.map(tool => {
    const isConnected = tool.keys.some(k => storedKeys.includes(k.toLowerCase()));
    // OpenRouter and Database are special: check server-side from toolHealth
    if (tool.name === 'OpenRouter') {
      const srv = data?.toolHealth?.openrouter?.status;
      return { ...tool, status: srv === 'operational' ? 'connected' : srv === 'degraded' ? 'degraded' : 'not_configured' };
    }
    if (tool.name === 'Database') return { ...tool, status: 'operational' };
    return { ...tool, status: isConnected ? 'connected' : 'not_configured' };
  });

  const connectedCount = toolStatus.filter(t => t.status === 'connected' || t.status === 'operational').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground font-mono">Loading Command Center…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
          <p className="text-sm text-rose-400">{error}</p>
          <Button size="sm" variant="outline" onClick={load} className="border-white/10">Retry</Button>
        </div>
      </div>
    );
  }

  const { systemStats, systems = [], aiActivity, toolHealth } = data ?? {};
  const activity = deriveActivity(systems);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* ── Command Center Header ────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground font-mono">System Command Center</h2>
            <Badge variant="outline" className="text-[9px] border-primary/30 text-primary bg-primary/5 font-mono">LIVE</Badge>
          </div>
          <p className="text-sm text-muted-foreground ml-11">
            Monitor and manage all deployed automation systems
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {lastRefresh && (
            <span className="text-[11px] text-muted-foreground/50 font-mono">
              {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <Button size="sm" variant="outline" onClick={load} className="h-8 text-xs border-white/10 gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />Refresh
          </Button>
          <Button size="sm" onClick={() => navigate('/builder')} className="h-8 text-xs gap-1.5">
            <Zap className="w-3.5 h-3.5" />Build New System
          </Button>
        </div>
      </div>

      {/* ── Systems Overview Stats ───────────────────────────────────────── */}
      <section>
        <SectionHeader icon={Activity} title="Systems Overview" sub="All your automation systems at a glance" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard icon={Server} label="Total" value={systemStats?.total ?? 0} sub="All systems" color="text-foreground" accent="bg-white/5" />
          <StatCard icon={CheckCircle2} label="Running" value={systemStats?.active ?? 0} sub="Healthy & live" color="text-emerald-400" accent="bg-emerald-500/10" />
          <StatCard icon={Zap} label="Building" value={systemStats?.building ?? 0} sub="Deploying now" color="text-blue-400" accent="bg-blue-500/10" />
          <StatCard icon={Clock} label="Paused" value={systemStats?.paused ?? 0} sub="Awaiting resume" color="text-amber-400" accent="bg-amber-500/10" />
          <StatCard icon={AlertTriangle} label="Failed" value={systemStats?.failed ?? 0} sub="Need attention" color="text-rose-400" accent="bg-rose-500/10" />
        </div>
      </section>

      {/* ── Revenue Center ───────────────────────────────────────────────── */}
      <section>
        <SectionHeader
          icon={DollarSign}
          title="Revenue Center"
          sub="Stripe billing integration activates live tracking"
          action={
            <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-400 bg-amber-500/5 font-mono">
              STRIPE PENDING
            </Badge>
          }
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Today', value: revenue?.today ?? 0, icon: Calendar, color: 'text-foreground', accent: 'bg-white/5' },
            { label: 'This Week', value: revenue?.thisWeek ?? 0, icon: TrendingUp, color: 'text-primary', accent: 'bg-primary/10' },
            { label: 'This Month', value: revenue?.thisMonth ?? 0, icon: BarChart3, color: 'text-violet-400', accent: 'bg-violet-500/10' },
            { label: 'Lifetime', value: revenue?.lifetime ?? 0, icon: DollarSign, color: 'text-emerald-400', accent: 'bg-emerald-500/10' },
          ].map(({ label, value, icon: Icon, color, accent }) => (
            <div key={label} className="rounded-xl border border-white/10 bg-black/40 backdrop-blur-md p-5 flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl ${accent} flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-0.5">{label}</p>
                <p className={`text-2xl font-bold leading-none font-mono ${color}`}>
                  ${value.toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground/40 mt-1">Connect Stripe to track</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── AI Operations + Credits ──────────────────────────────────────── */}
      <section>
        <SectionHeader icon={Brain} title="AI Operations" sub="STARK orchestrator usage and performance" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Zap} label="AI Requests" value={aiActivity?.totalRequests ?? 0} sub="Total completions" />
          <StatCard icon={BarChart3} label="Tokens Used" value={(aiActivity?.totalTokens ?? 0).toLocaleString()} sub="Across all builds" />
          <StatCard icon={TrendingUp} label="Success Rate" value={`${aiActivity?.successRate ?? 100}%`} sub="Build reliability" color="text-emerald-400" accent="bg-emerald-500/10" />
          <StatCard icon={CreditCard} label="Credits" value={credits?.balance ?? '—'} sub="Available balance" color="text-primary" accent="bg-primary/10" />
        </div>
      </section>

      {/* ── System Health + Controls ─────────────────────────────────────── */}
      <section>
        <SectionHeader
          icon={Server}
          title="System Health"
          sub="Live status, health, and controls for every deployed system"
          action={
            <Button size="sm" onClick={() => navigate('/builder')} className="h-7 text-xs gap-1.5 bg-primary/15 hover:bg-primary/25 text-primary border border-primary/25">
              <Plus className="w-3 h-3" /> New System
            </Button>
          }
        />

        {systems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-black/20 px-6 py-14 text-center">
            <Server className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground mb-1">No systems deployed yet</p>
            <p className="text-xs text-muted-foreground/50 mb-5">
              Use STARK to build your first automated income system in minutes.
            </p>
            <Button size="sm" onClick={() => navigate('/builder')} className="gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Build My First System
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-black/40 backdrop-blur-md overflow-hidden">
            {/* Table head */}
            <div className="hidden md:grid md:grid-cols-12 gap-4 px-5 py-3 border-b border-white/10 bg-white/2">
              {['System / Blueprint', 'Status', 'Health', 'Last Activity', 'Controls'].map((h, i, a) => (
                <div key={h} className={`${i === 0 ? 'col-span-3' : i === 4 ? 'col-span-3 text-right' : 'col-span-2'} text-[10px] uppercase tracking-widest text-muted-foreground font-medium`}>{h}</div>
              ))}
            </div>
            {systems.map((system, i) => {
              const isLoading = controlLoading[system.id];
              const isPaused = system.buildStatus === 'paused';
              const isBuilding = system.buildStatus === 'building';
              const isActive = system.buildStatus === 'active' || system.healthStatus === 'healthy';
              const lastActivity = system.updatedAt ? new Date(system.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

              return (
                <div key={system.id} className={`px-5 py-4 hover:bg-white/3 transition-colors ${i < systems.length - 1 ? 'border-b border-white/8' : ''}`}>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-center">
                    {/* System name */}
                    <div className="md:col-span-3 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{system.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{system.blueprint?.name ?? 'Custom System'}</p>
                    </div>
                    {/* Status */}
                    <div className="md:col-span-2">
                      <BuildBadge buildStatus={system.buildStatus} healthStatus={system.healthStatus} />
                    </div>
                    {/* Health */}
                    <div className="md:col-span-2 flex items-center gap-1.5">
                      <StatusDot status={system.healthStatus === 'unhealthy' ? 'offline' : isBuilding ? 'degraded' : isActive ? 'operational' : 'not_configured'} />
                      <span className="text-xs text-muted-foreground">
                        {isActive ? 'Healthy' : isBuilding ? 'Deploying…' : isPaused ? 'Paused' : system.healthStatus ?? 'Pending'}
                      </span>
                    </div>
                    {/* Last activity */}
                    <div className="md:col-span-2">
                      <span className="text-xs text-muted-foreground/60 font-mono">{lastActivity}</span>
                    </div>
                    {/* Controls */}
                    <div className="md:col-span-3 flex items-center gap-1.5 flex-wrap md:justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/build/${system.id}`)}
                        disabled={isLoading}
                        className="h-7 text-xs px-2.5 gap-1 text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="w-3 h-3" /> Open
                      </Button>
                      {isPaused ? (
                        <Button size="sm" variant="ghost" onClick={() => patchSystem(system.id, { buildStatus: 'active' })} disabled={isLoading}
                          className="h-7 text-xs px-2.5 gap-1 text-emerald-400/70 hover:text-emerald-400 hover:bg-emerald-500/10">
                          <Play className="w-3 h-3" /> Resume
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => patchSystem(system.id, { buildStatus: 'paused' })} disabled={isLoading || isBuilding}
                          className="h-7 text-xs px-2.5 gap-1 text-amber-400/70 hover:text-amber-400 hover:bg-amber-500/10">
                          <Pause className="w-3 h-3" /> Pause
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => patchSystem(system.id, { buildStatus: 'building' })} disabled={isLoading}
                        className="h-7 text-xs px-2.5 gap-1 text-blue-400/70 hover:text-blue-400 hover:bg-blue-500/10">
                        <RotateCcw className="w-3 h-3" /> Restart
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => navigate('/builder')} disabled={isLoading}
                        className="h-7 text-xs px-2.5 gap-1 text-muted-foreground/60 hover:text-foreground">
                        <Wrench className="w-3 h-3" /> Rebuild
                      </Button>
                      {deleteConfirm === system.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-rose-400">Confirm?</span>
                          <Button size="sm" variant="ghost" onClick={() => deleteSystem(system.id)} disabled={isLoading}
                            className="h-6 text-[10px] px-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10">Yes</Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(null)}
                            className="h-6 text-[10px] px-2 text-muted-foreground">No</Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(system.id)} disabled={isLoading}
                          className="h-7 text-xs px-2 text-rose-400/50 hover:text-rose-400 hover:bg-rose-500/10">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Tool Stack Monitor ───────────────────────────────────────────── */}
      <section>
        <SectionHeader
          icon={Settings2}
          title="Tool Stack Monitor"
          sub={`${connectedCount} of ${KNOWN_TOOLS.length} integrations configured`}
          action={
            <Button size="sm" variant="outline" onClick={() => navigate('/connections')} className="h-7 text-xs border-white/10 gap-1.5">
              <KeyRound className="w-3 h-3" /> Manage Credentials
            </Button>
          }
        />
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
          {toolStatus.map((tool) => (
            <div
              key={tool.name}
              className="rounded-xl border border-white/10 bg-black/40 backdrop-blur-sm p-4 flex items-start gap-3 hover:bg-white/5 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                <tool.icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground truncate">{tool.name}</p>
                <p className="text-[10px] text-muted-foreground/60 truncate">{tool.category}</p>
                <div className="flex items-center gap-1 mt-1.5">
                  <StatusDot status={tool.status} />
                  <StatusLabel status={tool.status} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── AI Operations Feed + Activity Feed ──────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* AI Operations */}
        <section>
          <SectionHeader icon={Brain} title="AI Operations Feed" sub="Recent STARK actions and optimizations" />
          <div className="rounded-xl border border-white/10 bg-black/40 backdrop-blur-md overflow-hidden">
            {aiActivity?.totalRequests > 0 ? (
              <div className="divide-y divide-white/8">
                <div className="flex items-start gap-3 px-4 py-3.5">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Brain className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">{aiActivity.totalRequests} AI completions processed</p>
                    <p className="text-[11px] text-muted-foreground/60">{(aiActivity.totalTokens || 0).toLocaleString()} total tokens · {aiActivity.successRate ?? 100}% success rate</p>
                  </div>
                </div>
                {systems.filter(s => s.buildStatus === 'building').map(s => (
                  <div key={s.id} className="flex items-start gap-3 px-4 py-3.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Zap className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">Building: {s.name}</p>
                      <p className="text-[11px] text-muted-foreground/60">Autonomous build in progress</p>
                    </div>
                  </div>
                ))}
                <div className="flex items-start gap-3 px-4 py-3.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">STARK Orchestrator — Operational</p>
                    <p className="text-[11px] text-muted-foreground/60">Ready to build any automated system</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-5 py-10 text-center">
                <Brain className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground/50">No AI activity yet. Build a system to see STARK in action.</p>
              </div>
            )}
          </div>
        </section>

        {/* Activity Feed */}
        <section>
          <SectionHeader icon={Activity} title="Activity Feed" sub="Platform events and system lifecycle" />
          <div className="rounded-xl border border-white/10 bg-black/40 backdrop-blur-md overflow-hidden">
            {activity.length > 0 ? (
              <div className="divide-y divide-white/8 max-h-72 overflow-y-auto">
                {activity.map(evt => (
                  <div key={evt.id} className="flex items-start gap-3 px-4 py-3">
                    <div className={`w-6 h-6 rounded-md bg-white/5 flex items-center justify-center shrink-0 mt-0.5`}>
                      <evt.icon className={`w-3 h-3 ${evt.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-foreground truncate">{evt.label}</p>
                        <span className="text-[10px] text-muted-foreground/40 shrink-0 font-mono">
                          {evt.ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground/60 truncate">{evt.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-10 text-center">
                <Activity className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground/50">No activity yet. Create a system to see events here.</p>
              </div>
            )}
          </div>
        </section>
      </div>

    </div>
  );
};

export default SystemCommandCenterPage;
