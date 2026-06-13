import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Activity, Zap, CheckCircle2, AlertTriangle, Clock, Server,
  Brain, Cpu, CreditCard, RefreshCw, TrendingUp,
  Play, Pause, RotateCcw, Trash2, DollarSign,
  ExternalLink, Plus, XCircle, Coins, Wifi, WifiOff,
  ChevronRight, Shield, Target, Gauge, BarChart2, Bot,
  Rocket, Settings, ArrowUpRight, ArrowDownRight, Layers,
  FlaskConical, Globe, Key, Database, ShieldCheck, Eye,
  TrendingDown, ArrowRight, Bolt, Flame, Star, Crown,
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
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
    <div className="bg-black border border-white/15 rounded-lg px-3 py-2 text-xs shadow-2xl">
      <p className="text-white/50 mb-0.5 font-mono">{label}</p>
      <p className="text-white font-mono font-semibold">{fmt(payload[0]?.value ?? 0)}</p>
    </div>
  );
};

const GenericTooltip = ({ active, payload, label, suffix = '' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-black border border-white/15 rounded-lg px-3 py-2 text-xs shadow-2xl">
      <p className="text-white/50 mb-0.5 font-mono">{label}</p>
      <p className="text-white font-mono font-semibold">{payload[0]?.value ?? 0}{suffix}</p>
    </div>
  );
};

const StatusDot = ({ status, large = false }) => {
  const map = {
    active:    'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]',
    completed: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]',
    building:  'bg-blue-400 animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.6)]',
    paused:    'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]',
    failed:    'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.7)]',
  };
  const sz = large ? 'w-2.5 h-2.5' : 'w-2 h-2';
  return (
    <span className={`inline-block ${sz} rounded-full shrink-0 ${map[status] ?? 'bg-zinc-600'}`} />
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
  { key: 'revenue',  label: 'Revenue',    color: '#06b6d4' },
  { key: 'ai',       label: 'AI Usage',   color: '#8b5cf6' },
  { key: 'systems',  label: 'Systems',    color: '#f59e0b' },
];

const PANEL = 'bg-black/80 backdrop-blur-md border border-white/10 rounded-xl';
const SUBPANEL = 'bg-black/60 border border-white/8 rounded-lg';

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
  const [expandedSystem, setExpandedSystem] = useState(null);
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
        <div className={`${PANEL} p-10 text-center space-y-4`}>
          <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="text-sm text-white/60 font-mono tracking-widest uppercase">Initializing Command Center…</p>
          <div className="flex items-center justify-center gap-1.5">
            {[0,1,2,3].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className={`${PANEL} p-10 text-center space-y-4 max-w-sm`}>
          <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
          <p className="text-base font-semibold text-white">Connection Error</p>
          <p className="text-sm text-white/60">{error}</p>
          <Button size="sm" onClick={load} className="border-white/20 text-white text-xs bg-white/10 hover:bg-white/20">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry
          </Button>
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

  const totalSystems  = systemStats?.total ?? 0;
  const activeSystems = systemStats?.active ?? 0;
  const building      = systemStats?.building ?? 0;
  const paused        = systemStats?.paused ?? 0;
  const failed        = systemStats?.failed ?? 0;
  const healthScore   = totalSystems === 0 ? 100
    : Math.round(((activeSystems + building * 0.5) / totalSystems) * 100);

  const credBalance  = credits?.balance ?? 0;
  const credAllotment = credits?.allotment ?? 0;
  const credUsed     = credAllotment - credBalance;
  const credPct      = credAllotment > 0 ? Math.round((credBalance / credAllotment) * 100) : 100;

  const connectedToolCount = ['openrouter', 'stripe', 'resend', 'cloudflare', 'make.com', 'tiktok', 'youtube', 'meta', 'shopify', 'gmail'].filter(
    k => toolConnected(k, storedKeys, orStatus)
  ).length;

  return (
    <div className="animate-in fade-in duration-500 pb-20 space-y-5">

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* PAGE HEADER                                                          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className={`${PANEL} px-5 py-4 flex items-center justify-between gap-4`}>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center shadow-[0_0_20px_rgba(14,165,233,0.15)]">
            <Cpu className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white font-mono tracking-tight"
              style={{ textShadow: '0 0 20px rgba(0,0,0,0.9)' }}>
              Command Center
            </h1>
            <p className="text-xs text-white/50 font-mono">
              {user.email ?? 'AI Operations Monitor'} · Tier: <span className="text-primary uppercase">{user.subscriptionTier ?? 'free'}</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest">Live</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-[10px] text-white/30 font-mono hidden sm:block">
              Updated {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={load}
            className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all border border-white/10"
            title="Refresh data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/connections')}
            className="h-8 text-xs gap-1.5 px-3 border-white/20 text-white bg-white/5 hover:bg-white/15"
          >
            <Key className="w-3 h-3" /> Credentials
          </Button>
          {(user.subscriptionTier ?? user.membershipTier ?? 'free').toLowerCase() !== 'empire' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/pricing')}
              className="h-8 text-xs gap-1.5 px-3 border-amber-500/40 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 hover:border-amber-400/60 transition-all"
            >
              <Crown className="w-3 h-3" /> Upgrade Plan
            </Button>
          )}
          <Button size="sm" onClick={() => navigate('/builder')} className="h-8 text-xs gap-1.5 px-3 font-semibold">
            <Plus className="w-3.5 h-3.5" /> New System
          </Button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* HERO BUILD CTA — shown prominently when no systems or always          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {systems.length === 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-black/60 to-violet-900/20 backdrop-blur-md px-6 py-6"
          style={{ boxShadow: '0 0 40px rgba(14,165,233,0.08), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, rgba(14,165,233,0.15) 0%, transparent 60%)' }} />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(14,165,233,0.8)]" />
                <span className="text-[10px] font-mono font-bold text-primary uppercase tracking-widest">ASH Agent Ready</span>
              </div>
              <h2 className="text-xl font-bold text-white leading-tight" style={{ textShadow: '0 0 30px rgba(0,0,0,0.9)' }}>
                Build Your First Income System
              </h2>
              <p className="text-sm text-white/55 leading-relaxed max-w-lg">
                Tell ASH what you want to earn. It will design a complete system — tools, steps, credentials — and build it autonomously in minutes.
              </p>
            </div>
            <div className="flex flex-col gap-2.5 shrink-0 w-full sm:w-auto">
              <Button onClick={() => navigate('/builder')} className="gap-2 font-bold h-11 px-6 text-sm bg-primary hover:bg-primary/90 shadow-[0_0_20px_rgba(14,165,233,0.3)]">
                <Bot className="w-4 h-4" /> Ask ASH to Build
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate('/blueprints')} className="flex-1 gap-1.5 h-8 text-xs border-white/15 text-white/60 hover:text-white bg-transparent">
                  <Layers className="w-3 h-3" /> Blueprints
                </Button>
                <Button variant="outline" onClick={() => navigate('/marketplace')} className="flex-1 gap-1.5 h-8 text-xs border-white/15 text-white/60 hover:text-white bg-transparent">
                  <Globe className="w-3 h-3" /> Marketplace
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* KPI STRIP — 8 METRICS                                                */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {[
          {
            label: 'Revenue Today',
            value: fmtCompact(todayCents),
            icon: DollarSign,
            color: 'text-white',
            iconColor: 'text-emerald-400',
            bg: 'bg-emerald-500/10 border-emerald-500/20',
            glow: '0 0 20px rgba(52,211,153,0.08)',
          },
          {
            label: 'This Week',
            value: fmtCompact(weekCents),
            icon: TrendingUp,
            color: 'text-emerald-400',
            iconColor: 'text-emerald-400',
            bg: 'bg-emerald-500/8 border-emerald-500/15',
            glow: '0 0 20px rgba(52,211,153,0.05)',
          },
          {
            label: 'This Month',
            value: fmtCompact(monthCents),
            icon: BarChart2,
            color: 'text-white',
            iconColor: 'text-cyan-400',
            bg: 'bg-cyan-500/8 border-cyan-500/15',
            glow: '0 0 20px rgba(6,182,212,0.05)',
          },
          {
            label: 'Lifetime',
            value: fmtCompact(lifetimeCents),
            icon: Star,
            color: 'text-white',
            iconColor: 'text-amber-400',
            bg: 'bg-amber-500/8 border-amber-500/15',
            glow: '0 0 20px rgba(245,158,11,0.05)',
          },
          {
            label: 'Active Systems',
            value: String(activeSystems),
            icon: Server,
            color: activeSystems > 0 ? 'text-emerald-400' : 'text-white',
            iconColor: 'text-emerald-400',
            bg: 'bg-black/80 border-white/10',
          },
          {
            label: 'Health Score',
            value: `${healthScore}%`,
            icon: Gauge,
            color: healthScore >= 80 ? 'text-emerald-400' : healthScore >= 50 ? 'text-amber-400' : 'text-rose-400',
            iconColor: healthScore >= 80 ? 'text-emerald-400' : healthScore >= 50 ? 'text-amber-400' : 'text-rose-400',
            bg: 'bg-black/80 border-white/10',
          },
          {
            label: 'AI Credits',
            value: String(credBalance),
            icon: Coins,
            color: credPct > 30 ? 'text-white' : 'text-rose-400',
            iconColor: 'text-amber-400',
            bg: 'bg-amber-500/8 border-amber-500/15',
          },
          {
            label: 'AI Requests',
            value: String(aiActivity?.totalRequests ?? 0),
            icon: Bot,
            color: 'text-violet-400',
            iconColor: 'text-violet-400',
            bg: 'bg-violet-500/8 border-violet-500/15',
            glow: '0 0 20px rgba(139,92,246,0.05)',
          },
        ].map(kpi => (
          <div
            key={kpi.label}
            className={`bg-black/80 backdrop-blur-md border rounded-xl p-3.5 flex flex-col gap-2 ${kpi.bg}`}
            style={kpi.glow ? { boxShadow: kpi.glow } : {}}
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-white/50 font-mono uppercase tracking-widest leading-tight">{kpi.label}</p>
              <kpi.icon className={`w-3.5 h-3.5 shrink-0 ${kpi.iconColor}`} />
            </div>
            <p className={`text-2xl font-bold font-mono tabular-nums leading-none ${kpi.color}`}
              style={{ textShadow: '0 0 15px rgba(0,0,0,0.9), 0 0 30px rgba(0,0,0,0.8)' }}>
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SYSTEM STATUS BAR                                                    */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className={`${PANEL} px-5 py-3.5 flex items-center gap-6 flex-wrap`}>
        <p className="text-[10px] text-white/40 font-mono uppercase tracking-widest shrink-0">Fleet Status</p>
        <div className="flex items-center gap-6 flex-wrap flex-1">
          {[
            { label: 'Running',  val: activeSystems, dot: 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]', text: 'text-emerald-400' },
            { label: 'Building', val: building,       dot: 'bg-blue-400 animate-pulse',    text: 'text-blue-400' },
            { label: 'Paused',   val: paused,         dot: 'bg-amber-400',                 text: 'text-amber-400' },
            { label: 'Failed',   val: failed,         dot: 'bg-rose-400',                  text: 'text-rose-400' },
            { label: 'Total',    val: totalSystems,   dot: 'bg-white/40',                  text: 'text-white' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2 shrink-0">
              <span className={`w-2 h-2 rounded-full ${s.dot}`} />
              <span className={`text-base font-bold font-mono tabular-nums ${s.text}`}>{s.val}</span>
              <span className="text-xs text-white/40 font-medium">{s.label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <Wifi className="w-3.5 h-3.5 text-white/40" />
            <span className="text-xs text-white/60 font-mono">{connectedToolCount} tools connected</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${orStatus === 'operational' ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
            <span className="text-xs text-white/60 font-mono">OpenRouter {orStatus === 'operational' ? 'operational' : 'offline'}</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MAIN CONTENT: CHART (LEFT) + QUICK ACTIONS + PLATFORM (RIGHT)       */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Analytics Chart */}
        <div className={`lg:col-span-3 ${PANEL} p-5`}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-widest font-mono"
                style={{ textShadow: '0 0 10px rgba(0,0,0,0.9)' }}>
                Analytics
              </h2>
              <p className="text-xs text-white/40 font-mono mt-0.5">7-day performance window</p>
            </div>
            <div className="flex items-center gap-1 bg-black/60 border border-white/10 rounded-lg p-1">
              {CHART_TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setChartTab(tab.key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all font-mono ${
                    chartTab === tab.key
                      ? 'bg-white/15 text-white shadow-sm'
                      : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-[10px] text-white/30 font-mono uppercase tracking-widest mb-1">
                {chartTab === 'revenue' ? 'Today\'s Revenue' : chartTab === 'ai' ? 'Total AI Requests' : 'Systems Deployed'}
              </p>
              <p className="text-3xl font-bold font-mono tabular-nums" style={{ color: chartCfg.color, textShadow: '0 0 20px rgba(0,0,0,0.9)' }}>
                {chartTab === 'revenue' ? fmtCompact(todayCents)
                  : chartTab === 'ai' ? (aiActivity?.totalRequests ?? 0)
                  : totalSystems}
              </p>
            </div>
            {chartTab === 'revenue' && weekCents > 0 && (
              <div className="flex items-center gap-1 text-emerald-400">
                <ArrowUpRight className="w-4 h-4" />
                <span className="text-sm font-bold font-mono">{fmtCompact(weekCents)} wk</span>
              </div>
            )}
          </div>

          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartCfg.color} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={chartCfg.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10, fontFamily: 'monospace' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={chartTab === 'revenue'
                    ? <RevenueTooltip />
                    : <GenericTooltip suffix={chartTab === 'ai' ? ' req' : ' sys'} />
                  }
                  cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }}
                />
                <Area
                  type="monotone"
                  dataKey={chartDataKey}
                  stroke={chartCfg.color}
                  strokeWidth={2}
                  fill="url(#chartFill)"
                  dot={false}
                  activeDot={{ r: 4, fill: chartCfg.color, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {lifetimeCents === 0 && chartTab === 'revenue' && (
            <p className="text-[10px] text-white/20 text-center mt-3 font-mono">
              Revenue events appear here as your systems run — results not guaranteed
            </p>
          )}
        </div>

        {/* Quick Actions + Platform Status */}
        <div className="lg:col-span-2 flex flex-col gap-5">

          {/* Quick Actions */}
          <div className={`${PANEL} p-5`}>
            <h2 className="text-sm font-bold text-white uppercase tracking-widest font-mono mb-4"
              style={{ textShadow: '0 0 10px rgba(0,0,0,0.9)' }}>
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Deploy System', icon: Rocket, onClick: () => navigate('/builder'), color: 'text-primary', bg: 'hover:bg-primary/15 hover:border-primary/30' },
                { label: 'Connect Tools', icon: Key, onClick: () => navigate('/connections'), color: 'text-amber-400', bg: 'hover:bg-amber-500/15 hover:border-amber-500/30' },
                { label: 'Browse Blueprints', icon: Layers, onClick: () => navigate('/blueprints'), color: 'text-violet-400', bg: 'hover:bg-violet-500/15 hover:border-violet-500/30' },
                { label: 'Marketplace', icon: Globe, onClick: () => navigate('/marketplace'), color: 'text-emerald-400', bg: 'hover:bg-emerald-500/15 hover:border-emerald-500/30' },
                { label: 'Buy Credits', icon: Coins, onClick: () => navigate('/credits'), color: 'text-amber-400', bg: 'hover:bg-amber-500/15 hover:border-amber-500/30' },
                { label: 'AI Assistant', icon: Bot, onClick: () => navigate('/builder'), color: 'text-cyan-400', bg: 'hover:bg-cyan-500/15 hover:border-cyan-500/30' },
              ].map(action => (
                <button
                  key={action.label}
                  onClick={action.onClick}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border border-white/8 bg-black/40 text-center transition-all duration-200 ${action.bg} group`}
                >
                  <action.icon className={`w-5 h-5 ${action.color} group-hover:scale-110 transition-transform`} />
                  <span className="text-[10px] font-semibold text-white/70 group-hover:text-white font-mono uppercase tracking-wide leading-tight">{action.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Platform Status */}
          <div className={`${PANEL} p-5 flex-1`}>
            <h2 className="text-sm font-bold text-white uppercase tracking-widest font-mono mb-4"
              style={{ textShadow: '0 0 10px rgba(0,0,0,0.9)' }}>
              Platform Status
            </h2>
            <div className="space-y-2">
              {[
                { name: 'OpenRouter AI',    key: 'openrouter',   icon: Bot },
                { name: 'PostgreSQL DB',    key: 'database',     icon: Database },
                { name: 'Stripe Payments',  key: 'stripe',       icon: CreditCard },
                { name: 'Resend Email',     key: 'resend',       icon: Zap },
                { name: 'Cloudflare',       key: 'cloudflare',   icon: Shield },
                { name: 'Make.com',         key: 'make.com',     icon: Settings },
              ].map(tool => {
                const connected = toolConnected(tool.name, storedKeys, orStatus);
                return (
                  <div key={tool.key} className={`flex items-center justify-between px-3 py-2.5 rounded-lg ${SUBPANEL}`}>
                    <div className="flex items-center gap-2.5">
                      <tool.icon className="w-3.5 h-3.5 text-white/40" />
                      <span className="text-xs font-medium text-white/80">{tool.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]' : 'bg-zinc-600'}`} />
                      <span className={`text-[10px] font-mono font-semibold ${connected ? 'text-emerald-400' : 'text-zinc-500'}`}>
                        {connected ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => navigate('/connections')}
              className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors py-2 rounded-lg border border-white/8 hover:bg-white/5"
            >
              <Settings className="w-3.5 h-3.5" /> Manage All Connections
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SYSTEMS FLEET                                                        */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className={`${PANEL} p-5`}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-widest font-mono"
              style={{ textShadow: '0 0 10px rgba(0,0,0,0.9)' }}>
              Systems Fleet
            </h2>
            <p className="text-xs text-white/40 font-mono mt-0.5">
              {systems.length} system{systems.length !== 1 ? 's' : ''} deployed · {activeSystems} active
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate('/systems')}
              className="h-7 text-xs gap-1 text-white/50 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10"
            >
              View All <ChevronRight className="w-3 h-3" />
            </Button>
            <Button size="sm" onClick={() => navigate('/builder')} className="h-7 text-xs gap-1 font-semibold">
              <Plus className="w-3 h-3" /> Deploy
            </Button>
          </div>
        </div>

        {systems.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-16 gap-5 rounded-xl border border-dashed border-white/10 bg-black/40`}>
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Server className="w-7 h-7 text-white/20" />
            </div>
            <div className="text-center max-w-xs">
              <p className="text-base font-bold text-white mb-1"
                style={{ textShadow: '0 0 20px rgba(0,0,0,0.9)' }}>
                No Systems Deployed
              </p>
              <p className="text-sm text-white/50">
                Build your first automated income system with the STARK AI agent
              </p>
            </div>
            <Button onClick={() => navigate('/builder')} className="gap-2 font-semibold">
              <Zap className="w-4 h-4" /> Launch Builder
            </Button>
          </div>
        ) : (
          <div>
            {/* Table header */}
            <div className="hidden lg:grid grid-cols-12 gap-3 pb-2.5 border-b border-white/8 mb-1 px-2">
              {[
                ['System', 'col-span-3'],
                ['Status', 'col-span-2'],
                ['Health', 'col-span-2'],
                ['Tools', 'col-span-2'],
                ['Uptime', 'col-span-1'],
                ['Revenue', 'col-span-1'],
                ['', 'col-span-1 text-right'],
              ].map(([h, cls]) => (
                <div key={h} className={`${cls} text-[9px] uppercase tracking-widest text-white/30 font-bold`}>{h}</div>
              ))}
            </div>

            {systems.map((system) => {
              const isLoading  = controlLoading[system.id];
              const isPaused   = system.buildStatus === 'paused';
              const isBuilding = system.buildStatus === 'building';
              const hp         = healthPct(system.buildStatus, system.healthStatus);
              const hpColor    = hp >= 80 ? 'bg-emerald-500' : hp >= 50 ? 'bg-amber-400' : hp >= 20 ? 'bg-orange-500' : 'bg-rose-500';
              const hpGlow     = hp >= 80 ? 'shadow-[0_0_8px_rgba(52,211,153,0.4)]' : '';
              const hpText     = hp >= 80 ? 'text-emerald-400' : hp >= 50 ? 'text-amber-400' : hp >= 20 ? 'text-orange-400' : 'text-rose-400';
              const systemTools = toolsBySystem[system.id] ?? [];
              const isExpanded = expandedSystem === system.id;

              return (
                <div key={system.id}>
                  <div
                    className="group py-3.5 px-2 rounded-lg border border-transparent hover:bg-white/[0.03] hover:border-white/8 transition-all cursor-pointer"
                    onClick={() => navigate(`/systems/${system.id}`)}
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">

                      {/* Name */}
                      <div className="lg:col-span-3 flex items-center gap-3 min-w-0">
                        <StatusDot status={system.buildStatus === 'completed' ? 'active' : (system.buildStatus ?? 'pending')} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate group-hover:text-primary transition-colors"
                            style={{ textShadow: '0 0 15px rgba(0,0,0,0.9)' }}>
                            {system.name}
                          </p>
                          <p className="text-[10px] text-white/40 font-mono truncate">{system.blueprint?.name ?? 'Custom Blueprint'}</p>
                        </div>
                      </div>

                      {/* Status badge */}
                      <div className="lg:col-span-2">
                        <StatusBadge buildStatus={system.buildStatus} healthStatus={system.healthStatus} />
                      </div>

                      {/* Health bar */}
                      <div className="lg:col-span-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-700 ${hpColor} ${hpGlow}`} style={{ width: `${hp}%` }} />
                          </div>
                          <span className={`text-[10px] font-mono font-bold shrink-0 ${hpText}`}>{hp}%</span>
                        </div>
                      </div>

                      {/* Tools */}
                      <div className="lg:col-span-2 flex items-center gap-1 flex-wrap">
                        {systemTools.length > 0
                          ? systemTools.slice(0, 3).map(tool => {
                              const connected = toolConnected(tool.name, storedKeys, orStatus);
                              return (
                                <span
                                  key={tool.id}
                                  className={`inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded border font-semibold ${
                                    connected
                                      ? 'border-white/15 text-white/60 bg-white/5'
                                      : 'border-rose-500/25 text-rose-400/70 bg-rose-500/5'
                                  }`}
                                >
                                  <span className={`w-1 h-1 rounded-full ${connected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                                  {tool.name}
                                </span>
                              );
                            })
                          : <span className="text-[10px] text-white/20 font-mono">No tools</span>
                        }
                        {systemTools.length > 3 && (
                          <span className="text-[9px] text-white/30 font-mono">+{systemTools.length - 3}</span>
                        )}
                      </div>

                      {/* Uptime */}
                      <div className="lg:col-span-1">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-white/25" />
                          <span className="text-[11px] text-white/50 font-mono">{uptimeLabel(system.createdAt, system.buildStatus)}</span>
                        </div>
                      </div>

                      {/* Revenue */}
                      <div className="lg:col-span-1">
                        {(() => {
                          const cents = systemRevenue[String(system.id)] ?? 0;
                          return (
                            <span className={`text-xs font-mono font-semibold ${cents > 0 ? 'text-emerald-400' : 'text-white/30'}`}>
                              {fmtCompact(cents)}
                            </span>
                          );
                        })()}
                      </div>

                      {/* Row actions */}
                      <div className="lg:col-span-1 flex items-center gap-0.5 lg:justify-end" onClick={e => e.stopPropagation()}>
                        {isPaused ? (
                          <button
                            onClick={() => patchSystem(system.id, { buildStatus: 'active' })}
                            disabled={isLoading}
                            title="Resume"
                            className="p-1.5 rounded-lg text-emerald-400/50 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-30 border border-transparent hover:border-emerald-500/20"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => patchSystem(system.id, { buildStatus: 'paused' })}
                            disabled={isLoading || isBuilding}
                            title="Pause"
                            className="p-1.5 rounded-lg text-amber-400/50 hover:text-amber-400 hover:bg-amber-500/10 transition-colors disabled:opacity-30 border border-transparent hover:border-amber-500/20"
                          >
                            <Pause className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => patchSystem(system.id, { buildStatus: 'building' })}
                          disabled={isLoading}
                          title="Restart"
                          className="p-1.5 rounded-lg text-blue-400/50 hover:text-blue-400 hover:bg-blue-500/10 transition-colors disabled:opacity-30 border border-transparent hover:border-blue-500/20"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        {deleteConfirm === system.id ? (
                          <span className="flex items-center gap-0.5 ml-1">
                            <button onClick={() => deleteSystem(system.id)} disabled={isLoading}
                              className="text-[10px] px-2 py-1 rounded-lg text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 font-bold">Y</button>
                            <button onClick={() => setDeleteConfirm(null)}
                              className="text-[10px] px-2 py-1 rounded-lg text-white/40 hover:bg-white/5 border border-white/10">N</button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(system.id)}
                            disabled={isLoading}
                            title="Delete"
                            className="p-1.5 rounded-lg text-rose-400/30 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-30 border border-transparent hover:border-rose-500/20"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors ml-1 hidden lg:block" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* BOTTOM ROW: CREDITS + AI TIMELINE + ALERTS                          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Credits Tracker */}
        <div className={`${PANEL} p-5`}>
          <h2 className="text-sm font-bold text-white uppercase tracking-widest font-mono mb-4"
            style={{ textShadow: '0 0 10px rgba(0,0,0,0.9)' }}>
            Credit Tracker
          </h2>

          <div className="text-center mb-5">
            <p className="text-4xl font-bold font-mono text-amber-400 tabular-nums"
              style={{ textShadow: '0 0 20px rgba(0,0,0,0.9), 0 0 40px rgba(245,158,11,0.15)' }}>
              {credBalance.toLocaleString()}
            </p>
            <p className="text-xs text-white/40 font-mono mt-1">credits remaining</p>
          </div>

          {/* Credit bar */}
          <div className="mb-4">
            <div className="flex justify-between text-[10px] text-white/40 font-mono mb-1.5">
              <span>{credUsed.toLocaleString()} used</span>
              <span>{credAllotment.toLocaleString()} total</span>
            </div>
            <div className="h-2.5 bg-black/60 border border-white/8 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  credPct > 60 ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
                  credPct > 30 ? 'bg-gradient-to-r from-orange-500 to-amber-400' :
                  'bg-gradient-to-r from-rose-600 to-rose-400'
                }`}
                style={{ width: `${credPct}%` }}
              />
            </div>
            <p className="text-right text-[10px] text-white/40 font-mono mt-1">{credPct}% remaining</p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { label: 'Balance', value: credBalance.toLocaleString(), color: 'text-amber-400' },
              { label: 'Allotment', value: credAllotment.toLocaleString(), color: 'text-white' },
              { label: 'Used', value: credUsed.toLocaleString(), color: 'text-white/70' },
              { label: 'Status', value: credPct > 30 ? 'Healthy' : 'Low', color: credPct > 30 ? 'text-emerald-400' : 'text-rose-400' },
            ].map(stat => (
              <div key={stat.label} className={`${SUBPANEL} p-2.5`}>
                <p className="text-[9px] text-white/35 font-mono uppercase tracking-wider mb-1">{stat.label}</p>
                <p className={`text-sm font-bold font-mono ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          <Button
            size="sm"
            onClick={() => navigate('/credits')}
            className="w-full h-8 text-xs font-semibold gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 hover:border-amber-500/50"
          >
            <Coins className="w-3.5 h-3.5" /> Top Up Credits
          </Button>
        </div>

        {/* AI Activity Timeline */}
        <div className={`${PANEL} p-5`}>
          <h2 className="text-sm font-bold text-white uppercase tracking-widest font-mono mb-4"
            style={{ textShadow: '0 0 10px rgba(0,0,0,0.9)' }}>
            Activity Log
          </h2>
          {timeline.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center">
                <Brain className="w-5 h-5 text-white/20" />
              </div>
              <p className="text-xs text-white/40 text-center">
                No activity recorded yet.<br />Deploy a system to see logs here.
              </p>
            </div>
          ) : (
            <div className="relative overflow-y-auto max-h-[320px] pr-2">
              <div className="absolute left-[5px] top-2 bottom-2 w-px bg-white/8" />
              <div className="space-y-0">
                {timeline.map((evt) => (
                  <div key={evt.id} className="relative flex gap-4 pb-4 pl-6">
                    <span className={`absolute left-0 top-[5px] w-[11px] h-[11px] rounded-full border-2 border-black ${evt.dot}`} />
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs font-semibold truncate ${evt.color}`}>{evt.label}</p>
                        <span className="text-[10px] text-white/30 font-mono shrink-0">{timeAgo(evt.ts)}</span>
                      </div>
                      {evt.detail && (
                        <p className="text-[11px] text-white/40 truncate mt-0.5">{evt.detail}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Alerts */}
        <div className={`${PANEL} p-5 flex flex-col`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest font-mono"
              style={{ textShadow: '0 0 10px rgba(0,0,0,0.9)' }}>
              Alerts & Notifications
            </h2>
            {alertNotifs.length > 0 && (
              <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30 text-[9px] font-mono">
                {alertNotifs.length}
              </Badge>
            )}
          </div>

          {alertNotifs.length === 0 ? (
            <div className={`flex items-center gap-3 p-3 rounded-xl ${SUBPANEL} mb-4`}>
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-emerald-400">All Systems Nominal</p>
                <p className="text-[10px] text-white/40">No active alerts or warnings</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 mb-4">
              {alertNotifs.slice(0, 4).map(n => {
                const tk = (n.notificationType || 'warning').toLowerCase();
                const isError = tk === 'error';
                return (
                  <div key={n.id} className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${
                    isError ? 'bg-rose-500/8 border-rose-500/20' : 'bg-amber-500/8 border-amber-500/20'
                  }`}>
                    <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isError ? 'text-rose-400' : 'text-amber-400'}`} />
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold truncate ${isError ? 'text-rose-400' : 'text-amber-400'}`}>
                        {n.title || n.message}
                      </p>
                      {n.message && n.title && (
                        <p className="text-[10px] text-white/40 truncate mt-0.5">{n.message}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Notification list */}
          <div className="flex-1 space-y-1">
            {notifications.slice(0, 5).map(n => {
              const tk = (n.notificationType || 'info').toLowerCase();
              const cfg = NOTIF_TYPE_MAP[tk] ?? NOTIF_TYPE_MAP.info;
              return (
                <div key={n.id} className="flex items-center gap-2.5 py-2 border-b border-white/5 last:border-0">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                  <p className="text-xs text-white/60 truncate flex-1">{n.title || n.message}</p>
                  <span className="text-[10px] text-white/25 font-mono shrink-0">{timeAgo(n.createdAt)}</span>
                </div>
              );
            })}
            {notifications.length === 0 && (
              <p className="text-[11px] text-white/25 text-center py-4 font-mono">No notifications yet</p>
            )}
          </div>

          <button
            onClick={() => navigate('/builder')}
            className="mt-4 w-full flex items-center justify-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors py-2 rounded-lg border border-white/8 hover:bg-white/5 font-mono"
          >
            <Eye className="w-3.5 h-3.5" /> View All Notifications
          </button>
        </div>
      </div>

    </div>
  );
};

export default SystemCommandCenterPage;
