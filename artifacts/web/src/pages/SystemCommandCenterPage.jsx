import React, { useEffect, useState, useCallback, useId } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Activity, Zap, CheckCircle2, AlertTriangle, Clock, Server,
  Brain, Cpu, CreditCard, RefreshCw, TrendingUp,
  Play, Pause, RotateCcw, Trash2, DollarSign,
  ExternalLink, Plus, XCircle, Coins,
  ChevronRight, Shield, BarChart2, Bot,
  Rocket, Settings, ArrowUpRight, Layers,
  Globe, Key, Database, ShieldCheck,
  Crown, Radio, Signal,
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  ResponsiveContainer, Tooltip, XAxis, CartesianGrid,
} from 'recharts';
import { Button } from '@/components/ui/button';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {};
};

const fmt = (cents) =>
  '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtCompact = (cents) => {
  if (cents >= 10000000) return '$' + (cents / 10000000).toFixed(1) + 'M';
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

const buildAIData = (aiActivity) => {
  const total = aiActivity?.totalRequests ?? 0;
  return Array.from({ length: 7 }, (_, i) => ({
    day: ['6d', '5d', '4d', '1d', 'Now'][i] ?? `${6 - i}d`,
    val: i === 6 ? total : Math.max(0, total - (6 - i)),
  }));
};

const buildSystemsData = (systemStats) => {
  const total = systemStats?.total ?? 0;
  return Array.from({ length: 7 }, (_, i) => ({
    day: ['6d', '5d', '4d', '3d', '2d', '1d', 'Now'][i],
    val: i === 6 ? total : Math.max(0, total - (6 - i)),
  }));
};

const RevenueTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="holo-glass rounded-lg px-3 py-2 text-xs shadow-2xl">
      <p className="text-white/45 mb-0.5 font-mono uppercase tracking-wider text-[9px]">{label}</p>
      <p className="text-white font-mono font-bold">{fmt(payload[0]?.value ?? 0)}</p>
    </div>
  );
};

const GenericTooltip = ({ active, payload, label, suffix = '' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="holo-glass rounded-lg px-3 py-2 text-xs shadow-2xl">
      <p className="text-white/45 mb-0.5 font-mono uppercase tracking-wider text-[9px]">{label}</p>
      <p className="text-white font-mono font-bold">{payload[0]?.value ?? 0}{suffix}</p>
    </div>
  );
};

/* ── HUD corner bracket ──────────────────────────────────────────────── */
const Corner = ({ pos, color }) => {
  const map = {
    tl: 'top-2 left-2 border-t-2 border-l-2 rounded-tl-md',
    tr: 'top-2 right-2 border-t-2 border-r-2 rounded-tr-md',
    bl: 'bottom-2 left-2 border-b-2 border-l-2 rounded-bl-md',
    br: 'bottom-2 right-2 border-b-2 border-r-2 rounded-br-md',
  };
  return <span className={`absolute w-3 h-3 pointer-events-none z-20 ${map[pos]}`} style={{ borderColor: color }} />;
};

/* ── Holographic glass panel with HUD brackets ───────────────────────── */
const HudPanel = ({ children, className = '', accent = 'rgba(56,189,248,0.55)', scan = false, corners = true }) => (
  <div className={`relative holo-glass rounded-2xl overflow-hidden ${className}`}>
    {scan && <span className="holo-scanline" />}
    {corners && (
      <>
        <Corner pos="tl" color={accent} />
        <Corner pos="tr" color={accent} />
        <Corner pos="bl" color={accent} />
        <Corner pos="br" color={accent} />
      </>
    )}
    {children}
  </div>
);

/* ── Inline SVG sparkline (real data trend) ──────────────────────────── */
const Sparkline = ({ values, color, height = 30 }) => {
  const rawId = useId();
  const id = rawId.replace(/:/g, '');
  if (!values || values.length < 2) return <div style={{ height }} />;
  const w = 100;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = (max - min) || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = height - 3 - ((v - min) / range) * (height - 6);
    return [x, y];
  });
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L ${w} ${height} L 0 ${height} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`sp-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.40} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sp-${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.6} vectorEffect="non-scaling-stroke"
        style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
    </svg>
  );
};

/* ── Radial gauge (credit balance ring) ──────────────────────────────── */
const RadialGauge = ({ pct, color, size = 88, stroke = 7, children }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, pct));
  const off = c - (clamped / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off}
          style={{ filter: `drop-shadow(0 0 5px ${color})`, transition: 'stroke-dashoffset 0.9s cubic-bezier(0.16,1,0.3,1)' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
};

const StatusDot = ({ status }) => {
  const map = {
    active:    'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]',
    completed: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]',
    building:  'bg-blue-400 animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.6)]',
    paused:    'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]',
    failed:    'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.7)]',
  };
  return (
    <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${map[status] ?? 'bg-zinc-600'}`} />
  );
};

const StatusBadge = ({ buildStatus, healthStatus }) => {
  if (buildStatus === 'active' || healthStatus === 'healthy' || buildStatus === 'completed')
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 uppercase tracking-wide">Active</span>;
  if (buildStatus === 'building')
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/15 text-blue-400 border border-blue-500/25 uppercase tracking-wide animate-pulse">Building</span>;
  if (buildStatus === 'paused')
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25 uppercase tracking-wide">Paused</span>;
  if (healthStatus === 'unhealthy')
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/15 text-rose-400 border border-rose-500/25 uppercase tracking-wide">Failed</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/5 text-white/40 border border-white/10 uppercase tracking-wide">Pending</span>;
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
  if (key === 'openrouter') return orStatus === 'operational';
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
      events.push({ id: `c-${s.id}`, dot: 'bg-blue-400', color: 'text-blue-400', label: 'System deployed', detail: s.name, ts: new Date(s.createdAt) });
    if (s.buildStatus === 'completed' || s.healthStatus === 'healthy')
      events.push({ id: `d-${s.id}`, dot: 'bg-emerald-400', color: 'text-emerald-400', label: 'Build completed', detail: s.name, ts: new Date(s.updatedAt || s.createdAt) });
    if (s.buildStatus === 'building')
      events.push({ id: `b-${s.id}`, dot: 'bg-blue-400 animate-pulse', color: 'text-blue-400', label: 'Build in progress', detail: s.name, ts: new Date(s.updatedAt || s.createdAt) });
    if (s.healthStatus === 'unhealthy')
      events.push({ id: `e-${s.id}`, dot: 'bg-rose-400', color: 'text-rose-400', label: 'Error detected', detail: s.name, ts: new Date(s.updatedAt || s.createdAt) });
  });
  notifications.forEach(n => {
    const tk = (n.notificationType || 'info').toLowerCase();
    const cfg = NOTIF_TYPE_MAP[tk] ?? NOTIF_TYPE_MAP.info;
    events.push({ id: `n-${n.id}`, dot: cfg.dot, color: cfg.color, label: cfg.label !== 'Info' ? cfg.label : (n.title || 'Notification'), detail: n.message || n.title || '', ts: new Date(n.createdAt) });
  });
  return events.sort((a, b) => b.ts - a.ts).slice(0, 20);
}

const CHART_TABS = [
  { key: 'revenue',  label: 'Revenue',  color: '#10b981', icon: DollarSign },
  { key: 'ai',       label: 'AI',       color: '#8b5cf6', icon: Bot },
  { key: 'systems',  label: 'Systems',  color: '#38bdf8', icon: Server },
];

const CHART_TYPES = [
  { key: 'area', label: 'Area', icon: Activity },
  { key: 'line', label: 'Line', icon: TrendingUp },
  { key: 'bar',  label: 'Bars', icon: BarChart2 },
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
  const [chartType, setChartType] = useState('area');
  const [systemRevenue, setSystemRevenue] = useState({});

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

  useEffect(() => {
    const systems = data?.systems;
    if (!systems?.length) return;
    const ids = systems.map((s) => s.id);
    fetch('/api/system-instances/revenue-batch', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ ids }),
    })
      .then((r) => (r.ok ? r.json() : {}))
      .then((rev) => setSystemRevenue(rev))
      .catch(() => {});
  }, [data]);

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
        <HudPanel className="p-10 text-center" scan accent="rgba(56,189,248,0.6)">
          <div className="relative inline-flex items-center justify-center mb-4">
            <RadialGauge pct={66} color="#38bdf8" size={72} stroke={5}>
              <Cpu className="w-6 h-6 text-primary holo-pulse" />
            </RadialGauge>
          </div>
          <p className="text-sm text-white/55 font-mono tracking-[0.25em] uppercase">Initializing Command Center</p>
          <div className="flex items-center justify-center gap-1.5 mt-4">
            {[0,1,2,3].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
        </HudPanel>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <HudPanel className="p-10 text-center max-w-sm" accent="rgba(251,113,133,0.6)">
          <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-3" />
          <p className="text-base font-semibold text-white">Connection Error</p>
          <p className="text-sm text-white/60 mt-1 mb-4">{error}</p>
          <Button size="sm" onClick={load} className="border-white/20 text-white text-xs bg-white/10 hover:bg-white/20">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry
          </Button>
        </HudPanel>
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

  const dailyData   = buildDailyData(revenue?.daily);
  const aiData      = buildAIData(aiActivity);
  const systemsData = buildSystemsData(systemStats);

  const chartCfg = CHART_TABS.find(t => t.key === chartTab);
  const chartData = chartTab === 'revenue' ? dailyData : chartTab === 'ai' ? aiData : systemsData;
  const chartDataKey = chartTab === 'revenue' ? 'cents' : 'val';

  const totalSystems  = systemStats?.total ?? 0;
  const activeSystems = systemStats?.active ?? 0;
  const building      = systemStats?.building ?? 0;
  const paused        = systemStats?.paused ?? 0;
  const failed        = systemStats?.failed ?? 0;

  const credBalance   = credits?.balance ?? 0;
  const credAllotment = credits?.allotment ?? 0;
  const credUsed      = credAllotment - credBalance;
  const credPct       = credAllotment > 0 ? Math.round((credBalance / credAllotment) * 100) : 100;

  const connectedToolCount = ['openrouter', 'stripe', 'resend', 'cloudflare', 'make.com', 'tiktok', 'youtube', 'meta', 'shopify', 'gmail'].filter(
    k => toolConnected(k, storedKeys, orStatus)
  ).length;

  /* ── Multi-type chart renderer ──────────────────────────────────────── */
  const chartAxes = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
      <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.32)', fontSize: 10, fontFamily: 'monospace' }} tickLine={false} axisLine={false} />
      <Tooltip
        content={chartTab === 'revenue' ? <RevenueTooltip /> : <GenericTooltip suffix={chartTab === 'ai' ? ' req' : ' sys'} />}
        cursor={{ stroke: 'rgba(255,255,255,0.10)', strokeWidth: 1 }}
      />
    </>
  );

  const renderChart = () => {
    if (chartType === 'line') {
      return (
        <LineChart data={chartData} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
          {chartAxes}
          <Line type="monotone" dataKey={chartDataKey} stroke={chartCfg.color} strokeWidth={2.6} dot={false}
            activeDot={{ r: 4, fill: chartCfg.color, strokeWidth: 0 }} />
        </LineChart>
      );
    }
    if (chartType === 'bar') {
      return (
        <BarChart data={chartData} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartCfg.color} stopOpacity={0.95} />
              <stop offset="100%" stopColor={chartCfg.color} stopOpacity={0.28} />
            </linearGradient>
          </defs>
          {chartAxes}
          <Bar dataKey={chartDataKey} fill="url(#barFill)" radius={[5, 5, 0, 0]} maxBarSize={34} />
        </BarChart>
      );
    }
    return (
      <AreaChart data={chartData} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chartCfg.color} stopOpacity={0.32} />
            <stop offset="100%" stopColor={chartCfg.color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {chartAxes}
        <Area type="monotone" dataKey={chartDataKey} stroke={chartCfg.color} strokeWidth={2.6} fill="url(#chartFill)" dot={false}
          activeDot={{ r: 4, fill: chartCfg.color, strokeWidth: 0 }} />
      </AreaChart>
    );
  };

  return (
    <div className="relative animate-in fade-in duration-500 pb-20">

      {/* ══ AMBIENT HUD LAYERS (video stays visible behind) ══════════════════ */}
      <div className="holo-grid-bg pointer-events-none fixed inset-0 opacity-30" style={{ zIndex: 0 }} />
      <div className="pointer-events-none fixed inset-0" style={{ zIndex: 0, background: 'radial-gradient(135% 80% at 50% -12%, rgba(56,189,248,0.07), transparent 55%)' }} />

      <div className="relative space-y-6" style={{ zIndex: 1 }}>

      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <HudPanel className="px-5 py-4" accent="rgba(56,189,248,0.5)" scan>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3.5">
            <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-primary/30 to-primary/5 border border-primary/30 flex items-center justify-center shadow-[0_0_24px_rgba(14,165,233,0.25)]">
              <Cpu className="w-5 h-5 text-primary" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#080a16] holo-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-white tracking-tight">Command Center</h1>
                <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-2 py-0.5 uppercase tracking-widest">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 holo-pulse" /> Live
                </span>
                <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-primary/80 bg-primary/8 border border-primary/25 rounded-full px-2 py-0.5 uppercase tracking-widest">
                  <Crown className="w-2.5 h-2.5" /> {user.subscriptionTier ?? 'free'}
                </span>
              </div>
              <p className="text-[11px] text-white/35 font-mono mt-1 flex items-center gap-1.5">
                <Signal className="w-3 h-3 text-primary/50" /> {user.email ?? 'AI Operations Monitor'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lastRefresh && (
              <span className="hidden lg:flex items-center gap-1.5 text-[10px] text-white/30 font-mono px-2.5 py-1.5 rounded-lg border border-white/8 bg-white/[0.02]">
                <Radio className="w-3 h-3 text-emerald-400/60" /> SYNC {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button onClick={load} aria-label="Refresh dashboard data" title="Refresh" className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/6 border border-white/8 transition-all">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => navigate('/connections')} className="flex items-center gap-1.5 h-9 px-3 text-[11px] font-mono border border-white/10 text-white/45 bg-white/[0.02] hover:bg-white/6 hover:text-white rounded-lg transition-all">
              <Key className="w-3 h-3" /> Connections
            </button>
            {(user.subscriptionTier ?? 'free').toLowerCase() !== 'empire' && (
              <button onClick={() => navigate('/pricing')} className="flex items-center gap-1.5 h-9 px-3 text-[11px] font-mono border border-amber-500/25 text-amber-300/70 bg-amber-500/5 hover:bg-amber-500/10 hover:text-amber-300 rounded-lg transition-all">
                <Crown className="w-3 h-3" /> Upgrade
              </button>
            )}
            <button onClick={() => navigate('/builder')} className="flex items-center gap-1.5 h-9 px-4 text-[11px] font-bold bg-primary hover:bg-primary/90 text-white rounded-lg transition-all shadow-[0_0_18px_rgba(14,165,233,0.3)]">
              <Plus className="w-3.5 h-3.5" /> New System
            </button>
          </div>
        </div>
      </HudPanel>

      {/* ══ KPI RIBBON — holographic instrument cells ═══════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Revenue */}
        <HudPanel className="p-5 flex flex-col group" accent="rgba(16,185,129,0.5)">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-emerald-500/0 via-emerald-400 to-emerald-500/0" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-mono font-bold text-white/40 uppercase tracking-widest">Revenue</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </div>
          <p className="text-[36px] font-black font-mono text-emerald-400 leading-none tabular-nums holo-shimmer-text">{fmtCompact(monthCents)}</p>
          <p className="text-[10px] text-white/30 font-mono mt-1 mb-2">this month</p>
          <div className="-mx-1 mb-2 opacity-80"><Sparkline values={dailyData.map(d => d.cents)} color="#10b981" height={32} /></div>
          <div className="flex items-center gap-3 mt-auto pt-3 border-t border-white/8">
            <div><p className="text-[8px] text-white/25 font-mono">Today</p><p className="text-[11px] font-mono font-bold text-white/60">{fmtCompact(todayCents)}</p></div>
            <div className="w-px h-4 bg-white/10" />
            <div><p className="text-[8px] text-white/25 font-mono">Week</p><p className="text-[11px] font-mono font-bold text-white/60">{fmtCompact(weekCents)}</p></div>
            <div className="w-px h-4 bg-white/10" />
            <div><p className="text-[8px] text-white/25 font-mono">All time</p><p className="text-[11px] font-mono font-bold text-white/60">{fmtCompact(lifetimeCents)}</p></div>
          </div>
        </HudPanel>

        {/* Systems */}
        <HudPanel className="p-5 flex flex-col" accent="rgba(56,189,248,0.5)">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-sky-500/0 via-sky-400 to-sky-500/0" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-mono font-bold text-white/40 uppercase tracking-widest">Systems</span>
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
              <Server className="w-3.5 h-3.5 text-sky-400" />
            </div>
          </div>
          <p className="text-[36px] font-black font-mono text-sky-400 leading-none tabular-nums">{activeSystems}</p>
          <p className="text-[10px] text-white/30 font-mono mt-1 mb-2">active of {totalSystems} total</p>
          <div className="-mx-1 mb-2 opacity-80"><Sparkline values={systemsData.map(d => d.val)} color="#38bdf8" height={32} /></div>
          <div className="flex items-center gap-3 mt-auto pt-3 border-t border-white/8 flex-wrap">
            {[{val: building, label: 'Building', cls: 'text-blue-400'}, {val: paused, label: 'Paused', cls: 'text-amber-400'}, {val: failed, label: 'Failed', cls: 'text-rose-400'}].map(s => (
              <div key={s.label}>
                <p className="text-[8px] text-white/25 font-mono">{s.label}</p>
                <p className={`text-[11px] font-mono font-bold ${s.cls}`}>{s.val}</p>
              </div>
            ))}
          </div>
        </HudPanel>

        {/* Credits — radial gauge */}
        <HudPanel className="p-5 flex flex-col" accent={credPct > 30 ? 'rgba(251,191,36,0.5)' : 'rgba(251,113,133,0.55)'}>
          <div className={`absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-amber-500/0 ${credPct > 30 ? 'via-amber-400' : 'via-rose-400'} to-amber-500/0`} />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-mono font-bold text-white/40 uppercase tracking-widest">AI Credits</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <RadialGauge pct={credPct} color={credPct > 30 ? '#fbbf24' : '#fb7185'} size={76} stroke={6}>
              <span className={`text-[15px] font-black font-mono leading-none tabular-nums ${credPct > 30 ? 'text-amber-400' : 'text-rose-400'}`}>{credPct}%</span>
              <span className="text-[7px] font-mono text-white/30 uppercase tracking-wider mt-0.5">left</span>
            </RadialGauge>
            <div className="min-w-0">
              <p className={`text-[26px] font-black font-mono leading-none tabular-nums ${credPct > 30 ? 'text-amber-400' : 'text-rose-400'}`}>{credBalance.toLocaleString()}</p>
              <p className="text-[10px] text-white/30 font-mono mt-1">credits remaining</p>
            </div>
          </div>
          <div className="flex justify-between text-[8px] font-mono text-white/25 mt-auto pt-3 border-t border-white/8">
            <span>{credUsed.toLocaleString()} used</span><span>of {credAllotment.toLocaleString()}</span>
          </div>
        </HudPanel>

        {/* AI Activity */}
        <HudPanel className="p-5 flex flex-col" accent="rgba(139,92,246,0.5)">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-violet-500/0 via-violet-400 to-violet-500/0" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-mono font-bold text-white/40 uppercase tracking-widest">AI Activity</span>
            <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-violet-400" />
            </div>
          </div>
          <p className="text-[36px] font-black font-mono text-violet-400 leading-none tabular-nums">{aiActivity?.totalRequests ?? 0}</p>
          <p className="text-[10px] text-white/30 font-mono mt-1 mb-2">total requests</p>
          <div className="-mx-1 mb-2 opacity-80"><Sparkline values={aiData.map(d => d.val)} color="#8b5cf6" height={32} /></div>
          <div className="flex items-center gap-2 mt-auto pt-3 border-t border-white/8">
            <span className={`w-2 h-2 rounded-full ${orStatus === 'operational' ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]' : 'bg-zinc-600'}`} />
            <span className="text-[10px] font-mono text-white/35 flex-1">OpenRouter {orStatus === 'operational' ? 'operational' : 'offline'}</span>
            <span className="text-[9px] font-mono font-bold text-white/30 bg-white/4 px-1.5 py-0.5 rounded">{connectedToolCount} tools</span>
          </div>
        </HudPanel>
      </div>

      {/* ══ HERO (no systems) or ASH STATUS STRIP ═══════════════════════════ */}
      {systems.length === 0 ? (
        <HudPanel className="px-7 py-6" accent="rgba(14,165,233,0.55)" scan>
          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-primary/0 via-primary to-primary/0" />
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex-1 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary holo-pulse shadow-[0_0_8px_rgba(14,165,233,0.8)]" />
                <span className="text-[10px] font-mono font-bold text-primary uppercase tracking-widest">ASH Agent Ready</span>
              </div>
              <h2 className="text-2xl font-bold text-white leading-snug">Build Your First <span className="text-primary">Income System</span></h2>
              <p className="text-sm text-white/40 leading-relaxed max-w-lg">Tell ASH what you want to earn. It designs a complete system — tools, credentials, steps — and builds it autonomously.</p>
            </div>
            <div className="flex flex-col gap-2.5 shrink-0 w-full sm:w-auto min-w-[192px]">
              <button onClick={() => navigate('/builder')} className="flex items-center justify-center gap-2 font-bold h-10 px-6 text-sm bg-primary hover:bg-primary/90 text-white rounded-xl shadow-[0_0_20px_rgba(14,165,233,0.3)] transition-all">
                <Bot className="w-4 h-4" /> Ask ASH to Build
              </button>
              <div className="flex gap-2">
                <button onClick={() => navigate('/blueprints')} className="flex-1 flex items-center justify-center gap-1.5 h-8 text-[11px] font-mono border border-white/10 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                  <Layers className="w-3 h-3" /> Blueprints
                </button>
                <button onClick={() => navigate('/marketplace')} className="flex-1 flex items-center justify-center gap-1.5 h-8 text-[11px] font-mono border border-white/10 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                  <Globe className="w-3 h-3" /> Tools
                </button>
              </div>
            </div>
          </div>
        </HudPanel>
      ) : (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl holo-glass">
          <span className="w-2 h-2 rounded-full bg-primary/80 holo-pulse" />
          <p className="text-[11px] font-mono text-white/40 flex-1">
            ASH monitoring <span className="text-white/70">{activeSystems} active system{activeSystems !== 1 ? 's' : ''}</span>
            {building > 0 && <> · <span className="text-blue-400">{building} building</span></>}
          </p>
          <button onClick={() => navigate('/builder')} className="shrink-0 text-[10px] font-mono text-primary/70 hover:text-primary transition-colors font-semibold">Open Builder →</button>
        </div>
      )}

      {/* ══ ANALYTICS + QUICK ACTIONS ═══════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Chart panel */}
        <HudPanel className="lg:col-span-3" accent={`${chartCfg.color}90`}>
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/8 flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-[3px] h-5 rounded-full" style={{ background: chartCfg.color }} />
              <div>
                <h2 className="text-sm font-bold text-white/80">Analytics Telemetry</h2>
                <p className="text-[10px] text-white/30 font-mono">7-day window · {chartType} view</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Metric switcher */}
              <div className="flex items-center bg-white/4 border border-white/10 rounded-xl p-1 gap-0.5">
                {CHART_TABS.map(tab => (
                  <button key={tab.key} onClick={() => setChartTab(tab.key)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold font-mono transition-all ${
                      chartTab === tab.key ? 'text-white shadow-sm' : 'text-white/30 hover:text-white/60'
                    }`}
                    style={chartTab === tab.key ? { background: `${tab.color}22`, boxShadow: `inset 0 0 0 1px ${tab.color}55` } : undefined}
                  >
                    <tab.icon className="w-3 h-3" style={chartTab === tab.key ? { color: tab.color } : undefined} />
                    {tab.label}
                  </button>
                ))}
              </div>
              {/* Chart-type switcher */}
              <div className="flex items-center bg-white/4 border border-white/10 rounded-xl p-1 gap-0.5">
                {CHART_TYPES.map(ct => (
                  <button key={ct.key} onClick={() => setChartType(ct.key)}
                    title={`${ct.label} chart`} aria-label={`${ct.label} chart`}
                    aria-pressed={chartType === ct.key}
                    className={`p-1.5 rounded-lg transition-all ${
                      chartType === ct.key ? 'bg-white/12 text-white shadow-sm' : 'text-white/30 hover:text-white/60'
                    }`}
                  >
                    <ct.icon className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="px-5 pt-4 pb-3">
            <div className="flex items-baseline gap-3 mb-4">
              <p className="text-[32px] font-black font-mono tabular-nums leading-none" style={{ color: chartCfg.color }}>
                {chartTab === 'revenue' ? fmtCompact(todayCents) : chartTab === 'ai' ? (aiActivity?.totalRequests ?? 0) : totalSystems}
              </p>
              <p className="text-[10px] text-white/30 font-mono uppercase tracking-widest">
                {chartTab === 'revenue' ? 'today' : chartTab === 'ai' ? 'total requests' : 'total systems'}
              </p>
              {chartTab === 'revenue' && weekCents > 0 && (
                <span className="ml-auto flex items-center gap-1 text-emerald-400 text-sm font-bold font-mono">
                  <ArrowUpRight className="w-4 h-4" />{fmtCompact(weekCents)}/wk
                </span>
              )}
            </div>
            <div className="h-[168px]" style={{ filter: `drop-shadow(0 4px 14px ${chartCfg.color}40)` }}>
              <ResponsiveContainer width="100%" height="100%">
                {renderChart()}
              </ResponsiveContainer>
            </div>
          </div>
        </HudPanel>

        {/* Side: Quick Actions + Platform */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Quick Actions */}
          <HudPanel className="p-4" accent="rgba(251,191,36,0.45)" corners={false}>
            <div className="flex items-center gap-2 mb-3.5">
              <div className="w-[3px] h-4 bg-amber-400 rounded-full" />
              <h2 className="text-[10px] font-bold text-white/55 uppercase tracking-widest font-mono">Quick Actions</h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                {label: 'Builder', icon: Rocket, onClick: () => navigate('/builder'), border: 'border-primary/25', bg: 'hover:bg-primary/10', text: 'text-primary'},
                {label: 'Connect Tools', icon: Key, onClick: () => navigate('/connections'), border: 'border-amber-500/25', bg: 'hover:bg-amber-500/10', text: 'text-amber-400'},
                {label: 'Blueprints', icon: Layers, onClick: () => navigate('/blueprints'), border: 'border-violet-500/25', bg: 'hover:bg-violet-500/10', text: 'text-violet-400'},
                {label: 'Buy Credits', icon: Coins, onClick: () => navigate('/credits'), border: 'border-emerald-500/25', bg: 'hover:bg-emerald-500/10', text: 'text-emerald-400'},
              ].map(a => (
                <button key={a.label} onClick={a.onClick}
                  className={`flex flex-col items-center gap-2.5 py-4 px-2 rounded-xl border ${a.border} bg-white/2 ${a.bg} transition-all group`}
                >
                  <a.icon className={`w-5 h-5 ${a.text} group-hover:scale-110 transition-transform`} />
                  <span className={`text-[9px] font-mono font-semibold ${a.text} uppercase tracking-wide leading-tight`}>{a.label}</span>
                </button>
              ))}
            </div>
          </HudPanel>

          {/* Platform Status */}
          <HudPanel className="p-4 flex-1" accent="rgba(16,185,129,0.45)" corners={false}>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-[3px] h-4 bg-emerald-400 rounded-full" />
                <h2 className="text-[10px] font-bold text-white/55 uppercase tracking-widest font-mono">Platform</h2>
              </div>
              <span className="text-[9px] font-mono font-bold text-white/30 bg-white/4 px-1.5 py-0.5 rounded border border-white/8">{connectedToolCount} online</span>
            </div>
            <div className="space-y-1.5">
              {[
                {name: 'OpenRouter AI', key: 'openrouter', icon: Bot},
                {name: 'PostgreSQL DB', key: 'database', icon: Database},
                {name: 'Stripe', key: 'stripe', icon: CreditCard},
                {name: 'Cloudflare', key: 'cloudflare', icon: Shield},
                {name: 'Make.com', key: 'make.com', icon: Settings},
              ].map(tool => {
                const connected = toolConnected(tool.name, storedKeys, orStatus);
                return (
                  <div key={tool.key} className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${connected ? 'bg-emerald-500/4 border-emerald-500/15' : 'bg-white/[0.02] border-white/5'}`}>
                    <div className="flex items-center gap-2">
                      <tool.icon className={`w-3 h-3 ${connected ? 'text-emerald-400/70' : 'text-white/20'}`} />
                      <span className="text-[11px] font-mono text-white/50">{tool.name}</span>
                    </div>
                    <span className={`text-[9px] font-mono font-bold ${connected ? 'text-emerald-400' : 'text-zinc-600'}`}>{connected ? '● Online' : '○ Off'}</span>
                  </div>
                );
              })}
            </div>
            <button onClick={() => navigate('/connections')} className="mt-3 w-full text-[10px] font-mono text-white/30 hover:text-white/55 py-1.5 rounded-lg border border-white/8 hover:bg-white/3 transition-all">
              Manage Connections →
            </button>
          </HudPanel>
        </div>
      </div>

      {/* ══ SYSTEMS FLEET ════════════════════════════════════════════════════ */}
      <HudPanel accent="rgba(56,189,248,0.5)">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/8">
          <div className="flex items-center gap-2.5">
            <div className="w-[3px] h-5 bg-sky-400 rounded-full" />
            <div>
              <h2 className="text-sm font-bold text-white/80">Systems Fleet</h2>
              <p className="text-[10px] text-white/30 font-mono">{systems.length} deployed · {activeSystems} active</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/systems')} className="h-7 px-3 text-[10px] font-mono text-white/35 hover:text-white hover:bg-white/5 border border-white/8 rounded-lg transition-all flex items-center gap-1.5">
              View All <ChevronRight className="w-3 h-3" />
            </button>
            <button onClick={() => navigate('/builder')} className="h-7 px-3 text-[10px] font-bold bg-primary/12 hover:bg-primary/22 text-primary border border-primary/22 hover:border-primary/35 rounded-lg transition-all flex items-center gap-1.5">
              <Plus className="w-3 h-3" /> Deploy
            </button>
          </div>
        </div>

        {systems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/2 border border-white/6 flex items-center justify-center">
              <Server className="w-6 h-6 text-white/10" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-white/45">No Systems Deployed</p>
              <p className="text-[11px] text-white/25 font-mono mt-1">Build your first system with ASH</p>
            </div>
            <button onClick={() => navigate('/builder')} className="flex items-center gap-1.5 px-4 py-2 bg-primary/10 hover:bg-primary/18 border border-primary/22 text-primary text-xs font-mono font-semibold rounded-xl transition-all">
              <Zap className="w-3.5 h-3.5" /> Launch Builder
            </button>
          </div>
        ) : (
          <div>
            <div className="hidden lg:grid grid-cols-12 gap-3 px-5 py-2.5 bg-white/[0.025] border-b border-white/5">
              {[['col-span-4','System'],['col-span-2','Status'],['col-span-2','Health'],['col-span-1','Uptime'],['col-span-2','Revenue'],['col-span-1 text-right','']].map(([cls, h]) => (
                <div key={h} className={`${cls} text-[9px] uppercase tracking-widest text-white/25 font-bold font-mono`}>{h}</div>
              ))}
            </div>
            {systems.map((system, idx) => {
              const isLoading  = controlLoading[system.id];
              const isPaused   = system.buildStatus === 'paused';
              const isBuilding = system.buildStatus === 'building';
              const hp         = healthPct(system.buildStatus, system.healthStatus);
              const hpColor    = hp >= 80 ? 'bg-emerald-500' : hp >= 50 ? 'bg-amber-400' : hp >= 20 ? 'bg-orange-500' : 'bg-rose-500';
              const hpText     = hp >= 80 ? 'text-emerald-400' : hp >= 50 ? 'text-amber-400' : hp >= 20 ? 'text-orange-400' : 'text-rose-400';
              return (
                <div
                  key={system.id}
                  className={`group grid grid-cols-1 lg:grid-cols-12 gap-3 items-center px-5 py-3.5 border-b border-white/4 last:border-0 hover:bg-white/[0.03] transition-colors cursor-pointer ${idx % 2 === 0 ? '' : 'bg-white/[0.012]'}`}
                  onClick={() => navigate(`/systems/${system.id}`)}
                >
                  <div className="lg:col-span-4 flex items-center gap-3 min-w-0">
                    <StatusDot status={system.buildStatus === 'completed' ? 'active' : (system.buildStatus ?? 'pending')} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white/75 truncate group-hover:text-white transition-colors">{system.name}</p>
                      <p className="text-[10px] text-white/30 font-mono truncate">{system.blueprint?.name ?? 'Custom Blueprint'}</p>
                    </div>
                  </div>
                  <div className="lg:col-span-2"><StatusBadge buildStatus={system.buildStatus} healthStatus={system.healthStatus} /></div>
                  <div className="lg:col-span-2 flex items-center gap-2">
                    <div className="flex-1 h-1 bg-white/6 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${hpColor}`} style={{width: `${hp}%`}} />
                    </div>
                    <span className={`text-[10px] font-mono font-bold shrink-0 ${hpText}`}>{hp}%</span>
                  </div>
                  <div className="lg:col-span-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-white/15" />
                    <span className="text-[10px] text-white/35 font-mono">{uptimeLabel(system.createdAt, system.buildStatus)}</span>
                  </div>
                  <div className="lg:col-span-2">
                    {(() => {
                      const cents = systemRevenue[String(system.id)] ?? 0;
                      return <span className={`text-xs font-mono font-bold ${cents > 0 ? 'text-emerald-400' : 'text-white/15'}`}>{fmtCompact(cents)}</span>;
                    })()}
                  </div>
                  <div className="lg:col-span-1 flex items-center gap-0.5 lg:justify-end" onClick={e => e.stopPropagation()}>
                    {isPaused ? (
                      <button onClick={() => patchSystem(system.id, {buildStatus: 'active'})} disabled={isLoading}
                        className="p-1.5 rounded text-emerald-400/40 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors border border-transparent hover:border-emerald-500/18">
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button onClick={() => patchSystem(system.id, {buildStatus: 'paused'})} disabled={isLoading || isBuilding}
                        className="p-1.5 rounded text-amber-400/40 hover:text-amber-400 hover:bg-amber-500/10 transition-colors border border-transparent hover:border-amber-500/18">
                        <Pause className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={() => patchSystem(system.id, {buildStatus: 'building'})} disabled={isLoading}
                      className="p-1.5 rounded text-blue-400/40 hover:text-blue-400 hover:bg-blue-500/10 transition-colors">
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    {deleteConfirm === system.id ? (
                      <span className="flex items-center gap-0.5 ml-0.5">
                        <button onClick={() => deleteSystem(system.id)} disabled={isLoading} className="text-[10px] px-1.5 py-0.5 rounded text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 font-bold">Y</button>
                        <button onClick={() => setDeleteConfirm(null)} className="text-[10px] px-1.5 py-0.5 rounded text-white/30 hover:bg-white/5 border border-white/8">N</button>
                      </span>
                    ) : (
                      <button onClick={() => setDeleteConfirm(system.id)} disabled={isLoading}
                        className="p-1.5 rounded text-rose-400/25 hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </HudPanel>

      {/* ══ BOTTOM ROW: ACTIVITY + CREDITS/ALERTS ═══════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Activity Timeline */}
        <HudPanel accent="rgba(139,92,246,0.45)" corners={false}>
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-white/8">
            <div className="w-[3px] h-4 bg-violet-400 rounded-full" />
            <h2 className="text-[10px] font-bold text-white/55 uppercase tracking-widest font-mono">Activity Log</h2>
          </div>
          <div className="p-4">
            {timeline.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Brain className="w-7 h-7 text-white/6" />
                <p className="text-[11px] text-white/25 font-mono text-center">No activity yet.<br />Deploy a system to see logs here.</p>
              </div>
            ) : (
              <div className="relative overflow-y-auto max-h-[260px] pr-1">
                <div className="absolute left-[5px] top-2 bottom-2 w-px bg-white/8" />
                <div className="space-y-0">
                  {timeline.map(evt => (
                    <div key={evt.id} className="relative flex gap-4 pb-3.5 pl-6">
                      <span className={`absolute left-0 top-[5px] w-[11px] h-[11px] rounded-full border-2 border-[#080a16] ${evt.dot}`} />
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-[11px] font-semibold truncate ${evt.color}`}>{evt.label}</p>
                          <span className="text-[9px] text-white/20 font-mono shrink-0">{timeAgo(evt.ts)}</span>
                        </div>
                        {evt.detail && <p className="text-[10px] text-white/30 truncate mt-0.5">{evt.detail}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </HudPanel>

        {/* Credits + Alerts */}
        <HudPanel accent="rgba(251,191,36,0.45)" corners={false}>
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/8">
            <div className="flex items-center gap-2.5">
              <div className="w-[3px] h-4 bg-amber-400 rounded-full" />
              <h2 className="text-[10px] font-bold text-white/55 uppercase tracking-widest font-mono">Credits & Alerts</h2>
            </div>
            <button onClick={() => navigate('/credits')} className="text-[10px] font-mono font-semibold text-amber-400/60 hover:text-amber-400 transition-colors">Top Up →</button>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b border-white/5">
              <RadialGauge pct={credPct} color={credPct > 30 ? '#fbbf24' : '#fb7185'} size={66} stroke={6}>
                <span className={`text-[13px] font-black font-mono ${credPct > 30 ? 'text-amber-400' : 'text-rose-400'}`}>{credPct}%</span>
              </RadialGauge>
              <div className="flex-1">
                <p className={`text-3xl font-black font-mono tabular-nums ${credPct > 30 ? 'text-amber-400' : 'text-rose-400'}`}>{credBalance.toLocaleString()}</p>
                <p className="text-[10px] text-white/25 font-mono mt-0.5">credits left · {credAllotment.toLocaleString()} total</p>
              </div>
            </div>

            {alertNotifs.length > 0 ? (
              <div className="space-y-2">
                {alertNotifs.slice(0, 3).map((n, i) => {
                  const isError = (n.notificationType || '').toLowerCase() === 'error';
                  return (
                    <div key={`${n.id}-${i}`} className={`flex items-start gap-2 p-2.5 rounded-xl border ${isError ? 'bg-rose-500/5 border-rose-500/18' : 'bg-amber-500/5 border-amber-500/18'}`}>
                      <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isError ? 'text-rose-400' : 'text-amber-400'}`} />
                      <div className="min-w-0">
                        <p className={`text-[11px] font-semibold truncate ${isError ? 'text-rose-400' : 'text-amber-400'}`}>{n.title || n.message}</p>
                        {n.message && n.title && <p className="text-[10px] text-white/28 truncate mt-0.5">{n.message}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-[11px] font-semibold text-emerald-400">All Systems Nominal</p>
                  <p className="text-[10px] text-white/25 font-mono mt-0.5">No active alerts</p>
                </div>
              </div>
            )}

            <div className="border-t border-white/5 pt-3 space-y-0.5">
              {notifications.slice(0, 4).map((n, i) => {
                const tk = (n.notificationType || 'info').toLowerCase();
                const cfg = NOTIF_TYPE_MAP[tk] ?? NOTIF_TYPE_MAP.info;
                return (
                  <div key={`${n.id}-${i}`} className="flex items-center gap-2 py-1.5 border-b border-white/4 last:border-0">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                    <p className="text-[11px] text-white/45 truncate flex-1">{n.title || n.message}</p>
                    <span className="text-[9px] text-white/20 font-mono shrink-0">{timeAgo(n.createdAt)}</span>
                  </div>
                );
              })}
              {notifications.length === 0 && (
                <p className="text-[10px] text-white/20 font-mono text-center py-2">No notifications yet</p>
              )}
            </div>
          </div>
        </HudPanel>
      </div>

      </div>
    </div>
  );
};

export default SystemCommandCenterPage;
