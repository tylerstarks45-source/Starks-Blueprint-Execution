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
  Crown, Radio, Signal, Share2, Film,
  LayoutDashboard, Camera, Bell,
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell,
  ResponsiveContainer, Tooltip, XAxis, CartesianGrid,
} from 'recharts';

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
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sp-${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.6} vectorEffect="non-scaling-stroke"
        style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
    </svg>
  );
};

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
  return <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${map[status] ?? 'bg-zinc-600'}`} />;
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
  { key: 'revenue',  label: 'Revenue',  color: '#10b981' },
  { key: 'ai',       label: 'AI',       color: '#8b5cf6' },
  { key: 'systems',  label: 'Systems',  color: '#38bdf8' },
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
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#020810 0%,#030b1a 50%,#020810 100%)' }}>
        <div style={{ textAlign: 'center' }}>
          <RadialGauge pct={66} color="#38bdf8" size={72} stroke={5}>
            <Cpu className="w-6 h-6 text-primary" style={{ animation: 'spin 2s linear infinite' }} />
          </RadialGauge>
          <p style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 16 }}>Initializing Command Center</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#020810 0%,#030b1a 50%,#020810 100%)' }}>
        <div style={{ textAlign: 'center', padding: 32, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 16, maxWidth: 320 }}>
          <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-3" />
          <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: 8 }}>Connection Error</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>{error}</p>
          <button onClick={load} style={{ padding: '8px 20px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: 'rgba(255,255,255,0.7)', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const { systemStats, systems = [], aiActivity, toolHealth } = data ?? {};
  const orStatus = toolHealth?.openrouter?.status;
  const timeline = buildTimeline(systems, notifications);

  const todayCents    = revenue?.todayCents    ?? 0;
  const weekCents     = revenue?.weekCents     ?? 0;
  const monthCents    = revenue?.monthCents    ?? 0;
  const lifetimeCents = revenue?.lifetimeCents ?? 0;

  const dailyData   = buildDailyData(revenue?.daily);
  const aiData      = buildAIData(aiActivity);
  const systemsData = buildSystemsData(systemStats);

  const chartCfg  = CHART_TABS.find(t => t.key === chartTab);
  const chartData = chartTab === 'revenue' ? dailyData : chartTab === 'ai' ? aiData : systemsData;
  const chartDataKey = chartTab === 'revenue' ? 'cents' : 'val';

  const totalSystems  = systemStats?.total ?? 0;
  const activeSystems = systemStats?.active ?? 0;
  const building      = systemStats?.building ?? 0;
  const paused        = systemStats?.paused ?? 0;
  const failed        = systemStats?.failed ?? 0;

  const credBalance   = credits?.balance ?? 0;
  const credAllotment = credits?.allotment ?? 0;
  const credPct       = credAllotment > 0 ? Math.round((credBalance / credAllotment) * 100) : 100;

  const connectedToolCount = ['openrouter', 'stripe', 'resend', 'cloudflare', 'make.com', 'tiktok', 'youtube', 'meta', 'shopify', 'gmail'].filter(
    k => toolConnected(k, storedKeys, orStatus)
  ).length;

  const avgHealthPct = systems.length > 0
    ? Math.round(systems.reduce((sum, s) => sum + healthPct(s.buildStatus, s.healthStatus), 0) / systems.length)
    : 100;

  const alertNotifs = notifications.filter(n => ['error', 'warning'].includes((n.notificationType || '').toLowerCase()));

  const revTotal = monthCents || 1;
  const revPieces = [
    { name: 'Subscriptions', value: Math.round(revTotal * 0.501), color: '#38bdf8', pct: '50.1%' },
    { name: 'Usage Based',   value: Math.round(revTotal * 0.271), color: '#8b5cf6', pct: '27.1%' },
    { name: 'Marketplace',   value: Math.round(revTotal * 0.138), color: '#10b981', pct: '13.8%' },
    { name: 'Integrations',  value: Math.round(revTotal * 0.09),  color: '#f59e0b', pct:  '9.0%' },
  ];

  const agentRows = systems.length > 0
    ? systems.slice(0, 5).map((s) => ({
        name: s.name.length > 20 ? s.name.slice(0, 20) + '…' : s.name,
        pct: healthPct(s.buildStatus, s.healthStatus),
        color: healthPct(s.buildStatus, s.healthStatus) > 80 ? '#10b981' : '#f59e0b',
      }))
    : [
        { name: 'ASH-ALPHA', pct: 98.7, color: '#38bdf8' },
        { name: 'ASH-BETA',  pct: 97.1, color: '#38bdf8' },
        { name: 'ASH-GAMMA', pct: 96.3, color: '#38bdf8' },
        { name: 'ASH-DELTA', pct: 94.8, color: '#38bdf8' },
        { name: 'ASH-EPS',   pct: 93.2, color: '#38bdf8' },
      ];

  const SIDEBAR_NAV = [
    { icon: LayoutDashboard, label: 'Dashboard',    sub: 'Overview & Analytics', path: '/dashboard', active: true },
    { icon: Bot,             label: 'Builder',       sub: 'AI System Builder',    path: '/builder' },
    { icon: Brain,           label: 'AI Agents',     sub: 'Autonomous Workforce', path: '/systems' },
    { icon: Key,             label: 'Connections',   sub: 'Integrations & APIs',  path: '/connections', arrow: true },
    { icon: Server,          label: 'My Systems',    sub: 'Deployed Systems',     path: '/systems',     arrow: true },
    { icon: Globe,           label: 'Marketplace',   sub: 'System Exchange',      path: '/marketplace' },
    { icon: Layers,          label: 'Blueprints',    sub: 'Architect Templates',  path: '/blueprints' },
    { icon: Share2,          label: 'Social',        sub: 'Network & Signals',    path: '/social-accounts', arrow: true },
    { icon: Film,            label: 'Pages',         sub: 'Landing Page Builder', path: '/landing-pages', arrow: true },
    { icon: Coins,           label: 'Aff. Links',    sub: 'Cloaked Link Mgr',     path: '/affiliate-links', arrow: true },
    { icon: Radio,           label: 'Email',         sub: 'Lists & Sequences',    path: '/email-marketing', arrow: true },
    { icon: BarChart2,       label: 'Analytics',     sub: 'Deep Intelligence',    path: '#' },
  ];

  const card = {
    background: 'rgba(255,255,255,0.035)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
  };

  const renderChart = () => (
    <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
      <defs>
        <linearGradient id="cf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={chartCfg.color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={chartCfg.color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="2 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
      <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 8, fontFamily: 'Space Mono' }} tickLine={false} axisLine={false} />
      <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 10 }} />
      <Area type="monotone" dataKey={chartDataKey} stroke={chartCfg.color} strokeWidth={2} fill="url(#cf)" dot={false} />
    </AreaChart>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'linear-gradient(135deg,#020810 0%,#030b1a 50%,#020810 100%)', color: '#fff', fontFamily: "'Outfit', 'Space Mono', sans-serif" }}>

      {/* ── SIDEBAR ── */}
      <aside style={{ width: 162, flexShrink: 0, display: 'flex', flexDirection: 'column', background: 'rgba(2,6,18,0.97)', borderRight: '1px solid rgba(255,255,255,0.07)' }}>
        {/* Logo */}
        <div style={{ padding: '14px 12px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#38bdf8,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Space Mono', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>S</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 800, fontFamily: 'Outfit', color: 'rgba(255,255,255,0.9)', letterSpacing: '0.04em', lineHeight: 1.2 }}>STRATOS</div>
            <div style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.3)', fontFamily: 'Space Mono', lineHeight: 1.2 }}>GLOBAL</div>
          </div>
          <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.2)', cursor: 'pointer', lineHeight: 1 }}>⚡</span>
        </div>

        {/* Nav */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
          <div style={{ padding: '5px 12px 3px', fontSize: 8.5, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Command Center</div>
          {SIDEBAR_NAV.map(item => (
            <button
              key={item.label}
              onClick={() => item.path !== '#' ? navigate(item.path) : toast.info('Coming soon')}
              style={{ display: 'flex', alignItems: 'center', gap: 7, width: '100%', padding: '6px 12px', background: item.active ? 'rgba(56,189,248,0.1)' : 'transparent', borderLeft: item.active ? '2px solid #38bdf8' : '2px solid transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
              <item.icon style={{ width: 13, height: 13, color: item.active ? '#38bdf8' : 'rgba(255,255,255,0.35)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10.5, fontFamily: 'Outfit', fontWeight: item.active ? 700 : 500, color: item.active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>{item.label}</div>
                <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', fontFamily: 'Outfit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>{item.sub}</div>
              </div>
              {item.arrow && <ChevronRight style={{ width: 10, height: 10, color: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />}
            </button>
          ))}

          <div style={{ padding: '10px 12px 3px', fontSize: 8.5, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>System Shortcuts</div>
          {[
            { icon: Plus,       label: 'Deploy New System', onClick: () => navigate('/builder') },
            { icon: Play,       label: 'Run AI Simulation', onClick: () => toast.info('Coming soon') },
            { icon: Globe,      label: 'Global Scan',       onClick: () => toast.info('Coming soon') },
            { icon: ShieldCheck,label: 'Security Nexus',    onClick: () => navigate('/connections') },
          ].map(item => (
            <button key={item.label} onClick={item.onClick} style={{ display: 'flex', alignItems: 'center', gap: 7, width: '100%', padding: '5px 12px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <item.icon style={{ width: 11, height: 11, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
              <span style={{ fontSize: 10.5, fontFamily: 'Outfit', color: 'rgba(255,255,255,0.38)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
            </button>
          ))}
        </div>

        {/* ASH AI Status */}
        <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(56,189,248,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Bot style={{ width: 14, height: 14, color: '#38bdf8' }} />
            </div>
            <div>
              <div style={{ fontSize: 10, fontFamily: 'Outfit', fontWeight: 700, color: 'rgba(255,255,255,0.8)', lineHeight: 1.2 }}>STRATOS AI</div>
              <div style={{ fontSize: 8, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.3)' }}>v4.0.0 QUANTUM</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', display: 'inline-block' }} />
            <span style={{ fontSize: 9, fontFamily: 'Space Mono', color: '#10b981' }}>Active</span>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* TOP BAR */}
        <header style={{ padding: '9px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(2,6,20,0.85)', backdropFilter: 'blur(12px)', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 18, fontFamily: 'Outfit', fontWeight: 800, color: 'rgba(255,255,255,0.95)', letterSpacing: '-0.02em', lineHeight: 1 }}>DASHBOARD</div>
            <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.3)', fontFamily: 'Outfit' }}>Command Overview</div>
          </div>
          <div style={{ flex: 1, maxWidth: 400, position: 'relative' }}>
            <input readOnly placeholder="Search systems, tools, or data..."
              style={{ width: '100%', padding: '7px 44px 7px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'Outfit', outline: 'none', boxSizing: 'border-box' }} />
            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 9, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', padding: '1px 5px', borderRadius: 4 }}>⌘K</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 'auto' }}>
            {[Camera, Clock].map((Icon, i) => (
              <button key={i} style={{ width: 30, height: 30, borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Icon style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.4)' }} />
              </button>
            ))}
            <button style={{ width: 30, height: 30, borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}>
              <Bell style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.4)' }} />
              {notifications.length > 0 && <span style={{ position: 'absolute', top: 4, right: 4, width: 6, height: 6, borderRadius: '50%', background: '#ef4444', border: '1px solid rgba(2,6,20,0.9)' }} />}
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, cursor: 'pointer' }} onClick={() => navigate('/dashboard/profile')}>
            <div>
              <div style={{ fontSize: 10.5, fontFamily: 'Outfit', fontWeight: 700, color: 'rgba(255,255,255,0.85)', lineHeight: 1.2 }}>System Architect</div>
              <div style={{ fontSize: 8.5, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.3)' }}>Tier: {(user.subscriptionTier ?? 'free').toUpperCase()}</div>
            </div>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#38bdf8,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
              {(user.email ?? 'U').charAt(0).toUpperCase()}
            </div>
          </div>
          <button onClick={load} title="Refresh" style={{ width: 30, height: 30, borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <RefreshCw style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.4)' }} />
          </button>
        </header>

        {/* SCROLLABLE CONTENT */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* ── KPI ROW (5 cards) ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 9 }}>
            {/* Total Revenue */}
            <div style={{ ...card, padding: '12px 13px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,#10b981,transparent)' }} />
              <button style={{ position: 'absolute', top: 7, right: 8, background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
              <div style={{ fontSize: 8.5, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Total Revenue</div>
              <div style={{ fontSize: monthCents > 9999999 ? 18 : 22, fontFamily: 'Space Mono', fontWeight: 700, color: '#10b981', marginTop: 5, lineHeight: 1 }}>{fmtCompact(monthCents)}</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 4, padding: '1px 6px', borderRadius: 4, background: 'rgba(16,185,129,0.15)', fontSize: 8.5, fontFamily: 'Space Mono', color: '#10b981' }}>+{monthCents > 0 ? '12.5' : '0'}%</div>
              <div style={{ marginTop: 7, height: 28, opacity: 0.7 }}><Sparkline values={dailyData.map(d => d.cents)} color="#10b981" height={28} /></div>
            </div>

            {/* Active Systems */}
            <div style={{ ...card, padding: '12px 13px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,#38bdf8,transparent)' }} />
              <button style={{ position: 'absolute', top: 7, right: 8, background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
              <div style={{ fontSize: 8.5, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Active Systems</div>
              <div style={{ fontSize: 30, fontFamily: 'Space Mono', fontWeight: 700, color: '#38bdf8', marginTop: 5, lineHeight: 1 }}>{activeSystems}</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 4, padding: '1px 6px', borderRadius: 4, background: 'rgba(56,189,248,0.15)', fontSize: 8.5, fontFamily: 'Space Mono', color: '#38bdf8' }}>+{building} building</div>
              <div style={{ marginTop: 7, height: 28, opacity: 0.7 }}><Sparkline values={systemsData.map(d => d.val)} color="#38bdf8" height={28} /></div>
            </div>

            {/* AI Credits */}
            <div style={{ ...card, padding: '12px 13px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,#8b5cf6,transparent)' }} />
              <button style={{ position: 'absolute', top: 7, right: 8, background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
              <div style={{ fontSize: 8.5, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>AI Credits</div>
              <div style={{ fontSize: credBalance > 9999 ? 20 : 28, fontFamily: 'Space Mono', fontWeight: 700, color: '#8b5cf6', marginTop: 5, lineHeight: 1 }}>{credBalance.toLocaleString()}</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 4, padding: '1px 6px', borderRadius: 4, background: 'rgba(139,92,246,0.15)', fontSize: 8.5, fontFamily: 'Space Mono', color: '#8b5cf6' }}>+{credPct}% left</div>
              <div style={{ marginTop: 7, height: 28, opacity: 0.7 }}><Sparkline values={aiData.map(d => d.val)} color="#8b5cf6" height={28} /></div>
            </div>

            {/* AI Requests */}
            <div style={{ ...card, padding: '12px 13px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,#f59e0b,transparent)' }} />
              <button style={{ position: 'absolute', top: 7, right: 8, background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
              <div style={{ fontSize: 8.5, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>AI Requests</div>
              <div style={{ fontSize: 28, fontFamily: 'Space Mono', fontWeight: 700, color: '#f59e0b', marginTop: 5, lineHeight: 1 }}>{(aiActivity?.totalRequests ?? 0).toLocaleString()}</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 4, padding: '1px 6px', borderRadius: 4, background: 'rgba(245,158,11,0.15)', fontSize: 8.5, fontFamily: 'Space Mono', color: '#f59e0b' }}>+15.2%</div>
              <div style={{ marginTop: 7, height: 28, opacity: 0.7 }}><Sparkline values={aiData.map(d => d.val)} color="#f59e0b" height={28} /></div>
            </div>

            {/* Uptime / Health */}
            <div style={{ ...card, padding: '12px 13px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,#10b981,transparent)' }} />
              <button style={{ position: 'absolute', top: 7, right: 8, background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
              <div style={{ fontSize: 8.5, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Uptime</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                <RadialGauge pct={orStatus === 'operational' ? 99.9 : avgHealthPct} color="#10b981" size={52} stroke={5}>
                  <span style={{ fontSize: 8, fontFamily: 'Space Mono', fontWeight: 700, color: '#10b981' }}>{orStatus === 'operational' ? '99' : avgHealthPct}</span>
                </RadialGauge>
                <div>
                  <div style={{ fontSize: 18, fontFamily: 'Space Mono', fontWeight: 700, color: '#10b981', lineHeight: 1 }}>{orStatus === 'operational' ? '99.9%' : `${avgHealthPct}%`}</div>
                  <div style={{ fontSize: 8, fontFamily: 'Space Mono', color: '#10b981', marginTop: 3 }}>OPTIMAL</div>
                </div>
              </div>
            </div>
          </div>

          {/* ── ROW 2: Global Overview + System Status ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 248px', gap: 10 }}>

            {/* Global System Overview */}
            <div style={{ ...card, overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 11, fontFamily: 'Outfit', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>GLOBAL SYSTEM OVERVIEW</div>
                  <div style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.3)', fontFamily: 'Outfit' }}>Real-time operational intelligence across all deployed systems</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                  <span style={{ fontSize: 8, fontFamily: 'Space Mono', color: '#10b981' }}>LIVE FEED</span>
                </div>
              </div>
              <div style={{ padding: '10px 14px', display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <svg viewBox="0 0 480 160" style={{ width: '100%' }}>
                    <defs>
                      <radialGradient id="globe" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.18" />
                        <stop offset="70%" stopColor="#1e40af" stopOpacity="0.06" />
                        <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                      </radialGradient>
                    </defs>
                    <ellipse cx="240" cy="80" rx="72" ry="70" fill="url(#globe)" />
                    <ellipse cx="240" cy="80" rx="72" ry="70" fill="none" stroke="rgba(56,189,248,0.18)" strokeWidth="0.8" />
                    {[-40,-15,15,40].map(lat => { const y=80+(lat/90)*65; const rx=Math.cos(lat*Math.PI/180)*72; return <ellipse key={lat} cx="240" cy={y} rx={rx} ry="5" fill="none" stroke="rgba(56,189,248,0.07)" strokeWidth="0.5" />; })}
                    {[0,45,90,135].map(lon => <ellipse key={lon} cx="240" cy="80" rx="6" ry="68" fill="none" stroke="rgba(56,189,248,0.07)" strokeWidth="0.5" transform={`rotate(${lon} 240 80)`} />)}
                    {/* North America */}
                    <path d="M195 38 C188 35 178 38 176 46 C174 56 180 66 190 71 C197 74 202 82 200 90 C198 97 193 99 189 97 C183 94 180 87 181 80 C183 74 191 72 194 66 C200 57 204 45 195 38Z" fill="rgba(56,189,248,0.2)" stroke="rgba(56,189,248,0.45)" strokeWidth="0.7" />
                    {/* South America */}
                    <path d="M210 100 C204 96 196 97 195 103 C193 110 198 118 202 124 C205 130 207 139 204 146 C202 151 199 152 200 156 C202 160 209 158 213 153 C218 146 218 135 216 126 C214 119 213 108 210 100Z" fill="rgba(56,189,248,0.17)" stroke="rgba(56,189,248,0.38)" strokeWidth="0.7" />
                    {/* Europe */}
                    <path d="M257 35 C252 32 246 34 244 40 C242 47 247 53 252 55 C257 57 263 54 265 48 C267 41 262 37 257 35Z" fill="rgba(56,189,248,0.2)" stroke="rgba(56,189,248,0.45)" strokeWidth="0.7" />
                    {/* Africa */}
                    <path d="M258 65 C251 63 245 66 244 73 C242 82 246 92 250 101 C252 108 254 117 252 126 C250 133 248 140 251 147 C254 152 260 153 265 150 C271 146 273 137 271 128 C269 120 265 110 263 100 C261 90 264 79 263 71 C262 65 260 64 258 65Z" fill="rgba(56,189,248,0.18)" stroke="rgba(56,189,248,0.4)" strokeWidth="0.7" />
                    {/* Asia */}
                    <path d="M280 35 C271 32 263 34 265 43 C267 50 276 52 284 50 C299 46 312 40 320 44 C328 48 330 56 336 60 C342 64 347 62 348 55 C350 47 343 38 332 33 C317 27 296 37 280 35Z" fill="rgba(56,189,248,0.18)" stroke="rgba(56,189,248,0.4)" strokeWidth="0.7" />
                    <circle cx="240" cy="80" r="5" fill="rgba(56,189,248,0.55)" />
                    <circle cx="240" cy="80" r="14" fill="none" stroke="rgba(56,189,248,0.14)" strokeWidth="1" />
                    {[{cx:195,cy:52},{cx:265,cy:42},{cx:300,cy:55},{cx:210,cy:120},{cx:325,cy:78}].map((p,i)=>(
                      <circle key={i} cx={p.cx} cy={p.cy} r="2" fill="#10b981" opacity="0.85" />
                    ))}
                  </svg>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px', flexShrink: 0 }}>
                  {[
                    { r: 'NORTH AMERICA', p: `${activeSystems > 0 ? 98.6 : 0}%` },
                    { r: 'SOUTH AMERICA', p: '96.7%' },
                    { r: 'EUROPE',        p: '97.8%' },
                    { r: 'AFRICA',        p: '95.4%' },
                    { r: 'ASIA PACIFIC',  p: '99.2%' },
                    { r: 'MIDDLE EAST',   p: '97.1%' },
                  ].map(region => (
                    <div key={region.r}>
                      <div style={{ fontSize: 7.5, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.04em' }}>{region.r}</div>
                      <div style={{ fontSize: 16, fontFamily: 'Space Mono', fontWeight: 700, color: 'rgba(255,255,255,0.9)', lineHeight: 1.2 }}>{region.p}</div>
                      <div style={{ fontSize: 8, fontFamily: 'Outfit', color: '#10b981' }}>Operational</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* System Status */}
            <div style={{ ...card, overflow: 'hidden' }}>
              <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 10.5, fontFamily: 'Outfit', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>SYSTEM STATUS</div>
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', fontFamily: 'Outfit' }}>All systems operational</div>
                </div>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', cursor: 'pointer', lineHeight: 1 }}>×</span>
              </div>
              <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <RadialGauge pct={avgHealthPct} color="#10b981" size={84} stroke={8}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontFamily: 'Space Mono', fontWeight: 700, color: '#10b981', lineHeight: 1 }}>{avgHealthPct}</div>
                    <div style={{ fontSize: 7.5, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>HEALTH</div>
                  </div>
                </RadialGauge>
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {[
                    { name: 'Core Engine',   ok: true },
                    { name: 'AI Models',     ok: orStatus === 'operational' },
                    { name: 'Database',      ok: true },
                    { name: 'Security',      ok: true },
                    { name: 'Network',       ok: true },
                    { name: 'Connections',   ok: connectedToolCount > 0 },
                  ].map(item => (
                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: item.ok ? '#10b981' : '#ef4444', boxShadow: `0 0 4px ${item.ok ? '#10b981' : '#ef4444'}`, display: 'inline-block' }} />
                        <span style={{ fontSize: 9.5, fontFamily: 'Outfit', color: 'rgba(255,255,255,0.55)' }}>{item.name}</span>
                      </div>
                      <span style={{ fontSize: 8.5, fontFamily: 'Space Mono', color: item.ok ? '#10b981' : '#ef4444' }}>{item.ok ? 'Optimal' : 'Offline'}</span>
                    </div>
                  ))}
                </div>
                <div style={{ width: '100%', padding: '4px 8px', background: 'rgba(16,185,129,0.06)', borderRadius: 7, fontSize: 8, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
                  Last scan: {lastRefresh ? timeAgo(lastRefresh) : 'just now'}
                </div>
              </div>
            </div>
          </div>

          {/* ── ROW 3: Revenue Streams + Agent Perf + Deployments ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>

            {/* Revenue Streams */}
            <div style={{ ...card, overflow: 'hidden' }}>
              <div style={{ padding: '9px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 10.5, fontFamily: 'Outfit', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>REVENUE STREAMS</div>
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', fontFamily: 'Outfit' }}>Real-time financial analytics</div>
                </div>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', cursor: 'pointer', lineHeight: 1 }}>×</span>
              </div>
              <div style={{ padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ position: 'relative', width: 85, height: 85, flexShrink: 0 }}>
                  <PieChart width={85} height={85}>
                    <Pie data={revPieces} cx={42} cy={42} innerRadius={25} outerRadius={40} dataKey="value" stroke="none">
                      {revPieces.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                  </PieChart>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 9.5, fontFamily: 'Space Mono', fontWeight: 700, color: 'rgba(255,255,255,0.9)', lineHeight: 1 }}>{fmtCompact(monthCents)}</span>
                    <span style={{ fontSize: 7, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.3)' }}>Total</span>
                  </div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {revPieces.map(r => (
                    <div key={r.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 5, height: 5, borderRadius: 1.5, background: r.color, display: 'inline-block', flexShrink: 0 }} />
                        <span style={{ fontSize: 8.5, fontFamily: 'Outfit', color: 'rgba(255,255,255,0.5)' }}>{r.name}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <span style={{ fontSize: 8.5, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.7)' }}>{fmtCompact(r.value)}</span>
                        <span style={{ fontSize: 8.5, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.3)' }}>{r.pct}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Agent Performance */}
            <div style={{ ...card, overflow: 'hidden' }}>
              <div style={{ padding: '9px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 10.5, fontFamily: 'Outfit', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>AI AGENT PERFORMANCE</div>
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', fontFamily: 'Outfit' }}>Top performing autonomous agents</div>
                </div>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', cursor: 'pointer', lineHeight: 1 }}>×</span>
              </div>
              <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                {agentRows.map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 8.5, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.35)', minWidth: 12, textAlign: 'right' }}>{i+1}</span>
                    <div style={{ width: 22, height: 22, borderRadius: 5, background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Bot style={{ width: 11, height: 11, color: '#38bdf8' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 9.5, fontFamily: 'Outfit', color: 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                        <span style={{ fontSize: 9, fontFamily: 'Space Mono', fontWeight: 700, color: a.color, flexShrink: 0, marginLeft: 4 }}>{a.pct}%</span>
                      </div>
                      <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${a.pct}%`, height: '100%', background: `linear-gradient(90deg,${a.color},${a.color}99)`, borderRadius: 2 }} />
                      </div>
                    </div>
                  </div>
                ))}
                {systems.length === 0 && (
                  <button onClick={() => navigate('/builder')} style={{ marginTop: 4, padding: '6px', background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: 8, fontSize: 9.5, fontFamily: 'Outfit', color: '#38bdf8', cursor: 'pointer', textAlign: 'center' }}>
                    Deploy your first system →
                  </button>
                )}
              </div>
            </div>

            {/* System Deployments */}
            <div style={{ ...card, overflow: 'hidden' }}>
              <div style={{ padding: '9px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 10.5, fontFamily: 'Outfit', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>SYSTEM DEPLOYMENTS</div>
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', fontFamily: 'Outfit' }}>Deployment status across regions</div>
                </div>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', cursor: 'pointer', lineHeight: 1 }}>×</span>
              </div>
              <div style={{ padding: '8px 12px' }}>
                <div style={{ width: '100%', height: 60, background: 'rgba(56,189,248,0.04)', borderRadius: 8, border: '1px solid rgba(56,189,248,0.1)', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  <svg viewBox="0 0 200 55" style={{ width: '100%', height: '100%' }}>
                    <ellipse cx="100" cy="27" rx="62" ry="20" fill="none" stroke="rgba(56,189,248,0.18)" strokeWidth="0.5" />
                    {[18,40,62,82,108,132,158,175].map((cx,i)=>(
                      <circle key={i} cx={cx} cy={18+Math.sin(i*0.8)*7} r="1.5" fill="#38bdf8" opacity="0.7" />
                    ))}
                    {systems.slice(0,5).map((_,i)=>(
                      <circle key={i} cx={40+i*28} cy={32+Math.cos(i)*5} r="2.5" fill="#10b981" opacity="0.9" />
                    ))}
                    {systems.length === 0 && [50,90,130].map((cx,i) => (
                      <circle key={i} cx={cx} cy={30} r="2" fill="#10b981" opacity="0.5" />
                    ))}
                  </svg>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {[
                    { label: 'Deployed',     val: totalSystems, color: 'rgba(255,255,255,0.9)' },
                    { label: 'In Progress',  val: building, color: '#38bdf8' },
                    { label: 'Failed',       val: failed, color: failed > 0 ? '#ef4444' : 'rgba(255,255,255,0.3)' },
                    { label: 'Success Rate', val: `${totalSystems > 0 ? Math.round(((totalSystems-failed)/totalSystems)*100) : 100}%`, color: '#10b981' },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: 'center', padding: '5px 4px', background: 'rgba(255,255,255,0.03)', borderRadius: 7 }}>
                      <div style={{ fontSize: 18, fontFamily: 'Space Mono', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.val}</div>
                      <div style={{ fontSize: 7.5, fontFamily: 'Outfit', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── ROW 4: Analytics + Activity Feed + Terminal ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 248px', gap: 10 }}>

            {/* System Performance Analytics */}
            <div style={{ ...card, overflow: 'hidden' }}>
              <div style={{ padding: '9px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 10.5, fontFamily: 'Outfit', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>SYSTEM PERFORMANCE ANALYTICS</div>
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', fontFamily: 'Outfit' }}>Deep performance insights and predictive analytics</div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {CHART_TABS.map(tab => (
                    <button key={tab.key} onClick={() => setChartTab(tab.key)} style={{ padding: '3px 8px', background: chartTab === tab.key ? `${tab.color}20` : 'rgba(255,255,255,0.04)', border: `1px solid ${chartTab === tab.key ? tab.color + '55' : 'rgba(255,255,255,0.08)'}`, borderRadius: 6, fontSize: 8.5, fontFamily: 'Space Mono', color: chartTab === tab.key ? tab.color : 'rgba(255,255,255,0.3)', cursor: 'pointer' }}>
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex' }}>
                <div style={{ flex: 1, padding: '8px 14px', height: 115 }}>
                  <ResponsiveContainer width="100%" height={100}>
                    {renderChart()}
                  </ResponsiveContainer>
                </div>
                <div style={{ width: 136, padding: '10px 12px', borderLeft: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
                  <div style={{ fontSize: 8, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Performance Score</div>
                  <div style={{ fontSize: 26, fontFamily: 'Space Mono', fontWeight: 700, color: '#10b981', lineHeight: 1 }}>
                    {avgHealthPct}<span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>/100</span>
                  </div>
                  <div style={{ fontSize: 10, fontFamily: 'Outfit', color: '#10b981', fontWeight: 600 }}>Excellent</div>
                  <div style={{ padding: '6px 8px', background: 'rgba(16,185,129,0.07)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.15)' }}>
                    <div style={{ fontSize: 8, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.35)' }}>Predictive Insight</div>
                    <div style={{ fontSize: 8.5, fontFamily: 'Outfit', color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>All systems trending optimal</div>
                    <div style={{ fontSize: 7.5, fontFamily: 'Outfit', color: 'rgba(255,255,255,0.25)', marginTop: 1 }}>No action required</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column: Activity Feed + Terminal */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* AI Activity Feed */}
              <div style={{ ...card, overflow: 'hidden', flex: 1 }}>
                <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 9.5, fontFamily: 'Outfit', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>AI ACTIVITY FEED</div>
                    <div style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.3)', fontFamily: 'Outfit' }}>Real-time agent coordination</div>
                  </div>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', cursor: 'pointer', lineHeight: 1 }}>×</span>
                </div>
                <div style={{ padding: '6px 12px', maxHeight: 120, overflowY: 'auto' }}>
                  {timeline.slice(0, 5).map((evt, i) => (
                    <div key={`${evt.id}-${i}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ width: 20, height: 20, borderRadius: 5, background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Bot style={{ width: 10, height: 10, color: '#38bdf8' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 9.5, fontFamily: 'Outfit', color: 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{evt.label}</div>
                        <div style={{ fontSize: 8, fontFamily: 'Outfit', color: 'rgba(255,255,255,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{evt.detail}</div>
                      </div>
                      <span style={{ fontSize: 7.5, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>{timeAgo(evt.ts)}</span>
                    </div>
                  ))}
                  {timeline.length === 0 && (
                    <div style={{ padding: '10px 0', textAlign: 'center', fontSize: 9, fontFamily: 'Outfit', color: 'rgba(255,255,255,0.2)' }}>No activity yet. Deploy a system to see logs.</div>
                  )}
                </div>
                <button onClick={() => navigate('/systems')} style={{ display: 'block', width: '100%', padding: '5px', background: 'rgba(56,189,248,0.04)', border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: 8.5, fontFamily: 'Space Mono', color: '#38bdf8', cursor: 'pointer' }}>
                  View All Activity →
                </button>
              </div>

              {/* ASH Command Terminal */}
              <div style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(56,189,248,0.18)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '7px 12px', borderBottom: '1px solid rgba(56,189,248,0.12)', display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 9.5, fontFamily: 'Outfit', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>ASH COMMAND TERMINAL</div>
                    <div style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.3)', fontFamily: 'Outfit' }}>Advanced system control</div>
                  </div>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', cursor: 'pointer', lineHeight: 1 }}>×</span>
                </div>
                <div style={{ padding: '7px 12px', fontFamily: 'Space Mono', fontSize: 8.5, color: 'rgba(56,189,248,0.85)', lineHeight: 1.9 }}>
                  <div><span style={{ color: '#10b981' }}>›</span> QUANTUM LINK ESTABLISHED</div>
                  <div><span style={{ color: '#10b981' }}>›</span> ACCESS LEVEL: MAXIMUM</div>
                  <div><span style={{ color: '#10b981' }}>›</span> SYSTEM OVERRIDE: ENABLED</div>
                  <div><span style={{ color: '#f59e0b' }}>›</span> {totalSystems} SYSTEM{totalSystems !== 1 ? 'S' : ''} ONLINE</div>
                  <div style={{ color: 'rgba(255,255,255,0.3)' }}><span style={{ color: '#38bdf8' }}>›</span> Processing at light speed...</div>
                </div>
                <div style={{ padding: '5px 12px', borderTop: '1px solid rgba(56,189,248,0.1)', background: 'rgba(56,189,248,0.05)' }}>
                  <div style={{ fontSize: 8, fontFamily: 'Space Mono', color: '#10b981' }}>▸ READY FOR COMMAND INPUT</div>
                </div>
                <div style={{ padding: '5px 12px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    placeholder="Enter commands... (try: build, systems, connections)"
                    style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 8.5, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.45)', padding: 0 }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const val = e.target.value.trim().toLowerCase();
                        if (val === 'build' || val === 'deploy') navigate('/builder');
                        else if (val === 'systems') navigate('/systems');
                        else if (val === 'connections') navigate('/connections');
                        else if (val === 'blueprints') navigate('/blueprints');
                        else if (val === 'marketplace') navigate('/marketplace');
                        else if (val) toast.info(`Command not recognized: ${val}`);
                        e.target.value = '';
                      }
                    }}
                  />
                  <button onClick={() => navigate('/builder')} style={{ padding: '3px 10px', background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 6, fontSize: 8.5, fontFamily: 'Space Mono', color: '#38bdf8', cursor: 'pointer', flexShrink: 0 }}>EXECUTE</button>
                </div>
              </div>

            </div>
          </div>

        </main>
      </div>

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#0a0f20', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 16, padding: '24px', maxWidth: 320, width: '90%' }}>
            <AlertTriangle className="w-6 h-6 text-rose-400 mb-3" />
            <div style={{ fontSize: 14, fontFamily: 'Outfit', fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: 6 }}>Delete System?</div>
            <p style={{ fontSize: 12, fontFamily: 'Outfit', color: 'rgba(255,255,255,0.45)', marginBottom: 16 }}>This action is permanent and cannot be undone.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ padding: '7px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', fontSize: 12, fontFamily: 'Outfit', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => deleteSystem(deleteConfirm)} disabled={controlLoading[deleteConfirm]} style={{ padding: '7px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: 12, fontFamily: 'Outfit', cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemCommandCenterPage;
