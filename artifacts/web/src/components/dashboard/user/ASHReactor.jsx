import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Plus, Hammer, CheckCircle2, Pause, AlertTriangle, Clock, Rocket, ShoppingBag, Mail, Share2, Globe, Zap, Bot, TrendingUp } from 'lucide-react';
import VaultModal from './VaultModal.jsx';

/* ── Icon map by blueprint/name keywords ────────────────────────────── */
const ICON_MAP = [
  { keys: ['shopify','store','ecomm','shop'],   Icon: ShoppingBag, color: '#96bf48' },
  { keys: ['youtube','video','content'],         Icon: Zap,         color: '#ff0000' },
  { keys: ['tiktok','social','reel'],            Icon: Share2,      color: '#69c9d0' },
  { keys: ['email','newsletter','mail'],         Icon: Mail,        color: '#f59e0b' },
  { keys: ['saas','platform','software'],        Icon: Globe,       color: '#3b82f6' },
  { keys: ['affiliate','partner'],               Icon: TrendingUp,  color: '#22c55e' },
  { keys: ['agent','bot','ai'],                  Icon: Bot,         color: '#8b5cf6' },
  { keys: ['market','commerce'],                 Icon: ShoppingBag, color: '#ec4899' },
  { keys: ['rocket','launch'],                   Icon: Rocket,      color: '#00c8ff' },
];
const DEFAULT_COLORS = ['#00c8ff','#8b5cf6','#22c55e','#f59e0b','#ec4899','#3b82f6','#96bf48','#ff6b35'];

function resolveIcon(system, index) {
  const lower = `${system.name ?? ''} ${system.blueprint?.name ?? ''}`.toLowerCase();
  const match  = ICON_MAP.find(m => m.keys.some(k => lower.includes(k)));
  return {
    Icon:  match?.Icon  ?? Rocket,
    color: match?.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length],
  };
}

const STATUS_BORDER = {
  active:    '#22c55e',
  building:  '#f59e0b',
  completed: '#3b82f6',
  paused:    '#8b5cf6',
  failed:    '#ef4444',
  pending:   '#6b7280',
};

/* ── Ring SVG ───────────────────────────────────────────────────────── */
function OrbitRing({ radius, dashed = false, opacity = 0.3, rotate = '0s', dir = 'cc-ring-cw', color = '#00c8ff' }) {
  const size = radius * 2 + 4;
  return (
    <div className="absolute left-1/2 top-1/2 pointer-events-none"
      style={{ width: size, height: size, marginLeft: -size/2, marginTop: -size/2,
        animation: `${dir} ${rotate} linear infinite` }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ opacity }}>
        <circle cx={size/2} cy={size/2} r={radius - 2}
          fill="none" stroke={color} strokeWidth={dashed ? 1 : 1.5}
          strokeDasharray={dashed ? '6 8' : undefined}
          style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
      </svg>
    </div>
  );
}

/* ── Orbiting node ──────────────────────────────────────────────────── */
function OrbitNode({ system, index, total, orbitRadius, duration, onClick }) {
  const { Icon, color } = resolveIcon(system, index);
  const border    = STATUS_BORDER[system.buildStatus] ?? '#6b7280';
  const delay     = -(duration * index / total);
  const isBuilding = system.buildStatus === 'building';

  return (
    <div
      className="absolute left-1/2 top-1/2 cursor-pointer group"
      style={{
        width: 72, height: 72,
        '--orbit-r': `${orbitRadius}px`,
        animation: `cc-orbit-cw ${duration}s linear infinite`,
        animationDelay: `${delay}s`,
        willChange: 'transform',
        zIndex: 10,
      }}
      onClick={(e) => { e.stopPropagation(); onClick(system); }}>

      {/* Outer glow ring */}
      <div className="absolute inset-0 rounded-full pointer-events-none transition-all duration-300 group-hover:scale-110"
        style={{ boxShadow: `0 0 20px ${color}60`, border: `1.5px solid ${color}50` }} />

      {/* Node shell */}
      <div className="absolute inset-2 rounded-full flex flex-col items-center justify-center gap-0.5 transition-all duration-300 group-hover:scale-110"
        style={{
          background: `radial-gradient(circle at 35% 35%, ${color}22 0%, rgba(5,10,25,0.95) 70%)`,
          border: `2px solid ${border}`,
          boxShadow: `0 0 12px ${border}60, inset 0 0 8px ${color}15`,
        }}>
        <Icon size={18} style={{ color }} />
        <span className="text-[8px] font-bold uppercase tracking-wider leading-tight text-center px-1 line-clamp-2"
          style={{ color: 'rgba(255,255,255,0.7)', maxWidth: 44, textShadow: `0 0 8px ${color}` }}>
          {system.name?.length > 10 ? system.name.slice(0, 9) + '…' : system.name}
        </span>
      </div>

      {/* Building pulse ring */}
      {isBuilding && (
        <div className="absolute inset-0 rounded-full border-2 border-amber-400 animate-ping opacity-30" />
      )}

      {/* Hover tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: 'rgba(0,5,20,0.92)', border: `1px solid ${color}50`, color, zIndex: 50 }}>
        {system.name}
      </div>
    </div>
  );
}

/* ── Particle ───────────────────────────────────────────────────────── */
function Particles() {
  const items = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    x: `${(Math.random() - 0.5) * 180}px`,
    y: `${(Math.random() - 0.5) * 180}px`,
    size: 1.5 + Math.random() * 2,
    delay: Math.random() * 5,
    dur:   2 + Math.random() * 4,
    color: ['#00c8ff','#f59e0b','#8b5cf6','#22c55e'][Math.floor(Math.random() * 4)],
  }));
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-full">
      {items.map(p => (
        <div key={p.id} className="absolute left-1/2 top-1/2 rounded-full"
          style={{
            width: p.size, height: p.size,
            background: p.color,
            boxShadow: `0 0 4px ${p.color}`,
            '--px': p.x, '--py': p.y,
            animation: `cc-particle ${p.dur}s ease-out ${p.delay}s infinite`,
            opacity: 0,
          }} />
      ))}
    </div>
  );
}

/* ── Core reactor ───────────────────────────────────────────────────── */
function ReactorCore({ onClick }) {
  return (
    <div className="absolute left-1/2 top-1/2 cursor-pointer group"
      style={{ width: 140, height: 140, marginLeft: -70, marginTop: -70, zIndex: 20 }}
      onClick={onClick}>
      {/* Outer halo */}
      <div className="absolute inset-0 rounded-full pointer-events-none"
        style={{ animation: 'cc-ring-cw 12s linear infinite' }}>
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r="66" fill="none" stroke="rgba(251,191,36,0.25)" strokeWidth="1"
            strokeDasharray="3 5" />
        </svg>
      </div>

      {/* Pulsing core */}
      <div className="absolute inset-4 rounded-full"
        style={{
          background: 'radial-gradient(circle at 40% 35%, #fef08a 0%, #f59e0b 30%, #d97706 60%, #92400e 100%)',
          animation: 'cc-core-pulse 2.4s ease-in-out infinite',
          boxShadow: '0 0 40px 10px rgba(251,191,36,0.5), 0 0 80px 20px rgba(251,191,36,0.25)',
        }}>

        {/* Inner concentric rings */}
        <div className="absolute inset-2 rounded-full border border-yellow-200/30 animate-spin" style={{ animationDuration: '8s' }} />
        <div className="absolute inset-4 rounded-full border border-yellow-300/20 animate-spin" style={{ animationDuration: '5s', animationDirection: 'reverse' }} />

        {/* ASH text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-black tracking-[0.2em]"
            style={{
              color: '#fff',
              fontFamily: 'monospace',
              textShadow: '0 0 20px rgba(255,255,255,0.9), 0 0 40px rgba(251,191,36,0.8)',
              letterSpacing: '0.2em',
            }}>ASH</span>
        </div>
      </div>

      {/* Hover label */}
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-widest text-yellow-400/60 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        AI Core · Click to Chat
      </div>
    </div>
  );
}

/* ── Add project button ─────────────────────────────────────────────── */
function AddProjectNode({ orbitRadius, duration, totalNodes }) {
  const delay = -(duration * totalNodes / (totalNodes + 1));
  return (
    <div className="absolute left-1/2 top-1/2 cursor-pointer group"
      style={{
        width: 56, height: 56,
        '--orbit-r': `${orbitRadius}px`,
        animation: `cc-orbit-cw ${duration}s linear infinite`,
        animationDelay: `${delay}s`,
        willChange: 'transform',
        zIndex: 10,
      }}
      onClick={() => { window.location.href = '/builder'; }}>
      <div className="absolute inset-2 rounded-full flex items-center justify-center border-2 border-dashed border-white/20 group-hover:border-cyan-400/60 transition-colors"
        style={{ background: 'rgba(0,200,255,0.04)' }}>
        <Plus size={16} className="text-white/30 group-hover:text-cyan-400 transition-colors" />
      </div>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded text-[9px] font-semibold whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: 'rgba(0,5,20,0.9)', border: '1px solid rgba(0,200,255,0.3)', color: '#00c8ff' }}>
        + New Project
      </div>
    </div>
  );
}

/* ── Main reactor component ─────────────────────────────────────────── */
export default function ASHReactor({ systems = [], onOpenASH }) {
  const [zoom, setZoom]           = useState(1);
  const [selected, setSelected]   = useState(null);
  const containerRef              = useRef(null);

  /* Zoom via wheel */
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setZoom(z => Math.min(2.5, Math.max(0.4, z - e.deltaY * 0.001)));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  /* Zoom controls */
  const zoomIn  = () => setZoom(z => Math.min(2.5, z + 0.15));
  const zoomOut = () => setZoom(z => Math.max(0.4, z - 0.15));
  const zoomReset = () => setZoom(1);

  const orbitR    = 185;
  const outerR    = 230;
  const innerR    = 130;
  const duration  = 28; // seconds per revolution

  return (
    <div ref={containerRef} className="relative flex-1 flex items-center justify-center overflow-hidden select-none"
      style={{ minHeight: 0 }}>

      {/* Star field background */}
      <StarField />

      {/* Circuit grid overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,200,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,200,255,0.03) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }} />

      {/* Zoomable area */}
      <div style={{ transform: `scale(${zoom})`, transition: 'transform 0.15s ease-out', transformOrigin: 'center center' }}>
        <div className="relative" style={{ width: 520, height: 520 }}>

          {/* Background orbital plate */}
          <div className="absolute left-1/2 top-1/2 rounded-full pointer-events-none"
            style={{
              width: 480, height: 480,
              marginLeft: -240, marginTop: -240,
              background: 'radial-gradient(ellipse at center, rgba(251,191,36,0.04) 0%, rgba(0,200,255,0.02) 40%, transparent 70%)',
              border: '1px solid rgba(0,200,255,0.06)',
            }} />

          {/* Orbit rings */}
          <OrbitRing radius={innerR}  color="#f59e0b" opacity={0.25} rotate="30s"  dir="cc-ring-ccw" />
          <OrbitRing radius={orbitR}  color="#00c8ff" opacity={0.35} rotate="45s"  dir="cc-ring-cw"  />
          <OrbitRing radius={outerR}  color="#8b5cf6" opacity={0.18} rotate="60s"  dir="cc-ring-ccw" dashed />
          <OrbitRing radius={orbitR - 15} color="#22c55e" opacity={0.12} rotate="20s" dir="cc-ring-cw" dashed />

          {/* Decorative inner ring */}
          <div className="absolute left-1/2 top-1/2 rounded-full pointer-events-none"
            style={{
              width: innerR * 2 - 10, height: innerR * 2 - 10,
              marginLeft: -(innerR - 5), marginTop: -(innerR - 5),
              background: 'radial-gradient(ellipse at center, rgba(251,191,36,0.06) 0%, transparent 70%)',
            }} />

          {/* Particles */}
          <div className="absolute left-1/2 top-1/2 pointer-events-none"
            style={{ width: orbitR * 2, height: orbitR * 2, marginLeft: -orbitR, marginTop: -orbitR }}>
            <Particles />
          </div>

          {/* Orbiting project nodes */}
          {systems.slice(0, 12).map((sys, i) => (
            <OrbitNode
              key={sys.id}
              system={sys}
              index={i}
              total={systems.length}
              orbitRadius={orbitR}
              duration={duration}
              onClick={setSelected}
            />
          ))}

          {/* Add project node */}
          <AddProjectNode orbitRadius={orbitR} duration={duration} totalNodes={systems.length} />

          {/* Central reactor core */}
          <ReactorCore onClick={onOpenASH} />
        </div>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1 z-30">
        {[
          { label: '+', action: zoomIn },
          { label: '⌂', action: zoomReset },
          { label: '−', action: zoomOut },
        ].map(({ label, action }) => (
          <button key={label} onClick={action}
            className="w-8 h-8 rounded-lg font-mono text-sm font-bold transition-all hover:scale-110 hover:brightness-125"
            style={{
              background: 'rgba(0,200,255,0.08)',
              border: '1px solid rgba(0,200,255,0.25)',
              color: 'rgba(0,200,255,0.8)',
            }}>
            {label}
          </button>
        ))}
        <div className="text-center text-[9px] font-mono" style={{ color: 'rgba(0,200,255,0.4)' }}>
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Zoom hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-widest pointer-events-none"
        style={{ color: 'rgba(255,255,255,0.2)' }}>
        Scroll to zoom · Click icon to open
      </div>

      {/* Vault modal */}
      {selected && <VaultModal system={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

/* ── Star field ─────────────────────────────────────────────────────── */
function StarField() {
  const stars = Array.from({ length: 80 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 0.5 + Math.random() * 1.5,
    delay: Math.random() * 6,
    dur:   2 + Math.random() * 4,
  }));
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {stars.map(s => (
        <div key={s.id} className="absolute rounded-full bg-white"
          style={{
            left: `${s.x}%`, top: `${s.y}%`,
            width: s.size, height: s.size,
            animation: `cc-star ${s.dur}s ease-in-out ${s.delay}s infinite`,
          }} />
      ))}
    </div>
  );
}
