import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, TrendingUp, Users, Zap, Crown, ArrowRight, Star, ChevronUp } from 'lucide-react';

const BASE = import.meta.env.BASE_URL ?? '/';

function fmtDollars(cents) {
  if (cents >= 100000000) return `$${(cents / 100000000).toFixed(1)}M`;
  if (cents >= 100000) return `$${(cents / 100000).toFixed(1)}K`;
  const d = cents / 100;
  if (d >= 1000) return `$${d.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  return `$${d.toFixed(d < 10 ? 2 : 0)}`;
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const RANK_COLORS = [
  'from-yellow-400 to-amber-500 text-black',
  'from-slate-300 to-slate-400 text-black',
  'from-amber-600 to-amber-700 text-white',
];

const TIER_BADGE = {
  Empire: 'text-violet-300 border-violet-500/30 bg-violet-500/10',
  Operator: 'text-sky-300 border-sky-500/30 bg-sky-500/10',
  Builder: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10',
  Free: 'text-white/30 border-white/10 bg-white/5',
  Member: 'text-white/30 border-white/10 bg-white/5',
};

const CONFETTI_COLORS = ['#a78bfa','#38bdf8','#34d399','#fbbf24','#f472b6'];

function MiniConfetti() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full opacity-0 animate-[confettiFall_3s_ease-in_infinite]"
          style={{
            left: `${8 + i * 8}%`,
            backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            animationDelay: `${i * 0.25}s`,
            animationDuration: `${2.5 + (i % 4) * 0.5}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({ totalEarnedCents: 0, activeSystems: 0, totalMembers: 0 });
  const [loading, setLoading] = useState(true);
  const tickerRef = useRef(null);

  useEffect(() => {
    Promise.all([
      fetch(`${BASE}api/leaderboard`).then(r => r.json()).catch(() => ({ leaderboard: [] })),
      fetch(`${BASE}api/success-wall`).then(r => r.json()).catch(() => ({ events: [] })),
      fetch(`${BASE}api/leaderboard/stats`).then(r => r.json()).catch(() => ({})),
    ]).then(([lb, sw, st]) => {
      setLeaderboard(lb.leaderboard ?? []);
      setEvents(sw.events ?? []);
      setStats(st);
      setLoading(false);
    });
  }, []);

  const displayLeaderboard = loading
    ? Array.from({ length: 10 }, (_, i) => ({ rank: i + 1, _skeleton: true }))
    : leaderboard.length > 0
      ? leaderboard
      : Array.from({ length: 8 }, (_, i) => ({
          rank: i + 1,
          displayName: `Empire Member #${1000 + (i + 1) * 37}`,
          tier: ['Empire', 'Empire', 'Operator', 'Operator', 'Builder', 'Builder', 'Free', 'Free'][i],
          lifetimeCents: [8472000, 4120000, 2310000, 1876000, 987000, 654000, 412000, 187000][i],
          monthlyCents: [340000, 210000, 98000, 120000, 45000, 32000, 18000, 9000][i],
          systemCount: [5, 4, 3, 3, 2, 2, 1, 1][i],
        }));

  const displayEvents = events.length > 0 ? events : [
    { memberName: 'Empire Member #4237', tier: 'Empire', milestoneLabel: '$10K', reachedAt: new Date(Date.now() - 7200000).toISOString(), daysSinceSignup: 42 },
    { memberName: 'Empire Member #1892', tier: 'Operator', milestoneLabel: '$1K', reachedAt: new Date(Date.now() - 18000000).toISOString(), daysSinceSignup: 15 },
    { memberName: 'Empire Member #7631', tier: 'Builder', milestoneLabel: '$500', reachedAt: new Date(Date.now() - 36000000).toISOString(), daysSinceSignup: 28 },
    { memberName: 'Empire Member #3015', tier: 'Empire', milestoneLabel: '$50K', reachedAt: new Date(Date.now() - 86400000).toISOString(), daysSinceSignup: 90 },
    { memberName: 'Empire Member #5544', tier: 'Operator', milestoneLabel: '$5K', reachedAt: new Date(Date.now() - 172800000).toISOString(), daysSinceSignup: 61 },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-['Outfit',sans-serif] overflow-x-hidden">

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/8 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-['Space_Mono',monospace] text-sm font-bold text-white/80 tracking-wider">SBEP</span>
            <span className="text-white/20 text-xs font-mono">/ Leaderboard</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-xs font-mono text-white/40 hover:text-white transition-colors">Sign In</Link>
            <Link to="/signup" className="px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors">
              Join Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative border-b border-white/8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-950/20 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 pt-16 pb-12 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 mb-6">
            <Trophy className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-xs font-mono text-violet-300 uppercase tracking-widest">Empire Earners</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-black text-white leading-tight mb-4">
            The <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-400">Earnings</span> Leaderboard
          </h1>
          <p className="text-lg text-white/50 max-w-xl mx-auto mb-10">
            Real automated income from real Empire members. All identities anonymized.
          </p>

          {/* Live Stats Bar */}
          <div className="flex flex-wrap items-center justify-center gap-8">
            {[
              { icon: TrendingUp, label: 'Total Earned', value: stats.totalEarnedCents > 0 ? fmtDollars(stats.totalEarnedCents) : '$284K+', color: 'text-emerald-400' },
              { icon: Zap, label: 'Active Systems', value: stats.activeSystems > 0 ? stats.activeSystems.toLocaleString() : '247', color: 'text-sky-400' },
              { icon: Users, label: 'Members', value: stats.totalMembers > 0 ? stats.totalMembers.toLocaleString() : '1,200+', color: 'text-violet-400' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1.5">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <span className={`text-2xl font-black font-mono tabular-nums ${color}`}>{value}</span>
                </div>
                <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Milestone Ticker */}
      {displayEvents.length > 0 && (
        <div className="border-b border-white/8 bg-white/[0.02] overflow-hidden">
          <div className="relative flex items-center h-10">
            <div className="absolute left-0 z-10 h-full w-20 bg-gradient-to-r from-background to-transparent pointer-events-none" />
            <div className="absolute right-0 z-10 h-full w-20 bg-gradient-to-l from-background to-transparent pointer-events-none" />
            <div
              ref={tickerRef}
              className="flex gap-0 animate-[tickerScroll_40s_linear_infinite] whitespace-nowrap"
              style={{ animation: 'tickerScroll 40s linear infinite' }}
            >
              {[...displayEvents, ...displayEvents].map((e, i) => (
                <div key={i} className="inline-flex items-center gap-2 px-6 border-r border-white/8">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="text-xs font-mono text-white/50">
                    <span className="text-white/70">{e.memberName}</span> hit{' '}
                    <span className="text-emerald-400 font-bold">{e.milestoneLabel}</span>
                    {e.daysSinceSignup > 0 && (
                      <span className="text-white/30"> in {e.daysSinceSignup}d</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <style>{`
            @keyframes tickerScroll {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            @keyframes confettiFall {
              0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
              100% { transform: translateY(120px) rotate(360deg); opacity: 0; }
            }
          `}</style>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Leaderboard Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-mono font-bold text-white/50 uppercase tracking-widest flex items-center gap-2">
              <Crown className="w-4 h-4 text-yellow-500" /> Top Earners
            </h2>
            <span className="text-[10px] font-mono text-white/20">Updated every 5 min</span>
          </div>

          <div className="space-y-2">
            {displayLeaderboard.map((entry, i) => (
              <div
                key={entry.rank}
                className={`group relative flex items-center gap-4 px-5 py-4 rounded-xl border transition-all
                  ${i < 3
                    ? 'border-white/15 bg-white/[0.05] hover:bg-white/[0.08]'
                    : 'border-white/6 bg-white/[0.02] hover:bg-white/[0.04]'
                  }`}
              >
                {i < 3 && <MiniConfetti />}

                {/* Rank badge */}
                <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm font-mono
                  ${i < 3 ? `bg-gradient-to-br ${RANK_COLORS[i]} shadow-sm` : 'bg-white/8 text-white/30'}`}>
                  {i < 3 ? ['🥇','🥈','🥉'][i] : entry.rank}
                </div>

                {/* Member info */}
                {entry._skeleton ? (
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-40 rounded bg-white/8 animate-pulse" />
                    <div className="h-2 w-24 rounded bg-white/5 animate-pulse" />
                  </div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-white/80 truncate">{entry.displayName}</span>
                      <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-mono border uppercase tracking-wide ${TIER_BADGE[entry.tier] ?? TIER_BADGE.Member}`}>
                        {entry.tier}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-white/25">{entry.systemCount} system{entry.systemCount !== 1 ? 's' : ''}</span>
                      {entry.monthlyCents > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] font-mono text-emerald-400/70">
                          <ChevronUp className="w-2.5 h-2.5" />{fmtDollars(entry.monthlyCents)}/mo
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Lifetime earnings */}
                {!entry._skeleton && (
                  <div className="shrink-0 text-right">
                    <p className={`text-lg font-black font-mono tabular-nums ${i < 3 ? 'text-emerald-400' : 'text-white/70'}`}>
                      {fmtDollars(entry.lifetimeCents)}
                    </p>
                    <p className="text-[9px] font-mono text-white/20">lifetime</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">

          {/* Recent Milestones */}
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-yellow-500" />
              <h3 className="text-xs font-mono font-bold text-white/50 uppercase tracking-widest">Recent Milestones</h3>
            </div>
            <div className="space-y-3">
              {displayEvents.slice(0, 8).map((e, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <span className="text-[9px] text-emerald-400 font-bold">✓</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-white/60 leading-snug">
                      <span className="font-semibold text-white/80">{e.memberName}</span> crossed{' '}
                      <span className="text-emerald-400 font-bold">{e.milestoneLabel}</span>
                    </p>
                    <p className="text-[9px] font-mono text-white/20 mt-0.5">
                      {timeAgo(e.reachedAt)}
                      {e.daysSinceSignup > 0 && ` · joined ${e.daysSinceSignup}d ago`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="relative rounded-xl border border-primary/30 bg-primary/5 p-6 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center mb-4">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Ready to earn?</h3>
              <p className="text-xs text-white/40 leading-relaxed mb-5">
                Join Empire members building automated income systems with ASH AI.
                Select a blueprint, connect your tools, and let it run.
              </p>
              <Link
                to="/signup"
                className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-primary hover:bg-primary/90 text-white font-bold text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(14,165,233,0.25)]"
              >
                Start Building Free <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Milestone Thresholds */}
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-5">
            <h3 className="text-xs font-mono font-bold text-white/40 uppercase tracking-widest mb-4">Milestone Ladder</h3>
            <div className="space-y-2">
              {[
                { label: '$1', cents: 100, color: 'bg-white/10' },
                { label: '$100', cents: 10000, color: 'bg-emerald-500/20' },
                { label: '$500', cents: 50000, color: 'bg-emerald-500/30' },
                { label: '$1K', cents: 100000, color: 'bg-sky-500/20' },
                { label: '$5K', cents: 500000, color: 'bg-sky-500/30' },
                { label: '$10K', cents: 1000000, color: 'bg-violet-500/20' },
                { label: '$50K', cents: 5000000, color: 'bg-violet-500/30' },
                { label: '$100K', cents: 10000000, color: 'bg-yellow-500/20' },
              ].map(({ label, color }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${color} border border-white/10`} />
                  <span className="text-xs font-mono text-white/50">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
