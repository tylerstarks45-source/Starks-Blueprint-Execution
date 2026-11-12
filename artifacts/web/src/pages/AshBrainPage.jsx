import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Activity, Brain, HeartPulse, Loader2, RefreshCw, Sparkles, UserRound } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout.jsx';
import Gauge from '@/components/ash/Gauge.jsx';
import { fetchBrainActivity, levelColor, timeAgo } from '@/lib/ashApi.js';

const HEALTH = {
  healthy: { label: 'Healthy', cls: 'text-emerald-300 border-emerald-400/30 bg-emerald-500/10' },
  degraded: { label: 'Degraded', cls: 'text-amber-300 border-amber-400/30 bg-amber-500/10' },
  warning: { label: 'Warning', cls: 'text-amber-300 border-amber-400/30 bg-amber-500/10' },
  offline: { label: 'Offline', cls: 'text-red-300 border-red-400/30 bg-red-500/10' },
  unknown: { label: 'Not checked', cls: 'text-white/50 border-white/15 bg-white/5' },
};
const ACTIVE_MS = 15 * 60 * 1000;

function Panel({ title, icon: Icon, children, right }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white/80 uppercase tracking-wider">
          <Icon className="w-4 h-4 text-cyan-300" /> {title}
        </h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export default function AshBrainPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await fetchBrainActivity()); setError(null); } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const subsystems = data?.subsystems ?? [];
  const overall = subsystems.length ? Math.round(subsystems.reduce((s, x) => s + x.level, 0) / subsystems.length) : 0;
  const activeNow = subsystems.filter((s) => s.lastActiveAt && Date.now() - new Date(s.lastActiveAt).getTime() < ACTIVE_MS);
  const health = data?.health;
  const healthyPct = health?.brains?.length ? Math.round((health.counts.healthy / health.brains.length) * 100) : 0;

  return (
    <AuthLayout>
      <Helmet><title>ASH Brain | Starks Global Group</title></Helmet>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Brain className="w-6 h-6 text-cyan-300" /> ASH Brain</h1>
            <p className="text-sm text-white/50 mt-1">Which parts of ASH's brain are working for you, measured from real activity. Levels compare the last 7 days with a healthy week.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/stats" className="text-xs px-3 py-2 rounded-lg border border-white/10 text-white/70 hover:text-white hover:bg-white/5">All stats</Link>
            <Link to="/ash-intelligence" className="text-xs px-3 py-2 rounded-lg border border-white/10 text-white/70 hover:text-white hover:bg-white/5">Lessons</Link>
            <button type="button" onClick={load} className="text-xs px-3 py-2 rounded-lg border border-cyan-400/30 text-cyan-200 hover:bg-cyan-400/10 flex items-center gap-1.5">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Refresh
            </button>
          </div>
        </div>

        {error && <div className="rounded-xl border border-red-400/30 bg-red-500/10 text-red-200 text-sm p-3">Couldn't load ASH's brain activity: {error}</div>}

        {data && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex justify-center"><Gauge value={overall} label="Overall activity" sublabel="avg of all regions" /></div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex justify-center"><Gauge value={healthyPct} label="System health" sublabel={`${health?.counts?.healthy ?? 0}/${health?.brains?.length ?? 0} brains healthy`} /></div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex justify-center"><Gauge value={data.persona.familiarity} label="Knows you" sublabel={`${data.persona.messages} messages learned from`} /></div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-xs uppercase tracking-wider text-white/50 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> Working right now</div>
                {activeNow.length ? (
                  <ul className="mt-3 space-y-1.5">
                    {activeNow.map((s) => (
                      <li key={s.key} className="flex items-center gap-2 text-sm text-white"><span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />{s.label}<span className="text-white/40 text-xs ml-auto">{timeAgo(s.lastActiveAt)}</span></li>
                    ))}
                  </ul>
                ) : <p className="mt-3 text-sm text-white/45">Idle. Nothing in the last 15 minutes.</p>}
              </div>
            </div>

            <Panel title="Brain regions" icon={Sparkles}>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
                {subsystems.map((s) => (
                  <div key={s.key} className="flex flex-col items-center text-center" title={s.description}>
                    <Gauge value={s.level} label={s.label} size={110} />
                    <div className="text-[11px] text-white/45 mt-1">{s.weekly} this week · {s.total} total</div>
                    <div className="text-[10px] text-white/30">last active {timeAgo(s.lastActiveAt)}</div>
                  </div>
                ))}
              </div>
            </Panel>

            <div className="grid lg:grid-cols-2 gap-5">
              <Panel title="Reasoning activity (7 days)" icon={Activity}>
                {data.dailyUsage.length ? (
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.dailyUsage}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                        <YAxis tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }} allowDecimals={false} />
                        <Tooltip contentStyle={{ background: '#050b1e', border: '1px solid rgba(0,200,255,0.3)', color: 'white' }} />
                        <Bar dataKey="calls" name="AI calls" fill="#00c8ff" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : <p className="text-sm text-white/45">No AI calls in the last 7 days. Talk to ASH to get started.</p>}
              </Panel>

              <Panel title="Region levels" icon={Brain}>
                <div className="space-y-3">
                  {subsystems.map((s) => (
                    <div key={s.key}>
                      <div className="flex justify-between text-xs text-white/60 mb-1"><span>{s.label}</span><span className="tabular-nums">{s.level}%</span></div>
                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${s.level}%`, background: levelColor(s.level) }} />
                      </div>
                      <div className="text-[10px] text-white/35 mt-0.5">{s.description}</div>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>

            <Panel title="Brain modules" icon={HeartPulse} right={<span className="text-[11px] text-white/40">checked {timeAgo(health?.generatedAt)}</span>}>
              {health?.brains?.length ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {health.brains.map((b) => {
                    const st = HEALTH[b.state] ?? HEALTH.unknown;
                    return (
                      <div key={b.brainName} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm text-white font-medium truncate">{b.brainName}</span>
                          <span className={`text-[10px] uppercase tracking-wider border rounded px-1.5 py-0.5 ${st.cls}`}>{st.label}</span>
                        </div>
                        {b.message ? <p className="text-[11px] text-white/40 mt-1 line-clamp-2">{b.message}</p> : null}
                        {typeof b.latencyMs === 'number' ? <p className="text-[10px] text-white/30 mt-1">{b.latencyMs} ms</p> : null}
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-sm text-white/45">Brain modules are still starting up.</p>}
            </Panel>

            <Panel title="Personality" icon={UserRound}>
              <p className="text-sm text-white/60">
                ASH is a sharp, warm, candid executive partner. As you talk to her she learns how you write (length, tone, energy) and gradually mirrors your style.
                She knows you at <span className="text-white font-semibold">{data.persona.familiarity}%</span>; at 70% and above she mirrors you closely.
              </p>
            </Panel>
          </>
        )}
        {!data && loading && <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-cyan-300" /></div>}
      </div>
    </AuthLayout>
  );
}
