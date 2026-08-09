import React, { useState, useEffect } from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { useAuth } from '@/contexts/AuthContext.jsx';
import ASHReactor from './ASHReactor.jsx';
import ASHAssistantPanel from './ASHAssistantPanel.jsx';
import bgUrl from '@/assets/cc-background.jpg';
import './command-center.css';

const authHeaders = () => {
  const t = localStorage.getItem('sbep_auth_token');
  return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : {};
};

/* ── Glass panel ─────────────────────────────────────────────────────── */
function GlassPanel({ children, className = '', style = {}, noBrackets = false }) {
  return (
    <div className={`relative rounded-xl overflow-hidden ${className}`}
      style={{
        background: 'linear-gradient(135deg, rgba(4,10,28,0.88) 0%, rgba(2,6,16,0.94) 100%)',
        border: '1px solid rgba(0,200,255,0.11)',
        boxShadow: '0 0 30px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)',
        backdropFilter: 'blur(24px)',
        ...style,
      }}>
      {!noBrackets && (
        <>
          {[['top-1.5 left-1.5 border-t border-l rounded-tl'],
            ['top-1.5 right-1.5 border-t border-r rounded-tr'],
            ['bottom-1.5 left-1.5 border-b border-l rounded-bl'],
            ['bottom-1.5 right-1.5 border-b border-r rounded-br'],
          ].map(([cls], i) => (
            <span key={i} className={`absolute w-2.5 h-2.5 pointer-events-none ${cls}`}
              style={{ borderColor: 'rgba(0,200,255,0.4)' }} />
          ))}
        </>
      )}
      {children}
    </div>
  );
}

/* ── Top navigation bar ──────────────────────────────────────────────── */
function TopBar({ userName }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(id); }, []);
  const hms  = time.toLocaleTimeString('en-US', { hour12: false });

  return (
    <div className="relative z-10 flex items-center justify-between px-3 h-10 shrink-0"
      style={{ background: 'rgba(0,3,12,0.72)', borderBottom: '1px solid rgba(0,200,255,0.07)', backdropFilter: 'blur(24px)' }}>

      {/* Left — logo + nav */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded flex items-center justify-center text-xs font-black"
            style={{ background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.5)', color: '#f59e0b' }}>◈</div>
          <div>
            <p className="text-[8px] uppercase tracking-[0.25em] leading-none" style={{ color: 'rgba(0,200,255,0.5)' }}>Starks Global Group</p>
            <p className="text-[9px] font-bold leading-none text-white/60" style={{ fontFamily: 'monospace', letterSpacing: '0.1em' }}>Command Center</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1 ml-2">
          {[
            { label: '⊛ Command Center', active: true },
            { label: '⚙ Builder',    path: '/builder'     },
            { label: '⊞ Marketplace', path: '/marketplace' },
            { label: '⬡ Analytics',  path: '/analytics'   },
            { label: '⌖ Operations', path: '/operations'  },
            { label: '◎ Finance',    path: '/finance'     },
            { label: '⚙ Settings',   path: '/settings'    },
          ].map(({ label, path, active }) => (
            <a key={label} href={path ?? '#'}
              className="px-2.5 py-1 rounded text-[9px] font-semibold uppercase tracking-wider transition-all hover:text-white/80"
              style={{
                color: active ? '#00c8ff' : 'rgba(255,255,255,0.35)',
                background: active ? 'rgba(0,200,255,0.1)' : 'transparent',
                border: active ? '1px solid rgba(0,200,255,0.2)' : '1px solid transparent',
              }}>
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* Right — status badges + clock */}
      <div className="flex items-center gap-2">
        <span className="hidden sm:block text-[9px] font-mono text-white/30">{hms}</span>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full"
          style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.28)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[8px] text-green-400 font-bold uppercase tracking-widest">System Status · Optimal</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full"
          style={{ background: 'rgba(0,200,255,0.08)', border: '1px solid rgba(0,200,255,0.22)' }}>
          <img src="https://horizons-cdn.hostinger.com/c23c9050-cfff-41bf-82a4-af121e0b4678/4c35c9e2294c3d0e16fb5ed3a74c5ddc.png"
            alt="" className="h-4 w-auto object-contain" />
          <span className="text-[8px] font-bold text-cyan-400 uppercase tracking-widest">ASH AI · Active</span>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

/* ── Custom recharts tooltip ─────────────────────────────────────────── */
const PerfTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="text-[9px] font-mono px-2 py-1 rounded"
      style={{ background: 'rgba(0,5,20,0.92)', border: '1px solid rgba(0,200,255,0.25)', color: '#00c8ff' }}>
      {payload[0].value}%
    </div>
  );
};

/* ── Performance chart ───────────────────────────────────────────────── */
function PerformancePanel({ data }) {
  const chartData = data?.length ? data
    : Array.from({ length: 20 }, (_, i) => ({ val: Math.round(78 + Math.sin(i * 0.7) * 13 + Math.random() * 7) }));
  return (
    <GlassPanel className="flex-1 p-2.5 flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[8px] uppercase tracking-[0.2em] font-bold" style={{ color: 'rgba(0,200,255,0.55)' }}>
          System Performance
        </p>
        <span className="text-[8px] text-white/25 uppercase tracking-wider">Real Time</span>
      </div>
      <div style={{ height: 58 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#00c8ff" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#00c8ff" stopOpacity={0}    />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="val" stroke="#00c8ff" strokeWidth={1.5} fill="url(#pg)" dot={false} />
            <Tooltip content={<PerfTip />} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-around pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        {[['CPU','98%','#00c8ff'],['MEMORY','96%','#8b5cf6'],['NETWORK','98%','#22c55e'],['STABILITY','100%','#f59e0b']].map(([l,v,c]) => (
          <div key={l} className="text-center">
            <p className="text-sm font-black font-mono" style={{ color: c, textShadow: `0 0 8px ${c}60` }}>{v}</p>
            <p className="text-[7px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>{l}</p>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}

/* ── Global ops map ──────────────────────────────────────────────────── */
function GlobalOpsPanel() {
  const dots = [
    ...Array.from({length:20},(_, i)=>({x:8+Math.random()*18,  y:16+Math.random()*24, b:Math.random()>0.4})),
    ...Array.from({length:12},(_, i)=>({x:20+Math.random()*10, y:44+Math.random()*24, b:Math.random()>0.5})),
    ...Array.from({length:18},(_, i)=>({x:42+Math.random()*10, y:12+Math.random()*20, b:Math.random()>0.3})),
    ...Array.from({length:14},(_, i)=>({x:44+Math.random()*10, y:36+Math.random()*26, b:Math.random()>0.55})),
    ...Array.from({length:26},(_, i)=>({x:58+Math.random()*22, y:12+Math.random()*30, b:Math.random()>0.35})),
    ...Array.from({length:8 },(_, i)=>({x:76+Math.random()*12, y:52+Math.random()*18, b:Math.random()>0.5})),
  ];
  return (
    <GlassPanel className="flex-1 p-2.5 flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[8px] uppercase tracking-[0.2em] font-bold" style={{ color: 'rgba(0,200,255,0.55)' }}>Global Operations</p>
      </div>
      <div className="relative rounded-lg overflow-hidden flex-1"
        style={{ background: 'rgba(0,8,28,0.6)', minHeight: 60 }}>
        {dots.map((d, i) => (
          <div key={i} className="absolute rounded-full"
            style={{
              left: `${d.x}%`, top: `${d.y}%`,
              width: d.b ? 2.5 : 1.5, height: d.b ? 2.5 : 1.5,
              background: d.b ? '#00c8ff' : 'rgba(0,200,255,0.2)',
              boxShadow: d.b ? '0 0 4px #00c8ff' : 'none',
              animation: d.b ? `cc-star ${1.5+Math.random()*3}s ease-in-out ${Math.random()*3}s infinite` : 'none',
            }} />
        ))}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-center">
          <p className="text-2xl font-black font-mono" style={{ color:'#00c8ff', textShadow:'0 0 20px rgba(0,200,255,0.8)' }}>128</p>
          <p className="text-[7px] uppercase tracking-widest text-white/30">Countries Active</p>
        </div>
      </div>
      <p className="text-center text-[8px] uppercase tracking-widest" style={{ color:'rgba(0,200,255,0.45)' }}>
        ● All Systems Operational
      </p>
    </GlassPanel>
  );
}

/* ── Active tasks ────────────────────────────────────────────────────── */
function ActiveTasksPanel({ systems }) {
  const tasks = systems.slice(0,5).map(s => ({
    name: s.name,
    color: {active:'#22c55e',building:'#f59e0b',completed:'#3b82f6',paused:'#8b5cf6',failed:'#ef4444',pending:'#6b7280'}[s.buildStatus]??'#6b7280',
    label: {active:'In Progress',building:'In Progress',completed:'Completed',paused:'Paused',failed:'Failed',pending:'Pending'}[s.buildStatus]??'Pending',
  }));
  if (!tasks.length) [
    {name:'Revenue Optimization',color:'#22c55e',label:'In Progress'},
    {name:'AI Content Generation',color:'#f59e0b',label:'In Progress'},
    {name:'System Sync',color:'#3b82f6',label:'Completed'},
    {name:'Marketplace Update',color:'#8b5cf6',label:'Pending'},
  ].forEach(t => tasks.push(t));
  return (
    <GlassPanel className="flex-1 p-2.5 flex flex-col gap-1.5">
      <p className="text-[8px] uppercase tracking-[0.2em] font-bold" style={{ color:'rgba(0,200,255,0.55)' }}>Active Tasks</p>
      <div className="flex-1 space-y-1.5 overflow-y-auto">
        {tasks.map((t,i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background:t.color, boxShadow:`0 0 4px ${t.color}` }} />
            <span className="text-[9px] text-white/60 flex-1 truncate">{t.name}</span>
            <span className="text-[8px] font-semibold shrink-0" style={{ color:t.color }}>{t.label}</span>
          </div>
        ))}
      </div>
      <button onClick={() => window.location.href='/systems'}
        className="w-full py-1.5 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all hover:brightness-125"
        style={{ background:'rgba(0,200,255,0.07)', border:'1px solid rgba(0,200,255,0.2)', color:'rgba(0,200,255,0.65)' }}>
        View All Tasks
      </button>
    </GlassPanel>
  );
}

/* ── Main dashboard ──────────────────────────────────────────────────── */
export default function CommandCenterDashboard() {
  const { currentUser } = useAuth();
  const [systems,   setSystems]   = useState([]);
  const [perfData,  setPerfData]  = useState([]);
  const [ashOpen,   setAshOpen]   = useState(false);

  useEffect(() => {
    fetch('/api/system-instances?limit=20&sort=updatedAt&order=desc', { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setSystems(Array.isArray(d) ? d : (d.data ?? [])))
      .catch(() => {});
    setPerfData(Array.from({length:20}, (_, i) => ({
      val: Math.round(80 + Math.sin(i * 0.65) * 12 + Math.random() * 6),
    })));
  }, []);

  const userName     = currentUser?.name?.split(' ')[0] ?? currentUser?.email?.split('@')[0] ?? 'Tyler';
  const totalSystems = systems.length;
  const building     = systems.filter(s => s.buildStatus === 'building').length;
  const active       = systems.filter(s => s.buildStatus === 'active').length;

  return (
    <div className="flex flex-col w-full overflow-hidden"
      style={{ height: '100%', minHeight: '100vh', fontFamily: "'Inter','SF Pro Display',system-ui,sans-serif" }}>

      {/* ── Background ── */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        {/* Cinematic city background */}
        <img src={bgUrl} alt="" className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.45, filter: 'saturate(1.3) brightness(0.6)' }} />
        {/* Dark gradient overlay */}
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(0,10,40,0.55) 0%, rgba(0,0,8,0.88) 70%, rgba(0,0,2,0.97) 100%)' }} />
        {/* Bottom vignette */}
        <div className="absolute bottom-0 left-0 right-0 h-48"
          style={{ background: 'linear-gradient(to top, rgba(0,0,5,0.95) 0%, transparent 100%)' }} />
        {/* Ambient blue glow center */}
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ width:500, height:400, background:'radial-gradient(ellipse,rgba(0,60,180,0.12) 0%,transparent 70%)',
            animation:'cc-glow 8s ease-in-out infinite' }} />
      </div>

      {/* ── Top bar ── */}
      <TopBar userName={userName} />

      {/* ── Main body ── */}
      <div className="relative z-10 flex-1 flex gap-2 px-2 pt-2 min-h-0 overflow-hidden">

        {/* CENTER — Reactor (fills remaining space) */}
        <div className="flex-1 flex flex-col gap-2 min-w-0 min-h-0">

          {/* Stats ribbon */}
          <div className="flex gap-2 shrink-0">
            {[
              {label:'Projects',  val:totalSystems, color:'#00c8ff'},
              {label:'Building',  val:building,     color:'#f59e0b'},
              {label:'Live',      val:active,        color:'#22c55e'},
              {label:'AI Active', val:'100%',        color:'#8b5cf6'},
            ].map(({label,val,color}) => (
              <GlassPanel key={label} noBrackets className="flex-1 py-1.5 px-2 text-center">
                <p className="text-base font-black font-mono" style={{ color, textShadow:`0 0 10px ${color}55` }}>{val}</p>
                <p className="text-[7px] uppercase tracking-wider" style={{ color:`${color}80` }}>{label}</p>
              </GlassPanel>
            ))}
          </div>

          {/* Canvas reactor */}
          <div className="flex-1 min-h-0">
            <ASHReactor systems={systems} onOpenASH={() => setAshOpen(true)} />
          </div>
        </div>

        {/* RIGHT — ASH panel */}
        <div className="shrink-0 hidden lg:block" style={{ width: 258 }}>
          <GlassPanel className="h-full p-3.5"
            style={{ border:'1px solid rgba(0,200,255,0.16)' }}>
            <ASHAssistantPanel userName={userName} systemStats={{ totalSystems, building, active }} />
          </GlassPanel>
        </div>
      </div>

      {/* ── Bottom metrics ── */}
      <div className="relative z-10 flex gap-2 px-2 pb-2 pt-1 shrink-0" style={{ height: 155 }}>
        <PerformancePanel data={perfData} />
        <GlobalOpsPanel />
        <ActiveTasksPanel systems={systems} />
      </div>

      {/* Mobile ASH drawer */}
      {ashOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden items-end"
          style={{ background:'rgba(0,0,10,0.88)', backdropFilter:'blur(14px)' }}
          onClick={e => { if (e.target===e.currentTarget) setAshOpen(false); }}>
          <div className="w-full max-h-[80vh] overflow-y-auto rounded-t-2xl p-4"
            style={{ background:'rgba(4,10,28,0.98)', border:'1px solid rgba(0,200,255,0.18)',
              borderBottom:'none' }}>
            <ASHAssistantPanel userName={userName} systemStats={{ totalSystems, building, active }} />
          </div>
        </div>
      )}
    </div>
  );
}
