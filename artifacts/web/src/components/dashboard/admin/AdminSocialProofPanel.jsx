import React, { useState, useEffect } from 'react';
import { Trophy, Users, TrendingUp, Star, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

const BASE = import.meta.env.BASE_URL ?? '/';

function fmtDollars(cents) {
  if (cents >= 100000000) return `$${(cents / 100000000).toFixed(2)}M`;
  if (cents >= 100000) return `$${(cents / 100000).toFixed(1)}K`;
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const MILESTONE_AMOUNTS = [100, 10000, 50000, 100000, 500000, 1000000, 5000000, 10000000];
const MILESTONE_LABELS = {
  100: '$1', 10000: '$100', 50000: '$500',
  100000: '$1K', 500000: '$5K', 1000000: '$10K',
  5000000: '$50K', 10000000: '$100K',
};

const TIER_COLORS = {
  Empire: 'text-violet-300 bg-violet-500/10 border-violet-500/20',
  Operator: 'text-sky-300 bg-sky-500/10 border-sky-500/20',
  Builder: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  Free: 'text-white/30 bg-white/5 border-white/10',
  Member: 'text-white/30 bg-white/5 border-white/10',
};

export default function AdminSocialProofPanel() {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [filterTier, setFilterTier] = useState('all');

  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('sbep_auth_token') : null;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const load = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const [sw, st, lb] = await Promise.all([
        fetch(`${BASE}api/success-wall`, { headers }).then(r => r.json()).catch(() => ({ events: [] })),
        fetch(`${BASE}api/leaderboard/stats`, { headers }).then(r => r.json()).catch(() => null),
        fetch(`${BASE}api/leaderboard`, { headers }).then(r => r.json()).catch(() => ({ leaderboard: [] })),
      ]);
      setEvents(sw.events ?? []);
      setStats(st);
      setLeaderboard(lb.leaderboard ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const milestoneCount = MILESTONE_AMOUNTS.reduce((acc, a) => {
    acc[a] = events.filter(e => e.milestoneAmount === a).length;
    return acc;
  }, {});

  const filtered = filterTier === 'all' ? events : events.filter(e => e.tier === filterTier);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Social Proof Wall
          </h2>
          <p className="text-sm text-white/40 mt-0.5">Milestone achievements and earnings leaderboard data</p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border border-white/10 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all disabled:opacity-40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Platform stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: TrendingUp, label: 'Total Platform Earnings', value: fmtDollars(stats.totalEarnedCents || 0), color: 'text-emerald-400', accent: 'rgba(16,185,129,0.3)' },
            { icon: Users, label: 'Active Members', value: (stats.totalMembers || 0).toLocaleString(), color: 'text-sky-400', accent: 'rgba(56,189,248,0.3)' },
            { icon: Star, label: 'Active Systems', value: (stats.activeSystems || 0).toLocaleString(), color: 'text-violet-400', accent: 'rgba(139,92,246,0.3)' },
            { icon: Trophy, label: 'Milestone Events', value: events.length.toString(), color: 'text-yellow-400', accent: 'rgba(251,191,36,0.3)' },
          ].map(({ icon: Icon, label, value, color, accent }) => (
            <div key={label} className="p-4 rounded-xl border border-white/8 bg-white/[0.02]" style={{ boxShadow: `inset 0 0 30px ${accent}10` }}>
              <Icon className={`w-4 h-4 ${color} mb-2`} />
              <p className={`text-2xl font-black font-mono tabular-nums ${color}`}>{value}</p>
              <p className="text-[10px] font-mono text-white/30 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Milestone distribution */}
      <div className="p-5 rounded-xl border border-white/8 bg-white/[0.02]">
        <h3 className="text-xs font-mono font-bold text-white/40 uppercase tracking-widest mb-4">Milestone Distribution</h3>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {MILESTONE_AMOUNTS.map(amount => {
            const cnt = milestoneCount[amount] || 0;
            const maxCnt = Math.max(...Object.values(milestoneCount), 1);
            const pct = Math.round((cnt / maxCnt) * 100);
            return (
              <div key={amount} className="flex flex-col items-center gap-1.5">
                <div className="w-full h-12 bg-white/5 rounded-lg relative overflow-hidden">
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary/60 to-primary/20 rounded-lg transition-all"
                    style={{ height: `${Math.max(pct, cnt > 0 ? 8 : 0)}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-mono font-bold text-white/60">
                    {cnt}
                  </span>
                </div>
                <span className="text-[9px] font-mono text-white/30">{MILESTONE_LABELS[amount]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top leaderboard */}
      <div className="p-5 rounded-xl border border-white/8 bg-white/[0.02]">
        <h3 className="text-xs font-mono font-bold text-white/40 uppercase tracking-widest mb-4">Top Earners (Anonymized)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/8">
                {['Rank', 'Member', 'Tier', 'Lifetime', 'This Month', 'Systems'].map(h => (
                  <th key={h} className="text-left pb-2 pr-4 text-[10px] font-mono text-white/25 uppercase tracking-widest font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/4">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="py-2 pr-4">
                          <div className="h-3 w-16 rounded bg-white/8 animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                : leaderboard.slice(0, 10).map((row) => (
                    <tr key={row.rank} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 pr-4 font-mono text-white/30">#{row.rank}</td>
                      <td className="py-2.5 pr-4 text-white/70">{row.displayName}</td>
                      <td className="py-2.5 pr-4">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border uppercase tracking-wide ${TIER_COLORS[row.tier] ?? TIER_COLORS.Member}`}>
                          {row.tier}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 font-mono font-bold text-emerald-400">{fmtDollars(row.lifetimeCents)}</td>
                      <td className="py-2.5 pr-4 font-mono text-white/40">{fmtDollars(row.monthlyCents)}</td>
                      <td className="py-2.5 pr-4 font-mono text-white/40">{row.systemCount}</td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* Milestone events log */}
      <div className="p-5 rounded-xl border border-white/8 bg-white/[0.02]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-mono font-bold text-white/40 uppercase tracking-widest">Milestone Events</h3>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-white/25">Filter:</span>
            {['all', 'Empire', 'Operator', 'Builder', 'Free'].map(tier => (
              <button
                key={tier}
                onClick={() => setFilterTier(tier)}
                className={`px-2 py-0.5 rounded text-[9px] font-mono border transition-all ${
                  filterTier === tier
                    ? 'border-primary/50 bg-primary/10 text-primary'
                    : 'border-white/10 text-white/30 hover:text-white/60'
                }`}
              >
                {tier}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2 px-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/10 animate-pulse" />
                  <div className="h-3 w-full max-w-sm rounded bg-white/8 animate-pulse" />
                </div>
              ))
            : filtered.length === 0
              ? <p className="text-center text-xs font-mono text-white/20 py-6">No milestone events yet</p>
              : filtered.map((e, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/[0.02] transition-colors">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-[11px] text-white/60 flex-1">
                      <span className="text-white/80">{e.memberName}</span> crossed{' '}
                      <span className="text-emerald-400 font-bold">{e.milestoneLabel}</span>
                    </span>
                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-mono border ${TIER_COLORS[e.tier] ?? TIER_COLORS.Member}`}>
                      {e.tier}
                    </span>
                    {e.daysSinceSignup > 0 && (
                      <span className="shrink-0 text-[9px] font-mono text-white/20">{e.daysSinceSignup}d in</span>
                    )}
                    <span className="shrink-0 text-[9px] font-mono text-white/15">{fmtDate(e.reachedAt)}</span>
                  </div>
                ))
          }
        </div>
      </div>

    </div>
  );
}
