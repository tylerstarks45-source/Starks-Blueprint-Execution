import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Layers, Server, Coins, Crown, Zap, ArrowRight, Cpu } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const TIER_COLORS = {
  starter:  { badge: 'bg-zinc-700/60 text-zinc-300 border-zinc-600/40', glow: 'shadow-zinc-900/30' },
  builder:  { badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30', glow: 'shadow-blue-900/30' },
  operator: { badge: 'bg-violet-500/15 text-violet-300 border-violet-500/30', glow: 'shadow-violet-900/30' },
  empire:   { badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30', glow: 'shadow-amber-900/30' },
};

const TIER_ICON = {
  starter: null,
  builder: <Zap className="w-3 h-3" />,
  operator: <Crown className="w-3 h-3" />,
  empire: <Crown className="w-3 h-3" />,
};

const UserDashboardHeader = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ balance: 0, total: 0, active: 0 });

  const tier = (currentUser?.membershipTier || 'starter').toLowerCase();
  const tierCfg = TIER_COLORS[tier] || TIER_COLORS.starter;
  const name = currentUser?.name || currentUser?.email?.split('@')[0] || 'Commander';
  const hours = new Date().getHours();
  const greeting = hours < 12 ? 'Good morning' : hours < 18 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    const load = async () => {
      try {
        const [meRes, siRes] = await Promise.all([
          fetch('/api/credits/me', { headers: authHeaders() }),
          fetch('/api/system-instances', { headers: authHeaders() }),
        ]);
        const me = meRes.ok ? await meRes.json() : {};
        const instances = siRes.ok ? await siRes.json() : [];
        const arr = Array.isArray(instances) ? instances : [];
        const active = arr.filter(s =>
          ['active', 'building', 'running'].includes((s.buildStatus || '').toLowerCase())
        ).length;
        setStats({ balance: me.balance ?? 0, total: arr.length, active });
      } catch {}
    };
    load();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-br from-black/70 via-black/50 to-primary/5 backdrop-blur-lg p-6 md:p-8"
    >
      {/* Ambient glow */}
      <div className="absolute -top-16 -right-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-secondary/5 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">

        {/* Left: greeting + tier */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className={`inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full border font-semibold uppercase tracking-widest ${tierCfg.badge}`}>
              {TIER_ICON[tier]} {tier} tier
            </span>
            <span className="text-xs text-muted-foreground/50 font-mono">
              {currentUser?.email}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground font-mono mb-1">
            {greeting}, {name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Your automation infrastructure is ready. What will you build today?
          </p>
        </div>

        {/* Right: stat pills */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/4 border border-white/8 backdrop-blur-sm">
            <Layers className="w-4 h-4 text-primary shrink-0" />
            <div>
              <p className="text-xl font-bold font-mono leading-none text-foreground">{stats.total}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Systems</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/4 border border-white/8 backdrop-blur-sm">
            <Server className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <p className="text-xl font-bold font-mono leading-none text-emerald-400">{stats.active}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Active</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/4 border border-white/8 backdrop-blur-sm">
            <Coins className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <p className="text-xl font-bold font-mono leading-none text-amber-400">{stats.balance.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Credits</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/dashboard/system-stats')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/6 border border-white/10 text-foreground font-semibold text-sm hover:bg-white/10 active:scale-[0.97] transition-all whitespace-nowrap"
          >
            <Cpu className="w-4 h-4 text-primary" />
            Command Center
          </button>
          <button
            onClick={() => navigate('/blueprints')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 active:scale-[0.97] transition-all shadow-lg shadow-primary/20 whitespace-nowrap"
          >
            <Zap className="w-4 h-4" />
            Build New System
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default UserDashboardHeader;
