import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, Zap, CheckCircle2, AlertTriangle, Clock, Server,
  Brain, Cpu, CreditCard, RefreshCw, TrendingUp,
  Play, Pause, RotateCcw, Trash2, DollarSign,
  ExternalLink, Plus, XCircle, Coins, Wifi, WifiOff,
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, ResponsiveContainer, Tooltip,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {};
};

const fmt = (cents) =>
  '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const buildDailyData = (daily) => {
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
    const found = (daily || []).find(r => r.date === key);
    result.push({ day: dayLabel, date: key, cents: found ? Number(found.cents) : 0 });
  }
  return result;
};

const buildWeeklyData = (weekCents) => [
  { week: '4w ago', cents: 0 },
  { week: '3w ago', cents: 0 },
  { week: '2w ago', cents: 0 },
  { week: 'This week', cents: weekCents ?? 0 },
];

const buildAISparkData = (aiActivity) => {
  const total = aiActivity?.totalRequests ?? 0;
  return [0, 0, 0, 0, 0, 0, total].map((v, i) => ({ i, val: v }));
};

const buildSystemSparkData = (systemStats) => {
  const total = systemStats?.total ?? 0;
  return [0, 0, 0, 0, 0, 0, total].map((v, i) => ({ i, val: v }));
};

const RevenueTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-black/95 border border-white/10 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-muted-foreground mb-0.5">{label}</p>
      <p className="text-foreground font-mono font-bold">{fmt(payload[0]?.value ?? 0)}</p>
    </div>
  );
};

const PulseChip = ({ icon: Icon, label, value, color }) => {
  const colorMap = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    blue:    'text-blue-400 bg-blue-500/10 border-blue-500/20',
    amber:   'text-amber-400 bg-amber-500/10 border-amber-500/20',
    rose:    'text-rose-400 bg-rose-500/10 border-rose-500/20',
    zinc:    'text-zinc-400 bg-zinc-500/10 border-zinc-600/30',
    violet:  'text-violet-400 bg-violet-500/10 border-violet-500/20',
  };
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-mono font-semibold ${colorMap[color] ?? colorMap.zinc}`}>
      <Icon className="w-3 h-3" />
      <span className="text-foreground tabular-nums">{value}</span>
      <span className="text-muted-foreground/50">{label}</span>
    </div>
  );
};

const BuildBadge = ({ buildStatus, healthStatus }) => {
  if (buildStatus === 'active' || healthStatus === 'healthy') return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-[10px]">Active</Badge>;
  if (buildStatus === 'building') return <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/20 text-[10px]">Building</Badge>;
  if (buildStatus === 'paused') return <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20 text-[10px]">Paused</Badge>;
  if (buildStatus === 'completed') return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-[10px]">Live</Badge>;
  if (healthStatus === 'unhealthy') return <Badge className="bg-rose-500/15 text-rose-400 border-rose-500/20 text-[10px]">Failed</Badge>;
  return <Badge className="bg-zinc-500/15 text-zinc-400 border-zinc-500/20 text-[10px]">Pending</Badge>;
};

const healthPercent = (buildStatus, healthStatus) => {
  if (healthStatus === 'healthy' || buildStatus === 'active' || buildStatus === 'completed') return 100;
  if (buildStatus === 'building') return 55;
  if (buildStatus === 'paused') return 40;
  if (healthStatus === 'unhealthy') return 5;
  return 25;
};

const uptimeLabel = (createdAt, buildStatus) => {
  if (!['active', 'completed', 'building'].includes(buildStatus)) return '—';
  if (!createdAt) return '—';
  const ms = Date.now() - new Date(createdAt).getTime();
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((ms % 3600000) / 60000);
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

const NOTIF_TYPE_MAP = {
  error:   { color: 'text-rose-400',    icon: XCircle,       label: 'Error' },
  warning: { color: 'text-amber-400',   icon: AlertTriangle, label: 'Warning' },
  success: { color: 'text-emerald-400', icon: CheckCircle2,  label: 'Build Completed' },
  revenue: { color: 'text-emerald-400', icon: Coins,         label: 'Revenue Generated' },
  info:    { color: 'text-primary',     icon: Activity,      label: 'Info' },
};

function buildActivityFeed(systems, notifications) {
  const events = [];
  systems.forEach(s => {
    if (s.createdAt) events.push({ id: `created-${s.id}`, label: 'System Created', detail: s.name, ts: new Date(s.createdAt), color: 'text-blue-400', icon: Plus });
    if (s.buildStatus === 'building') events.push({ id: `building-${s.id}`, label: 'Build Started', detail: s.name, ts: new Date(s.updatedAt || s.createdAt), color: 'text-primary', icon: Zap });
    if (s.buildStatus === 'completed' || s.healthStatus === 'healthy') events.push({ id: `complete-${s.id}`, label: 'Build Completed', detail: s.name, ts: new Date(s.updatedAt || s.createdAt), color: 'text-emerald-400', icon: CheckCircle2 });
    if (s.healthStatus === 'unhealthy') events.push({ id: `error-${s.id}`, label: 'Error Detected', detail: s.name, ts: new Date(s.updatedAt || s.createdAt), color: 'text-rose-400', icon: XCircle });
  });
  (notifications || []).forEach(n => {
    const typeKey = (n.notificationType || 'info').toLowerCase();
    const cfg = NOTIF_TYPE_MAP[typeKey] || NOTIF_TYPE_MAP.info;
    events.push({ id: `notif-${n.id}`, label: cfg.label !== 'Info' ? cfg.label : (n.title || 'Notification'), detail: n.message || n.title || '', ts: new Date(n.createdAt), color: cfg.color, icon: cfg.icon });
  });
  return events.sort((a, b) => b.ts - a.ts).slice(0, 15);
}

const TOOL_KEY_HINTS = {
  openrouter: ['OPENROUTER_API_KEY', 'openrouter_api_key'],
  stripe: ['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY', 'stripe_secret_key'],
  resend: ['RESEND_API_KEY', 'resend_api_key'],
  tiktok: ['TIKTOK_ACCESS_TOKEN', 'tiktok_cookie', 'TIKTOK_COOKIE'],
  youtube: ['YOUTUBE_API_KEY', 'youtube_api_key', 'YOUTUBE_OAUTH_TOKEN'],
  meta: ['META_ACCESS_TOKEN', 'meta_access_token', 'FACEBOOK_ACCESS_TOKEN'],
  shopify: ['SHOPIFY_API_KEY', 'shopify_api_key', 'SHOPIFY_STORE_URL'],
  gmail: ['GMAIL_REFRESH_TOKEN', 'gmail_refresh_token', 'GMAIL_CLIENT_ID'],
  cloudflare: ['CLOUDFLARE_API_TOKEN', 'cloudflare_api_token'],
  'make.com': ['MAKE_API_KEY', 'make_api_key', 'MAKE_WEBHOOK_URL'],
  database: ['DATABASE_URL'],
};

function toolConnectionStatus(toolName, storedKeys, orStatus) {
  const key = toolName.toLowerCase();
  if (key === 'openrouter') return orStatus === 'operational' ? 'connected' : orStatus === 'degraded' ? 'degraded' : 'not_configured';
  if (key === 'database' || key === 'postgresql') return 'connected';
  const hints = Object.entries(TOOL_KEY_HINTS).find(([k]) => key.includes(k))?.[1] ?? [];
  return hints.some(h => storedKeys.includes(h.toLowerCase())) ? 'connected' : 'not_configured';
}

const ToolPill = ({ name, status }) => {
  const connected = status === 'connected';
  const degraded = status === 'degraded';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
      connected ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
      degraded  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                  'bg-zinc-800/60 border-zinc-700/40 text-zinc-500'
    }`}>
      {connected ? <Wifi className="w-2.5 h-2.5" /> : degraded ? <AlertTriangle className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
      {name}
    </span>
  );
};

const SystemCommandCenterPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [credits, setCredits] = useState(null);
  const [storedKeys, setStoredKeys] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [toolsBySystem, setToolsBySystem] = useState({});
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
      const [statsRes, revRes, creditsRes, credsRes, notifsRes, selectionsRes, toolsRes] = await Promise.all([
        fetch('/api/ai-orchestrator/platform-stats', { headers: authHeaders() }),
        fetch('/api/dashboard/revenue-summary', { headers: authHeaders() }),
        fetch('/api/credits/me', { headers: authHeaders() }),
        fetch(`/api/user-credentials?userId=${user.id ?? ''}`, { headers: authHeaders() }),
        fetch('/api/notifications', { headers: authHeaders() }),
        fetch('/api/user-tool-selections', { headers: authHeaders() }),
        fetch('/api/tools', { headers: authHeaders() }),
      ]);
      if (!statsRes.ok) throw new Error('Failed to load platform stats');
      const [statsData, revData, credData, credsData, notifsData, selectionsData, toolsData] = await Promise.all([
        statsRes.json(),
        revRes.ok ? revRes.json() : null,
        creditsRes.ok ? creditsRes.json() : null,
        credsRes.ok ? credsRes.json() : [],
        notifsRes.ok ? notifsRes.json() : [],
        selectionsRes.ok ? selectionsRes.json() : [],
        toolsRes.ok ? toolsRes.json() : [],
      ]);
      setData(statsData);
      setRevenue(revData);
      setCredits(credData);
      setNotifications(Array.isArray(notifsData) ? notifsData : []);
      const keys = Array.isArray(credsData) ? credsData.map(c => c.credentialKey?.toLowerCase()) : [];
      setStoredKeys(keys);
      const toolMap = {};
      const allTools = Array.isArray(toolsData?.items ?? toolsData) ? (toolsData?.items ?? toolsData) : [];
      const selArr = Array.isArray(selectionsData?.items ?? selectionsData) ? (selectionsData?.items ?? selectionsData) : [];
      selArr.forEach(sel => {
        if (!sel?.systemInstanceId) return;
        const tool = allTools.find(t => t.id === sel.toolId);
        if (!tool) return;
        if (!toolMap[sel.systemInstanceId]) toolMap[sel.systemInstanceId] = [];
        toolMap[sel.systemInstanceId].push(tool);
      });
      setToolsBySystem(toolMap);
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
      const resp = await fetch(`/api/system-instances/${id}`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify(body) });
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
  const orStatus = toolHealth?.openrouter?.status;
  const activity = buildActivityFeed(systems, notifications);

  const todayCents    = revenue?.todayCents    ?? 0;
  const weekCents     = revenue?.weekCents     ?? 0;
  const monthCents    = revenue?.monthCents    ?? 0;
  const lifetimeCents = revenue?.lifetimeCents ?? 0;

  const dailyData   = buildDailyData(revenue?.daily);
  const weeklyData  = buildWeeklyData(weekCents);
  const aiSparkData = buildAISparkData(aiActivity);
  const buildSparkData = buildSystemSparkData(systemStats);

  const alertNotifs = notifications.filter(n => ['error', 'warning'].includes((n.notificationType || '').toLowerCase()));

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-10">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground font-mono">Command Center</h2>
            <Badge variant="outline" className="text-[9px] border-primary/30 text-primary bg-primary/5 font-mono">LIVE</Badge>
          </div>
          <p className="text-sm text-muted-foreground ml-10">Monitor and manage all deployed automation systems</p>
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-[11px] text-muted-foreground/40 font-mono">
              {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <Button size="sm" variant="outline" onClick={load} className="h-8 text-xs border-white/10 gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button size="sm" onClick={() => navigate('/builder')} className="h-8 text-xs gap-1.5">
            <Zap className="w-3.5 h-3.5" /> Build New System
          </Button>
        </div>
      </div>

      {/* ── Revenue Spotlight ───────────────────────────────────────────────── */}
      <section>
        <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-black/60 backdrop-blur-xl p-8">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsla(180,100%,50%,0.06),transparent_60%)] pointer-events-none" />
          <div className="relative">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 mb-8">
              <div>
                <p className="text-[11px] text-muted-foreground font-mono uppercase tracking-widest mb-2">Today's Revenue</p>
                <p className="text-5xl sm:text-6xl font-bold font-mono text-foreground leading-none tabular-nums">
                  {fmt(todayCents)}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-400">{fmt(weekCents)}</span>
                  <span className="text-sm text-muted-foreground/60">this week</span>
                </div>
              </div>
              <div className="flex gap-8 sm:gap-10">
                <div>
                  <p className="text-[10px] text-muted-foreground/50 font-mono uppercase tracking-widest mb-1">Monthly</p>
                  <p className="text-2xl font-bold font-mono text-foreground tabular-nums">{fmt(monthCents)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground/50 font-mono uppercase tracking-widest mb-1">Lifetime</p>
                  <p className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">{fmt(lifetimeCents)}</p>
                </div>
              </div>
            </div>

            <div className="h-20">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                  <Tooltip content={<RevenueTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }} />
                  <Line
                    type="monotone"
                    dataKey="cents"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3, fill: '#06b6d4', strokeWidth: 0 }}
                    isAnimationActive
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between mt-1 px-1">
              {dailyData.map((d, i) => (
                <span key={i} className="text-[9px] text-muted-foreground/25 font-mono">{d.day}</span>
              ))}
            </div>

            {lifetimeCents === 0 && (
              <p className="text-[10px] text-muted-foreground/30 text-center mt-3 font-mono">
                Revenue events from running systems will appear here · <span className="text-primary/50">disclaimer: results not guaranteed</span>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── System Pulse ────────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[10px] text-muted-foreground/40 font-mono uppercase tracking-widest shrink-0">System Pulse</span>
          <div className="h-px flex-1 bg-white/6 min-w-4" />
          <PulseChip icon={CheckCircle2} label="Running"  value={systemStats?.active   ?? 0} color="emerald" />
          <PulseChip icon={Zap}          label="Building" value={systemStats?.building  ?? 0} color="blue"   />
          <PulseChip icon={Clock}        label="Paused"   value={systemStats?.paused    ?? 0} color="amber"  />
          <PulseChip icon={AlertTriangle} label="Failed"  value={systemStats?.failed    ?? 0} color="rose"   />
          <div className="hidden sm:block h-4 w-px bg-white/10" />
          <PulseChip icon={CreditCard}   label="Credits"  value={credits?.balance       ?? 0} color="zinc"   />
          <PulseChip icon={Brain}        label="AI Req"   value={aiActivity?.totalRequests ?? 0} color="violet" />
        </div>
      </section>

      {/* ── Charts Row ──────────────────────────────────────────────────────── */}
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Weekly Revenue AreaChart */}
          <div className="lg:col-span-3 rounded-2xl border border-white/8 bg-black/40 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Weekly Revenue</h3>
                <p className="text-xs text-muted-foreground/50 mt-0.5">4-week rolling</p>
              </div>
              <span className="text-xl font-bold font-mono text-emerald-400 tabular-nums">{fmt(weekCents)}</span>
            </div>
            <div className="h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                  <Tooltip content={<RevenueTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.08)' }} />
                  <Area
                    type="monotone"
                    dataKey="cents"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="#10b981"
                    fillOpacity={0.1}
                    dot={false}
                    isAnimationActive
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between mt-2 px-1">
              {weeklyData.map((d, i) => (
                <span key={i} className="text-[9px] text-muted-foreground/25 font-mono">{d.week}</span>
              ))}
            </div>
          </div>

          {/* Mini charts — AI usage + Build activity */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            <div className="flex-1 rounded-2xl border border-white/8 bg-black/40 p-5">
              <div className="flex items-end justify-between mb-4">
                <div>
                  <p className="text-xs font-semibold text-foreground">AI Usage</p>
                  <p className="text-[10px] text-muted-foreground/50 mt-0.5">Tokens total</p>
                </div>
                <p className="text-2xl font-bold font-mono text-violet-400 tabular-nums">
                  {(aiActivity?.totalTokens ?? 0).toLocaleString()}
                </p>
              </div>
              <div className="h-14">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={aiSparkData} margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
                    <Line type="monotone" dataKey="val" stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="3 2" dot={false} isAnimationActive />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="flex-1 rounded-2xl border border-white/8 bg-black/40 p-5">
              <div className="flex items-end justify-between mb-4">
                <div>
                  <p className="text-xs font-semibold text-foreground">Build Activity</p>
                  <p className="text-[10px] text-muted-foreground/50 mt-0.5">Systems total</p>
                </div>
                <p className="text-2xl font-bold font-mono text-amber-400 tabular-nums">
                  {systemStats?.total ?? 0}
                </p>
              </div>
              <div className="h-14">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={buildSparkData} margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
                    <Line type="monotone" dataKey="val" stroke="#f59e0b" strokeWidth={1.5} dot={false} isAnimationActive />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Active Systems Table ─────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Active Systems</h3>
            <p className="text-xs text-muted-foreground/50 mt-0.5">All deployed automation systems</p>
          </div>
          <Button size="sm" onClick={() => navigate('/builder')} className="h-7 text-xs gap-1.5 bg-primary/15 hover:bg-primary/25 text-primary border border-primary/25">
            <Plus className="w-3 h-3" /> New System
          </Button>
        </div>

        {systems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-6 py-16 text-center">
            <Server className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground mb-1">No systems deployed yet</p>
            <p className="text-xs text-muted-foreground/40 mb-5">
              Use STARK to build your first automated income system in minutes.
            </p>
            <Button size="sm" onClick={() => navigate('/builder')} className="gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Build My First System
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/8 bg-black/40 backdrop-blur-md overflow-hidden">
            <div className="hidden xl:grid xl:grid-cols-12 gap-2 px-5 py-3 border-b border-white/6 bg-white/2">
              {[['System', 'col-span-2'], ['Blueprint', 'col-span-2'], ['Status', 'col-span-1'], ['Tools', 'col-span-3'], ['Health', 'col-span-2'], ['Uptime', 'col-span-1'], ['Controls', 'col-span-1 text-right']].map(([h, cls]) => (
                <div key={h} className={`${cls} text-[10px] uppercase tracking-widest text-muted-foreground/40 font-medium`}>{h}</div>
              ))}
            </div>

            {systems.map((system, i) => {
              const isLoading = controlLoading[system.id];
              const isPaused  = system.buildStatus === 'paused';
              const isBuilding = system.buildStatus === 'building';
              const hp = healthPercent(system.buildStatus, system.healthStatus);
              const hpColor = hp >= 80 ? 'bg-emerald-500' : hp >= 50 ? 'bg-amber-400' : hp >= 20 ? 'bg-orange-500' : 'bg-rose-500';
              const hpText  = hp >= 80 ? 'text-emerald-400' : hp >= 50 ? 'text-amber-400' : hp >= 20 ? 'text-orange-400' : 'text-rose-400';
              const typeName = system.blueprint?.name ?? 'Custom System';
              const systemTools = toolsBySystem[system.id] ?? [];

              return (
                <div key={system.id} className={`px-5 py-4 hover:bg-white/2 transition-colors ${i < systems.length - 1 ? 'border-b border-white/6' : ''}`}>
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-2 items-center">
                    <div className="xl:col-span-2 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{system.name}</p>
                      <p className="text-[10px] text-muted-foreground/35 font-mono">#{system.id}</p>
                    </div>
                    <div className="xl:col-span-2 min-w-0">
                      <p className="text-xs text-foreground/70 truncate">{typeName}</p>
                      <p className="text-[10px] text-muted-foreground/35 font-mono">{system.blueprint?.category?.name ?? '—'}</p>
                    </div>
                    <div className="xl:col-span-1">
                      <BuildBadge buildStatus={system.buildStatus} healthStatus={system.healthStatus} />
                    </div>
                    <div className="xl:col-span-3 flex flex-wrap gap-1">
                      {systemTools.length > 0
                        ? systemTools.slice(0, 3).map(tool => (
                            <ToolPill key={tool.id} name={tool.name} status={toolConnectionStatus(tool.name, storedKeys, orStatus)} />
                          ))
                        : <span className="text-[10px] text-muted-foreground/25">No tools</span>
                      }
                    </div>
                    <div className="xl:col-span-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 bg-white/8 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-700 ${hpColor}`} style={{ width: `${hp}%` }} />
                        </div>
                        <span className={`text-xs font-mono font-semibold shrink-0 ${hpText}`}>{hp}%</span>
                      </div>
                    </div>
                    <div className="xl:col-span-1">
                      <span className="text-xs text-muted-foreground/50 font-mono">{uptimeLabel(system.createdAt, system.buildStatus)}</span>
                    </div>
                    <div className="xl:col-span-1 flex items-center gap-0.5 xl:justify-end">
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/systems/${system.id}`)} disabled={isLoading} title="Open" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                      {isPaused ? (
                        <Button size="sm" variant="ghost" onClick={() => patchSystem(system.id, { buildStatus: 'active' })} disabled={isLoading} title="Resume" className="h-7 w-7 p-0 text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-500/10">
                          <Play className="w-3.5 h-3.5" />
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => patchSystem(system.id, { buildStatus: 'paused' })} disabled={isLoading || isBuilding} title="Pause" className="h-7 w-7 p-0 text-amber-400/60 hover:text-amber-400 hover:bg-amber-500/10">
                          <Pause className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => patchSystem(system.id, { buildStatus: 'building' })} disabled={isLoading} title="Restart" className="h-7 w-7 p-0 text-blue-400/60 hover:text-blue-400 hover:bg-blue-500/10">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </Button>
                      {deleteConfirm === system.id ? (
                        <div className="flex items-center gap-0.5">
                          <span className="text-[10px] text-rose-400 mr-1">Sure?</span>
                          <Button size="sm" variant="ghost" onClick={() => deleteSystem(system.id)} disabled={isLoading} className="h-6 text-[10px] px-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10">Y</Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(null)} className="h-6 text-[10px] px-1.5 text-muted-foreground">N</Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(system.id)} disabled={isLoading} title="Delete" className="h-7 w-7 p-0 text-rose-400/30 hover:text-rose-400 hover:bg-rose-500/10">
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* ── Alerts Strip ────────────────────────────────────────────────────── */}
      {alertNotifs.length > 0 && (
        <section>
          <div className="flex items-start gap-3 px-5 py-4 rounded-xl border border-rose-500/20 bg-rose-500/5 flex-wrap gap-y-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="text-xs font-semibold text-rose-400">System Alerts</p>
              {alertNotifs.slice(0, 3).map(n => (
                <p key={n.id} className="text-xs text-rose-300/70">{n.title || n.message}</p>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Activity Feed ───────────────────────────────────────────────────── */}
      {activity.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-4">Recent Activity</h3>
          <div className="rounded-2xl border border-white/8 bg-black/40 overflow-hidden">
            <div className="divide-y divide-white/6 max-h-72 overflow-y-auto">
              {activity.map(evt => (
                <div key={evt.id} className="flex items-start gap-3 px-5 py-3">
                  <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                    <evt.icon className={`w-3 h-3 ${evt.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-foreground truncate">{evt.label}</p>
                      <span className="text-[10px] text-muted-foreground/35 shrink-0 font-mono">
                        {evt.ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground/50 truncate">{evt.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

    </div>
  );
};

export default SystemCommandCenterPage;
