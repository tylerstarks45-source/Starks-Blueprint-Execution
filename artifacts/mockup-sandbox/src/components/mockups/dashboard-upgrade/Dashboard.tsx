import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, Tooltip } from 'recharts';

const areaData = [
  { t: '00:00', v: 72 }, { t: '04:00', v: 68 }, { t: '08:00', v: 85 },
  { t: '12:00', v: 91 }, { t: '16:00', v: 88 }, { t: '20:00', v: 96 }, { t: '24:00', v: 99 },
];
const pieData = [
  { name: 'Subscriptions', value: 50.1, color: '#38bdf8' },
  { name: 'Usage Based', value: 27.1, color: '#8b5cf6' },
  { name: 'Marketplace', value: 13.8, color: '#10b981' },
  { name: 'Integrations', value: 9.0, color: '#f59e0b' },
];
const agents = [
  { name: 'ALPHA-7', pct: 98.7 }, { name: 'BETA-3', pct: 97.1 },
  { name: 'GAMMA-2', pct: 96.3 }, { name: 'DELTA-5', pct: 94.8 }, { name: 'EPSILON-1', pct: 93.2 },
];
const activity = [
  { agent: 'AI Agent ALPHA-7', action: 'Market analysis completed', ago: '2 sec ago' },
  { agent: 'System Builder', action: 'New deployment generated', ago: '15 sec ago' },
  { agent: 'AI Agent BETA-3', action: 'Data pipeline optimized', ago: '32 sec ago' },
  { agent: 'Marketplace', action: 'New blueprint uploaded', ago: '1 min ago' },
  { agent: 'AI Agent GAMMA-2', action: 'Predictive model updated', ago: '2 min ago' },
];
const navItems = [
  { label: 'Dashboard', sub: 'Overview & Analytics', active: true },
  { label: 'Builder', sub: 'AI System Builder' },
  { label: 'AI Agents', sub: 'Autonomous Workforce' },
  { label: 'Connections', sub: 'Integrations & APIs', arrow: true },
  { label: 'My Systems', sub: 'Deployed Systems', arrow: true },
  { label: 'Marketplace', sub: 'System Exchange' },
  { label: 'Blueprints', sub: 'Architect Templates' },
  { label: 'Social Command', sub: 'Network & Signals', arrow: true },
  { label: 'Analytics Core', sub: 'Deep Intelligence', arrow: true },
  { label: 'Logs & Monitoring', sub: 'Real-time Telemetry', arrow: true },
];
const shortcuts = [
  { label: 'Deploy New System' }, { label: 'Run AI Simulation' },
  { label: 'Global Scan' }, { label: 'Security Nexus' },
];

const Gauge = ({ pct, color, size = 80, stroke = 7 }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (Math.min(100, pct) / 100) * c;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'Space Mono', fontWeight: 700, fontSize: size < 70 ? 11 : 16, color, lineHeight: 1 }}>{pct}</span>
        {size >= 70 && <span style={{ fontSize: 7, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>HEALTH</span>}
      </div>
    </div>
  );
};

const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.035)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
};

export function Dashboard() {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'linear-gradient(135deg,#020810 0%,#030b1a 50%,#020810 100%)', color: '#fff', fontFamily: "'Outfit',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Outfit:wght@400;500;600;700;800&display=swap');
        ::-webkit-scrollbar{width:4px;background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
      `}</style>

      {/* ── SIDEBAR ── */}
      <aside style={{ width: 162, flexShrink: 0, display: 'flex', flexDirection: 'column', background: 'rgba(2,6,18,0.97)', borderRight: '1px solid rgba(255,255,255,0.07)' }}>
        {/* Logo */}
        <div style={{ padding: '14px 12px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#38bdf8,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Space Mono', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>S</div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, fontFamily: 'Outfit', color: 'rgba(255,255,255,0.9)', letterSpacing: '0.04em', lineHeight: 1.2 }}>STRATOS</div>
            <div style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.3)', fontFamily: 'Space Mono' }}>GLOBAL</div>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 16, color: 'rgba(255,255,255,0.2)', cursor: 'pointer' }}>⚡</span>
        </div>

        {/* Nav */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          <div style={{ padding: '5px 12px 3px', fontSize: 8.5, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Command Center</div>
          {navItems.map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', background: item.active ? 'rgba(56,189,248,0.1)' : 'transparent', borderLeft: item.active ? '2px solid #38bdf8' : '2px solid transparent', cursor: 'pointer' }}>
              <div style={{ width: 13, height: 13, borderRadius: 3, background: item.active ? '#38bdf8' : 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10.5, fontFamily: 'Outfit', fontWeight: item.active ? 700 : 500, color: item.active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</div>
                <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', fontFamily: 'Outfit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.sub}</div>
              </div>
              {item.arrow && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)' }}>›</span>}
            </div>
          ))}

          <div style={{ padding: '10px 12px 3px', fontSize: 8.5, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 4 }}>System Shortcuts</div>
          {shortcuts.map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 12px', cursor: 'pointer' }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>+</span>
              <span style={{ fontSize: 10, fontFamily: 'Outfit', color: 'rgba(255,255,255,0.38)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Bottom AI status */}
        <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(56,189,248,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>🤖</div>
            <div>
              <div style={{ fontSize: 10, fontFamily: 'Outfit', fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>STRATOS AI</div>
              <div style={{ fontSize: 8, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.3)' }}>v4.0.0 QUANTUM</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 5 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 5px #10b981', display: 'inline-block' }} />
            <span style={{ fontSize: 9, fontFamily: 'Space Mono', color: '#10b981' }}>Active</span>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top bar */}
        <header style={{ padding: '9px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(2,6,20,0.85)', backdropFilter: 'blur(12px)', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 17, fontFamily: 'Outfit', fontWeight: 800, color: 'rgba(255,255,255,0.95)', letterSpacing: '-0.02em', lineHeight: 1 }}>DASHBOARD</div>
            <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.3)' }}>Command Overview</div>
          </div>
          <div style={{ flex: 1, maxWidth: 380 }}>
            <div style={{ padding: '6px 36px 6px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'Outfit', position: 'relative' }}>
              Search systems, tools, or data...
              <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 9, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', padding: '1px 4px', borderRadius: 3 }}>⌘K</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 5, marginLeft: 'auto' }}>
            {['📅','📷','⏰'].map((ic,i) => (
              <div key={i} style={{ width: 30, height: 30, borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>{ic}</div>
            ))}
            <div style={{ width: 30, height: 30, borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, position: 'relative' }}>
              🔔
              <span style={{ position: 'absolute', top: 3, right: 3, width: 6, height: 6, borderRadius: '50%', background: '#ef4444', border: '1px solid rgba(2,6,20,0.9)' }} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }}>
            <div>
              <div style={{ fontSize: 10.5, fontFamily: 'Outfit', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>System Architect</div>
              <div style={{ fontSize: 8.5, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.3)' }}>Level 99 ★</div>
            </div>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#38bdf8,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>T</div>
          </div>
        </header>

        {/* Scrollable content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* KPI Row - 5 cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 9 }}>
            {[
              { label: 'TOTAL REVENUE', val: '$248,392.00', badge: '+12.5%', color: '#10b981', spark: [60,70,65,80,90,85,95] },
              { label: 'ACTIVE SYSTEMS', val: '24', badge: '+4', color: '#38bdf8', spark: [10,14,18,20,22,22,24] },
              { label: 'AI CREDITS', val: '1.2M', badge: '+18.3%', color: '#8b5cf6', spark: [400,600,800,900,1000,1100,1200] },
              { label: 'TOTAL AGENTS', val: '120', badge: '+15.2%', color: '#f59e0b', spark: [80,85,90,100,108,115,120] },
              { label: 'UPTIME', val: null, badge: 'OPTIMAL', color: '#10b981', gauge: 99.9 },
            ].map((k, i) => (
              <div key={i} style={{ ...card, padding: '12px 13px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 7, right: 8, fontSize: 10, color: 'rgba(255,255,255,0.2)', cursor: 'pointer' }}>×</div>
                <div style={{ fontSize: 8.5, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{k.label}</div>
                {k.gauge ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <Gauge pct={k.gauge} color={k.color} size={56} stroke={5} />
                    <div>
                      <div style={{ fontSize: 14, fontFamily: 'Space Mono', fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.gauge}%</div>
                      <div style={{ fontSize: 7.5, fontFamily: 'Space Mono', color: k.color, marginTop: 2 }}>OPTIMAL</div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: i === 0 ? 17 : 24, fontFamily: 'Space Mono', fontWeight: 700, color: k.color, marginTop: 5, lineHeight: 1 }}>{k.val}</div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 4, padding: '1px 5px', borderRadius: 4, background: `${k.color}18`, fontSize: 8.5, fontFamily: 'Space Mono', color: k.color }}>{k.badge}</div>
                    <svg viewBox={`0 0 80 24`} style={{ width: '100%', height: 24, marginTop: 6 }} preserveAspectRatio="none">
                      {k.spark.map((v, j, arr) => {
                        if (j === 0) return null;
                        const max = Math.max(...arr); const min = Math.min(...arr);
                        const x1 = ((j-1)/(arr.length-1))*80; const y1 = 24-2-((arr[j-1]-min)/(max-min||1))*20;
                        const x2 = (j/(arr.length-1))*80; const y2 = 24-2-((v-min)/(max-min||1))*20;
                        return <line key={j} x1={x1} y1={y1} x2={x2} y2={y2} stroke={k.color} strokeWidth="1.5" strokeOpacity="0.7" />;
                      })}
                    </svg>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Row 2: Global Overview + System Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 248px', gap: 10 }}>
            {/* Global System Overview */}
            <div style={{ ...card, overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 11, fontFamily: 'Outfit', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>GLOBAL SYSTEM OVERVIEW</div>
                  <div style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.3)', fontFamily: 'Outfit' }}>Real-time operational intelligence across all deployed systems</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                  <span style={{ fontSize: 8, fontFamily: 'Space Mono', color: '#10b981' }}>LIVE FEED</span>
                </div>
              </div>
              <div style={{ padding: '10px 14px', display: 'flex', gap: 16, alignItems: 'center' }}>
                {/* World map SVG */}
                <div style={{ flex: 1 }}>
                  <svg viewBox="0 0 480 200" style={{ width: '100%' }}>
                    <defs>
                      <radialGradient id="g1" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                      </radialGradient>
                    </defs>
                    <ellipse cx="240" cy="100" rx="110" ry="92" fill="url(#g1)" />
                    <ellipse cx="240" cy="100" rx="110" ry="92" fill="none" stroke="rgba(56,189,248,0.2)" strokeWidth="1" />
                    {[-60,-30,0,30,60].map(lat => { const y=100+(lat/90)*88; const rx=Math.cos(lat*Math.PI/180)*110; return <ellipse key={lat} cx="240" cy={y} rx={rx} ry="6" fill="none" stroke="rgba(56,189,248,0.07)" strokeWidth="0.5" />; })}
                    {[0,36,72,108,144].map(lon => <ellipse key={lon} cx="240" cy="100" rx="8" ry="88" fill="none" stroke="rgba(56,189,248,0.07)" strokeWidth="0.5" transform={`rotate(${lon} 240 100)`} />)}
                    {/* Continents */}
                    <path d="M155 60 C145 55 132 60 130 70 C128 82 136 95 148 102 C158 108 165 118 162 130 C160 140 152 144 147 141 C140 137 135 128 137 118 C139 110 150 108 154 100 C162 88 168 72 155 60Z" fill="rgba(56,189,248,0.22)" stroke="rgba(56,189,248,0.5)" strokeWidth="0.8" />
                    <path d="M180 130 C173 124 164 126 162 133 C160 142 167 152 172 160 C176 167 178 178 174 186 C171 192 167 193 169 198 C172 203 181 200 186 194 C192 185 192 170 189 158 C187 148 186 140 180 130Z" fill="rgba(56,189,248,0.18)" stroke="rgba(56,189,248,0.4)" strokeWidth="0.8" />
                    <path d="M248 50 C241 47 234 50 232 57 C230 65 235 72 241 74 C247 77 254 74 257 67 C260 59 255 52 248 50Z" fill="rgba(56,189,248,0.24)" stroke="rgba(56,189,248,0.5)" strokeWidth="0.8" />
                    <path d="M250 82 C241 80 234 83 232 92 C230 103 234 116 239 128 C242 137 243 148 241 160 C239 170 237 179 240 187 C244 194 251 196 258 192 C265 188 268 177 266 165 C264 153 258 140 256 126 C254 113 258 98 256 88 C255 82 252 82 250 82Z" fill="rgba(56,189,248,0.2)" stroke="rgba(56,189,248,0.42)" strokeWidth="0.8" />
                    <path d="M274 52 C265 48 256 50 258 61 C260 68 269 70 278 68 C295 64 310 58 318 62 C327 66 330 75 337 79 C344 84 350 82 352 74 C354 65 346 54 334 48 C318 41 294 54 274 52Z" fill="rgba(56,189,248,0.2)" stroke="rgba(56,189,248,0.42)" strokeWidth="0.8" />
                    <circle cx="240" cy="100" r="6" fill="rgba(56,189,248,0.5)" />
                    <circle cx="240" cy="100" r="18" fill="none" stroke="rgba(56,189,248,0.15)" strokeWidth="1" />
                    {[{cx:170,cy:80},{cx:290,cy:65},{cx:330,cy:90},{cx:200,cy:150},{cx:340,cy:130}].map((p,i)=>(
                      <circle key={i} cx={p.cx} cy={p.cy} r="2.5" fill="#10b981" opacity="0.8" />
                    ))}
                  </svg>
                </div>
                {/* Regional stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 18px', flexShrink: 0 }}>
                  {[
                    { r: 'NORTH AMERICA', p: '98.6%' }, { r: 'SOUTH AMERICA', p: '96.7%' },
                    { r: 'EUROPE', p: '97.8%' }, { r: 'AFRICA', p: '95.4%' },
                    { r: 'ASIA PACIFIC', p: '99.2%' }, { r: 'MIDDLE EAST', p: '97.1%' },
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
              <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 10.5, fontFamily: 'Outfit', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>SYSTEM STATUS</div>
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', fontFamily: 'Outfit' }}>All systems operational</div>
                </div>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', cursor: 'pointer' }}>×</span>
              </div>
              <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <Gauge pct={100} color="#10b981" size={86} stroke={8} />
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {['Core Engine','AI Models','Database','Security','Network','Quantum Link'].map(name => (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 4px #10b981', display: 'inline-block' }} />
                        <span style={{ fontSize: 9.5, fontFamily: 'Outfit', color: 'rgba(255,255,255,0.6)' }}>{name}</span>
                      </div>
                      <span style={{ fontSize: 8.5, fontFamily: 'Space Mono', color: '#10b981' }}>Optimal</span>
                    </div>
                  ))}
                </div>
                <div style={{ width: '100%', padding: '4px 8px', background: 'rgba(16,185,129,0.06)', borderRadius: 6, fontSize: 8, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
                  Last scan: 2 sec ago
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Revenue Streams + Agent Performance + Deployments */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {/* Revenue Streams */}
            <div style={{ ...card, overflow: 'hidden' }}>
              <div style={{ padding: '9px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 10.5, fontFamily: 'Outfit', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>REVENUE STREAMS</div>
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>Real-time financial analytics</div>
                </div>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>×</span>
              </div>
              <div style={{ padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ position: 'relative', width: 88, height: 88, flexShrink: 0 }}>
                  <ResponsiveContainer width={88} height={88}>
                    <PieChart>
                      <Pie data={pieData} cx={44} cy={44} innerRadius={26} outerRadius={42} dataKey="value" stroke="none">
                        {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 9.5, fontFamily: 'Space Mono', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>$248.4K</span>
                    <span style={{ fontSize: 6.5, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.3)' }}>Total</span>
                  </div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {pieData.map(r => (
                    <div key={r.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 5, height: 5, borderRadius: 1.5, background: r.color, display: 'inline-block' }} />
                        <span style={{ fontSize: 8.5, fontFamily: 'Outfit', color: 'rgba(255,255,255,0.5)' }}>{r.name}</span>
                      </div>
                      <span style={{ fontSize: 8.5, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.3)' }}>{r.value}%</span>
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
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>Top performing autonomous agents</div>
                </div>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>×</span>
              </div>
              <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {agents.map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 8.5, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.35)', minWidth: 10, textAlign: 'right' }}>{i+1}</span>
                    <div style={{ width: 20, height: 20, borderRadius: 5, background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, flexShrink: 0 }}>🤖</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontSize: 9.5, fontFamily: 'Outfit', color: 'rgba(255,255,255,0.75)' }}>{a.name}</span>
                        <span style={{ fontSize: 9, fontFamily: 'Space Mono', fontWeight: 700, color: '#38bdf8' }}>{a.pct}%</span>
                      </div>
                      <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${a.pct}%`, height: '100%', background: 'linear-gradient(90deg,#38bdf8,#6366f1)', borderRadius: 2 }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* System Deployments */}
            <div style={{ ...card, overflow: 'hidden' }}>
              <div style={{ padding: '9px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 10.5, fontFamily: 'Outfit', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>SYSTEM DEPLOYMENTS</div>
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>Deployment status across regions</div>
                </div>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>×</span>
              </div>
              <div style={{ padding: '8px 12px' }}>
                <div style={{ width: '100%', height: 64, background: 'rgba(56,189,248,0.04)', borderRadius: 8, border: '1px solid rgba(56,189,248,0.1)', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  <svg viewBox="0 0 200 60" style={{ width: '100%', height: '100%' }}>
                    <ellipse cx="100" cy="30" rx="65" ry="22" fill="none" stroke="rgba(56,189,248,0.2)" strokeWidth="0.5" />
                    {[20,42,65,85,110,135,160,178].map((cx,i)=>(
                      <circle key={i} cx={cx} cy={22+Math.sin(i)*8} r="1.5" fill="#38bdf8" opacity="0.7" />
                    ))}
                    {[30,70,110,150].map((cx,i)=>(
                      <circle key={i} cx={cx} cy={35+Math.cos(i)*5} r="2.5" fill="#10b981" opacity="0.9" />
                    ))}
                  </svg>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                  {[
                    { label: 'Deployed', val: '24', color: 'rgba(255,255,255,0.9)' },
                    { label: 'In Progress', val: '5', color: '#38bdf8' },
                    { label: 'Failed', val: '0', color: 'rgba(255,255,255,0.3)' },
                    { label: 'Success Rate', val: '99.2%', color: '#10b981' },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: 'center', padding: '5px', background: 'rgba(255,255,255,0.03)', borderRadius: 7 }}>
                      <div style={{ fontSize: 16, fontFamily: 'Space Mono', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.val}</div>
                      <div style={{ fontSize: 7.5, fontFamily: 'Outfit', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Row 4: Analytics + Activity Feed + Terminal */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 248px', gap: 10 }}>
            {/* System Performance Analytics */}
            <div style={{ ...card, overflow: 'hidden' }}>
              <div style={{ padding: '9px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 10.5, fontFamily: 'Outfit', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>SYSTEM PERFORMANCE ANALYTICS</div>
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>Deep performance insights and predictive analytics</div>
                </div>
                <span style={{ fontSize: 9, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.3)', padding: '2px 8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6 }}>24 Hours ▾</span>
              </div>
              <div style={{ display: 'flex' }}>
                <div style={{ flex: 1, padding: '8px 14px', height: 110 }}>
                  <ResponsiveContainer width="100%" height={95}>
                    <AreaChart data={areaData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="ag1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="ag2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="2 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="t" tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 8, fontFamily: 'Space Mono' }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 10, fontFamily: 'Space Mono' }} />
                      <Area type="monotone" dataKey="v" stroke="#38bdf8" strokeWidth={2} fill="url(#ag1)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ width: 130, padding: '10px 12px', borderLeft: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5 }}>
                  <div style={{ fontSize: 8, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Performance Score</div>
                  <div style={{ fontSize: 26, fontFamily: 'Space Mono', fontWeight: 700, color: '#10b981', lineHeight: 1 }}>98.7<span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>/100</span></div>
                  <div style={{ fontSize: 9.5, fontFamily: 'Outfit', color: '#10b981', fontWeight: 600 }}>Excellent</div>
                  <div style={{ padding: '5px 7px', background: 'rgba(16,185,129,0.08)', borderRadius: 7, border: '1px solid rgba(16,185,129,0.15)', marginTop: 2 }}>
                    <div style={{ fontSize: 8, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.35)' }}>Predictive Insight</div>
                    <div style={{ fontSize: 8.5, fontFamily: 'Outfit', color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>All systems trending optimal</div>
                    <div style={{ fontSize: 7.5, fontFamily: 'Outfit', color: 'rgba(255,255,255,0.25)', marginTop: 1 }}>No action required</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Activity Feed + Terminal */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Activity Feed */}
              <div style={{ ...card, overflow: 'hidden', flex: 1 }}>
                <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 9.5, fontFamily: 'Outfit', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>AI ACTIVITY FEED</div>
                    <div style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.3)' }}>Real-time agent coordination</div>
                  </div>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>×</span>
                </div>
                <div style={{ padding: '6px 12px' }}>
                  {activity.map((a, i) => (
                    <div key={i} style={{ display: 'flex', gap: 7, padding: '4px 0', borderBottom: i < activity.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                      <div style={{ width: 20, height: 20, borderRadius: 5, background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, flexShrink: 0 }}>🤖</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 9, fontFamily: 'Outfit', color: 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.agent}</div>
                        <div style={{ fontSize: 8, fontFamily: 'Outfit', color: 'rgba(255,255,255,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.action}</div>
                      </div>
                      <span style={{ fontSize: 7.5, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>{a.ago}</span>
                    </div>
                  ))}
                </div>
                <div style={{ padding: '4px 12px', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', fontSize: 8, fontFamily: 'Space Mono', color: '#38bdf8', cursor: 'pointer', background: 'rgba(56,189,248,0.04)' }}>
                  View All Activity →
                </div>
              </div>

              {/* Command Terminal */}
              <div style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(56,189,248,0.18)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '7px 12px', borderBottom: '1px solid rgba(56,189,248,0.12)', display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 9.5, fontFamily: 'Outfit', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>QUANTUM COMMAND TERMINAL</div>
                    <div style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.3)' }}>Advanced system control</div>
                  </div>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>×</span>
                </div>
                <div style={{ padding: '6px 12px', fontFamily: 'Space Mono', fontSize: 8, color: 'rgba(56,189,248,0.85)', lineHeight: 1.8 }}>
                  <div><span style={{ color: '#10b981' }}>›</span> QUANTUM LINK ESTABLISHED</div>
                  <div><span style={{ color: '#10b981' }}>›</span> ACCESS LEVEL: MAXIMUM</div>
                  <div><span style={{ color: '#10b981' }}>›</span> SYSTEM OVERRIDE: ENABLED</div>
                  <div><span style={{ color: '#10b981' }}>›</span> Quantum Entanglement: ACTIVE</div>
                  <div style={{ color: 'rgba(255,255,255,0.3)' }}><span style={{ color: '#38bdf8' }}>›</span> Processing at Light Speed...</div>
                </div>
                <div style={{ padding: '4px 12px', borderTop: '1px solid rgba(56,189,248,0.1)', background: 'rgba(56,189,248,0.05)' }}>
                  <div style={{ fontSize: 7.5, fontFamily: 'Space Mono', color: '#10b981' }}>▸ READY FOR COMMAND INPUT</div>
                </div>
                <div style={{ padding: '5px 12px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 8, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.25)', flex: 1 }}>Enter advanced commands...</span>
                  <div style={{ padding: '2px 8px', background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 5, fontSize: 8, fontFamily: 'Space Mono', color: '#38bdf8', cursor: 'pointer' }}>EXECUTE</div>
                </div>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
