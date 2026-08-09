import React, { useState, useEffect, useRef } from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { useAuth } from '@/contexts/AuthContext.jsx';
import ASHReactor from './ASHReactor.jsx';
import ASHAssistantPanel from './ASHAssistantPanel.jsx';
import './command-center.css';

const authHeaders = () => {
  const t = localStorage.getItem('sbep_auth_token');
  return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : {};
};

/* ── Glassmorphism panel wrapper ────────────────────────────────────── */
function GlassPanel({ children, className = '', style = {} }) {
  return (
    <div
      className={`rounded-2xl relative overflow-hidden ${className}`}
      style={{
        background: 'linear-gradient(135deg, rgba(10,20,40,0.82) 0%, rgba(5,10,20,0.90) 100%)',
        border: '1px solid rgba(0,200,255,0.12)',
        boxShadow: '0 0 40px rgba(0,0,0,0.5), inset 0 0 40px rgba(0,200,255,0.03)',
        backdropFilter: 'blur(20px)',
        ...style,
      }}>
      {/* Corner brackets */}
      {[['top-2 left-2 border-t border-l', 'rounded-tl'],
        ['top-2 right-2 border-t border-r', 'rounded-tr'],
        ['bottom-2 left-2 border-b border-l', 'rounded-bl'],
        ['bottom-2 right-2 border-b border-r', 'rounded-br']].map(([pos, rnd], i) => (
        <span key={i} className={`absolute w-3 h-3 pointer-events-none ${pos} ${rnd}`}
          style={{ borderColor: 'rgba(0,200,255,0.35)' }} />
      ))}
      {children}
    </div>
  );
}

/* ── HUD label ──────────────────────────────────────────────────────── */
function HudLabel({ children }) {
  return (
    <p className="text-[9px] uppercase tracking-[0.2em] font-bold mb-2"
      style={{ color: 'rgba(0,200,255,0.55)' }}>
      {children}
    </p>
  );
}

/* ── Top status bar ─────────────────────────────────────────────────── */
function TopStatusBar({ userName, totalSystems, buildingSystems }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hms = time.toLocaleTimeString('en-US', { hour12: false });
  const date = time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="flex items-center justify-between px-4 py-2 shrink-0"
      style={{
        background: 'rgba(0,5,15,0.7)',
        borderBottom: '1px solid rgba(0,200,255,0.08)',
        backdropFilter: 'blur(20px)',
      }}>
      {/* Left: Logo + title */}
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded flex items-center justify-center text-xs font-black"
          style={{ background: 'rgba(0,200,255,0.15)', border: '1px solid rgba(0,200,255,0.35)',
            color: '#00c8ff', fontFamily: 'monospace' }}>
          ◈
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-[0.25em]" style={{ color: 'rgba(0,200,255,0.5)' }}>
            Starks Global Group
          </p>
          <p className="text-xs font-bold text-white/80" style={{ fontFamily: 'monospace', letterSpacing: '0.1em' }}>
            Command Center
          </p>
        </div>
      </div>

      {/* Center: nav links */}
      <div className="hidden md:flex items-center gap-6">
        {['Builder', 'Systems', 'Analytics', 'Intelligence'].map(label => (
          <a key={label}
            href={`/${label.toLowerCase()}`}
            className="text-[10px] uppercase tracking-widest text-white/35 hover:text-cyan-400/80 transition-colors">
            {label}
          </a>
        ))}
      </div>

      {/* Right: clock + status */}
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-xs font-mono font-bold text-white/70" style={{ letterSpacing: '0.08em' }}>{hms}</p>
          <p className="text-[9px] text-white/30">{date}</p>
        </div>
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg"
          style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[9px] uppercase tracking-widest text-green-400 font-bold">Optimal</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
          style={{ background: 'rgba(0,200,255,0.08)', border: '1px solid rgba(0,200,255,0.2)' }}>
          <span className="text-[9px] font-mono text-cyan-400 font-bold">ASH AI</span>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

/* ── Performance chart ──────────────────────────────────────────────── */
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="text-[10px] font-mono px-2 py-1 rounded"
      style={{ background: 'rgba(0,5,20,0.9)', border: '1px solid rgba(0,200,255,0.2)', color: '#00c8ff' }}>
      {payload[0].value}%
    </div>
  );
};

function PerformanceChart({ data }) {
  const chartData = data?.length
    ? data
    : Array.from({ length: 12 }, (_, i) => ({ val: 75 + Math.sin(i * 0.8) * 15 + Math.random() * 8 }));

  return (
    <GlassPanel className="p-3" style={{ flex: 1 }}>
      <HudLabel>System Performance · Real Time</HudLabel>
      <div style={{ height: 70 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00c8ff" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#00c8ff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="val" stroke="#00c8ff" strokeWidth={1.5}
              fill="url(#perfGrad)" dot={false} />
            <Tooltip content={<CustomTooltip />} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {/* Gauge row */}
      <div className="flex justify-between mt-2 pt-2"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        {[
          { label: 'CPU',      val: 98, color: '#00c8ff' },
          { label: 'Memory',   val: 96, color: '#8b5cf6' },
          { label: 'Network',  val: 98, color: '#22c55e' },
          { label: 'Stability',val: 100,color: '#f59e0b' },
        ].map(({ label, val, color }) => (
          <div key={label} className="flex flex-col items-center gap-0.5">
            <span className="text-sm font-black font-mono" style={{ color }}>{val}%</span>
            <span className="text-[8px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}

/* ── World map (CSS-based) ──────────────────────────────────────────── */
function GlobalOpsPanel({ countriesActive = 128 }) {
  /* Dot grid approximating world continents */
  const dots = [
    // N America
    ...Array.from({ length: 22 }, (_, i) => ({ x: 10+Math.random()*18, y: 18+Math.random()*22, bright: Math.random() > 0.4 })),
    // S America
    ...Array.from({ length: 12 }, (_, i) => ({ x: 20+Math.random()*10, y: 44+Math.random()*22, bright: Math.random() > 0.5 })),
    // Europe
    ...Array.from({ length: 18 }, (_, i) => ({ x: 42+Math.random()*10, y: 15+Math.random()*18, bright: Math.random() > 0.3 })),
    // Africa
    ...Array.from({ length: 16 }, (_, i) => ({ x: 44+Math.random()*10, y: 36+Math.random()*25, bright: Math.random() > 0.5 })),
    // Asia
    ...Array.from({ length: 28 }, (_, i) => ({ x: 58+Math.random()*22, y: 15+Math.random()*28, bright: Math.random() > 0.35 })),
    // Oceania
    ...Array.from({ length: 8 }, (_, i) => ({ x: 76+Math.random()*12, y: 52+Math.random()*16, bright: Math.random() > 0.5 })),
  ];

  return (
    <GlassPanel className="p-3" style={{ flex: 1 }}>
      <HudLabel>Global Operations</HudLabel>
      {/* Map area */}
      <div className="relative rounded-lg overflow-hidden" style={{ height: 90, background: 'rgba(0,10,30,0.6)' }}>
        {dots.map((d, i) => (
          <div key={i} className="absolute rounded-full"
            style={{
              left: `${d.x}%`, top: `${d.y}%`,
              width: d.bright ? 3 : 2, height: d.bright ? 3 : 2,
              background: d.bright ? '#00c8ff' : 'rgba(0,200,255,0.25)',
              boxShadow: d.bright ? '0 0 4px #00c8ff' : 'none',
              animation: d.bright ? `cc-star ${1.5 + Math.random() * 3}s ease-in-out ${Math.random() * 3}s infinite` : 'none',
            }} />
        ))}
        {/* Center label */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-center">
          <p className="text-xl font-black font-mono" style={{ color: '#00c8ff',
            textShadow: '0 0 20px rgba(0,200,255,0.8)' }}>{countriesActive}</p>
          <p className="text-[8px] uppercase tracking-widest text-white/30">Countries Active</p>
        </div>
      </div>
      <div className="mt-2 text-center">
        <p className="text-[9px] uppercase tracking-widest" style={{ color: 'rgba(0,200,255,0.5)' }}>
          ● All Systems Operational
        </p>
      </div>
    </GlassPanel>
  );
}

/* ── Active tasks ───────────────────────────────────────────────────── */
function ActiveTasksPanel({ systems }) {
  const tasks = systems.slice(0, 5).map(s => ({
    name: s.name,
    status: s.buildStatus,
    color: {
      active:    '#22c55e',
      building:  '#f59e0b',
      completed: '#3b82f6',
      paused:    '#8b5cf6',
      failed:    '#ef4444',
      pending:   '#6b7280',
    }[s.buildStatus] ?? '#6b7280',
    label: {
      active: 'In Progress', building: 'In Progress',
      completed: 'Completed', paused: 'Paused',
      failed: 'Failed', pending: 'Pending',
    }[s.buildStatus] ?? 'Pending',
  }));

  if (tasks.length === 0) {
    tasks.push(
      { name: 'Revenue Optimization', color: '#22c55e', label: 'In Progress' },
      { name: 'AI Content Generation', color: '#f59e0b', label: 'In Progress' },
      { name: 'System Sync',           color: '#3b82f6', label: 'Completed'  },
      { name: 'Marketplace Update',    color: '#8b5cf6', label: 'Pending'    },
    );
  }

  return (
    <GlassPanel className="p-3" style={{ flex: 1 }}>
      <HudLabel>Active Tasks</HudLabel>
      <div className="space-y-1.5" style={{ height: 90, overflowY: 'auto' }}>
        {tasks.map((t, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: t.color, boxShadow: `0 0 4px ${t.color}` }} />
            <span className="text-[10px] text-white/65 flex-1 truncate">{t.name}</span>
            <span className="text-[8px] font-semibold shrink-0" style={{ color: t.color }}>{t.label}</span>
          </div>
        ))}
      </div>
      <button
        onClick={() => window.location.href = '/systems'}
        className="mt-2 w-full py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all hover:brightness-125"
        style={{
          background: 'rgba(0,200,255,0.08)',
          border: '1px solid rgba(0,200,255,0.2)',
          color: 'rgba(0,200,255,0.7)',
        }}>
        View All Tasks
      </button>
    </GlassPanel>
  );
}

/* ── Main dashboard ─────────────────────────────────────────────────── */
export default function CommandCenterDashboard() {
  const { currentUser } = useAuth();
  const [systems, setSystems]       = useState([]);
  const [perfData, setPerfData]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [ashPanelOpen, setAshPanel] = useState(false);

  /* Fetch system instances */
  useEffect(() => {
    fetch('/api/system-instances?limit=20&sort=updatedAt&order=desc', { headers: authHeaders() })
      .then(r => r.json())
      .then(d => {
        setSystems(Array.isArray(d) ? d : (d.data ?? []));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  /* Mock perf data (real data would come from monitoring endpoint) */
  useEffect(() => {
    setPerfData(Array.from({ length: 20 }, (_, i) => ({
      val: Math.round(80 + Math.sin(i * 0.6) * 12 + Math.random() * 6),
    })));
  }, []);

  const userName     = currentUser?.name?.split(' ')[0] ?? currentUser?.email?.split('@')[0] ?? 'Tyler';
  const totalSystems = systems.length;
  const building     = systems.filter(s => s.buildStatus === 'building').length;
  const active       = systems.filter(s => s.buildStatus === 'active').length;

  return (
    <div className="flex flex-col w-full overflow-hidden"
      style={{
        height: '100%',
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 30% 20%, rgba(0,20,60,0.9) 0%, rgba(2,5,15,1) 50%, rgba(0,0,5,1) 100%)',
        fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
      }}>

      {/* Animated deep space background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        {/* Nebula blobs */}
        <div className="absolute rounded-full"
          style={{
            width: 600, height: 400, left: '10%', top: '5%',
            background: 'radial-gradient(ellipse, rgba(0,100,200,0.06) 0%, transparent 70%)',
            animation: 'cc-glow 8s ease-in-out infinite',
          }} />
        <div className="absolute rounded-full"
          style={{
            width: 500, height: 350, right: '5%', bottom: '10%',
            background: 'radial-gradient(ellipse, rgba(80,0,180,0.05) 0%, transparent 70%)',
            animation: 'cc-glow 10s ease-in-out 3s infinite',
          }} />

        {/* Circuit lines */}
        <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="traceGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#00c8ff" stopOpacity="0" />
              <stop offset="50%"  stopColor="#00c8ff" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#00c8ff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0 200 H400 V100 H800" stroke="url(#traceGrad)" strokeWidth="0.5" fill="none"
            strokeDasharray="8 12" style={{ animation: 'cc-trace 6s linear infinite' }} />
          <path d="M0 400 H300 V300 H600 V250 H900" stroke="url(#traceGrad)" strokeWidth="0.5" fill="none"
            strokeDasharray="6 14" style={{ animation: 'cc-trace 9s linear 2s infinite' }} />
        </svg>
      </div>

      {/* Top status bar */}
      <div className="relative z-10">
        <TopStatusBar userName={userName} totalSystems={totalSystems} buildingSystems={building} />
      </div>

      {/* Main content area */}
      <div className="relative z-10 flex-1 flex gap-3 p-3 min-h-0 overflow-hidden">

        {/* CENTER — Reactor */}
        <div className="flex-1 flex flex-col min-w-0 gap-3">
          {/* Stats ribbon */}
          <div className="flex gap-2 shrink-0">
            {[
              { label: 'Total Projects', val: totalSystems, color: '#00c8ff' },
              { label: 'Building',       val: building,     color: '#f59e0b' },
              { label: 'Live',           val: active,       color: '#22c55e' },
              { label: 'AI Active',      val: '100%',       color: '#8b5cf6' },
            ].map(({ label, val, color }) => (
              <div key={label} className="flex-1 rounded-xl px-3 py-2 text-center"
                style={{
                  background: `${color}08`,
                  border: `1px solid ${color}20`,
                }}>
                <p className="text-lg font-black font-mono" style={{ color, textShadow: `0 0 12px ${color}60` }}>{val}</p>
                <p className="text-[8px] uppercase tracking-widest" style={{ color: `${color}80` }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Reactor area — takes remaining space */}
          <div className="flex-1 relative min-h-0" style={{ minHeight: 380 }}>
            <ASHReactor
              systems={systems}
              onOpenASH={() => setAshPanel(true)}
            />
          </div>
        </div>

        {/* RIGHT — ASH panel */}
        <div className="shrink-0 hidden lg:block" style={{ width: 270 }}>
          <GlassPanel className="h-full p-4"
            style={{ border: '1px solid rgba(0,200,255,0.15)' }}>
            <ASHAssistantPanel
              userName={userName}
              systemStats={{ totalSystems, building, active }}
            />
          </GlassPanel>
        </div>
      </div>

      {/* BOTTOM — metrics strip */}
      <div className="relative z-10 flex gap-3 px-3 pb-3 shrink-0">
        <PerformanceChart data={perfData} />
        <GlobalOpsPanel countriesActive={128} />
        <ActiveTasksPanel systems={systems} />
      </div>

      {/* Mobile ASH panel drawer */}
      {ashPanelOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden"
          style={{ background: 'rgba(0,0,10,0.85)', backdropFilter: 'blur(12px)' }}
          onClick={e => { if (e.target === e.currentTarget) setAshPanel(false); }}>
          <div className="ml-auto w-80 h-full p-4 overflow-y-auto"
            style={{
              background: 'linear-gradient(135deg, rgba(10,20,40,0.98) 0%, rgba(5,10,20,0.99) 100%)',
              border: '1px solid rgba(0,200,255,0.15)',
            }}>
            <ASHAssistantPanel userName={userName} systemStats={{ totalSystems, building, active }} />
          </div>
        </div>
      )}
    </div>
  );
}
