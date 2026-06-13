import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  User, Mail, Calendar, Coins, Brain, MessageSquare, Cpu,
  CheckCircle2, Clock, AlertTriangle, Loader2, RefreshCw,
  TrendingUp, Shield, Activity,
} from 'lucide-react';
import adminApi from '@/lib/adminApi.js';
import { num, usd, compact } from '@/lib/adminFormat.js';

const TIER_COLORS = {
  empire:   'bg-violet-500/15 text-violet-400 border-violet-500/30',
  operator: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  builder:  'bg-blue-500/15 text-blue-400 border-blue-500/30',
  starter:  'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  free:     'bg-white/8 text-white/45 border-white/15',
};

const BUILD_STATUS_COLORS = {
  complete:   'bg-emerald-500/15 text-emerald-400',
  running:    'bg-blue-500/15 text-blue-400',
  failed:     'bg-rose-500/15 text-rose-400',
  pending:    'bg-amber-500/15 text-amber-400',
};

const TABS = [
  { id: 'overview',       label: 'Overview',       icon: User },
  { id: 'systems',        label: 'Systems',         icon: Cpu },
  { id: 'conversations',  label: 'Conversations',   icon: MessageSquare },
  { id: 'ai-usage',       label: 'AI Usage',        icon: Brain },
  { id: 'credits',        label: 'Credits',         icon: Coins },
];

const fmtDate = (str) => {
  if (!str) return '—';
  const d = new Date(str);
  return d.toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const fmtDateShort = (str) => {
  if (!str) return '—';
  const d = new Date(str);
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const initials = (name, email) => {
  if (name?.trim()) return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
  if (email) return email.slice(0, 2).toUpperCase();
  return '??';
};

const AdminUserDetailPanel = ({ userId, onClose, onEdit, onAdjustCredits }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('overview');

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      setData(await adminApi.getUserDetail(userId));
    } catch (e) {
      setError(e.message || 'Failed to load user details');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    setTab('overview');
    load();
  }, [load]);

  const open = !!userId;
  const user = data?.user;
  const systems = data?.systems ?? [];
  const sessions = data?.sessions ?? [];
  const usage = data?.usageSummary ?? { requests: 0, tokens: 0, costUsd: 0 };
  const recentUsage = data?.recentUsage ?? [];
  const creditHistory = data?.creditHistory ?? [];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl w-full max-h-[90vh] flex flex-col p-0 gap-0 bg-[#07070f] border border-white/12">

        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-white/8 shrink-0">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 text-primary font-bold text-lg font-mono">
              {loading || !user ? '…' : initials(user.name, user.email)}
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-white text-lg font-bold leading-tight mb-1">
                {loading ? <Skeleton className="h-5 w-40" /> : (user?.name || user?.email || 'Unknown User')}
              </DialogTitle>
              {!loading && user?.name && (
                <p className="text-sm text-white/45 font-mono">{user.email}</p>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {loading ? <Skeleton className="h-5 w-20" /> : (
                  <>
                    <Badge className={`text-[10px] border capitalize ${TIER_COLORS[user?.membershipTier?.toLowerCase()] ?? TIER_COLORS.free}`}>
                      {user?.membershipTier ?? 'free'}
                    </Badge>
                    <Badge variant="outline" className={`text-[10px] ${user?.active ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-rose-400 border-rose-500/30 bg-rose-500/10'}`}>
                      {user?.active ? 'Active' : 'Suspended'}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] text-white/35 border-white/12">
                      {user?.role}
                    </Badge>
                    <span className="text-[10px] text-white/30 font-mono flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Joined {fmtDateShort(user?.createdAt)}
                    </span>
                  </>
                )}
              </div>
            </div>
            {/* Quick action buttons */}
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" className="h-8 text-xs border-white/15 text-white/60 hover:text-white hover:border-white/30"
                onClick={() => onEdit(user)} disabled={!user}>
                Edit Tier
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs border-primary/30 text-primary hover:bg-primary/10"
                onClick={() => onAdjustCredits(user)} disabled={!user}>
                Adjust Credits
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-white/40 hover:text-white" onClick={load} disabled={loading}>
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Stat row */}
          {!loading && user && (
            <div className="grid grid-cols-4 gap-3 mt-4">
              {[
                { label: 'Credits', value: num(user.creditsBalance), icon: Coins, color: 'text-amber-400' },
                { label: 'AI Requests', value: compact(usage.requests), icon: Brain, color: 'text-primary' },
                { label: 'Tokens Used', value: compact(usage.tokens), icon: Activity, color: 'text-cyan-400' },
                { label: 'Systems Built', value: num(systems.length), icon: Cpu, color: 'text-emerald-400' },
              ].map(s => (
                <div key={s.label} className="bg-white/3 border border-white/8 rounded-lg px-3 py-2">
                  <p className="text-[9px] uppercase tracking-widest text-white/30 font-mono mb-0.5">{s.label}</p>
                  <p className={`text-lg font-bold font-mono ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
          )}
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b border-white/8 shrink-0 px-2">
          {TABS.map(t => {
            const TIcon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-mono font-semibold border-b-2 transition-colors ${
                  tab === t.id
                    ? 'text-primary border-primary'
                    : 'text-white/35 border-transparent hover:text-white/60'
                }`}
              >
                <TIcon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 min-h-0">
          {error && (
            <div className="flex items-center gap-2 text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-3 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          )}

          {!loading && !error && tab === 'overview' && user && (
            <div className="space-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/30 font-mono font-bold mb-2">Account Info</p>
                <div className="bg-white/3 border border-white/8 rounded-xl divide-y divide-white/6">
                  {[
                    { label: 'Email', value: user.email, icon: Mail },
                    { label: 'Name', value: user.name || '—', icon: User },
                    { label: 'Role', value: user.role, icon: Shield },
                    { label: 'Membership', value: `${user.membershipTier ?? 'free'} · ${user.membershipStatus ?? 'inactive'}`, icon: TrendingUp },
                    { label: 'Credits Balance', value: num(user.creditsBalance), icon: Coins },
                    { label: 'Status', value: user.active ? 'Active' : 'Suspended', icon: CheckCircle2 },
                    { label: 'Member Since', value: fmtDate(user.createdAt), icon: Calendar },
                    { label: 'Last Updated', value: fmtDate(user.updatedAt), icon: Clock },
                  ].map(row => {
                    const RIcon = row.icon;
                    return (
                      <div key={row.label} className="flex items-center gap-3 px-4 py-2.5">
                        <RIcon className="w-3.5 h-3.5 text-white/30 shrink-0" />
                        <span className="text-[11px] text-white/40 font-mono w-28 shrink-0">{row.label}</span>
                        <span className="text-sm text-white/80 font-mono truncate">{row.value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/30 font-mono font-bold mb-2">AI Usage Summary</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Total Requests', value: num(usage.requests) },
                    { label: 'Total Tokens', value: compact(usage.tokens) },
                    { label: 'Est. Cost', value: usd(usage.costUsd) },
                  ].map(s => (
                    <div key={s.label} className="bg-white/3 border border-white/8 rounded-lg px-3 py-2.5 text-center">
                      <p className="text-[9px] uppercase tracking-widest text-white/30 font-mono">{s.label}</p>
                      <p className="text-xl font-bold font-mono text-white/80 mt-0.5">{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {sessions.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/30 font-mono font-bold mb-2">Recent Conversations ({sessions.length})</p>
                  <div className="space-y-1">
                    {sessions.slice(0, 5).map(s => (
                      <div key={s.id} className="flex items-center gap-3 bg-white/3 border border-white/6 rounded-lg px-3 py-2">
                        <MessageSquare className="w-3.5 h-3.5 text-white/25 shrink-0" />
                        <span className="flex-1 text-sm text-white/65 truncate font-mono">{s.title}</span>
                        <span className="text-[10px] text-white/30 font-mono shrink-0">{s.messageCount} msgs</span>
                        <span className="text-[10px] text-white/25 font-mono shrink-0">{fmtDateShort(s.updatedAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && !error && tab === 'systems' && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/30 font-mono font-bold mb-3">
                System Instances ({systems.length})
              </p>
              {systems.length === 0 ? (
                <div className="text-center py-12 text-white/25 text-sm">No systems built yet.</div>
              ) : (
                <div className="space-y-2">
                  {systems.map(s => (
                    <div key={s.id} className="flex items-center gap-3 bg-white/3 border border-white/8 rounded-xl px-4 py-3">
                      <Cpu className="w-4 h-4 text-white/30 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/80 font-semibold truncate">{s.name}</p>
                        <p className="text-[10px] text-white/30 font-mono">Blueprint #{s.blueprintId} · Updated {fmtDateShort(s.updatedAt)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${BUILD_STATUS_COLORS[s.buildStatus] ?? 'bg-white/8 text-white/35'}`}>
                          {s.buildStatus}
                        </span>
                        <span className="text-[10px] text-white/30 font-mono">{fmtDateShort(s.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!loading && !error && tab === 'conversations' && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/30 font-mono font-bold mb-3">
                Chat Sessions ({sessions.length})
              </p>
              {sessions.length === 0 ? (
                <div className="text-center py-12 text-white/25 text-sm">No conversations yet.</div>
              ) : (
                <div className="space-y-2">
                  {sessions.map(s => (
                    <div key={s.id} className="flex items-center gap-3 bg-white/3 border border-white/8 rounded-xl px-4 py-3">
                      <MessageSquare className="w-4 h-4 text-white/30 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/80 font-semibold truncate">{s.title}</p>
                        <p className="text-[10px] text-white/30 font-mono">Started {fmtDateShort(s.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                          s.phase === 'complete' ? 'bg-emerald-500/15 text-emerald-400'
                          : s.phase === 'building' ? 'bg-blue-500/15 text-blue-400'
                          : s.phase === 'collecting' ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-white/6 text-white/30'
                        }`}>
                          {s.phase}
                        </span>
                        <span className="text-[10px] text-white/40 font-mono">{s.messageCount} msgs</span>
                        <span className="text-[10px] text-white/25 font-mono">{fmtDateShort(s.updatedAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!loading && !error && tab === 'ai-usage' && (
            <div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'Total Requests', value: num(usage.requests), color: 'text-primary' },
                  { label: 'Total Tokens', value: compact(usage.tokens), color: 'text-cyan-400' },
                  { label: 'Est. Cost', value: usd(usage.costUsd), color: 'text-amber-400' },
                ].map(s => (
                  <div key={s.label} className="bg-white/3 border border-white/8 rounded-lg px-3 py-2.5 text-center">
                    <p className="text-[9px] uppercase tracking-widest text-white/30 font-mono">{s.label}</p>
                    <p className={`text-xl font-bold font-mono mt-0.5 ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] uppercase tracking-widest text-white/30 font-mono font-bold mb-2">Recent Requests ({recentUsage.length})</p>
              {recentUsage.length === 0 ? (
                <div className="text-center py-12 text-white/25 text-sm">No AI requests yet.</div>
              ) : (
                <div className="space-y-1">
                  {recentUsage.map(u => (
                    <div key={u.id} className="flex items-center gap-3 bg-white/3 border border-white/6 rounded-lg px-3 py-2">
                      <Brain className="w-3.5 h-3.5 text-white/25 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-white/60 font-mono truncate">{u.model}</p>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${u.success === 'true' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {u.success === 'true' ? 'OK' : 'ERR'}
                      </span>
                      <span className="text-[10px] text-white/40 font-mono shrink-0">{compact(u.totalTokens)} tok</span>
                      <span className="text-[10px] text-white/40 font-mono shrink-0">{usd(u.estimatedCost)}</span>
                      <span className="text-[10px] text-white/25 font-mono shrink-0">{fmtDateShort(u.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!loading && !error && tab === 'credits' && (
            <div>
              <div className="flex items-center gap-3 mb-4 bg-white/3 border border-white/8 rounded-xl px-4 py-3">
                <Coins className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-sm text-white/60 font-mono">Current Balance</span>
                <span className="ml-auto text-xl font-bold font-mono text-amber-400">{num(user?.creditsBalance)}</span>
              </div>
              <p className="text-[10px] uppercase tracking-widest text-white/30 font-mono font-bold mb-2">Transaction History ({creditHistory.length})</p>
              {creditHistory.length === 0 ? (
                <div className="text-center py-12 text-white/25 text-sm">No transactions yet.</div>
              ) : (
                <div className="space-y-1">
                  {creditHistory.map(tx => (
                    <div key={tx.id} className="flex items-center gap-3 bg-white/3 border border-white/6 rounded-lg px-3 py-2">
                      <span className={`text-sm font-bold font-mono w-16 shrink-0 ${tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {tx.amount > 0 ? '+' : ''}{num(tx.amount)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-white/55 font-mono truncate">{tx.reason || tx.type}</p>
                        {tx.model && <p className="text-[9px] text-white/25 font-mono">{tx.model}</p>}
                      </div>
                      <span className="text-[10px] text-white/35 font-mono shrink-0">Bal: {num(tx.balanceAfter)}</span>
                      <span className="text-[10px] text-white/25 font-mono shrink-0">{fmtDateShort(tx.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminUserDetailPanel;
