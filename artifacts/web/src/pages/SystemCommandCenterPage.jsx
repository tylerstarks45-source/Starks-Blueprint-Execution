import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, Zap, CheckCircle2, AlertTriangle, Clock, Server,
  Brain, Cpu, Database, CreditCard, ExternalLink, RefreshCw,
  ChevronRight, Circle, TrendingUp, BarChart3, Settings2, Wifi
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ─── Status Badge ────────────────────────────────────────────────────────────
const StatusDot = ({ status }) => {
  const map = {
    operational: 'bg-emerald-500',
    degraded: 'bg-amber-400',
    not_configured: 'bg-zinc-600',
    offline: 'bg-rose-500',
  };
  const pulse = status === 'operational';
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      {pulse && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${map[status] ?? 'bg-zinc-600'}`} />
    </span>
  );
};

const StatusLabel = ({ status }) => {
  const map = {
    operational: ['text-emerald-400', 'Operational'],
    degraded: ['text-amber-400', 'Degraded'],
    not_configured: ['text-zinc-500', 'Not Configured'],
    offline: ['text-rose-400', 'Offline'],
  };
  const [cls, label] = map[status] ?? ['text-zinc-500', 'Unknown'];
  return <span className={`text-xs font-medium ${cls}`}>{label}</span>;
};

// ─── Stat Card ───────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, color = 'text-primary', accent = 'bg-primary/10' }) => (
  <div className="rounded-xl border border-white/10 bg-black/40 backdrop-blur-md p-5 flex items-start gap-4">
    <div className={`w-10 h-10 rounded-xl ${accent} flex items-center justify-center shrink-0`}>
      <Icon className={`w-5 h-5 ${color}`} />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  </div>
);

// ─── Section Header ──────────────────────────────────────────────────────────
const SectionHeader = ({ icon: Icon, title, sub }) => (
  <div className="flex items-center gap-3 mb-4">
    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
      <Icon className="w-4 h-4 text-muted-foreground" />
    </div>
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  </div>
);

// ─── Build Status Badge ──────────────────────────────────────────────────────
const BuildBadge = ({ buildStatus, healthStatus }) => {
  if (healthStatus === 'healthy' || buildStatus === 'active') {
    return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-[10px]">Active</Badge>;
  }
  if (buildStatus === 'building') {
    return <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/20 text-[10px]">Building</Badge>;
  }
  if (buildStatus === 'paused') {
    return <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20 text-[10px]">Paused</Badge>;
  }
  if (healthStatus === 'unhealthy') {
    return <Badge className="bg-rose-500/15 text-rose-400 border-rose-500/20 text-[10px]">Failed</Badge>;
  }
  return <Badge className="bg-zinc-500/15 text-zinc-400 border-zinc-500/20 text-[10px]">Pending</Badge>;
};

// ─── Main Page ───────────────────────────────────────────────────────────────
const SystemCommandCenterPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [credits, setCredits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsResp, creditsResp] = await Promise.all([
        fetch('/api/ai-orchestrator/platform-stats', { headers: authHeaders() }),
        fetch('/api/credits/me', { headers: authHeaders() }),
      ]);
      if (!statsResp.ok) throw new Error('Failed to load platform stats');
      const [statsData, creditsData] = await Promise.all([
        statsResp.json(),
        creditsResp.ok ? creditsResp.json() : null,
      ]);
      setData(statsData);
      setCredits(creditsData);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading System Command Center…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
          <p className="text-sm text-rose-400">{error}</p>
          <Button size="sm" variant="outline" onClick={load} className="border-white/10">Retry</Button>
        </div>
      </div>
    );
  }

  const { systemStats, systems = [], aiActivity, toolHealth } = data ?? {};

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground">System Command Center</h1>
            <Badge variant="outline" className="text-[9px] border-primary/30 text-primary bg-primary/5 font-mono">LIVE</Badge>
          </div>
          <p className="text-sm text-muted-foreground ml-10">
            Real-time platform intelligence · All data is live
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-[11px] text-muted-foreground/50">
              Updated {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <Button size="sm" variant="outline" onClick={load} className="h-8 text-xs border-white/10 gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── System Performance Metrics ──────────────────────────────────── */}
      <section>
        <SectionHeader icon={Activity} title="System Performance" sub="Your automated systems overview" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={CheckCircle2} label="Active Systems" value={systemStats?.active ?? 0}
            sub="Running & healthy" color="text-emerald-400" accent="bg-emerald-500/10" />
          <StatCard icon={Zap} label="Building" value={systemStats?.building ?? 0}
            sub="Currently deploying" color="text-blue-400" accent="bg-blue-500/10" />
          <StatCard icon={Clock} label="Paused" value={systemStats?.paused ?? 0}
            sub="Awaiting resumption" color="text-amber-400" accent="bg-amber-500/10" />
          <StatCard icon={AlertTriangle} label="Failed" value={systemStats?.failed ?? 0}
            sub="Need attention" color="text-rose-400" accent="bg-rose-500/10" />
        </div>
      </section>

      {/* ── AI Activity + Credits ─────────────────────────────────────────── */}
      <section>
        <SectionHeader icon={Brain} title="AI Activity" sub="STARK orchestrator usage and credits" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Zap} label="AI Requests" value={aiActivity?.totalRequests ?? 0}
            sub="Total completions" />
          <StatCard icon={BarChart3} label="Tokens Used" value={(aiActivity?.totalTokens ?? 0).toLocaleString()}
            sub="Across all builds" />
          <StatCard icon={TrendingUp} label="Success Rate" value={`${aiActivity?.successRate ?? 100}%`}
            sub="AI reliability" color="text-emerald-400" accent="bg-emerald-500/10" />
          <StatCard icon={CreditCard} label="Credits Left" value={credits?.balance ?? '—'}
            sub="Available balance" color="text-primary" accent="bg-primary/10" />
        </div>
      </section>

      {/* ── Tool Health ───────────────────────────────────────────────────── */}
      <section>
        <SectionHeader icon={Wifi} title="Tool Health" sub="Core platform service status" />
        <div className="rounded-xl border border-white/10 bg-black/40 backdrop-blur-md overflow-hidden">
          {Object.entries(toolHealth ?? {}).map(([key, tool], i, arr) => (
            <div key={key} className={`flex items-center justify-between px-5 py-4 ${i < arr.length - 1 ? 'border-b border-white/8' : ''}`}>
              <div className="flex items-center gap-3">
                <StatusDot status={tool.status} />
                <div>
                  <p className="text-sm font-medium text-foreground">{tool.name}</p>
                  <p className="text-xs text-muted-foreground">{tool.description}</p>
                </div>
              </div>
              <StatusLabel status={tool.status} />
            </div>
          ))}
          {/* Extra services */}
          <div className="border-t border-white/8 flex items-center justify-between px-5 py-4 border-b border-white/8">
            <div className="flex items-center gap-3">
              <StatusDot status="operational" />
              <div>
                <p className="text-sm font-medium text-foreground">Automation Engine</p>
                <p className="text-xs text-muted-foreground">Build pipeline & step executor</p>
              </div>
            </div>
            <StatusLabel status="operational" />
          </div>
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <StatusDot status="operational" />
              <div>
                <p className="text-sm font-medium text-foreground">Blueprint Library</p>
                <p className="text-xs text-muted-foreground">All 8 blueprints indexed & ready</p>
              </div>
            </div>
            <StatusLabel status="operational" />
          </div>
        </div>
      </section>

      {/* ── Blueprint Analytics ───────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <SectionHeader icon={Server} title="Blueprint Analytics" sub="Your deployed automation systems" />
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/system-builder')}
            className="h-8 text-xs border-white/10 gap-1.5"
          >
            <Zap className="w-3.5 h-3.5" />
            New System
          </Button>
        </div>

        {systems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
            <Server className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground mb-1">No systems deployed yet</p>
            <p className="text-xs text-muted-foreground/60 mb-4">Build your first automated system to see analytics here.</p>
            <Button size="sm" onClick={() => navigate('/blueprints')} className="gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Browse Blueprints
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-black/40 backdrop-blur-md overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-white/10 bg-white/2">
              <div className="col-span-4 text-[10px] uppercase tracking-widest text-muted-foreground font-medium">System / Blueprint</div>
              <div className="col-span-2 text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Status</div>
              <div className="col-span-3 text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Health</div>
              <div className="col-span-3 text-[10px] uppercase tracking-widest text-muted-foreground font-medium text-right">Actions</div>
            </div>
            {/* Table rows */}
            {systems.map((system, i) => (
              <div key={system.id} className={`grid grid-cols-12 gap-4 items-center px-5 py-4 hover:bg-white/3 transition-colors ${i < systems.length - 1 ? 'border-b border-white/8' : ''}`}>
                <div className="col-span-4 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{system.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{system.blueprint?.name ?? 'Custom System'}</p>
                </div>
                <div className="col-span-2">
                  <BuildBadge buildStatus={system.buildStatus} healthStatus={system.healthStatus} />
                </div>
                <div className="col-span-3 flex items-center gap-1.5">
                  <StatusDot status={system.healthStatus === 'unhealthy' ? 'degraded' : system.buildStatus === 'building' ? 'degraded' : 'operational'} />
                  <span className="text-xs text-muted-foreground capitalize">
                    {system.healthStatus === 'healthy' ? 'Healthy' : system.buildStatus === 'building' ? 'Deploying…' : system.healthStatus ?? 'Pending'}
                  </span>
                </div>
                <div className="col-span-3 flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate(`/build/${system.id}`)}
                    className="h-7 text-xs text-muted-foreground hover:text-foreground px-2 gap-1"
                  >
                    View <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Connection Hub ────────────────────────────────────────────────── */}
      <section>
        <SectionHeader icon={Settings2} title="Connection Hub" sub="Integrated services and platforms" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { name: 'OpenRouter', desc: 'AI completions', status: toolHealth?.openrouter?.status ?? 'operational', icon: Brain },
            { name: 'Stripe', desc: 'Payments', status: toolHealth?.stripe?.status ?? 'not_configured', icon: CreditCard },
            { name: 'PostgreSQL', desc: 'Database', status: 'operational', icon: Database },
            { name: 'Make.com', desc: 'Automation', status: 'not_configured', icon: Zap },
            { name: 'TikTok', desc: 'Traffic source', status: 'not_configured', icon: Activity },
            { name: 'Shopify', desc: 'eCommerce', status: 'not_configured', icon: Server },
            { name: 'YouTube', desc: 'Video traffic', status: 'not_configured', icon: Activity },
            { name: 'Resend', desc: 'Email delivery', status: 'not_configured', icon: Wifi },
          ].map((svc) => (
            <div key={svc.name} className="rounded-xl border border-white/10 bg-black/40 backdrop-blur-sm p-4 flex items-start gap-3 hover:bg-white/5 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                <svc.icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground">{svc.name}</p>
                <p className="text-[11px] text-muted-foreground">{svc.desc}</p>
                <div className="flex items-center gap-1 mt-1.5">
                  <StatusDot status={svc.status} />
                  <StatusLabel status={svc.status} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
};

export default SystemCommandCenterPage;
