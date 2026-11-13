import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BarChart3, Brain, Building2, Calendar, Coins, Cpu, FileText, Layers, Lightbulb, Loader2, RefreshCw, Search, BookOpen, FolderKanban } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout.jsx';
import { fetchStats } from '@/lib/ashApi.js';

const COLORS = ['#00c8ff', '#22c55e', '#8b5cf6', '#f59e0b', '#ef4444', '#64748b'];

function Stat({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 text-white/50 text-xs uppercase tracking-wider"><Icon className="w-3.5 h-3.5" />{label}</div>
      <div className="mt-2 text-2xl font-semibold text-white tabular-nums">{typeof value === 'number' ? value.toLocaleString('en-US') : value}</div>
      {hint ? <div className="mt-1 text-xs text-white/40">{hint}</div> : null}
    </div>
  );
}

function Breakdown({ title, icon: Icon, data, empty }) {
  const rows = Object.entries(data ?? {}).map(([name, value]) => ({ name, value }));
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-white/80 uppercase tracking-wider mb-3"><Icon className="w-4 h-4 text-cyan-300" />{title}</h2>
      {rows.length ? (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={rows} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                {rows.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#050b1e', border: '1px solid rgba(0,200,255,0.3)', color: 'white' }} />
              <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : <p className="text-sm text-white/45">{empty}</p>}
    </section>
  );
}

export default function StatsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await fetchStats()); setError(null); } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <AuthLayout>
      <Helmet><title>Stats | Starks Global Group</title></Helmet>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2"><BarChart3 className="w-6 h-6 text-cyan-300" /> Stats</h1>
            <p className="text-sm text-white/50 mt-1">Everything on your account in one place, from live data.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/ash-brain" className="text-xs px-3 py-2 rounded-lg border border-white/10 text-white/70 hover:text-white hover:bg-white/5">ASH Brain</Link>
            <Link to="/analytics" className="text-xs px-3 py-2 rounded-lg border border-white/10 text-white/70 hover:text-white hover:bg-white/5">Revenue analytics</Link>
            <button type="button" onClick={load} className="text-xs px-3 py-2 rounded-lg border border-cyan-400/30 text-cyan-200 hover:bg-cyan-400/10 flex items-center gap-1.5">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Refresh
            </button>
          </div>
        </div>
        {error && <div className="rounded-xl border border-red-400/30 bg-red-500/10 text-red-200 text-sm p-3">Couldn't load stats: {error}</div>}
        {data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat icon={Coins} label="Credits" value={data.account.credits} hint={data.account.tier ? `${data.account.tier} plan` : undefined} />
              <Stat icon={Building2} label="Businesses" value={data.portfolio.businesses} />
              <Stat icon={Layers} label="Systems" value={data.portfolio.systems} />
              <Stat icon={Cpu} label="AI calls (30d)" value={data.ai.calls30d} hint={`${data.ai.tokens30d.toLocaleString('en-US')} tokens`} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Stat icon={Brain} label="Memories" value={data.ash.memories} />
              <Stat icon={BookOpen} label="Knowledge" value={data.ash.knowledge} />
              <Stat icon={Search} label="Research runs" value={data.ash.research} />
              <Stat icon={FolderKanban} label="Projects" value={data.ash.projects} />
              <Stat icon={FileText} label="Files" value={data.ash.files} />
            </div>
            <div className="grid md:grid-cols-2 gap-5">
              <Breakdown title="Recommendations" icon={Lightbulb} data={data.recommendations} empty="No recommendations yet." />
              <Breakdown title="Scheduled posts" icon={Calendar} data={data.scheduledPosts} empty="No scheduled posts yet." />
            </div>
          </>
        )}
        {!data && loading && <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-cyan-300" /></div>}
      </div>
    </AuthLayout>
  );
}
