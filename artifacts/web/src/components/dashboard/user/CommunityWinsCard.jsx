import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Star, TrendingUp, Users, ArrowRight } from 'lucide-react';

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
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const FALLBACK_EVENTS = [
  { memberName: 'Empire Member #4237', tier: 'Empire', milestoneLabel: '$10K', reachedAt: new Date(Date.now() - 7200000).toISOString(), daysSinceSignup: 42 },
  { memberName: 'Empire Member #1892', tier: 'Operator', milestoneLabel: '$1K', reachedAt: new Date(Date.now() - 18000000).toISOString(), daysSinceSignup: 15 },
  { memberName: 'Empire Member #7631', tier: 'Builder', milestoneLabel: '$500', reachedAt: new Date(Date.now() - 36000000).toISOString(), daysSinceSignup: 28 },
  { memberName: 'Empire Member #3015', tier: 'Empire', milestoneLabel: '$50K', reachedAt: new Date(Date.now() - 86400000).toISOString(), daysSinceSignup: 90 },
  { memberName: 'Empire Member #5544', tier: 'Operator', milestoneLabel: '$5K', reachedAt: new Date(Date.now() - 172800000).toISOString(), daysSinceSignup: 61 },
];

export default function CommunityWinsCard({ userId }) {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${BASE}api/success-wall`).then(r => r.json()).catch(() => ({ events: [] })),
      fetch(`${BASE}api/leaderboard/stats`).then(r => r.json()).catch(() => null),
    ]).then(([sw, st]) => {
      setEvents(sw.events ?? []);
      setStats(st);
      setLoading(false);
    });
  }, []);

  const displayEvents = events.length > 0 ? events.slice(0, 5) : FALLBACK_EVENTS;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <span className="text-[10px] font-mono font-bold text-white/40 uppercase tracking-[0.15em]">Community Wins</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <Link
          to="/leaderboard"
          className="flex items-center gap-1 text-[10px] font-mono text-primary/60 hover:text-primary transition-colors"
        >
          Full Leaderboard <ArrowRight className="w-2.5 h-2.5" />
        </Link>
      </div>

      {/* Platform stats strip */}
      {stats && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: TrendingUp, label: 'Earned', value: fmtDollars(stats.totalEarnedCents || 0), color: 'text-emerald-400' },
            { icon: Users, label: 'Members', value: (stats.totalMembers || 0).toLocaleString(), color: 'text-sky-400' },
            { icon: Star, label: 'Systems', value: (stats.activeSystems || 0).toString(), color: 'text-violet-400' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg bg-white/[0.03] border border-white/6">
              <Icon className={`w-3 h-3 ${color} mb-0.5`} />
              <span className={`text-sm font-black font-mono tabular-nums ${color}`}>{value}</span>
              <span className="text-[8px] font-mono text-white/20 uppercase">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Milestone events */}
      <div className="space-y-2">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5">
                <div className="w-5 h-5 rounded-full bg-white/8 animate-pulse shrink-0" />
                <div className="flex-1 space-y-1">
                  <div className="h-2 w-32 rounded bg-white/8 animate-pulse" />
                  <div className="h-1.5 w-20 rounded bg-white/5 animate-pulse" />
                </div>
              </div>
            ))
          : displayEvents.map((e, i) => (
              <div key={i} className="flex items-center gap-2.5 py-1 border-b border-white/4 last:border-0">
                <div className="shrink-0 w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <span className="text-[8px] text-emerald-400 font-bold">✓</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-white/50 truncate">
                    <span className="text-white/70">{e.memberName}</span>
                    {' '}hit{' '}
                    <span className="text-emerald-400 font-bold">{e.milestoneLabel}</span>
                    {e.daysSinceSignup > 0 && (
                      <span className="text-white/25"> · {e.daysSinceSignup}d after joining</span>
                    )}
                  </p>
                </div>
                <span className="shrink-0 text-[8px] font-mono text-white/20">{timeAgo(e.reachedAt)}</span>
              </div>
            ))
        }
      </div>
    </div>
  );
}
