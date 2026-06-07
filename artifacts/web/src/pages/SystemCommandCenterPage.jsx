import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Activity, Zap, CheckCircle2, AlertTriangle, Clock, Server,
  Brain, Cpu, CreditCard, RefreshCw, TrendingUp,
  Play, Pause, RotateCcw, Trash2, DollarSign,
  ExternalLink, Plus, XCircle, Coins, Wifi, WifiOff,
  ChevronRight,
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {};
};

const fmt = (cents) =>
  '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtCompact = (cents) => {
  if (cents >= 100000) return '$' + (cents / 100000).toFixed(1) + 'k';
  return '$' + (cents / 100).toFixed(2);
};

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

const buildAIData = (aiActivity, dailyLen = 7) => {
  const total = aiActivity?.totalRequests ?? 0;
  return Array.from({ length: dailyLen }, (_, i) => ({
    day: ['6d', '5d', '4d', '3d', '2d', '1d', 'Now'][i] ?? `${dailyLen - 1 - i}d`,
    val: i === dailyLen - 1 ? total : 0,
  }));
};

const buildSystemsData = (systemStats, dailyLen = 7) => {
  const total = systemStats?.total ?? 0;
  return Array.from({ length: dailyLen }, (_, i) => ({
    day: ['6d', '5d', '4d', '3d', '2d', '1d', 'Now'][i] ?? `${dailyLen - 1 - i}d`,
    val: i === dailyLen - 1 ? total : 0,
  }));
};

const RevenueTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-2 text-xs shadow-2xl">
      <p className="text-muted-foreground mb-0.5 font-mono">{label}</p>
      <p className="text-foreground font-mono font-semibold">{fmt(payload[0]?.value ?? 0)}</p>
    </div>
  );
};

const GenericTooltip = ({ active, payload, label, suffix = '' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-2 text-xs shadow-2xl">
      <p className="text-muted-foreground mb-0.5 font-mono">{label}</p>
      <p className="text-foreground font-mono font-semibold">{payload[0]?.value ?? 0}{suffix}</p>
    </div>
  );
};

const StatusDot = ({ status }) => {
  const map = {
    active:    'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]',
    completed: 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]',
    building:  'bg-blue-400 animate-pulse',
    paused:    'bg-amber-400',
    failed:    'bg-rose-400',
  };
  return (
    <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${map[status] ?? 'bg-zinc-500'}`} />
  );
};

const StatusLabel = ({ buildStatus, healthStatus }) => {
  if (buildStatus === 'active' || healthStatus === 'healthy' || buildStatus === 'completed')
    return <span className="text-emerald-400">Active</span>;
  if (buildStatus === 'building')
    return <span className="text-blue-400">Building…</span>;
  if (buildStatus === 'paused')
    return <span className="text-amber-400">Paused</span>;
  if (healthStatus === 'unhealthy')
    return <span className="text-rose-400">Failed</span>;
  return <span className="text-zinc-500">Pending</span>;
};

const TOOL_KEY_HINTS = {
  openrouter: ['openrouter_api_key'],
  stripe: ['stripe_secret_key', 'stripe_publishable_key'],
  resend: ['resend_api_key'],
  tiktok: ['tiktok_access_token', 'tiktok_cookie'],
  youtube: ['youtube_api_key', 'youtube_oauth_token'],
  meta: ['meta_access_token', 'facebook_access_token'],
  shopify: ['shopify_api_key', 'shopify_store_url'],
  gmail: ['gmail_refresh_token', 'gmail_client_id'],
  cloudflare: ['cloudflare_api_token'],
  'make.com': ['make_api_key', 'make_webhook_url'],
  database: ['database_url'],
};

function toolConnected(toolName, storedKeys, orStatus) {
  const key = toolName.toLowerCase();
  if (key === 'openrouter') return orStatus === 'operational' ? true : false;
  if (key === 'database' || key === 'postgresql') return true;
  const hints = Object.entries(TOOL_KEY_HINTS).find(([k]) => key.includes(k))?.[1] ?? [];
  return hints.some(h => storedKeys.includes(h.toLowerCase()));
}

const healthPct = (buildStatus, healthStatus) => {
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

const timeAgo = (ts) => {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const NOTIF_TYPE_MAP = {
  error:   { color: 'text-rose-400',    dot: 'bg-rose-400',    label: 'Error' },
  warning: { color: 'text-amber-400',   dot: 'bg-amber-400',   label: 'Warning' },
  success: { color: 'text-emerald-400', dot: 'bg-emerald-400', label: 'Build Completed' },
  revenue: { color: 'text-emerald-400', dot: 'bg-emerald-400', label: 'Revenue' },
  info:    { color: 'text-blue-400',    dot: 'bg-blue-400',    label: 'Info' },
};

function buildTimeline(systems, notifications) {
  const events = [];
  systems.forEach(s => {
    if (s.createdAt)
      events.push({ id: `c-${s.id}`, dot: 'bg-blue-400',    label: 'System created',     detail: s.name, ts: new Date(s.createdAt) });
    if (s.buildStatus === 'completed' || s.healthStatus === 'healthy')
      events.push({ id: `d-${s.id}`, dot: 'bg-emerald-400', label: 'Build completed',    detail: s.name, ts: new Date(s.updatedAt || s.createdAt) });
    if (s.buildStatus === 'building')
      events.push({ id: `b-${s.id}`, dot: 'bg-blue-400 animate-pulse', label: 'Build started', detail: s.name, ts: new Date(s.updatedAt || s.createdAt) });
    if (s.healthStatus === 'unhealthy')
      events.push({ id: `e-${s.id}`, dot: 'bg-rose-400',   label: 'Error detected',     detail: s.name, ts: new Date(s.updatedAt || s.createdAt) });
  });
  notifications.forEach(n => {
    const tk = (n.notificationType || 'info').toLowerCase();
    const cfg = NOTIF_TYPE_MAP[tk] ?? NOTIF_TYPE_MAP.info;
    events.push({ id: `n-${n.id}`, dot: cfg.dot, label: cfg.label !== 'Info' ? cfg.label : (n.title || 'Notification'), detail: n.message || n.title || '', ts: new Date(n.createdAt) });
  });
  return events.sort((a, b) => b.ts - a.ts).slice(0, 20);
}

const CHART_TABS = [
  { key: 'revenue',  label: 'Revenue',    color: '#06b6d4' },
  { key: 'ai',       label: 'AI Usage',   color: '#8b5cf6' },
  { key: 'systems',  label: 'Systems',    color: '#f59e0b' },
];

const SystemCommandCenterPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [chartTab, setChartTab] = useState('revenue');

  const user = JSON.parse(localStorage.getItem('sbep_auth_user') || '{}');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('credits_purchased') === '1') {
      toast.success('Credits added to your account!', { description: 'Your balance has been updated.' });
      navigate('/dashboard', { replace: true });
    } else if (params.get('credits_canceled') === '1') {
      toast.info('Credit purchase canceled.');
      navigate('/dashboard', { replace: true });
    }
  }, [location.search, navigate]);

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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <RefreshCw className="w-6 h-6 text-primary animate-spin mx-auto opacity-60" />
          <p className="text-xs text-muted-foreground/40 font-mono tracking-widest uppercase">Loading…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-6 h-6 text-rose-400 mx-auto" />
          <p className="text-sm text-rose-400">{error}</p>
          <Button size="sm" variant="outline" onClick={load} className="border-white/10 text-xs">Retry</Button>
        </div>
      </div>
    );
  }

  const { systemStats, systems = [], aiActivity, toolHealth } = data ?? {};
  const orStatus = toolHealth?.openrouter?.status;
  const timeline = buildTimeline(systems, notifications);
  const alertNotifs = notifications.filter(n => ['error', 'warning'].includes((n.notificationType || '').toLowerCase()));

  const todayCents    = revenue?.todayCents    ?? 0;
  const weekCents     = revenue?.weekCents     ?? 0;
  const monthCents    = revenue?.monthCents    ?? 0;
  const lifetimeCents = revenue?.lifetimeCents ?? 0;

  const dailyData    = buildDailyData(revenue?.daily);
  const aiData       = buildAIData(aiActivity);
  const systemsData  = buildSystemsData(systemStats);

  const chartCfg = CHART_TABS.find(t => t.key === chartTab);
  const chartData = chartTab === 'revenue' ? dailyData
    : chartTab === 'ai' ? aiData
    : systemsData;
  const chartDataKey = chartTab === 'revenue' ? 'cents' : 'val';

  return (
    <div className="animate-in fade-in duration-500 pb-16">

      {/* ── Page Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 pb-6 border-b border-white/6">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Cpu className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground font-mono tracking-tight">Command Center</h1>
            <p className="text-[11px] text-muted-foreground/40">AI Operations Monitor</p>
          </div>
          <Badge variant="outline" className="ml-1 text-[9px] border-emerald-500/20 text-emerald-400 bg-emerald-500/5 font-mono px-1.5">LIVE</Badge>
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-[10px] text-muted-foreground/25 font-mono hidden sm:block">
              {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={load}
            className="text-muted-foreground/40 hover:text-muted-foreground transition-colors p-1"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <Button size="sm" onClick={() => navigate('/builder')} className="h-7 text-xs gap-1.5 px-3">
            <Plus className="w-3 h-3" /> New System
          </Button>
        </div>
      </div>

      {/* ── KPI Strip ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-white/6 mt-0 border-b border-white/6">
        {[
          { label: 'Today',    value: fmtCompact(todayCents),              color: 'text-foreground' },
          { label: 'This Week', value: fmtCompact(weekCents),              color: 'text-emerald-400' },
          { label: 'Active',   value: `${systemStats?.active ?? 0} sys`,   color: 'text-foreground' },
          { label: 'Credits',  value: `${credits?.balance ?? 0} cr`,       color: 'text-foreground' },
          { label: 'AI Req',   value: `${aiActivity?.totalRequests ?? 0}`, color: 'text-violet-400' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-background px-4 py-4 sm:py-5">
            <p className="text-[10px] text-muted-foreground/40 font-mono uppercase tracking-widest mb-1">{kpi.label}</p>
            <p className={`text-xl font-bold font-mono tabular-nums ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* ── Primary Analytics Chart ───────────────────────────────────────────── */}
      <section className="py-8 border-b border-white/6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-1 bg-white/4 rounded-lg p-1">
            {CHART_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setChartTab(tab.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  chartTab === tab.key
                    ? 'bg-white/8 text-foreground'
                    : 'text-muted-foreground/50 hover:text-muted-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground/30 font-mono uppercase tracking-widest">
              {chartTab === 'revenue' ? 'Total today' : chartTab === 'ai' ? 'Total requests' : 'Total deployed'}
            </p>
            <p className="text-2xl font-bold font-mono tabular-nums" style={{ color: chartCfg.color }}>
              {chartTab === 'revenue' ? fmtCompact(todayCents)
                : chartTab === 'ai' ? (aiActivity?.totalRequests ?? 0)
                : (systemStats?.total ?? 0)}
            </p>
          </div>
        </div>

        <div className="h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartCfg.color} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={chartCfg.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="day"
                tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9, fontFamily: 'monospace' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={chartTab === 'revenue'
                  ? <RevenueTooltip />
                  : <GenericTooltip suffix={chartTab === 'ai' ? ' req' : ' sys'} />
                }
                cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey={chartDataKey}
                stroke={chartCfg.color}
                strokeWidth={1.5}
                fill="url(#chartFill)"
                dot={false}
                activeDot={{ r: 3, fill: chartCfg.color, strokeWidth: 0 }}
                isAnimationActive
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {lifetimeCents === 0 && chartTab === 'revenue' && (
          <p className="text-[10px] text-muted-foreground/20 text-center mt-3 font-mono">
            Revenue events will appear here as your systems run — results not guaranteed
          </p>
        )}
      </section>

      {/* ── System Pulse Bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-5 py-4 border-b border-white/6 overflow-x-auto">
        {[
          { label: 'Running',  val: systemStats?.active   ?? 0, dot: 'bg-emerald-400', text: 'text-emerald-400' },
          { label: 'Building', val: systemStats?.building  ?? 0, dot: 'bg-blue-400 animate-pulse', text: 'text-blue-400' },
          { label: 'Paused',   val: systemStats?.paused    ?? 0, dot: 'bg-amber-400',  text: 'text-amber-400' },
          { label: 'Failed',   val: systemStats?.failed    ?? 0, dot: 'bg-rose-400',   text: 'text-rose-400' },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-2 shrink-0">
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            <span className={`text-sm font-bold font-mono tabular-nums ${s.text}`}>{s.val}</span>
            <span className="text-xs text-muted-foreground/40">{s.label}</span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
          <span className="text-sm font-bold font-mono tabular-nums text-foreground/60">{credits?.balance ?? 0}</span>
          <span className="text-xs text-muted-foreground/40">Credits</span>
        </div>
      </div>

      {/* ── Systems Fleet ─────────────────────────────────────────────────────── */}
      <section className="py-8 border-b border-white/6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xs font-semibold text-foreground font-mono uppercase tracking-widest">Systems Fleet</h2>
            <p className="text-[11px] text-muted-foreground/40 mt-0.5">{systems.length} system{systems.length !== 1 ? 's' : ''} deployed</p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate('/builder')}
            className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
          >
            <Plus className="w-3 h-3" /> Deploy
          </Button>
        </div>

        {systems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Server className="w-8 h-8 text-white/10" />
            <div className="text-center">
              <p className="text-sm text-muted-foreground/60 mb-1">No systems deployed</p>
              <p className="text-xs text-muted-foreground/30">Build your first automated income system with STARK</p>
            </div>
            <Button size="sm" onClick={() => navigate('/builder')} variant="outline" className="border-white/10 text-xs gap-1.5">
              <Zap className="w-3 h-3" /> Build Now
            </Button>
          </div>
        ) : (
          <div>
            {/* Table header */}
            <div className="hidden lg:grid grid-cols-12 gap-3 pb-2 border-b border-white/4 mb-1">
              {[
                ['System', 'col-span-3'],
                ['Status', 'col-span-1'],
                ['Health', 'col-span-2'],
                ['Connected Tools', 'col-span-3'],
                ['Uptime', 'col-span-1'],
                ['Revenue', 'col-span-1'],
                ['', 'col-span-1 text-right'],
              ].map(([h, cls]) => (
                <div key={h} className={`${cls} text-[9px] uppercase tracking-widest text-muted-foreground/25 font-medium`}>{h}</div>
              ))}
            </div>

            {systems.map((system, i) => {
              const isLoading  = controlLoading[system.id];
              const isPaused   = system.buildStatus === 'paused';
              const isBuilding = system.buildStatus === 'building';
              const hp         = healthPct(system.buildStatus, system.healthStatus);
              const hpColor    = hp >= 80 ? 'bg-emerald-500' : hp >= 50 ? 'bg-amber-400' : hp >= 20 ? 'bg-orange-500' : 'bg-rose-500';
              const hpText     = hp >= 80 ? 'text-emerald-400' : hp >= 50 ? 'text-amber-400' : hp >= 20 ? 'text-orange-400' : 'text-rose-400';
              const systemTools = toolsBySystem[system.id] ?? [];

              return (
                <div
                  key={system.id}
                  className={`group py-3.5 border-b border-white/4 last:border-0 hover:bg-white/[0.015] transition-colors cursor-pointer`}
                  onClick={() => navigate(`/systems/${system.id}`)}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">

                    {/* Name */}
                    <div className="lg:col-span-3 flex items-center gap-2.5 min-w-0">
                      <StatusDot status={system.buildStatus === 'completed' ? 'active' : (system.buildStatus ?? 'pending')} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{system.name}</p>
                        <p className="text-[10px] text-muted-foreground/35 truncate">{system.blueprint?.name ?? 'Custom'}</p>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="lg:col-span-1 text-xs font-mono">
                      <StatusLabel buildStatus={system.buildStatus} healthStatus={system.healthStatus} />
                    </div>

                    {/* Health bar */}
                    <div className="lg:col-span-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-0.5 bg-white/6 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-700 ${hpColor}`} style={{ width: `${hp}%` }} />
                        </div>
                        <span className={`text-[10px] font-mono shrink-0 ${hpText}`}>{hp}%</span>
                      </div>
                    </div>

                    {/* Tools */}
                    <div className="lg:col-span-3 flex items-center gap-1.5 flex-wrap">
                      {systemTools.length > 0
                        ? systemTools.slice(0, 4).map(tool => {
                            const connected = toolConnected(tool.name, storedKeys, orStatus);
                            return (
                              <span
                                key={tool.id}
                                className={`inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                                  connected
                                    ? 'border-white/8 text-muted-foreground/60'
                                    : 'border-rose-500/20 text-rose-400/50'
                                }`}
                              >
                                <span className={`w-1 h-1 rounded-full ${connected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                                {tool.name}
                              </span>
                            );
                          })
                        : <span className="text-[10px] text-muted-foreground/20">—</span>
                      }
                    </div>

                    {/* Uptime */}
                    <div className="lg:col-span-1">
                      <span className="text-[11px] text-muted-foreground/40 font-mono">{uptimeLabel(system.createdAt, system.buildStatus)}</span>
                    </div>

                    {/* Revenue placeholder */}
                    <div className="lg:col-span-1">
                      <span className="text-[11px] text-muted-foreground/25 font-mono">$0.00</span>
                    </div>

                    {/* Row actions */}
                    <div className="lg:col-span-1 flex items-center gap-0.5 lg:justify-end" onClick={e => e.stopPropagation()}>
                      {isPaused ? (
                        <button
                          onClick={() => patchSystem(system.id, { buildStatus: 'active' })}
                          disabled={isLoading}
                          title="Resume"
                          className="p-1.5 rounded text-emerald-400/40 hover:text-emerald-400 hover:bg-emerald-500/8 transition-colors disabled:opacity-30"
                        >
                          <Play className="w-3 h-3" />
                        </button>
                      ) : (
                        <button
                          onClick={() => patchSystem(system.id, { buildStatus: 'paused' })}
                          disabled={isLoading || isBuilding}
                          title="Pause"
                          className="p-1.5 rounded text-amber-400/40 hover:text-amber-400 hover:bg-amber-500/8 transition-colors disabled:opacity-30"
                        >
                          <Pause className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={() => patchSystem(system.id, { buildStatus: 'building' })}
                        disabled={isLoading}
                        title="Restart"
                        className="p-1.5 rounded text-blue-400/40 hover:text-blue-400 hover:bg-blue-500/8 transition-colors disabled:opacity-30"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                      {deleteConfirm === system.id ? (
                        <span className="flex items-center gap-0.5">
                          <button onClick={() => deleteSystem(system.id)} disabled={isLoading} className="text-[10px] px-1.5 py-1 rounded text-rose-400 hover:bg-rose-500/10">Y</button>
                          <button onClick={() => setDeleteConfirm(null)} className="text-[10px] px-1.5 py-1 rounded text-muted-foreground hover:bg-white/5">N</button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(system.id)}
                          disabled={isLoading}
                          title="Delete"
                          className="p-1.5 rounded text-rose-400/20 hover:text-rose-400 hover:bg-rose-500/8 transition-colors disabled:opacity-30"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/20 group-hover:text-muted-foreground/50 transition-colors ml-1 hidden lg:block" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Bottom: AI Timeline + Alerts ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-0 pt-8">

        {/* AI Activity Timeline */}
        <div className="lg:col-span-3 lg:pr-8 lg:border-r border-white/6">
          <h2 className="text-[10px] font-semibold text-muted-foreground/40 font-mono uppercase tracking-widest mb-5">AI Activity</h2>
          {timeline.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Brain className="w-6 h-6 text-white/10" />
              <p className="text-xs text-muted-foreground/30">No AI activity recorded yet</p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-[5px] top-2 bottom-2 w-px bg-white/6" />
              <div className="space-y-0">
                {timeline.map((evt, i) => (
                  <div key={evt.id} className="relative flex gap-4 pb-4 pl-5">
                    <span className={`absolute left-0 top-[5px] w-[11px] h-[11px] rounded-full border-2 border-background ${evt.dot}`} />
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-foreground/80 truncate">{evt.label}</p>
                        <span className="text-[10px] text-muted-foreground/25 font-mono shrink-0">{timeAgo(evt.ts)}</span>
                      </div>
                      {evt.detail && (
                        <p className="text-[11px] text-muted-foreground/40 truncate mt-0.5">{evt.detail}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Alerts + Tool Health */}
        <div className="lg:col-span-2 lg:pl-8 pt-8 lg:pt-0">
          <h2 className="text-[10px] font-semibold text-muted-foreground/40 font-mono uppercase tracking-widest mb-5">Alerts</h2>
          {alertNotifs.length === 0 ? (
            <div className="flex items-center gap-2 py-3">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/60" />
              <span className="text-xs text-muted-foreground/40">All systems nominal</span>
            </div>
          ) : (
            <div className="space-y-2">
              {alertNotifs.slice(0, 5).map(n => {
                const tk = (n.notificationType || 'warning').toLowerCase();
                const isError = tk === 'error';
                return (
                  <div key={n.id} className={`flex items-start gap-2.5 py-2.5 border-b border-white/4 last:border-0`}>
                    <span className={`w-1 h-1 rounded-full mt-1.5 shrink-0 ${isError ? 'bg-rose-400' : 'bg-amber-400'}`} />
                    <div className="min-w-0">
                      <p className={`text-xs font-medium truncate ${isError ? 'text-rose-400' : 'text-amber-400'}`}>
                        {n.title || n.message}
                      </p>
                      {n.message && n.title && (
                        <p className="text-[11px] text-muted-foreground/40 truncate mt-0.5">{n.message}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tool Health Summary */}
          <h2 className="text-[10px] font-semibold text-muted-foreground/40 font-mono uppercase tracking-widest mt-8 mb-4">Tool Connections</h2>
          <div className="space-y-2">
            {[
              { name: 'OpenRouter',   key: 'openrouter' },
              { name: 'Stripe',       key: 'stripe' },
              { name: 'Database',     key: 'database' },
              { name: 'Resend',       key: 'resend' },
              { name: 'Cloudflare',   key: 'cloudflare' },
            ].map(tool => {
              const connected = toolConnected(tool.name, storedKeys, orStatus);
              return (
                <div key={tool.key} className="flex items-center justify-between py-1.5 border-b border-white/4 last:border-0">
                  <span className="text-xs text-muted-foreground/60">{tool.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                    <span className={`text-[10px] font-mono ${connected ? 'text-emerald-400/70' : 'text-zinc-600'}`}>
                      {connected ? 'connected' : 'not set'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {storedKeys.length > 0 && (
            <button
              onClick={() => navigate('/connections')}
              className="mt-4 flex items-center gap-1.5 text-[11px] text-muted-foreground/40 hover:text-muted-foreground transition-colors"
            >
              <Wifi className="w-3 h-3" /> Manage credentials
            </button>
          )}
        </div>
      </div>

    </div>
  );
};

export default SystemCommandCenterPage;
