import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, TrendingUp, Activity, DollarSign, Clock, CheckCircle2,
  Hammer, AlertTriangle, Pause, Zap, ExternalLink, Globe,
  BarChart2, Users, ShoppingCart, Settings,
} from 'lucide-react';

const authHeaders = () => {
  const t = localStorage.getItem('sbep_auth_token');
  return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : {};
};

const fmtRevenue = (cents) => {
  if (!cents) return '$0.00';
  if (cents >= 100000000) return '$' + (cents / 100000000).toFixed(1) + 'M';
  if (cents >= 100000)   return '$' + (cents / 100000).toFixed(1)   + 'k';
  return '$' + (cents / 100).toFixed(2);
};

const STATUS_META = {
  active:    { label: 'Live',      color: '#22c55e', glow: 'rgba(34,197,94,0.4)' },
  building:  { label: 'Building',  color: '#f59e0b', glow: 'rgba(245,158,11,0.4)' },
  completed: { label: 'Complete',  color: '#3b82f6', glow: 'rgba(59,130,246,0.4)' },
  paused:    { label: 'Paused',    color: '#8b5cf6', glow: 'rgba(139,92,246,0.4)' },
  failed:    { label: 'Failed',    color: '#ef4444', glow: 'rgba(239,68,68,0.4)'  },
  pending:   { label: 'Pending',   color: '#6b7280', glow: 'rgba(107,114,128,0.4)'},
};

/* ── Animated gear SVG ──────────────────────────────────────────────── */
function Gear({ size = 40, speed = '4s', direction = 'normal', color = '#00c8ff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40"
      style={{ animation: `vault-gear ${speed} linear ${direction} infinite` }}>
      <path fill={color} opacity="0.7" d="
        M20 14a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8z
        M18 2h4v4.2a14 14 0 0 1 3.9 1.6l3-3 2.8 2.8-3 3A14 14 0 0 1 30.2 14H34v4h-3.8a14 14 0 0 1-1.6 3.9l3 3-2.8 2.8-3-3A14 14 0 0 1 22 26.2V30h-4v-3.8a14 14 0 0 1-3.9-1.6l-3 3-2.8-2.8 3-3A14 14 0 0 1 9.8 18H6v-4h3.8a14 14 0 0 1 1.6-3.9l-3-3 2.8-2.8 3 3A14 14 0 0 1 18 6.2V2z" />
    </svg>
  );
}

/* ── Progress ring ──────────────────────────────────────────────────── */
function ProgressRing({ pct = 0, color = '#00c8ff', size = 80 }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="6"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)', filter: `drop-shadow(0 0 6px ${color})` }}
      />
      <text x={size/2} y={size/2+5} textAnchor="middle" fill="white" fontSize="13" fontWeight="700" fontFamily="monospace">
        {pct}%
      </text>
    </svg>
  );
}

/* ── Stat tile ──────────────────────────────────────────────────────── */
function StatTile({ label, value, icon: Icon, color = '#00c8ff' }) {
  return (
    <div className="flex items-center gap-3 rounded-xl p-3"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="rounded-lg p-2 shrink-0" style={{ background: `${color}22` }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</p>
        <p className="text-sm font-bold text-white font-mono truncate">{value}</p>
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────── */
export default function VaultModal({ system, onClose }) {
  const [detail, setDetail]   = useState(null);
  const [phase, setPhase]     = useState('opening'); // opening | open | closing
  const meta = STATUS_META[system?.buildStatus] ?? STATUS_META.pending;

  /* fetch extra detail (revenue etc.) */
  useEffect(() => {
    if (!system?.id) return;
    fetch(`/api/system-instances/${system.id}`, { headers: authHeaders() })
      .then(r => r.json()).then(d => setDetail(d)).catch(() => {});
  }, [system?.id]);

  /* Sequence: vault panels animate out → content fades in */
  useEffect(() => {
    const t = setTimeout(() => setPhase('open'), 900);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    setPhase('closing');
    setTimeout(onClose, 400);
  };

  const buildPct = system?.buildProgress ?? (system?.buildStatus === 'completed' ? 100 : system?.buildStatus === 'building' ? 55 : 0);
  const revenue  = detail?.lifetimeRevenueCents ?? 0;
  const daily    = detail?.dailyRevenueCents    ?? 0;

  return (
    <AnimatePresence>
      <motion.div
        key="vault-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ background: 'rgba(0,2,10,0.85)', backdropFilter: 'blur(12px)' }}
        onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>

        {/* Vault door panels */}
        <motion.div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Top */}
          <motion.div className="absolute top-0 left-0 right-0 h-1/2"
            style={{ background: 'linear-gradient(to bottom, #0a0f1e 0%, #0d1525 100%)', borderBottom: '3px solid #00c8ff55', zIndex: 10 }}
            animate={phase !== 'opening' ? { y: '-100%', opacity: 0 } : { y: 0 }}
            transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}>
            <div className="flex items-end justify-center pb-4 h-full gap-8">
              <Gear size={48} speed="3s" color="#00c8ff" />
              <Gear size={32} speed="2s" direction="reverse" color="#f59e0b" />
              <Gear size={56} speed="4s" color="#8b5cf6" />
            </div>
          </motion.div>
          {/* Bottom */}
          <motion.div className="absolute bottom-0 left-0 right-0 h-1/2"
            style={{ background: 'linear-gradient(to top, #0a0f1e 0%, #0d1525 100%)', borderTop: '3px solid #00c8ff55', zIndex: 10 }}
            animate={phase !== 'opening' ? { y: '100%', opacity: 0 } : { y: 0 }}
            transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}>
            <div className="flex items-start justify-center pt-4 h-full gap-8">
              <Gear size={40} speed="2.5s" direction="reverse" color="#00c8ff" />
              <Gear size={60} speed="5s" color="#22c55e" />
              <Gear size={36} speed="3s" direction="reverse" color="#f59e0b" />
            </div>
          </motion.div>
        </motion.div>

        {/* Content — fades in after panels open */}
        <motion.div
          className="relative z-20 w-full max-w-2xl mx-4 rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(10,20,40,0.97) 0%, rgba(5,10,20,0.99) 100%)',
            border: `1px solid ${meta.color}55`,
            boxShadow: `0 0 60px ${meta.glow}, 0 0 120px rgba(0,10,40,0.8)`,
          }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={phase === 'open' ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}>

          {/* Header */}
          <div className="relative flex items-center gap-4 px-6 py-5"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
            {/* Node icon */}
            <div className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
              style={{ background: `${meta.color}22`, border: `2px solid ${meta.color}`, color: meta.color,
                boxShadow: `0 0 20px ${meta.glow}`, fontFamily: 'monospace' }}>
              {(system?.name ?? 'P')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-white truncate" style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                {system?.name ?? 'Project'}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: meta.color }}>
                ● {meta.label}
              </p>
            </div>
            {/* Corner gears */}
            <div className="shrink-0 opacity-40"><Gear size={28} speed="6s" color={meta.color} /></div>
            <button onClick={handleClose}
              className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <X size={14} className="text-white/60" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            {/* Progress + key stats row */}
            <div className="flex items-center gap-6">
              <div className="shrink-0 flex flex-col items-center gap-1">
                <ProgressRing pct={buildPct} color={meta.color} size={88} />
                <p className="text-[10px] text-white/40 uppercase tracking-widest">Progress</p>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-3">
                <StatTile label="Lifetime Revenue" value={fmtRevenue(revenue)} icon={DollarSign} color="#22c55e" />
                <StatTile label="Daily Revenue"    value={fmtRevenue(daily)}   icon={TrendingUp}  color="#00c8ff" />
                <StatTile label="Status"           value={meta.label}          icon={Activity}    color={meta.color} />
                <StatTile label="Build Stage"      value={system?.buildStatus === 'building' ? 'In Progress' : meta.label}
                  icon={system?.buildStatus === 'building' ? Hammer : CheckCircle2} color="#8b5cf6" />
              </div>
            </div>

            {/* Blueprint / description */}
            {(system?.blueprint?.name || system?.blueprintName) && (
              <div className="rounded-xl p-4"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Blueprint</p>
                <p className="text-sm text-white/80 font-medium">{system?.blueprint?.name ?? system?.blueprintName}</p>
                {system?.blueprint?.description && (
                  <p className="text-xs text-white/40 mt-1 line-clamp-2">{system.blueprint.description}</p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => { window.location.href = `/systems/${system?.id}`; }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105 hover:brightness-110"
                style={{ background: `linear-gradient(135deg, ${meta.color}33, ${meta.color}11)`,
                  border: `1px solid ${meta.color}55`, color: meta.color }}>
                <ExternalLink size={14} /> View Full Details
              </button>
              <button
                onClick={() => { window.location.href = `/builder?system=${system?.id}`; }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105 hover:brightness-110"
                style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.4)', color: '#a78bfa' }}>
                <Settings size={14} /> Open in Builder
              </button>
            </div>
          </div>

          {/* Bottom scan line */}
          <div className="absolute bottom-0 left-0 right-0 h-px"
            style={{ background: `linear-gradient(to right, transparent, ${meta.color}, transparent)`, opacity: 0.6 }} />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
