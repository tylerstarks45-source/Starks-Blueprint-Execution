import React, { useRef, useEffect, useState, useCallback } from 'react';
import VaultModal from './VaultModal.jsx';

/* ── Constants ───────────────────────────────────────────────────────── */
const TILT         = 0.30;   // Ring Y-scale — perspective tilt (lower = more tilted)
const ORBIT_R      = 200;    // Orbit radius (pixels at 1× zoom)
const ORB_R        = 52;     // Central ASH orb radius
const NODE_R       = 40;     // Orbit icon node radius (at scale=1)
const ORBIT_SPEED  = 0.14;   // Radians per second
const PARTICLE_COUNT = 50;

/*
 * Ring groups — each is a cluster of closely-spaced rings rendered together.
 * This creates the "mechanical/layered" look from the reference image.
 * Each group: { radii, color, glowColor, glowAlpha, lineWidths, speed }
 */
const RING_GROUPS = [
  // ── Inner golden core rings (tight cluster)
  {
    radii:      [46, 52, 58, 64],
    lineWidths: [1, 2.5, 1.5, 1],
    color:      '#d97706',
    glowColor:  '#f59e0b',
    glowAlpha:  0.9,
    glowSize:   20,
    speed:      0.12,
    dashes:     [false, false, false, true],
  },
  // ── First blue band
  {
    radii:      [82, 88, 94, 100, 106],
    lineWidths: [0.8, 1.5, 3, 1.5, 0.8],
    color:      '#1e40af',
    glowColor:  '#3b82f6',
    glowAlpha:  0.85,
    glowSize:   18,
    speed:      -0.07,
    dashes:     [false, false, false, true, false],
  },
  // ── Accent cyan band
  {
    radii:      [128, 134, 140],
    lineWidths: [1, 2, 1],
    color:      '#0891b2',
    glowColor:  '#22d3ee',
    glowAlpha:  0.7,
    glowSize:   14,
    speed:      0.05,
    dashes:     [true, false, true],
  },
  // ── Orbit ring — icons ride on this band
  {
    radii:      [ORBIT_R - 8, ORBIT_R, ORBIT_R + 8],
    lineWidths: [1.2, 4, 1.2],
    color:      '#1d4ed8',
    glowColor:  '#60a5fa',
    glowAlpha:  1.0,
    glowSize:   28,
    speed:      0.04,
    dashes:     [false, false, false],
  },
  // ── Outer purple band
  {
    radii:      [224, 231, 238],
    lineWidths: [0.8, 2, 0.8],
    color:      '#5b21b6',
    glowColor:  '#a78bfa',
    glowAlpha:  0.7,
    glowSize:   14,
    speed:      -0.035,
    dashes:     [true, false, true],
  },
  // ── Outermost blue band
  {
    radii:      [252, 258, 264, 270],
    lineWidths: [0.6, 1.5, 1, 0.6],
    color:      '#1e3a8a',
    glowColor:  '#3b82f6',
    glowAlpha:  0.55,
    glowSize:   10,
    speed:      0.025,
    dashes:     [false, false, true, false],
  },
];

/* ── Icon definitions ────────────────────────────────────────────────── */
const DEMO_ICONS = [
  {
    name: 'SHOPIFY\nSTORE',
    color: '#96bf48', glow: '#a8d348', bg: 'rgba(150,191,72,0.18)',
    draw(ctx, x, y, r) {
      const s = r * 0.46;
      ctx.strokeStyle = 'rgba(255,255,255,0.92)';
      ctx.lineWidth = r * 0.09;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      // Bag body
      ctx.beginPath();
      ctx.roundRect(x - s * 0.65, y - s * 0.4, s * 1.3, s * 1.1, r * 0.06);
      ctx.stroke();
      // Handle
      ctx.beginPath();
      ctx.arc(x, y - s * 0.4, s * 0.38, Math.PI, 0);
      ctx.stroke();
    },
  },
  {
    name: 'YOUTUBE\nAUTOMATION',
    color: '#ef4444', glow: '#ef4444', bg: 'rgba(239,68,68,0.18)',
    draw(ctx, x, y, r) {
      const s = r * 0.42;
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath();
      ctx.moveTo(x - s * 0.45, y - s * 0.72);
      ctx.lineTo(x + s * 0.82, y);
      ctx.lineTo(x - s * 0.45, y + s * 0.72);
      ctx.closePath();
      ctx.fill();
    },
  },
  {
    name: 'TIKTOK\nAUTOMATION',
    color: '#69c9d0', glow: '#69c9d0', bg: 'rgba(105,201,208,0.18)',
    draw(ctx, x, y, r) {
      // Music note
      const s = r * 0.44;
      ctx.strokeStyle = 'rgba(255,255,255,0.92)';
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.lineWidth = r * 0.09;
      ctx.lineCap = 'round';
      // Stem
      ctx.beginPath();
      ctx.moveTo(x + s * 0.15, y - s * 0.75);
      ctx.lineTo(x + s * 0.15, y + s * 0.3);
      ctx.stroke();
      // Note head
      ctx.beginPath();
      ctx.ellipse(x - s * 0.1, y + s * 0.3, s * 0.3, s * 0.22, -0.4, 0, Math.PI * 2);
      ctx.fill();
      // Flag
      ctx.beginPath();
      ctx.moveTo(x + s * 0.15, y - s * 0.75);
      ctx.quadraticCurveTo(x + s * 0.85, y - s * 0.5, x + s * 0.5, y - s * 0.1);
      ctx.stroke();
    },
  },
  {
    name: 'SAAS\nPLATFORM',
    color: '#3b82f6', glow: '#60a5fa', bg: 'rgba(59,130,246,0.18)',
    draw(ctx, x, y, r) {
      // Rocket
      const s = r * 0.44;
      ctx.strokeStyle = 'rgba(255,255,255,0.92)';
      ctx.lineWidth = r * 0.09;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y - s);
      ctx.quadraticCurveTo(x + s * 0.65, y - s * 0.15, x + s * 0.45, y + s * 0.7);
      ctx.lineTo(x - s * 0.45, y + s * 0.7);
      ctx.quadraticCurveTo(x - s * 0.65, y - s * 0.15, x, y - s);
      ctx.stroke();
      // Exhaust
      ctx.beginPath();
      ctx.moveTo(x - s * 0.25, y + s * 0.65);
      ctx.lineTo(x, y + s * 1.0);
      ctx.lineTo(x + s * 0.25, y + s * 0.65);
      ctx.stroke();
      // Window
      ctx.beginPath();
      ctx.arc(x, y - s * 0.08, s * 0.2, 0, Math.PI * 2);
      ctx.stroke();
    },
  },
  {
    name: 'MARKETPLACE',
    color: '#a855f7', glow: '#c084fc', bg: 'rgba(168,85,247,0.18)',
    draw(ctx, x, y, r) {
      // Shopping cart
      const s = r * 0.42;
      ctx.strokeStyle = 'rgba(255,255,255,0.92)';
      ctx.lineWidth = r * 0.09;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(x - s * 0.92, y - s * 0.55);
      ctx.lineTo(x - s * 0.6, y - s * 0.55);
      ctx.lineTo(x - s * 0.2, y + s * 0.55);
      ctx.lineTo(x + s * 0.82, y + s * 0.55);
      ctx.lineTo(x + s * 0.92, y - s * 0.0);
      ctx.lineTo(x - s * 0.25, y - s * 0.0);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath();
      ctx.arc(x + s * 0.06, y + s * 0.78, s * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + s * 0.62, y + s * 0.78, s * 0.14, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  {
    name: 'AFFILIATE\nSYSTEM',
    color: '#22c55e', glow: '#4ade80', bg: 'rgba(34,197,94,0.18)',
    draw(ctx, x, y, r) {
      // Network nodes
      const s = r * 0.42;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.lineWidth = r * 0.08;
      const nodes = [[0, -0.78], [-0.72, 0.45], [0.72, 0.45]];
      // Lines first
      nodes.forEach(([ox, oy]) => {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + ox * s, y + oy * s);
        ctx.stroke();
      });
      // Center node
      ctx.beginPath();
      ctx.arc(x, y, s * 0.22, 0, Math.PI * 2);
      ctx.fill();
      // Outer nodes
      nodes.forEach(([ox, oy]) => {
        ctx.beginPath();
        ctx.arc(x + ox * s, y + oy * s, s * 0.2, 0, Math.PI * 2);
        ctx.fill();
      });
    },
  },
  {
    name: 'AI AGENT',
    color: '#00c8ff', glow: '#00e5ff', bg: 'rgba(0,200,255,0.18)',
    draw(ctx, x, y, r) {
      // Robot face
      const s = r * 0.42;
      ctx.strokeStyle = 'rgba(255,255,255,0.92)';
      ctx.lineWidth = r * 0.09;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      // Head
      ctx.beginPath();
      ctx.roundRect(x - s * 0.65, y - s * 0.5, s * 1.3, s * 1.05, r * 0.07);
      ctx.stroke();
      // Antenna
      ctx.beginPath();
      ctx.moveTo(x, y - s * 0.5);
      ctx.lineTo(x, y - s * 0.78);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath();
      ctx.arc(x, y - s * 0.82, s * 0.1, 0, Math.PI * 2);
      ctx.fill();
      // Eyes
      ctx.beginPath();
      ctx.arc(x - s * 0.28, y - s * 0.08, s * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + s * 0.28, y - s * 0.08, s * 0.16, 0, Math.PI * 2);
      ctx.fill();
      // Mouth
      ctx.strokeStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath();
      ctx.moveTo(x - s * 0.3, y + s * 0.35);
      ctx.lineTo(x + s * 0.3, y + s * 0.35);
      ctx.stroke();
    },
  },
  {
    name: 'NEWSLETTER',
    color: '#fbbf24', glow: '#fde68a', bg: 'rgba(251,191,36,0.18)',
    draw(ctx, x, y, r) {
      // Envelope
      const s = r * 0.44;
      ctx.strokeStyle = 'rgba(255,255,255,0.92)';
      ctx.lineWidth = r * 0.09;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.roundRect(x - s * 0.82, y - s * 0.55, s * 1.64, s * 1.1, r * 0.06);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - s * 0.82, y - s * 0.55);
      ctx.lineTo(x, y + s * 0.18);
      ctx.lineTo(x + s * 0.82, y - s * 0.55);
      ctx.stroke();
    },
  },
];

const STATUS_COLOR = {
  active:    '#22c55e',
  building:  '#f59e0b',
  completed: '#3b82f6',
  paused:    '#8b5cf6',
  failed:    '#ef4444',
  pending:   '#6b7280',
};

function systemToIcon(sys, i) {
  const base = DEMO_ICONS[i % DEMO_ICONS.length];
  return {
    ...base,
    name:   sys.name,
    id:     sys.id,
    system: sys,
    color:  STATUS_COLOR[sys.buildStatus] ?? base.color,
    glow:   STATUS_COLOR[sys.buildStatus] ?? base.glow,
  };
}

/* ── Drawing helpers ─────────────────────────────────────────────────── */

/**
 * Draw a full ring group — multiple closely-spaced ellipses with shared glow.
 */
function drawRingGroup(ctx, cx, cy, group, t) {
  const { radii, lineWidths, color, glowColor, glowAlpha, glowSize, speed, dashes } = group;

  // Ambient glow for the whole group (drawn once as a wide ellipse)
  const maxR = radii[radii.length - 1];
  const glowW = maxR - radii[0] + glowSize * 2;
  ctx.save();
  ctx.globalAlpha = glowAlpha * 0.25;
  ctx.shadowColor = glowColor;
  ctx.shadowBlur  = glowSize * 1.5;
  ctx.strokeStyle = glowColor;
  ctx.lineWidth   = glowW;
  ctx.beginPath();
  ctx.ellipse(cx, cy, (radii[0] + maxR) / 2, (radii[0] + maxR) / 2 * TILT, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Each individual ring
  radii.forEach((r, i) => {
    const rotation = t * speed + i * 0.04;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);

    // Gradient along the Y axis — near side brighter, far side dimmer
    const grd = ctx.createLinearGradient(0, -r * TILT, 0, r * TILT);
    grd.addColorStop(0,    color + 'ff');
    grd.addColorStop(0.28, color + 'cc');
    grd.addColorStop(0.5,  color + '33');
    grd.addColorStop(0.72, color + 'cc');
    grd.addColorStop(1,    color + 'ff');

    ctx.strokeStyle = grd;
    ctx.lineWidth   = lineWidths[i] ?? 1;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur  = glowSize * 0.7;

    if (dashes && dashes[i]) {
      ctx.setLineDash([6, 9]);
      ctx.lineDashOffset = t * (speed > 0 ? 25 : -25);
    }
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * TILT, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  });
}

/**
 * Draw one orbit node: glowing border circle + dark fill + icon + label.
 */
function drawIconNode(ctx, x, y, scale, icon, hovered) {
  const r = NODE_R * Math.max(scale, 0.5);

  ctx.save();

  // Outer glow halo (always present, stronger on hover)
  const haloR = r * (hovered ? 1.85 : 1.45);
  const halo  = ctx.createRadialGradient(x, y, r * 0.9, x, y, haloR);
  halo.addColorStop(0,   icon.glow + 'aa');
  halo.addColorStop(0.5, icon.glow + '44');
  halo.addColorStop(1,   'transparent');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, haloR, 0, Math.PI * 2);
  ctx.fill();

  // Outer pulse ring (hovered only)
  if (hovered) {
    ctx.beginPath();
    ctx.arc(x, y, r * 1.55, 0, Math.PI * 2);
    ctx.strokeStyle = icon.color + '55';
    ctx.lineWidth   = 1.5;
    ctx.stroke();
  }

  // Border ring (thick, colored, glowing)
  ctx.shadowColor = icon.glow;
  ctx.shadowBlur  = hovered ? 30 : 18;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = icon.color;
  ctx.lineWidth   = hovered ? 3.5 : 2.5;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Dark background fill
  const bg = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, 0, x, y, r);
  bg.addColorStop(0, icon.bg ?? 'rgba(4,10,28,0.88)');
  bg.addColorStop(1, 'rgba(2,4,12,0.96)');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(x, y, r - (hovered ? 1.8 : 1.2), 0, Math.PI * 2);
  ctx.fill();

  // Inner accent ring
  ctx.beginPath();
  ctx.arc(x, y, r * 0.82, 0, Math.PI * 2);
  ctx.strokeStyle = icon.color + '44';
  ctx.lineWidth   = 0.8;
  ctx.stroke();

  // Icon drawing
  ctx.save();
  ctx.shadowColor = icon.glow;
  ctx.shadowBlur  = 10;
  ctx.scale(scale, scale);
  ctx.translate(x / scale, y / scale);
  icon.draw(ctx, 0, 0, NODE_R);
  ctx.restore();

  // Label below the node
  ctx.shadowBlur = 0;
  const lines = icon.name.split('\n');
  const labelSize = Math.max(Math.round(8.5 * scale), 7);
  ctx.font      = `bold ${labelSize}px 'Courier New', monospace`;
  ctx.textAlign = 'center';
  ctx.fillStyle = icon.color;
  ctx.shadowColor = icon.glow;
  ctx.shadowBlur  = 8;
  lines.forEach((line, li) => {
    ctx.fillText(line, x, y + r * 1.32 + li * (labelSize + 2));
  });

  ctx.restore();
}

/**
 * Draw the glowing golden ASH orb at center.
 */
function drawCenterOrb(ctx, cx, cy, r, t) {
  const pulse = 0.5 + 0.25 * Math.sin(t * 1.8);

  // Far ambient pool
  const amb = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 6);
  amb.addColorStop(0,   `rgba(251,191,36,${pulse * 0.85})`);
  amb.addColorStop(0.2, `rgba(251,120,10,${pulse * 0.35})`);
  amb.addColorStop(0.5, `rgba(100,50,0,${pulse * 0.12})`);
  amb.addColorStop(1,   'transparent');
  ctx.fillStyle = amb;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 6, 0, Math.PI * 2);
  ctx.fill();

  // Mid glow ring
  const mid = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 2.5);
  mid.addColorStop(0,   `rgba(255,210,50,${pulse * 0.6})`);
  mid.addColorStop(1,   'transparent');
  ctx.fillStyle = mid;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Sphere body
  ctx.save();
  ctx.shadowColor = '#fbbf24';
  ctx.shadowBlur  = 35 + 20 * Math.sin(t * 2.2);
  const sph = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.05, cx, cy, r);
  sph.addColorStop(0,    '#fffbeb');
  sph.addColorStop(0.15, '#fef3c7');
  sph.addColorStop(0.5,  '#fbbf24');
  sph.addColorStop(0.82, '#d97706');
  sph.addColorStop(1,    '#7c2d12');
  ctx.fillStyle = sph;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Specular
  const hi = ctx.createRadialGradient(cx - r * 0.28, cy - r * 0.35, 0, cx - r * 0.28, cy - r * 0.35, r * 0.52);
  hi.addColorStop(0, 'rgba(255,255,255,0.62)');
  hi.addColorStop(1, 'transparent');
  ctx.fillStyle = hi;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // ASH text
  const fs = Math.round(r * 0.5);
  ctx.font         = `900 ${fs}px 'Courier New', monospace`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor  = 'rgba(255,255,255,0.95)';
  ctx.shadowBlur   = 22;
  ctx.fillStyle    = '#ffffff';
  ctx.fillText('ASH', cx, cy);
  ctx.restore();
}

/**
 * Draw the concentric-ring platform base below the reactor.
 */
function drawPlatformBase(ctx, cx, cy, maxR, t) {
  const baseY = cy + maxR * TILT * 0.85;
  const pulse  = 0.4 + 0.2 * Math.sin(t * 0.9);

  // Ground glow
  const gnd = ctx.createRadialGradient(cx, baseY, 0, cx, baseY, maxR * 0.85);
  gnd.addColorStop(0,   `rgba(180,100,0,${pulse * 0.3})`);
  gnd.addColorStop(0.4, `rgba(0,80,180,${pulse * 0.15})`);
  gnd.addColorStop(1,   'transparent');
  ctx.fillStyle = gnd;
  ctx.beginPath();
  ctx.ellipse(cx, baseY, maxR * 0.85, maxR * 0.85 * TILT * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();

  // Concentric platform rings
  const platformRings = [
    { r: maxR * 0.22, color: '#78350f', w: 2 },
    { r: maxR * 0.35, color: '#92400e', w: 1.5 },
    { r: maxR * 0.48, color: '#1e40af', w: 1 },
    { r: maxR * 0.6,  color: '#1e3a8a', w: 1.2 },
    { r: maxR * 0.72, color: '#1e3a8a', w: 0.8 },
  ];
  platformRings.forEach(({ r, color, w }) => {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur  = 8;
    ctx.strokeStyle = color + 'bb';
    ctx.lineWidth   = w;
    ctx.beginPath();
    ctx.ellipse(cx, baseY, r, r * TILT * 0.55, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });
}

/**
 * Particles drifting around the reactor.
 */
function spawnParticle(cx, cy) {
  const angle = Math.random() * Math.PI * 2;
  const dist  = 30 + Math.random() * 280;
  return {
    x:      cx + Math.cos(angle) * dist,
    y:      cy + Math.sin(angle) * dist * TILT,
    vx:     (Math.random() - 0.5) * 0.5,
    vy:     (Math.random() - 0.5) * 0.25,
    r:      0.7 + Math.random() * 2,
    life:   Math.random() * 140,
    maxLife: 90 + Math.random() * 130,
    color:  ['#60a5fa','#fbbf24','#a78bfa','#34d399','#f472b6'][Math.floor(Math.random() * 5)],
  };
}

function drawParticles(ctx, particles) {
  particles.forEach(p => {
    const alpha = (1 - p.life / p.maxLife) * 0.75;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur  = 5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

/* ── Main Component ──────────────────────────────────────────────────── */
export default function ASHReactor({ systems = [], onOpenASH }) {
  const canvasRef   = useRef(null);
  const stateRef    = useRef({ time: 0, hoveredIdx: -1, particles: [], iconData: null });
  const zoomRef     = useRef(1);
  const [selected,  setSelected]  = useState(null);
  const [zoomDisp,  setZoomDisp]  = useState(1);
  const rafRef      = useRef(null);
  const lastTRef    = useRef(null);

  /* Seed particles */
  useEffect(() => {
    stateRef.current.particles = Array.from({ length: PARTICLE_COUNT },
      () => spawnParticle(0, 0));
  }, []);

  /* Animation loop */
  const animate = useCallback((ts) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W   = canvas.width, H = canvas.height;
    const cx  = W / 2, cy = H * 0.47;
    const S   = stateRef.current;
    const dt  = lastTRef.current ? Math.min((ts - lastTRef.current) / 1000, 0.05) : 0.016;
    lastTRef.current = ts;
    S.time += dt;
    const t = S.time;
    const z = zoomRef.current;

    ctx.clearRect(0, 0, W, H);

    /* Zoom transform */
    ctx.save();
    ctx.translate(cx * (1 - z), cy * (1 - z));
    ctx.scale(z, z);

    /* ── Deep space ambient ── */
    const deep = ctx.createRadialGradient(cx, cy, 0, cx, cy, 320);
    deep.addColorStop(0,   'rgba(10,30,90,0.22)');
    deep.addColorStop(0.5, 'rgba(20,0,60,0.12)');
    deep.addColorStop(1,   'transparent');
    ctx.fillStyle = deep;
    ctx.fillRect(0, 0, W, H);

    /* ── Platform base ── */
    drawPlatformBase(ctx, cx, cy, ORBIT_R * 1.35, t);

    /* ── Ring groups (outer → inner so inner renders on top) ── */
    [...RING_GROUPS].reverse().forEach(g => drawRingGroup(ctx, cx, cy, g, t));

    /* ── Icon nodes with depth sorting ── */
    const icons = systems.length > 0
      ? systems.slice(0, 12).map(systemToIcon)
      : DEMO_ICONS;

    const iconData = icons.map((icon, i) => {
      const angle = (i / icons.length) * Math.PI * 2 + t * ORBIT_SPEED;
      const x     = cx + ORBIT_R * Math.cos(angle);
      const y     = cy + ORBIT_R * TILT * Math.sin(angle);
      const depth = Math.sin(angle); // -1 = far (top), +1 = near (bottom)
      const scale = 0.6 + 0.4 * (depth + 1) / 2; // 0.6 … 1.0
      return { ...icon, x, y, depth, scale, angle, idx: i };
    });

    // Sort back → front (far behind near)
    iconData.sort((a, b) => a.depth - b.depth);
    iconData.forEach(icon =>
      drawIconNode(ctx, icon.x, icon.y, icon.scale, icon, icon.idx === S.hoveredIdx));
    S.iconData = iconData;

    /* ── Center orb (always on top) ── */
    drawCenterOrb(ctx, cx, cy, ORB_R, t);

    /* ── Particles ── */
    S.particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.life += 0.7;
      if (p.life > p.maxLife) Object.assign(p, spawnParticle(cx, cy));
    });
    drawParticles(ctx, S.particles);

    ctx.restore();
    rafRef.current = requestAnimationFrame(animate);
  }, [systems]);

  /* Start / stop */
  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate);
    return () => rafRef.current && cancelAnimationFrame(rafRef.current);
  }, [animate]);

  /* Resize observer */
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
    setZoomDisp(zoomRef.current);
  }, []);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.addEventListener('wheel', handleWheel, { passive: false });
    return () => c.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  /* Mouse move — hover */
  const handleMouseMove = useCallback(e => {
    const canvas = canvasRef.current;
    if (!canvas || !stateRef.current.iconData) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const z  = zoomRef.current;
    let found = -1;
    stateRef.current.iconData.forEach(icon => {
      const ix = icon.x * z + canvas.width  * (1 - z) / 2;
      const iy = icon.y * z + canvas.height * (1 - z) / 2;
      const hr = NODE_R * icon.scale * z * 1.15;
      if ((mx - ix) ** 2 + (my - iy) ** 2 < hr * hr) found = icon.idx;
    });
    stateRef.current.hoveredIdx = found;
    canvas.style.cursor = found >= 0 ? 'pointer' : 'default';
  }, []);

  /* Click */
  const handleClick = useCallback(e => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const z  = zoomRef.current;
    const W  = canvas.width, H = canvas.height;
    const cx = W / 2 * z + W * (1 - z) / 2;
    const cy = H * 0.47 * z + H * (1 - z) / 2;

    // Center orb → open ASH assistant
    if ((mx - cx) ** 2 + (my - cy) ** 2 < (ORB_R * z) ** 2) {
      onOpenASH?.();
      return;
    }
    // Icon node → open vault
    stateRef.current.iconData?.forEach(icon => {
      const ix = icon.x * z + W * (1 - z) / 2;
      const iy = icon.y * z + H * (1 - z) / 2;
      const hr = NODE_R * icon.scale * z * 1.15;
      if ((mx - ix) ** 2 + (my - iy) ** 2 < hr * hr) {
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
        {[
          { l: '+', a: () => { zoomRef.current = Math.min(2.5, zoomRef.current + 0.15); setZoomDisp(zoomRef.current); } },
          { l: '⌂', a: () => { zoomRef.current = 1; setZoomDisp(1); } },
          { l: '−', a: () => { zoomRef.current = Math.max(0.4, zoomRef.current - 0.15); setZoomDisp(zoomRef.current); } },
        ].map(({ l, a }) => (
          <button key={l} onClick={a}
            className="w-7 h-7 rounded-lg font-mono text-sm font-bold transition-all hover:scale-110"
            style={{ background: 'rgba(0,200,255,0.1)', border: '1px solid rgba(0,200,255,0.3)', color: 'rgba(0,200,255,0.8)' }}>
            {l}
          </button>
        ))}
        <div className="text-center text-[8px] font-mono" style={{ color: 'rgba(0,200,255,0.4)' }}>
          {Math.round(zoomDisp * 100)}%
        </div>
      </div>

      {/* Hint */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[8px] uppercase tracking-widest pointer-events-none select-none"
        style={{ color: 'rgba(255,255,255,0.15)' }}>
        Scroll · zoom &nbsp;|&nbsp; Click icon · open project &nbsp;|&nbsp; Click ASH · chat
      </div>

      {/* Vault modal */}
      {selected && <VaultModal system={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
