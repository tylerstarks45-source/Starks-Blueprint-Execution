import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { toast } from 'sonner';
import {
  ArrowLeft, Building2, Globe, Wrench, Download, Link2, RefreshCw,
  FileText, TrendingUp, BarChart3, Server, Plug, Sparkles, Bell,
  ListChecks, LineChart as LineChartIcon, Rocket, ExternalLink, AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import AuthLayout from '@/components/AuthLayout.jsx';
import HealthScoreCard from '@/components/HealthScoreCard.jsx';
import ApprovalsQueue from '@/components/ApprovalsQueue.jsx';
import OperationsModePanel from '@/components/OperationsModePanel.jsx';
import { getAuthHeaders } from '@/lib/apiHeaders.js';
import { useBusiness } from '@/contexts/BusinessContext.jsx';

const authHeaders = () => getAuthHeaders();

const ORIGIN_META = {
  built:    { label: 'Built on SBEP', badge: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20', icon: Wrench },
  imported: { label: 'Imported',      badge: 'bg-blue-400/10 text-blue-400 border-blue-400/20',          icon: Download },
};

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function centsToDisplay(cents) {
  if (!cents) return '$0';
  const dollars = cents / 100;
  if (dollars < 1) return `$${dollars.toFixed(2)}`;
  if (dollars >= 1000) return `$${(dollars / 1000).toFixed(1)}k`;
  return `$${dollars.toFixed(2)}`;
}

function StatCard({ label, value, sub, accent = 'blue' }) {
  const colors = {
    blue: 'from-blue-500/10 to-transparent border-blue-500/20',
    emerald: 'from-emerald-500/10 to-transparent border-emerald-500/20',
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/30',
    amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/30',
  };
  return (
    <div className={`relative rounded-xl border bg-gradient-to-br ${colors[accent]} bg-black/70 p-4`}>
      <p className="text-[10px] uppercase tracking-widest text-gray-400 font-mono mb-1">{label}</p>
      <p className="text-2xl font-bold text-white font-mono">{value}</p>
      {sub && <p className="text-xs text-gray-300 mt-0.5">{sub}</p>}
    </div>
  );
}

function RevenueSparkline({ trend, height = 64 }) {
  if (!trend || trend.length === 0) return null;
  const hasData = trend.some((t) => t.amountCents > 0);
  const data = trend.map((t) => ({ date: t.date.slice(5), value: t.amountCents / 100 }));

  return (
    <div className="w-full mt-2" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
          <defs>
            <linearGradient id="cchRevenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" hide />
          <YAxis hide domain={[0, 'auto']} />
          <Tooltip
            contentStyle={{ background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 10, fontFamily: 'monospace' }}
            itemStyle={{ color: '#34d399' }}
            formatter={(v) => [`$${v.toFixed(2)}`, 'Revenue']}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={hasData ? '#34d399' : '#1f2937'}
            strokeWidth={1.5}
            fill="url(#cchRevenueGrad)"
            dot={false}
            activeDot={{ r: 3, fill: '#34d399', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function SectionCard({ icon: Icon, title, action, children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-black/70 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function BusinessCommandCenterPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setActiveBusiness } = useBusiness();

  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState(null);
  const [activity, setActivity] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [domains, setDomains] = useState([]);
  const [published, setPublished] = useState([]);
  const [health, setHealth] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/businesses/${id}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Business not found');
      const data = await res.json();
      setBusiness(data);
      setActiveBusiness({ id: data.id, name: data.name, businessType: data.businessType });

      const healthRes = await fetch(`/api/businesses/${id}/health`, { headers: authHeaders() });
      if (healthRes.ok) setHealth(await healthRes.json());

      if (data.systemInstanceId != null) {
        const [revRes, actRes, pubRes] = await Promise.all([
          fetch(`/api/system-instances/${data.systemInstanceId}/revenue`, { headers: authHeaders() }),
          fetch('/api/system-instances/activity', { headers: authHeaders() }),
          fetch(`/api/system-instances/${data.systemInstanceId}/published-content`, { headers: authHeaders() }),
        ]);
        if (revRes.ok) setRevenue(await revRes.json());
        if (actRes.ok) {
          const all = await actRes.json();
          setActivity(all.filter((e) => e.systemInstanceId === data.systemInstanceId));
        }
        if (pubRes.ok) setPublished(await pubRes.json());
      }

      const [notifRes, domainsRes] = await Promise.all([
        fetch('/api/notifications', { headers: authHeaders() }),
        fetch('/api/domains', { headers: authHeaders() }),
      ]);
      if (notifRes.ok) setNotifications((await notifRes.json()).slice(0, 8));
      if (domainsRes.ok) setDomains(await domainsRes.json());
    } catch (err) {
      toast.error(err.message || 'Failed to load business');
      navigate('/business-portfolio');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, setActiveBusiness]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <RefreshCw className="w-6 h-6 text-muted-foreground/40 animate-spin" />
        </div>
      </AuthLayout>
    );
  }

  if (!business) return null;

  const origin = ORIGIN_META[business.origin] ?? ORIGIN_META.imported;
  const OriginIcon = origin.icon;
  const connections = business.connections || [];
  const linkedDomain = domains.find((d) => d.linkedPageId != null) || null;
  const latestHealth = health?.latest ?? null;

  return (
    <AuthLayout>
      <Helmet><title>{business.name} · SBEP</title></Helmet>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <button
          onClick={() => navigate('/business-portfolio')}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-foreground font-mono mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Businesses
        </button>

        <div className="flex items-start gap-4 mb-8 flex-wrap">
          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            <Building2 className="w-5.5 h-5.5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold font-mono text-foreground">{business.name}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-mono font-semibold uppercase tracking-wider ${origin.badge}`}>
                <OriginIcon className="w-3 h-3" /> {origin.label}
              </span>
              {business.businessType && (
                <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider">{business.businessType}</span>
              )}
              {business.websiteUrl && (
                <a href={business.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
                  <Globe className="w-3 h-3" /> {business.websiteUrl.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue */}
          <SectionCard icon={TrendingUp} title="Revenue" className="lg:col-span-2">
            {business.systemInstanceId == null ? (
              <p className="text-sm text-muted-foreground/60">No revenue source connected. Link this business to a built system to track revenue automatically.</p>
            ) : revenue ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard label="Today" value={centsToDisplay(revenue.todayCents)} accent="emerald" />
                  <StatCard label="This Week" value={centsToDisplay(revenue.weekCents)} accent="emerald" />
                  <StatCard label="This Month" value={centsToDisplay(revenue.monthCents)} accent="emerald" />
                  <StatCard label="Lifetime" value={centsToDisplay(revenue.lifetimeCents)} accent="emerald" />
                </div>
                <RevenueSparkline trend={revenue.trend} height={80} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground/60">Loading revenue…</p>
            )}
          </SectionCard>

          {/* Health */}
          <div className="lg:col-span-1">
            <HealthScoreCard businessId={business.id} />
          </div>

          {/* Revenue Trend chart (larger) */}
          <SectionCard icon={LineChartIcon} title="Revenue Trend" className="lg:col-span-3">
            {revenue?.trend?.length ? (
              <RevenueSparkline trend={revenue.trend} height={160} />
            ) : (
              <p className="text-sm text-muted-foreground/60">No revenue trend data yet.</p>
            )}
          </SectionCard>

          {/* Traffic */}
          <SectionCard icon={BarChart3} title="Traffic">
            <p className="text-sm text-muted-foreground/60">
              Traffic analytics aren't connected for this business yet. Connect an analytics tool from the Connections Hub to start tracking visitors.
            </p>
          </SectionCard>

          {/* Analytics (SEO / Content / Marketing sub-scores) */}
          <SectionCard icon={Sparkles} title="Analytics">
            {latestHealth ? (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'seoScore', label: 'SEO' },
                  { key: 'contentScore', label: 'Content' },
                  { key: 'marketingScore', label: 'Marketing' },
                ].map((s) => (
                  <div key={s.key} className="text-center">
                    <div className="text-sm font-bold font-mono text-foreground">{latestHealth[s.key]}</div>
                    <div className="text-[10px] text-muted-foreground/50 font-mono mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/60">No analytics scores yet — run a health analysis to populate this.</p>
            )}
          </SectionCard>

          {/* Hosting */}
          <SectionCard icon={Server} title="Hosting">
            {business.websiteUrl ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground/60">Website</span>
                  <a href={business.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-primary font-medium inline-flex items-center gap-1 hover:underline">
                    {business.websiteUrl.replace(/^https?:\/\//, '')} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                {linkedDomain ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground/60">Custom domain</span>
                    <span className="text-foreground font-medium">{linkedDomain.domain}</span>
                  </div>
                ) : (
                  <Link to="/domains" className="text-xs text-primary hover:underline inline-block">Connect a custom domain →</Link>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/60">
                No hosted site yet.{' '}
                <Link to="/domains" className="text-primary hover:underline">Manage domains</Link>
              </p>
            )}
          </SectionCard>

          {/* Connections */}
          <SectionCard
            icon={Plug}
            title="Connections"
            action={<Link to="/connections" className="text-xs text-primary hover:underline">Manage in Connections Hub →</Link>}
          >
            {connections.length === 0 ? (
              <p className="text-sm text-muted-foreground/60">No platforms connected yet.</p>
            ) : (
              <div className="space-y-2">
                {connections.map((conn) => (
                  <div key={conn.id} className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 min-w-0">
                      <Link2 className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                      <span className="text-sm text-foreground truncate">{conn.platformName}</span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground/50 uppercase">{conn.status}</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Automations */}
          <SectionCard icon={Rocket} title="Automations">
            {business.systemInstanceId == null ? (
              <p className="text-sm text-muted-foreground/60">No linked system — automations aren't available for this business yet.</p>
            ) : published.length === 0 ? (
              <p className="text-sm text-muted-foreground/60">No published content or automations recorded yet.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto ash-scroll">
                {published.slice(0, 6).map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                    <span className="text-sm text-foreground truncate">{item.channel}</span>
                    <span className="text-[10px] text-muted-foreground/50 font-mono">{timeAgo(item.publishedAt || item.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* AI Activity */}
          <SectionCard icon={Sparkles} title="AI Activity">
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground/60">
                {business.systemInstanceId == null
                  ? 'No linked system — AI activity is only tracked for built systems.'
                  : 'No AI activity recorded yet for this business.'}
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto ash-scroll">
                {activity.slice(0, 8).map((evt) => (
                  <div key={evt.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-foreground/80 truncate">{evt.description}</span>
                    <span className="text-[10px] text-muted-foreground/50 font-mono shrink-0">{timeAgo(evt.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Notifications */}
          <SectionCard icon={Bell} title="Notifications">
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground/60">No recent notifications.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto ash-scroll">
                {notifications.map((n, i) => (
                  <div key={`${n.id}-${i}`} className="flex items-start justify-between gap-2 text-sm">
                    <span className="text-foreground/80">{n.message || n.title}</span>
                    <span className="text-[10px] text-muted-foreground/50 font-mono shrink-0">{timeAgo(n.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Tasks / Approval Queue */}
          <SectionCard icon={ListChecks} title="Approval Queue">
            <ApprovalsQueue businessId={business.id} />
          </SectionCard>

          {/* ASH Operations Mode */}
          <SectionCard icon={ShieldCheck} title="ASH Operations Mode">
            <OperationsModePanel businessId={business.id} />
          </SectionCard>

          {/* Growth Recommendations */}
          <SectionCard icon={TrendingUp} title="Growth Recommendations" className="lg:col-span-3">
            {latestHealth?.recommendations?.length || latestHealth?.revenueOpportunities?.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {latestHealth.revenueOpportunities?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold mb-1.5 text-emerald-400">
                      <TrendingUp className="w-3.5 h-3.5" /> Revenue opportunities
                    </div>
                    <ul className="space-y-1">
                      {latestHealth.revenueOpportunities.map((item, i) => (
                        <li key={i} className="text-sm text-foreground/80 pl-1">• {item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {latestHealth.recommendations?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold mb-1.5 text-amber-400">
                      <Sparkles className="w-3.5 h-3.5" /> ASH recommends
                    </div>
                    <ul className="space-y-1">
                      {latestHealth.recommendations.map((item, i) => (
                        <li key={i} className="text-sm text-foreground/80 pl-1">• {item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/60 inline-flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> No recommendations yet — run a health analysis above to get growth suggestions from ASH.
              </p>
            )}
          </SectionCard>
        </div>

        {business.notes && (
          <div className="rounded-2xl border border-white/10 bg-black/70 p-6 mt-6">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 mb-1.5">
              <FileText className="w-3.5 h-3.5" /> Notes
            </div>
            <p className="text-sm text-foreground/80 whitespace-pre-wrap">{business.notes}</p>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
