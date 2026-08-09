import React, { useRef, useEffect, useState, useCallback } from 'react';
import VaultModal from './VaultModal.jsx';
import platformUrl from '@/assets/reactor-platform.jpg';

/* ── Constants ───────────────────────────────────────────────────────── */
const TILT        = 0.36;   // Ring Y-scale (creates perspective tilt)
const ORBIT_R     = 175;    // Orbit radius (pixels at 1× zoom)
const ORB_R       = 46;     // Central ASH orb radius
const ORBIT_SPEED = 0.18;   // Radians per second
const PARTICLE_COUNT = 30;

const RING_CONFIGS = [
  { r: 60,  color: '#d97706', glow: '#f59e0b', speed:  0.12, width: 3,   dashes: false },
  { r: 105, color: '#0ea5e9', glow: '#38bdf8', speed: -0.08, width: 1.5, dashes: true  },
  { r: ORBIT_R, color: '#60a5fa', glow: '#93c5fd', speed: 0.06, width: 2.5, dashes: false },
  { r: 212, color: '#7c3aed', glow: '#a78bfa', speed: -0.04, width: 1,   dashes: true  },
  { r: 238, color: '#0891b2', glow: '#22d3ee', speed:  0.03, width: 0.8, dashes: false },
];

const DEMO_ICONS = [
  { name: 'SHOPIFY\nSTORE',      emoji: '🛍',  color: '#96bf48', glow: '#96bf48', bg: 'rgba(150,191,72,0.18)'  },
  { name: 'YOUTUBE\nAUTOMATION', emoji: '▶',   color: '#ef4444', glow: '#ef4444', bg: 'rgba(239,68,68,0.18)'   },
  { name: 'TIKTOK\nAUTOMATION',  emoji: '♪',   color: '#69c9d0', glow: '#69c9d0', bg: 'rgba(105,201,208,0.18)' },
  { name: 'MARKETPLACE',          emoji: '🛒',  color: '#a855f7', glow: '#c084fc', bg: 'rgba(168,85,247,0.18)'  },
  { name: 'AI AGENT',             emoji: '⊛',  color: '#00c8ff', glow: '#00c8ff', bg: 'rgba(0,200,255,0.18)'   },
  { name: 'NEWSLETTER',           emoji: '✉',  color: '#fbbf24', glow: '#fde68a', bg: 'rgba(251,191,36,0.18)'  },
  { name: 'AFFILIATE\nSYSTEM',   emoji: '⚇',  color: '#22c55e', glow: '#4ade80', bg: 'rgba(34,197,94,0.18)'   },
  { name: 'SAAS\nPLATFORM',      emoji: '⬡',  color: '#3b82f6', glow: '#60a5fa', bg: 'rgba(59,130,246,0.18)'  },
];

const STATUS_COLOR = { active:'#22c55e', building:'#f59e0b', completed:'#3b82f6', paused:'#8b5cf6', failed:'#ef4444', pending:'#6b7280' };

function systemToIcon(sys, i) {
  const base = DEMO_ICONS[i % DEMO_ICONS.length];
  return {
    ...base,
    name: sys.name,
    id:   sys.id,
    system: sys,
    color: STATUS_COLOR[sys.buildStatus] ?? base.color,
    glow:  STATUS_COLOR[sys.buildStatus] ?? base.glow,
  };
}

/* ── Canvas drawing helpers ──────────────────────────────────────────── */
function drawGlow(ctx, cx, cy, r, color, alpha = 1) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, color.replace(')', `,${alpha})`).replace('rgb', 'rgba'));
  g.addColorStop(1, 'transparent');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawRing(ctx, cx, cy, rx, ry, color, glowColor, lw, dashed, rotation) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  // Gradient stroke (brighter at top/bottom where ring "bends toward viewer")
  const grd = ctx.createLinearGradient(0, -ry, 0, ry);
  grd.addColorStop(0,   color + 'ff');
  grd.addColorStop(0.3, color + 'aa');
  grd.addColorStop(0.5, color + '44');
  grd.addColorStop(0.7, color + 'aa');
  grd.addColorStop(1,   color + 'ff');
  ctx.strokeStyle = grd;
  ctx.lineWidth = lw;
  ctx.shadowColor = glowColor;
  ctx.shadowBlur  = 14;
  if (dashed) ctx.setLineDash([5, 7]);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawIconNode(ctx, x, y, scale, icon, hovered) {
  const r = Math.max(26 * scale, 16);
  ctx.save();
  // Drop shadow / glow
  ctx.shadowColor = icon.glow;
  ctx.shadowBlur  = hovered ? 35 : 18;

  // Outer pulse ring (hovered)
  if (hovered) {
    ctx.beginPath();
    ctx.arc(x, y, r * 1.45, 0, Math.PI * 2);
    ctx.strokeStyle = icon.color + '50';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Background fill
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  const bg = ctx.createRadialGradient(x - r * 0.28, y - r * 0.28, 0, x, y, r);
  bg.addColorStop(0, icon.bg);
  bg.addColorStop(1, 'rgba(4,8,20,0.93)');
  ctx.fillStyle = bg;
  ctx.fill();

  // Border
  ctx.strokeStyle = icon.color;
  ctx.lineWidth = hovered ? 2.5 : 1.8;
  ctx.stroke();

  // Emoji / symbol
  ctx.shadowBlur = 8;
  ctx.fillStyle  = 'rgba(255,255,255,0.92)';
  ctx.font = `${Math.round(14 * scale)}px system-ui, sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon.emoji, x, y);

  // Label
  ctx.shadowBlur = 0;
  ctx.fillStyle  = icon.color;
  ctx.font       = `bold ${Math.max(Math.round(7.5 * scale), 6)}px 'Courier New', monospace`;
  ctx.textAlign  = 'center';
  const lines = icon.name.split('\n');
  lines.forEach((line, li) => {
    ctx.fillText(line, x, y + r * 1.38 + li * Math.max(9 * scale, 7));
  });

  ctx.restore();
}

function drawCenterOrb(ctx, cx, cy, r, t) {
  // Wide ambient glow
  const amb = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 4.5);
  const pulse = 0.55 + 0.25 * Math.sin(t * 1.8);
  amb.addColorStop(0,   `rgba(251,191,36,${pulse})`);
  amb.addColorStop(0.3, `rgba(251,191,36,${pulse * 0.35})`);
  amb.addColorStop(1,   'transparent');
  ctx.fillStyle = amb;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 4.5, 0, Math.PI * 2);
  ctx.fill();

  // Sphere body
  const sph = ctx.createRadialGradient(cx - r * 0.32, cy - r * 0.32, r * 0.08, cx, cy, r);
  sph.addColorStop(0,   '#fff8dc');
  sph.addColorStop(0.2, '#fef3c7');
  sph.addColorStop(0.55,'#fbbf24');
  sph.addColorStop(0.85,'#d97706');
  sph.addColorStop(1,   '#7c2d12');
  ctx.save();
  ctx.shadowColor = '#f59e0b';
  ctx.shadowBlur  = 30 + 15 * Math.sin(t * 2);
  ctx.fillStyle = sph;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Specular highlight
  const hi = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.38, 0, cx - r * 0.3, cy - r * 0.38, r * 0.55);
  hi.addColorStop(0, 'rgba(255,255,255,0.55)');
  hi.addColorStop(1, 'transparent');
  ctx.fillStyle = hi;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // ASH label
  const fs = Math.round(r * 0.52);
  ctx.font         = `900 ${fs}px 'Courier New', monospace`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor  = 'rgba(255,255,255,0.9)';
  ctx.shadowBlur   = 20;
  ctx.fillStyle    = 'white';
  ctx.fillText('ASH', cx, cy);
  ctx.restore();
}

function drawPlatform(ctx, cx, cy, rx, img) {
  const ry = rx * TILT * 0.6;
  const y0  = cy + rx * TILT * 0.8;
  ctx.save();
  ctx.shadowColor = '#0ea5e9';
  ctx.shadowBlur  = 30;
  // Draw ellipse clip
  ctx.beginPath();
  ctx.ellipse(cx, y0, rx * 0.72, ry * 0.75, 0, 0, Math.PI * 2);
  if (img) {
    ctx.clip();
    const iw = rx * 1.5, ih = ry * 1.5;
    ctx.drawImage(img, cx - iw / 2, y0 - ih / 2, iw, ih);
  }
  // Platform glow overlay
  const g = ctx.createRadialGradient(cx, y0, 0, cx, y0, rx * 0.72);
  g.addColorStop(0,   'rgba(0,100,200,0.15)');
  g.addColorStop(0.6, 'rgba(0,80,160,0.08)');
  g.addColorStop(1,   'transparent');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, y0, rx * 0.72, ry * 0.75, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawParticles(ctx, cx, cy, particles) {
  particles.forEach(p => {
    const alpha = (p.life / p.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha * 0.8;
    ctx.fillStyle   = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur  = 6;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

/* ── Main Component ──────────────────────────────────────────────────── */
export default function ASHReactor({ systems = [], onOpenASH }) {
  const canvasRef    = useRef(null);
  const stateRef     = useRef({
    time: 0, zoom: 1, hoveredIdx: -1,
    particles: [], platformImg: null,
  });
  const [selected,  setSelected]  = useState(null);
  const [zoom,      setZoom]      = useState(1);
  const zoomRef                   = useRef(1);
  const rafRef                    = useRef(null);
  const lastTimeRef               = useRef(null);

  /* Preload platform image */
  useEffect(() => {
    const img = new Image();
    img.src = platformUrl;
    img.onload = () => { stateRef.current.platformImg = img; };
  }, []);

  /* Particle seed */
  useEffect(() => {
    stateRef.current.particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => spawnParticle(260, 0, 0));
  }, []);

  function spawnParticle(maxR, cx, cy) {
    const angle = Math.random() * Math.PI * 2;
    const dist  = 20 + Math.random() * maxR;
    return {
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist * TILT,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.2,
      r: 0.8 + Math.random() * 1.8,
      life: Math.random() * 120,
      maxLife: 80 + Math.random() * 120,
      color: ['#60a5fa','#fbbf24','#a78bfa','#34d399'][Math.floor(Math.random() * 4)],
    };
  }

  /* Animation loop */
  const animate = useCallback((ts) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H * 0.46;
    const S = stateRef.current;
    const dt = lastTimeRef.current ? Math.min((ts - lastTimeRef.current) / 1000, 0.05) : 0.016;
    lastTimeRef.current = ts;
    S.time += dt;
    const t   = S.time;
    const z   = zoomRef.current;
    const scl = z; // canvas scale applied via transform

    ctx.clearRect(0, 0, W, H);

    // Global zoom transform
    ctx.save();
    ctx.translate(cx * (1 - z), cy * (1 - z));
    ctx.scale(z, z);

    // --- Ambient glow pools ---
    const amb = ctx.createRadialGradient(cx, cy, 0, cx, cy, 260);
    amb.addColorStop(0,   'rgba(0,80,200,0.18)');
    amb.addColorStop(0.5, 'rgba(30,0,80,0.10)');
    amb.addColorStop(1,   'transparent');
    ctx.fillStyle = amb;
    ctx.fillRect(0, 0, W, H);

    // --- Platform ---
    drawPlatform(ctx, cx, cy, ORBIT_R * 1.32, S.platformImg);

    // --- Rings (outer → inner, so inner renders on top) ---
    const rReversed = [...RING_CONFIGS].reverse();
    rReversed.forEach(ring => {
      drawRing(ctx, cx, cy,
        ring.r, ring.r * TILT,
        ring.color, ring.glow, ring.width,
        ring.dashes, t * ring.speed);
    });

    // --- Icon nodes ---
    const icons = systems.length > 0
      ? systems.slice(0, 12).map(systemToIcon)
      : DEMO_ICONS;
    const iconData = icons.map((icon, i) => {
      const angle = (i / icons.length) * Math.PI * 2 + t * ORBIT_SPEED;
      const x     = cx + ORBIT_R * Math.cos(angle);
      const y     = cy + ORBIT_R * TILT * Math.sin(angle);
      const depth = Math.sin(angle);
      const scale = 0.62 + 0.38 * (depth + 1) / 2;
      return { ...icon, x, y, depth, scale, angle, idx: i };
    });
    // Sort back→front
    iconData.sort((a, b) => a.depth - b.depth);
    iconData.forEach(icon => {
      drawIconNode(ctx, icon.x, icon.y, icon.scale, icon, icon.idx === S.hoveredIdx);
    });
    // Store for click detection
    S.iconData = iconData;

    // --- Center orb (always on top of rings/icons) ---
    drawCenterOrb(ctx, cx, cy, ORB_R, t);

    // --- Particles ---
    S.particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.life += 0.8;
      if (p.life > p.maxLife) Object.assign(p, spawnParticle(ORBIT_R * 1.1, cx, cy));
    });
    drawParticles(ctx, cx, cy, S.particles);

    ctx.restore();

    rafRef.current = requestAnimationFrame(animate);
  }, [systems]);

  /* Start/stop loop */
  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate);
    return () => rafRef.current && cancelAnimationFrame(rafRef.current);
  }, [animate]);

  /* Canvas sizing */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    });
    ro.observe(canvas);
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    return () => ro.disconnect();
  }, []);

  /* Wheel zoom */
  const handleWheel = useCallback(e => {
    e.preventDefault();
    zoomRef.current = Math.min(2.5, Math.max(0.4, zoomRef.current - e.deltaY * 0.001));
    setZoom(zoomRef.current);
  }, []);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.addEventListener('wheel', handleWheel, { passive: false });
    return () => c.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  /* Mouse move — hover detection */
  const handleMouseMove = useCallback(e => {
    const canvas = canvasRef.current;
    if (!canvas || !stateRef.current.iconData) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    let found = -1;
    stateRef.current.iconData.forEach(icon => {
      const dx = icon.x * zoomRef.current + canvas.width  * (1 - zoomRef.current) / 2 - mx;
      const dy = icon.y * zoomRef.current + canvas.height * (1 - zoomRef.current) / 2 - my;
      const hitR = Math.max(26 * icon.scale * zoomRef.current, 18);
      if (dx * dx + dy * dy < hitR * hitR) found = icon.idx;
    });
    stateRef.current.hoveredIdx = found;
    canvas.style.cursor = found >= 0 ? 'pointer' : 'default';
  }, []);

  /* Click — open vault */
  const handleClick = useCallback(e => {
    const canvas = canvasRef.current;
    if (!canvas || !stateRef.current.iconData) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    // Check center orb click
    const W = canvas.width, H = canvas.height;
    const cx = W / 2 * zoomRef.current + W * (1 - zoomRef.current) / 2;
    const cy = H * 0.46 * zoomRef.current + H * (1 - zoomRef.current) / 2;
    if ((mx - cx) ** 2 + (my - cy) ** 2 < (ORB_R * zoomRef.current) ** 2) {
      onOpenASH?.();
      return;
    }
    stateRef.current.iconData?.forEach(icon => {
      const ix = icon.x * zoomRef.current + W * (1 - zoomRef.current) / 2;
      const iy = icon.y * zoomRef.current + H * (1 - zoomRef.current) / 2;
      const dx = ix - mx, dy = iy - my;
      const hitR = Math.max(26 * icon.scale * zoomRef.current, 18);
      if (dx * dx + dy * dy < hitR * hitR) {
        setSelected(icon.system ?? { name: icon.name, buildStatus: 'active', buildProgress: 100 });
      }
    });
  }, [onOpenASH]);

  return (
    <div className="relative flex-1 flex flex-col min-h-0" style={{ minHeight: 0 }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block', cursor: 'default' }}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      />

      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1 z-20">
        {[{l:'+',a:() => { zoomRef.current=Math.min(2.5,zoomRef.current+0.15); setZoom(zoomRef.current); }},
          {l:'⌂',a:() => { zoomRef.current=1; setZoom(1); }},
          {l:'−',a:() => { zoomRef.current=Math.max(0.4,zoomRef.current-0.15); setZoom(zoomRef.current); }},
        ].map(({l,a}) => (
          <button key={l} onClick={a}
            className="w-7 h-7 rounded-lg font-mono text-sm font-bold transition-all hover:scale-110"
            style={{ background:'rgba(0,200,255,0.1)', border:'1px solid rgba(0,200,255,0.3)', color:'rgba(0,200,255,0.8)' }}>
            {l}
          </button>
        ))}
        <div className="text-center text-[8px] font-mono" style={{ color:'rgba(0,200,255,0.4)' }}>
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Hint */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[8px] uppercase tracking-widest pointer-events-none select-none"
        style={{ color:'rgba(255,255,255,0.18)' }}>
        Scroll · zoom &nbsp;|&nbsp; Click icon · open project &nbsp;|&nbsp; Click ASH · chat
      </div>

      {/* Vault modal */}
      {selected && <VaultModal system={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
