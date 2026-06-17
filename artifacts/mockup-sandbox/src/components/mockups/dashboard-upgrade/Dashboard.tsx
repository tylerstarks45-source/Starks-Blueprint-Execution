import React from 'react';
import {
  PieChart, Pie, Cell,
  ResponsiveContainer, AreaChart, Area,
  CartesianGrid, XAxis, YAxis, Tooltip, LineChart, Line, Legend,
} from 'recharts';

/* ─── FONTS ─────────────────────────────────────────────────── */
const fonts = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Outfit:wght@300;400;500;600;700;800&display=swap');
  ::-webkit-scrollbar{width:4px;background:transparent}
  ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:2px}
`;

/* ─── PALETTE ────────────────────────────────────────────────── */
const P = {
  bg:        '#020810',
  bgAlt:     '#030c1a',
  sidebar:   '#010810',
  card:      'rgba(255,255,255,0.028)',
  border:    'rgba(255,255,255,0.075)',
  cyan:      '#38bdf8',
  violet:    '#8b5cf6',
  green:     '#10b981',
  amber:     '#f59e0b',
  text:      'rgba(255,255,255,0.88)',
  textMid:   'rgba(255,255,255,0.48)',
  textDim:   'rgba(255,255,255,0.22)',
};

const card: React.CSSProperties = {
  background: P.card,
  border: `1px solid ${P.border}`,
  borderRadius: 12,
  overflow: 'hidden',
};

/* ─── GAUGE ──────────────────────────────────────────────────── */
function Gauge({ pct, color, size = 80, stroke = 7 }: { pct: number; color: string; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'Space Mono', fontWeight: 700, fontSize: size < 70 ? 11 : 18, color, lineHeight: 1 }}>{pct}%</span>
        {size >= 70 && <span style={{ fontSize: 7, fontFamily: 'Space Mono', color: P.textDim, marginTop: 2 }}>HEALTH</span>}
      </div>
    </div>
  );
}

/* ─── DATA ───────────────────────────────────────────────────── */
const pieData = [
  { name: 'Subscriptions', val: '$124.3K', pct: 50.7, color: '#38bdf8' },
  { name: 'Usage Based',   val: '$68.7K',  pct: 27.7, color: '#8b5cf6' },
  { name: 'Marketplace',   val: '$34.2K',  pct: 13.8, color: '#10b981' },
  { name: 'Integrations',  val: '$21.2K',  pct: 8.4,  color: '#f59e0b' },
];
const agents = [
  { name: 'ALPHA-7',   pct: 98.7 },
  { name: 'BETA-3',    pct: 97.1 },
  { name: 'GAMMA-2',   pct: 96.3 },
  { name: 'DELTA-5',   pct: 94.8 },
  { name: 'EPSILON-1', pct: 93.2 },
];
const activity = [
  { agent: 'AI Agent ALPHA-7', action: 'Market analysis completed',    ago: '2 sec ago',  color: '#38bdf8' },
  { agent: 'System Builder',   action: 'New deployment generated',     ago: '15 sec ago', color: '#10b981' },
  { agent: 'AI Agent BETA-3',  action: 'Data pipeline optimized',      ago: '32 sec ago', color: '#8b5cf6' },
  { agent: 'Marketplace',      action: 'New blueprint uploaded',        ago: '1 min ago',  color: '#f59e0b' },
  { agent: 'AI Agent GAMMA-2', action: 'Predictive model updated',     ago: '2 min ago',  color: '#38bdf8' },
];
const chartData = [
  { t: '00:00', e: 72,  m: 58,  p: 64,  th: 48  },
  { t: '02:00', e: 68,  m: 62,  p: 70,  th: 55  },
  { t: '04:00', e: 65,  m: 60,  p: 58,  th: 52  },
  { t: '06:00', e: 80,  m: 71,  p: 75,  th: 63  },
  { t: '08:00', e: 88,  m: 76,  p: 82,  th: 74  },
  { t: '10:00', e: 85,  m: 80,  p: 88,  th: 78  },
  { t: '12:00', e: 91,  m: 85,  p: 90,  th: 83  },
  { t: '14:00', e: 89,  m: 82,  p: 86,  th: 80  },
  { t: '16:00', e: 94,  m: 88,  p: 92,  th: 87  },
  { t: '18:00', e: 92,  m: 86,  p: 89,  th: 84  },
  { t: '20:00', e: 96,  m: 91,  p: 94,  th: 90  },
  { t: '22:00', e: 98,  m: 93,  p: 96,  th: 92  },
  { t: '24:00', e: 99,  m: 95,  p: 97,  th: 94  },
];
const navItems = [
  { label: 'Dashboard',       sub: 'Overview & Analytics', active: true  },
  { label: 'Builder',         sub: 'AI System Builder'                   },
  { label: 'AI Agents',       sub: 'Autonomous Workforce'                },
  { label: 'Connections',     sub: 'Integrations & APIs',  arrow: true   },
  { label: 'My Systems',      sub: 'Deployed Systems',     arrow: true   },
  { label: 'Marketplace',     sub: 'System Exchange'                     },
  { label: 'Blueprints',      sub: 'Architect Templates'                 },
  { label: 'Social Command',  sub: 'Network & Signals',    arrow: true   },
  { label: 'Analytics Core',  sub: 'Deep Intelligence',    arrow: true   },
  { label: 'Logs & Monitoring', sub: 'Real-time Telemetry', arrow: true  },
];
const shortcuts = ['Deploy New System', 'Run AI Simulation', 'Global Scan', 'Security Nexus'];

/* ─── GLOBE SVG ──────────────────────────────────────────────── */
function Globe() {
  const cx = 220, cy = 120, r = 100;
  const latLines = [-60, -40, -20, 0, 20, 40, 60];
  const lonCount = 12;
  return (
    <svg viewBox="0 0 440 240" style={{ width: '100%', height: '100%' }}>
      <defs>
        {/* outer space glow */}
        <radialGradient id="spaceGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#0ea5e9" stopOpacity="0.12" />
          <stop offset="60%"  stopColor="#0369a1" stopOpacity="0.04" />
          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
        </radialGradient>
        {/* sphere body */}
        <radialGradient id="sphereFill" cx="35%" cy="30%" r="65%">
          <stop offset="0%"   stopColor="#1e4a7a" stopOpacity="0.9" />
          <stop offset="50%"  stopColor="#0c2a4a" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#050f1e" stopOpacity="1"   />
        </radialGradient>
        {/* highlight */}
        <radialGradient id="highlight" cx="30%" cy="25%" r="40%">
          <stop offset="0%"   stopColor="#38bdf8" stopOpacity="0.25" />
          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
        </radialGradient>
        {/* rim glow */}
        <filter id="rimGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="nodeGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <clipPath id="sphereClip">
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>

      {/* space background glow */}
      <ellipse cx={cx} cy={cy} rx={r*1.8} ry={r*1.6} fill="url(#spaceGlow)" />

      {/* outer ring */}
      <circle cx={cx} cy={cy} r={r+18} fill="none" stroke="rgba(56,189,248,0.06)" strokeWidth="1" strokeDasharray="4 6" />
      <circle cx={cx} cy={cy} r={r+32} fill="none" stroke="rgba(56,189,248,0.04)" strokeWidth="0.5" />

      {/* sphere */}
      <circle cx={cx} cy={cy} r={r} fill="url(#sphereFill)" />
      <circle cx={cx} cy={cy} r={r} fill="url(#highlight)" />

      {/* latitude lines */}
      <g clipPath="url(#sphereClip)" stroke="rgba(56,189,248,0.18)" strokeWidth="0.5" fill="none">
        {latLines.map(lat => {
          const y = cy + (lat / 90) * r;
          const rx2 = Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy)));
          return <ellipse key={lat} cx={cx} cy={y} rx={rx2} ry={rx2 * 0.25} />;
        })}
        {/* longitude arcs */}
        {Array.from({ length: lonCount }, (_, i) => {
          const angle = (i / lonCount) * 180;
          return <ellipse key={i} cx={cx} cy={cy} rx={r * 0.18} ry={r} transform={`rotate(${angle} ${cx} ${cy})`} />;
        })}
      </g>

      {/* continents */}
      <g clipPath="url(#sphereClip)" fill="rgba(56,189,248,0.18)" stroke="rgba(56,189,248,0.45)" strokeWidth="0.7">
        {/* North America */}
        <path d="M148 62 C140 58 128 63 126 73 C124 85 132 98 144 106 C154 113 160 124 157 136 C155 146 147 150 142 147 C135 143 130 134 132 124 C134 115 145 114 149 106 C157 93 163 76 148 62Z" />
        {/* South America */}
        <path d="M176 136 C169 130 160 132 158 140 C156 150 163 161 168 170 C172 178 174 189 170 197 C167 203 162 204 164 209 C167 215 176 212 181 205 C188 195 187 178 184 165 C182 154 182 146 176 136Z" />
        {/* Europe */}
        <path d="M230 52 C223 49 216 52 214 59 C212 67 217 74 223 76 C229 79 236 76 239 69 C242 61 237 54 230 52Z" />
        {/* Africa */}
        <path d="M232 86 C223 84 216 87 214 97 C212 108 216 122 221 134 C224 143 225 155 223 167 C221 177 219 186 222 194 C226 202 233 204 240 200 C247 196 250 184 248 172 C246 160 240 146 238 132 C236 118 240 102 238 91 C237 85 234 85 232 86Z" />
        {/* Asia */}
        <path d="M256 54 C247 50 238 52 240 63 C242 70 251 72 260 70 C277 66 292 60 300 64 C309 68 312 77 319 81 C326 86 332 84 334 76 C336 67 328 56 316 50 C300 43 276 56 256 54Z" />
        {/* Australia */}
        <path d="M318 148 C308 145 300 150 301 160 C302 170 311 176 321 174 C336 172 348 162 350 152 C352 142 338 146 318 148Z" />
      </g>

      {/* rim glow */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(56,189,248,0.55)" strokeWidth="1.5"
        style={{ filter: 'drop-shadow(0 0 8px rgba(56,189,248,0.6))' }} />

      {/* deployment nodes */}
      {[
        { x: 155, y: 85,  c: '#10b981' },
        { x: 200, y: 148, c: '#10b981' },
        { x: 268, y: 75,  c: '#38bdf8' },
        { x: 310, y: 110, c: '#10b981' },
        { x: 324, y: 156, c: '#38bdf8' },
        { x: 245, y: 140, c: '#f59e0b' },
      ].map((n, i) => (
        <g key={i}>
          <circle cx={n.x} cy={n.y} r="5" fill={n.c} opacity="0.12" />
          <circle cx={n.x} cy={n.y} r="2.5" fill={n.c} style={{ filter: `drop-shadow(0 0 3px ${n.c})` }} />
        </g>
      ))}

      {/* center pulse */}
      <circle cx={cx} cy={cy} r="8" fill="rgba(56,189,248,0.35)" style={{ filter: 'drop-shadow(0 0 8px #38bdf8)' }} />
      <circle cx={cx} cy={cy} r="3.5" fill="#38bdf8" style={{ filter: 'drop-shadow(0 0 6px #38bdf8)' }} />
    </svg>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────────── */
export function Dashboard() {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: P.bg, color: '#fff', fontFamily: "'Outfit',sans-serif" }}>
      <style>{fonts}</style>

      {/* ══════════════════ SIDEBAR ══════════════════ */}
      <aside style={{ width: 168, flexShrink: 0, display: 'flex', flexDirection: 'column', background: P.sidebar, borderRight: `1px solid rgba(255,255,255,0.06)` }}>
        {/* Logo */}
        <div style={{ padding: '13px 12px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#38bdf8,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <polygon points="8,2 14,12 2,12" stroke="white" strokeWidth="1.5" fill="none" />
              <circle cx="8" cy="8" r="2" fill="white" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 800, fontFamily: 'Outfit', color: P.text, letterSpacing: '0.06em', lineHeight: 1.1 }}>STRATOS</div>
            <div style={{ fontSize: 8.5, color: P.textDim, fontFamily: 'Space Mono', letterSpacing: '0.04em' }}>GLOBAL</div>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 14, color: P.textDim }}>⚡</span>
        </div>

        {/* Nav */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
          <div style={{ padding: '6px 12px 3px', fontSize: 8, fontFamily: 'Space Mono', color: P.textDim, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Command Center</div>
          {navItems.map((item, i) => {
            const icons = ['▦','◈','◎','⊞','▣','◇','▤','⊹','◐','≡'];
            return (
              <div key={item.label} style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px',
                background: item.active ? 'rgba(56,189,248,0.09)' : 'transparent',
                borderLeft: `2px solid ${item.active ? '#38bdf8' : 'transparent'}`,
                cursor: 'pointer',
              }}>
                <span style={{ fontSize: 12, color: item.active ? P.cyan : P.textDim, flexShrink: 0, lineHeight: 1 }}>{icons[i]}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10.5, fontFamily: 'Outfit', fontWeight: item.active ? 700 : 500, color: item.active ? P.text : P.textMid, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>{item.label}</div>
                  <div style={{ fontSize: 7.5, color: P.textDim, fontFamily: 'Outfit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.sub}</div>
                </div>
                {item.arrow && <span style={{ fontSize: 9, color: P.textDim }}>›</span>}
              </div>
            );
          })}

          <div style={{ margin: '8px 12px 3px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 8, fontSize: 8, fontFamily: 'Space Mono', color: P.textDim, letterSpacing: '0.12em', textTransform: 'uppercase' }}>System Shortcuts</div>
          {shortcuts.map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 12px', cursor: 'pointer' }}>
              <span style={{ fontSize: 11, color: P.textDim }}>+</span>
              <span style={{ fontSize: 10, fontFamily: 'Outfit', color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s}</span>
            </div>
          ))}
        </div>

        {/* AI badge */}
        <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(56,189,248,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 14 }}>🤖</span>
            </div>
            <div>
              <div style={{ fontSize: 10, fontFamily: 'Outfit', fontWeight: 700, color: P.text }}>STRATOS AI</div>
              <div style={{ fontSize: 7.5, fontFamily: 'Space Mono', color: P.textDim }}>v.4.0.0 QUANTUM</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: P.green, boxShadow: `0 0 6px ${P.green}`, display: 'inline-block' }} />
            <span style={{ fontSize: 8.5, fontFamily: 'Space Mono', color: P.green }}>Active</span>
          </div>
        </div>
      </aside>

      {/* ══════════════════ MAIN ══════════════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── TOP BAR ── */}
        <header style={{ padding: '9px 18px', borderBottom: `1px solid rgba(255,255,255,0.06)`, display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(2,6,20,0.9)', backdropFilter: 'blur(12px)', flexShrink: 0 }}>
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontSize: 19, fontFamily: 'Outfit', fontWeight: 800, color: P.text, letterSpacing: '-0.02em', lineHeight: 1 }}>DASHBOARD</div>
            <div style={{ fontSize: 9, color: P.textDim, fontFamily: 'Outfit', letterSpacing: '0.02em' }}>Command Overview</div>
          </div>
          <div style={{ width: 280 }}>
            <div style={{ padding: '7px 36px 7px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, fontSize: 11, color: P.textDim, fontFamily: 'Outfit', position: 'relative' }}>
              🔍 Search systems, tools, or data...
              <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 9, fontFamily: 'Space Mono', color: P.textDim, background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 4 }}>⌘K</span>
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            {['📅','📷','⏰'].map((ic, i) => (
              <div key={i} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: `1px solid ${P.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, cursor: 'pointer' }}>{ic}</div>
            ))}
            <div style={{ position: 'relative', width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: `1px solid ${P.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, cursor: 'pointer' }}>
              🔔
              <span style={{ position: 'absolute', top: 4, right: 4, width: 7, height: 7, borderRadius: '50%', background: '#ef4444', border: '1.5px solid #020810' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${P.border}`, borderRadius: 10, cursor: 'pointer' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, fontFamily: 'Outfit', fontWeight: 700, color: P.text }}>System Architect</div>
                <div style={{ fontSize: 8.5, fontFamily: 'Space Mono', color: P.textDim }}>Level 99 ★</div>
              </div>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#38bdf8,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>T</div>
            </div>
          </div>
        </header>

        {/* ── SCROLLABLE CONTENT ── */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '11px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* ── ROW 1: KPI CARDS ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
            {[
              { label: 'TOTAL REVENUE', val: '$248,392.00', badge: '+12.5%', color: P.green,  spark: [55,65,60,78,88,83,96] },
              { label: 'ACTIVE SYSTEMS', val: '24',         badge: '+4',     color: P.cyan,   spark: [10,13,17,20,21,22,24] },
              { label: 'AI CREDITS',    val: '1.2M',        badge: '+18.3%', color: P.violet, spark: [400,580,780,900,1000,1100,1200] },
              { label: 'TOTAL AGENTS',  val: '120',         badge: '+15.2%', color: P.amber,  spark: [80,84,90,100,108,115,120] },
              { label: 'UPTIME',        val: null,           badge: 'OPTIMAL', color: P.green, gauge: 99.9 },
            ].map((k, i) => (
              <div key={i} style={{ ...card, padding: '12px 14px', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 8, right: 9, fontSize: 10, color: P.textDim, cursor: 'pointer' }}>×</div>
                <div style={{ fontSize: 8, fontFamily: 'Space Mono', color: P.textDim, letterSpacing: '0.1em' }}>{k.label}</div>
                {k.gauge ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                    <Gauge pct={99.9} color={P.green} size={62} stroke={6} />
                    <div>
                      <div style={{ fontSize: 15, fontFamily: 'Space Mono', fontWeight: 700, color: P.green, lineHeight: 1 }}>99.998%</div>
                      <div style={{ fontSize: 7.5, fontFamily: 'Space Mono', color: P.green, marginTop: 3, letterSpacing: '0.06em' }}>OPTIMAL</div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: i === 0 ? 17 : 24, fontFamily: 'Space Mono', fontWeight: 700, color: k.color, marginTop: 6, lineHeight: 1 }}>{k.val}</div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 5, padding: '1px 6px', borderRadius: 5, background: `${k.color}1a`, fontSize: 8.5, fontFamily: 'Space Mono', color: k.color }}>{k.badge}</div>
                    <svg viewBox="0 0 80 24" style={{ width: '100%', height: 24, marginTop: 7 }} preserveAspectRatio="none">
                      {k.spark!.map((v, j, arr) => {
                        if (j === 0) return null;
                        const max = Math.max(...arr), min = Math.min(...arr), span = max - min || 1;
                        const x1 = ((j-1)/(arr.length-1))*80, y1 = 22 - ((arr[j-1]-min)/span)*20;
                        const x2 = (j/(arr.length-1))*80,     y2 = 22 - ((v-min)/span)*20;
                        return <line key={j} x1={x1} y1={y1} x2={x2} y2={y2} stroke={k.color} strokeWidth="1.5" strokeOpacity="0.7" strokeLinecap="round" />;
                      })}
                    </svg>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* ── ROW 2: GLOBE + [SYSTEM STATUS + ACTIVITY FEED] ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 272px', gap: 10, minHeight: 250 }}>

            {/* GLOBAL SYSTEM OVERVIEW */}
            <div style={{ ...card }}>
              <div style={{ padding: '10px 14px', borderBottom: `1px solid rgba(255,255,255,0.06)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 11, fontFamily: 'Outfit', fontWeight: 700, color: P.text, letterSpacing: '0.04em' }}>GLOBAL SYSTEM OVERVIEW</div>
                  <div style={{ fontSize: 8.5, color: P.textDim, fontFamily: 'Outfit' }}>Real-time operational intelligence across all deployed systems</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 20, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: P.green, display: 'inline-block', boxShadow: `0 0 4px ${P.green}` }} />
                  <span style={{ fontSize: 8, fontFamily: 'Space Mono', color: P.green, letterSpacing: '0.06em' }}>+ LIVE FEED</span>
                </div>
              </div>
              {/* Globe + regional stats overlay */}
              <div style={{ position: 'relative', flex: 1, padding: '8px 14px 10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0, height: '100%', minHeight: 190 }}>
                  {/* Left stats */}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 190, width: 120, flexShrink: 0, paddingRight: 8 }}>
                    {[
                      { r: 'NORTH AMERICA', p: '98.6%' },
                      { r: 'EUROPE',        p: '97.8%' },
                      { r: 'ASIA PACIFIC',  p: '99.2%' },
                    ].map(reg => (
                      <div key={reg.r}>
                        <div style={{ fontSize: 7, fontFamily: 'Space Mono', color: P.textDim, letterSpacing: '0.06em' }}>{reg.r}</div>
                        <div style={{ fontSize: 18, fontFamily: 'Space Mono', fontWeight: 700, color: P.text, lineHeight: 1.15 }}>{reg.p}</div>
                        <div style={{ fontSize: 8, fontFamily: 'Outfit', color: P.green }}>Operational</div>
                      </div>
                    ))}
                  </div>
                  {/* Globe */}
                  <div style={{ flex: 1, height: 200, minWidth: 0 }}>
                    <Globe />
                  </div>
                  {/* Right stats */}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 190, width: 120, flexShrink: 0, paddingLeft: 8 }}>
                    {[
                      { r: 'SOUTH AMERICA', p: '96.7%' },
                      { r: 'AFRICA',        p: '95.4%' },
                      { r: 'MIDDLE EAST',   p: '97.1%' },
                    ].map(reg => (
                      <div key={reg.r} style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 7, fontFamily: 'Space Mono', color: P.textDim, letterSpacing: '0.06em' }}>{reg.r}</div>
                        <div style={{ fontSize: 18, fontFamily: 'Space Mono', fontWeight: 700, color: P.text, lineHeight: 1.15 }}>{reg.p}</div>
                        <div style={{ fontSize: 8, fontFamily: 'Outfit', color: P.green }}>Operational</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: System Status + Activity Feed stacked */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* SYSTEM STATUS */}
              <div style={{ ...card, flex: '0 0 auto' }}>
                <div style={{ padding: '9px 12px', borderBottom: `1px solid rgba(255,255,255,0.06)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 10.5, fontFamily: 'Outfit', fontWeight: 700, color: P.text }}>SYSTEM STATUS</div>
                    <div style={{ fontSize: 7.5, color: P.textDim, fontFamily: 'Outfit' }}>All systems operational</div>
                  </div>
                  <span style={{ fontSize: 11, color: P.textDim, cursor: 'pointer' }}>×</span>
                </div>
                <div style={{ padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Gauge pct={100} color={P.green} size={76} stroke={7} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {['Core Engine','AI Models','Database','Security','Network','Quantum Link'].map(name => (
                      <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ width: 4.5, height: 4.5, borderRadius: '50%', background: P.green, boxShadow: `0 0 4px ${P.green}`, display: 'inline-block' }} />
                          <span style={{ fontSize: 9, fontFamily: 'Outfit', color: P.textMid }}>{name}</span>
                        </div>
                        <span style={{ fontSize: 8, fontFamily: 'Space Mono', color: P.green }}>Optimal</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ margin: '0 10px 8px', padding: '3px 8px', background: 'rgba(16,185,129,0.06)', borderRadius: 6, fontSize: 7.5, fontFamily: 'Space Mono', color: P.textDim, textAlign: 'center' }}>
                  Last scan: 2 sec ago
                </div>
              </div>

              {/* AI ACTIVITY FEED */}
              <div style={{ ...card, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '9px 12px', borderBottom: `1px solid rgba(255,255,255,0.06)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                  <div>
                    <div style={{ fontSize: 10.5, fontFamily: 'Outfit', fontWeight: 700, color: P.text }}>AI ACTIVITY FEED</div>
                    <div style={{ fontSize: 7.5, color: P.textDim, fontFamily: 'Outfit' }}>Real-time agent coordination</div>
                  </div>
                  <span style={{ fontSize: 11, color: P.textDim, cursor: 'pointer' }}>×</span>
                </div>
                <div style={{ flex: 1, padding: '5px 12px' }}>
                  {activity.map((a, i) => (
                    <div key={i} style={{ display: 'flex', gap: 7, padding: '5px 0', borderBottom: i < activity.length-1 ? `1px solid rgba(255,255,255,0.04)` : 'none', alignItems: 'flex-start' }}>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: `${a.color}18`, border: `1px solid ${a.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, flexShrink: 0 }}>🤖</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 9.5, fontFamily: 'Outfit', fontWeight: 600, color: P.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.agent}</div>
                        <div style={{ fontSize: 8.5, fontFamily: 'Outfit', color: P.textMid, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.action}</div>
                      </div>
                      <span style={{ fontSize: 7.5, fontFamily: 'Space Mono', color: P.textDim, flexShrink: 0, paddingTop: 1 }}>{a.ago}</span>
                    </div>
                  ))}
                </div>
                <div style={{ padding: '5px 12px', borderTop: `1px solid rgba(255,255,255,0.05)`, textAlign: 'center', fontSize: 8, fontFamily: 'Space Mono', color: P.cyan, cursor: 'pointer', background: 'rgba(56,189,248,0.03)', flexShrink: 0 }}>
                  View All Activity →
                </div>
              </div>

            </div>
          </div>

          {/* ── ROW 3: REVENUE + AGENTS + DEPLOYMENTS ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>

            {/* REVENUE STREAMS */}
            <div style={{ ...card }}>
              <div style={{ padding: '9px 12px', borderBottom: `1px solid rgba(255,255,255,0.06)`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 10.5, fontFamily: 'Outfit', fontWeight: 700, color: P.text }}>REVENUE STREAMS</div>
                  <div style={{ fontSize: 7.5, color: P.textDim }}>Real-time financial analytics</div>
                </div>
                <span style={{ fontSize: 11, color: P.textDim, cursor: 'pointer' }}>×</span>
              </div>
              <div style={{ padding: '10px 12px', display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ position: 'relative', width: 96, height: 96, flexShrink: 0 }}>
                  <PieChart width={96} height={96}>
                    <Pie data={pieData.map(d => ({ ...d, value: d.pct }))} cx={48} cy={48} innerRadius={28} outerRadius={45} dataKey="value" stroke="none">
                      {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                  </PieChart>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 9, fontFamily: 'Space Mono', fontWeight: 700, color: P.text, lineHeight: 1 }}>$248.4K</span>
                    <span style={{ fontSize: 6.5, fontFamily: 'Space Mono', color: P.textDim, marginTop: 1 }}>Total Revenue</span>
                  </div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {pieData.map(r => (
                    <div key={r.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 5, height: 5, borderRadius: 1.5, background: r.color, display: 'inline-block', flexShrink: 0 }} />
                        <span style={{ fontSize: 8.5, fontFamily: 'Outfit', color: P.textMid, whiteSpace: 'nowrap' }}>{r.name}</span>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span style={{ fontSize: 8.5, fontFamily: 'Space Mono', color: P.text }}>{r.val}</span>
                        <span style={{ fontSize: 7.5, fontFamily: 'Space Mono', color: P.textDim, marginLeft: 3 }}>{r.pct}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* AI AGENT PERFORMANCE */}
            <div style={{ ...card }}>
              <div style={{ padding: '9px 12px', borderBottom: `1px solid rgba(255,255,255,0.06)`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 10.5, fontFamily: 'Outfit', fontWeight: 700, color: P.text }}>AI AGENT PERFORMANCE</div>
                  <div style={{ fontSize: 7.5, color: P.textDim }}>Top performing autonomous agents</div>
                </div>
                <span style={{ fontSize: 11, color: P.textDim, cursor: 'pointer' }}>×</span>
              </div>
              <div style={{ padding: '9px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {agents.map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: `${P.cyan}18`, border: `1px solid ${P.cyan}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, flexShrink: 0 }}>🤖</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 10, fontFamily: 'Outfit', fontWeight: 600, color: P.textMid }}>{a.name}</span>
                        <span style={{ fontSize: 9.5, fontFamily: 'Space Mono', fontWeight: 700, color: P.cyan }}>{a.pct}%</span>
                      </div>
                      <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${a.pct}%`, height: '100%', background: `linear-gradient(90deg,${P.cyan},${P.violet})`, borderRadius: 2 }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SYSTEM DEPLOYMENTS */}
            <div style={{ ...card }}>
              <div style={{ padding: '9px 12px', borderBottom: `1px solid rgba(255,255,255,0.06)`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 10.5, fontFamily: 'Outfit', fontWeight: 700, color: P.text }}>SYSTEM DEPLOYMENTS</div>
                  <div style={{ fontSize: 7.5, color: P.textDim }}>Deployment status across regions</div>
                </div>
                <span style={{ fontSize: 11, color: P.textDim, cursor: 'pointer' }}>×</span>
              </div>
              <div style={{ padding: '8px 12px' }}>
                {/* Mini globe/map */}
                <div style={{ height: 80, background: 'rgba(56,189,248,0.04)', border: `1px solid rgba(56,189,248,0.1)`, borderRadius: 8, marginBottom: 8, overflow: 'hidden', position: 'relative' }}>
                  <svg viewBox="0 0 250 75" style={{ width: '100%', height: '100%' }}>
                    <defs>
                      <radialGradient id="miniGlobe" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.1" />
                        <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                      </radialGradient>
                    </defs>
                    <ellipse cx="125" cy="37" rx="95" ry="32" fill="url(#miniGlobe)" />
                    <ellipse cx="125" cy="37" rx="95" ry="32" fill="none" stroke="rgba(56,189,248,0.15)" strokeWidth="0.5" strokeDasharray="3 4" />
                    {[20,50,80,110,140,165,195,220].map((x, i) => (
                      <circle key={i} cx={x} cy={22 + Math.sin(i * 1.2) * 10} r="1.5" fill="#38bdf8" opacity="0.6" />
                    ))}
                    {[35,70,115,165].map((x, i) => (
                      <g key={i}>
                        <circle cx={x} cy={42 + Math.cos(i) * 6} r="4" fill="#10b981" opacity="0.1" />
                        <circle cx={x} cy={42 + Math.cos(i) * 6} r="2" fill="#10b981" opacity="0.85" style={{ filter: 'drop-shadow(0 0 3px #10b981)' }} />
                      </g>
                    ))}
                  </svg>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {[
                    { label: 'Deployed',     val: '24',    color: P.text  },
                    { label: 'In Progress',  val: '5',     color: P.cyan  },
                    { label: 'Failed',       val: '0',     color: P.textDim },
                    { label: 'Success Rate', val: '99.2%', color: P.green },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: 'center', padding: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                      <div style={{ fontSize: 18, fontFamily: 'Space Mono', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.val}</div>
                      <div style={{ fontSize: 7.5, fontFamily: 'Outfit', color: P.textDim, marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* ── ROW 4: ANALYTICS + QUANTUM TERMINAL ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 272px', gap: 10 }}>

            {/* SYSTEM PERFORMANCE ANALYTICS */}
            <div style={{ ...card }}>
              <div style={{ padding: '9px 14px', borderBottom: `1px solid rgba(255,255,255,0.06)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 10.5, fontFamily: 'Outfit', fontWeight: 700, color: P.text }}>SYSTEM PERFORMANCE ANALYTICS</div>
                  <div style={{ fontSize: 7.5, color: P.textDim }}>Deep performance insights and predictive analytics</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 8.5, fontFamily: 'Space Mono', color: P.textDim, padding: '3px 9px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${P.border}`, borderRadius: 6 }}>24 Hours ▾</span>
                  <span style={{ fontSize: 11, color: P.textDim, cursor: 'pointer' }}>×</span>
                </div>
              </div>
              <div style={{ display: 'flex', height: 130 }}>
                <div style={{ flex: 1, padding: '8px 6px 4px 10px' }}>
                  <ResponsiveContainer width="100%" height={118}>
                    <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <defs>
                        {[['#38bdf8','ag1'],['#8b5cf6','ag2'],['#10b981','ag3'],['#f59e0b','ag4']].map(([c,id]) => (
                          <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={c as string} stopOpacity="0.25" />
                            <stop offset="100%" stopColor={c as string} stopOpacity="0" />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="2 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="t" tick={{ fill: P.textDim, fontSize: 7.5, fontFamily: 'Space Mono' }} tickLine={false} axisLine={false} interval={2} />
                      <YAxis tick={{ fill: P.textDim, fontSize: 7, fontFamily: 'Space Mono' }} tickLine={false} axisLine={false} width={24} />
                      <Tooltip contentStyle={{ background: '#0a1628', border: `1px solid ${P.border}`, borderRadius: 8, fontSize: 9, fontFamily: 'Space Mono' }} />
                      <Line type="monotone" dataKey="e"  stroke="#38bdf8" strokeWidth={1.5} dot={false} name="Efficiency"   />
                      <Line type="monotone" dataKey="m"  stroke="#8b5cf6" strokeWidth={1.5} dot={false} name="Memory"       />
                      <Line type="monotone" dataKey="p"  stroke="#10b981" strokeWidth={1.5} dot={false} name="Processing"   />
                      <Line type="monotone" dataKey="th" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="Throughput"   />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ width: 140, padding: '12px', borderLeft: `1px solid rgba(255,255,255,0.06)`, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
                  <div style={{ fontSize: 7.5, fontFamily: 'Space Mono', color: P.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Performance Score</div>
                  <div style={{ fontSize: 28, fontFamily: 'Space Mono', fontWeight: 700, color: P.green, lineHeight: 1 }}>
                    98.7<span style={{ fontSize: 12, color: P.textDim }}>/100</span>
                  </div>
                  <div style={{ fontSize: 10, fontFamily: 'Outfit', color: P.green, fontWeight: 600 }}>Excellent</div>
                  <div style={{ padding: '6px 8px', background: 'rgba(16,185,129,0.07)', borderRadius: 8, border: `1px solid rgba(16,185,129,0.14)`, marginTop: 2 }}>
                    <div style={{ fontSize: 7.5, fontFamily: 'Space Mono', color: P.textDim }}>Predictive Insight</div>
                    <div style={{ fontSize: 9, fontFamily: 'Outfit', color: P.textMid, marginTop: 3, lineHeight: 1.35 }}>All systems trending optimal</div>
                    <div style={{ fontSize: 8, fontFamily: 'Outfit', color: P.textDim, marginTop: 2 }}>No action required</div>
                  </div>
                  {/* legend */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 2 }}>
                    {[['#38bdf8','Efficiency'],['#8b5cf6','Memory'],['#10b981','Processing'],['#f59e0b','Throughput']].map(([c,l]) => (
                      <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 14, height: 2, background: c, display: 'inline-block', borderRadius: 1 }} />
                        <span style={{ fontSize: 8, fontFamily: 'Outfit', color: P.textDim }}>{l}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* QUANTUM COMMAND TERMINAL */}
            <div style={{ background: 'rgba(1,5,15,0.7)', border: `1px solid rgba(56,189,248,0.18)`, borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '9px 12px', borderBottom: `1px solid rgba(56,189,248,0.12)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div>
                  <div style={{ fontSize: 10.5, fontFamily: 'Outfit', fontWeight: 700, color: P.text }}>QUANTUM COMMAND TERMINAL</div>
                  <div style={{ fontSize: 7.5, color: P.textDim, fontFamily: 'Outfit' }}>Advanced system control</div>
                </div>
                <span style={{ fontSize: 11, color: P.textDim, cursor: 'pointer' }}>×</span>
              </div>
              <div style={{ flex: 1, padding: '8px 12px', fontFamily: 'Space Mono', fontSize: 8.5, lineHeight: 1.9, overflowY: 'auto' }}>
                <div><span style={{ color: P.green }}>›</span> <span style={{ color: 'rgba(56,189,248,0.9)' }}>QUANTUM LINK ESTABLISHED</span></div>
                <div><span style={{ color: P.green }}>›</span> <span style={{ color: 'rgba(56,189,248,0.9)' }}>Access Level: MAXIMUM</span></div>
                <div><span style={{ color: P.green }}>›</span> <span style={{ color: 'rgba(56,189,248,0.9)' }}>System Override: ENABLED</span></div>
                <div><span style={{ color: P.green }}>›</span> <span style={{ color: 'rgba(56,189,248,0.9)' }}>Quantum Entanglement: ACTIVE</span></div>
                <div><span style={{ color: P.cyan }}>›</span> <span style={{ color: 'rgba(255,255,255,0.3)' }}>Processing at Light Speed...</span></div>
                <div style={{ marginTop: 4 }}><span style={{ color: P.textDim }}>_</span></div>
              </div>
              <div style={{ padding: '5px 12px', borderTop: `1px solid rgba(56,189,248,0.1)`, background: 'rgba(56,189,248,0.05)', flexShrink: 0 }}>
                <div style={{ fontSize: 8, fontFamily: 'Space Mono', color: P.green }}>▸ READY FOR COMMAND INPUT</div>
              </div>
            </div>

          </div>

        </main>

        {/* ── COMMAND INPUT BAR ── */}
        <div style={{ padding: '8px 14px', borderTop: `1px solid rgba(255,255,255,0.06)`, background: 'rgba(1,5,18,0.92)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ flex: 1, padding: '8px 14px', background: 'rgba(255,255,255,0.04)', border: `1px solid rgba(255,255,255,0.09)`, borderRadius: 8, fontSize: 11, color: P.textDim, fontFamily: 'Outfit' }}>
            QUANTUM COMMAND INPUT — Enter advanced commands or queries...
          </div>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: `1px solid ${P.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, cursor: 'pointer' }}>⚡</div>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: `1px solid ${P.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, cursor: 'pointer' }}>🎙</div>
          <div style={{ padding: '8px 16px', background: 'rgba(56,189,248,0.18)', border: `1px solid rgba(56,189,248,0.4)`, borderRadius: 8, fontSize: 10, fontFamily: 'Space Mono', color: P.cyan, cursor: 'pointer', letterSpacing: '0.06em', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span>▶</span> EXECUTE
          </div>
        </div>

      </div>
    </div>
  );
}
