import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  CreditCard, Users, TrendingUp, DollarSign, RefreshCw, CheckCircle2,
  AlertTriangle, UserPlus, ExternalLink, Loader2, Zap, ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import adminApi from '@/lib/adminApi.js';

const usd = (cents) => {
  if (!cents && cents !== 0) return '—';
  return `$${(cents / 100).toFixed(2)}`;
};

const fmtDate = (unix) => {
  if (!unix) return '—';
  return new Date(unix * 1000).toLocaleString([], {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const fmtIso = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString([], {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const TIER_COLORS = {
  empire:   'bg-violet-500/15 text-violet-400 border-violet-500/30',
  operator: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  builder:  'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
};

const STATUS_COLORS = {
  succeeded: 'bg-emerald-500/10 text-emerald-400',
  active:    'bg-emerald-500/10 text-emerald-400',
  failed:    'bg-rose-500/10 text-rose-400',
  refunded:  'bg-amber-500/10 text-amber-400',
  pending:   'bg-blue-500/10 text-blue-400',
};

const TABS = ['overview', 'customers', 'charges', 'subscriptions', 'unresolved'];

const AdminStripePanel = () => {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [tab, setTab]           = useState('overview');
  const [stripeStatus, setStripeStatus] = useState(null);

  // Unresolved sessions
  const [sessions, setSessions]         = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Provision dialog
  const [provisionOpen, setProvisionOpen]   = useState(false);
  const [provisionCustomer, setProvisionCustomer] = useState(null);
  const [provisionTier, setProvisionTier]   = useState('builder');
  const [provisionEmail, setProvisionEmail] = useState('');
  const [provisionNotificationId, setProvisionNotificationId] = useState(null);
  const [provisionSaving, setProvisionSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overview, status] = await Promise.all([
        adminApi.getStripeOverview(),
        adminApi.getStripeStatus().catch(() => null),
      ]);
      setData(overview);
      setStripeStatus(status);
    } catch (e) {
      setError(e.message || 'Failed to load Stripe data');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const result = await adminApi.getUnprovisionedSessions();
      setSessions(result?.sessions ?? []);
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => { load(); loadSessions(); }, [load, loadSessions]);

  const summary    = data?.summary ?? {};
  const charges    = data?.recentCharges ?? [];
  const customers  = data?.customers ?? [];
  const activeSubs = data?.activeSubscriptions ?? [];

  const unprovisioned = customers.filter(c => !c.hasLocalAccount && c.email);

  const openProvision = (customer) => {
    setProvisionCustomer(customer);
    setProvisionEmail(customer.email ?? '');
    setProvisionTier('builder');
    setProvisionNotificationId(null);
    setProvisionOpen(true);
  };

  const openProvisionFromSession = (session) => {
    const meta = session.metadata ?? {};
    setProvisionCustomer({
      stripeCustomerId: meta.customerId ?? '',
      email: meta.stripeEmail ?? '',
      name: null,
    });
    setProvisionEmail(meta.stripeEmail ?? '');
    setProvisionTier(meta.tier ?? 'builder');
    setProvisionNotificationId(session.id);
    setProvisionOpen(true);
  };

  const submitProvision = async () => {
    if (!provisionCustomer) return;
    setProvisionSaving(true);
    try {
      const result = await adminApi.provisionUser({
        stripeCustomerId: provisionCustomer.stripeCustomerId,
        email: provisionEmail,
        name: provisionCustomer.name || undefined,
        tier: provisionTier,
        notificationId: provisionNotificationId ?? undefined,
      });
      toast.success(`User ${result.action === 'created' ? 'provisioned' : 'updated'} — ${provisionEmail}`);
      setProvisionOpen(false);
      load();
      loadSessions();
    } catch (e) {
      toast.error(e.message || 'Provision failed');
    } finally {
      setProvisionSaving(false);
    }
  };

  const totalUnresolved = sessions.length + unprovisioned.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-0.5">
            <h2 className="text-xl font-bold text-white font-mono">Stripe Revenue</h2>
            {stripeStatus && (
              stripeStatus.mode === 'live' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
              ) : stripeStatus.mode === 'test' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  TEST
                </span>
              ) : stripeStatus.configured ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  UNREACHABLE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest bg-white/8 text-white/30 border border-white/10">
                  NOT CONFIGURED
                </span>
              )
            )}
          </div>
          <p className="text-sm text-white/40">
            {stripeStatus?.message ?? 'Live data pulled directly from your Stripe account'}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { load(); loadSessions(); }}
          disabled={loading}
          className="border-white/15 text-white/60 hover:text-white"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Unprovisioned alert */}
      {!loading && totalUnresolved > 0 && (
        <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-400">
              {totalUnresolved} payment{totalUnresolved > 1 ? 's' : ''} need attention
            </p>
            <p className="text-xs text-amber-400/70 mt-0.5">
              {unprovisioned.length > 0 && `${unprovisioned.length} Stripe customer${unprovisioned.length > 1 ? 's' : ''} with no platform account`}
              {unprovisioned.length > 0 && sessions.length > 0 && ' · '}
              {sessions.length > 0 && `${sessions.length} webhook payment${sessions.length > 1 ? 's' : ''} with unresolved user`}
              {' — use "Provision" to apply the correct tier.'}
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setTab('unresolved')}
            className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 text-[10px] font-mono shrink-0"
          >
            View all
          </Button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-rose-400 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)
        ) : [
          { label: 'Total Collected', value: usd(summary.totalRevenueCents), icon: DollarSign, color: 'text-emerald-400' },
          { label: 'Monthly Recurring', value: usd(summary.mrrCents), icon: TrendingUp, color: 'text-primary' },
          { label: 'Active Subscriptions', value: activeSubs.length, icon: Zap, color: 'text-cyan-400' },
          { label: 'Stripe Customers', value: summary.totalCustomers ?? 0, icon: Users, color: 'text-amber-400' },
        ].map(s => {
          const SIcon = s.icon;
          return (
            <Card key={s.label} className="bg-white/3 border-white/8">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <SIcon className={`w-4 h-4 ${s.color}`} />
                  <span className="text-[10px] uppercase tracking-widest text-white/30 font-mono">{s.label}</span>
                </div>
                <p className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/8 pb-0 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs font-mono font-semibold border-b-2 capitalize transition-colors whitespace-nowrap ${
              tab === t ? 'text-primary border-primary' : 'text-white/35 border-transparent hover:text-white/60'
            }`}
          >
            {t === 'subscriptions' ? 'Subscriptions' :
             t === 'unresolved' ? 'Unresolved' :
             t.charAt(0).toUpperCase() + t.slice(1)}
            {t === 'customers' && unprovisioned.length > 0 && (
              <span className="ml-1.5 bg-amber-500 text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                {unprovisioned.length}
              </span>
            )}
            {t === 'unresolved' && totalUnresolved > 0 && (
              <span className="ml-1.5 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                {totalUnresolved}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {/* Overview */}
        {tab === 'overview' && (
          <div className="space-y-4">
            <Card className="bg-white/3 border-white/8">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono text-white/60">Recent Charges</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
                ) : charges.length === 0 ? (
                  <p className="text-center py-8 text-white/25 text-sm">No charges found in Stripe.</p>
                ) : (
                  <div className="divide-y divide-white/6">
                    {charges.slice(0, 10).map(c => (
                      <div key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                        <CreditCard className="w-3.5 h-3.5 text-white/25 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white/70 font-mono truncate">
                            {c.customerEmail ?? c.customerId ?? c.id}
                          </p>
                          <p className="text-[10px] text-white/30 font-mono">{c.description ?? 'Subscription creation'}</p>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${STATUS_COLORS[c.refunded ? 'refunded' : c.status] ?? 'bg-white/8 text-white/40'}`}>
                          {c.refunded ? 'refunded' : c.status}
                        </span>
                        <span className="text-sm font-bold font-mono text-emerald-400 shrink-0">{usd(c.amount)}</span>
                        <span className="text-[10px] text-white/25 font-mono shrink-0">{fmtDate(c.created)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white/3 border-white/8">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono text-white/60">Active Subscriptions</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-4 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
                ) : activeSubs.length === 0 ? (
                  <p className="text-center py-8 text-white/25 text-sm">No active subscriptions in Stripe.</p>
                ) : (
                  <div className="divide-y divide-white/6">
                    {activeSubs.map(s => (
                      <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                        <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white/50 font-mono truncate">{s.customerId}</p>
                          <p className="text-[10px] text-white/25 font-mono">Renews {fmtDate(s.currentPeriodEnd)}</p>
                        </div>
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono">active</span>
                        <span className="text-sm font-bold font-mono text-white/70 shrink-0">{usd(s.amount)}/{s.interval}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Customers */}
        {tab === 'customers' && (
          <Card className="bg-white/3 border-white/8">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
              ) : customers.length === 0 ? (
                <p className="text-center py-12 text-white/25 text-sm">No Stripe customers found.</p>
              ) : (
                <div className="divide-y divide-white/6">
                  {customers.map(c => (
                    <div key={c.stripeCustomerId} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[11px] font-mono text-white/40 shrink-0">
                        {c.email ? c.email.slice(0, 2).toUpperCase() : '??'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/80 font-mono truncate">{c.email ?? '—'}</p>
                        <p className="text-[10px] text-white/30 font-mono">{c.stripeCustomerId} · {fmtDate(c.created)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {c.localTier && (
                          <Badge className={`text-[9px] border capitalize ${TIER_COLORS[c.localTier] ?? 'bg-white/8 text-white/35 border-white/15'}`}>
                            {c.localTier}
                          </Badge>
                        )}
                        {c.hasLocalAccount ? (
                          <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                            <CheckCircle2 className="w-3 h-3" /> In Platform
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            className="h-7 text-[10px] font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30"
                            onClick={() => openProvision(c)}
                          >
                            <UserPlus className="w-3 h-3 mr-1" /> Provision User
                          </Button>
                        )}
                        <a
                          href={`https://dashboard.stripe.com/customers/${c.stripeCustomerId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white/20 hover:text-white/50 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Charges */}
        {tab === 'charges' && (
          <Card className="bg-white/3 border-white/8">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-2">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : charges.length === 0 ? (
                <p className="text-center py-12 text-white/25 text-sm">No charges found.</p>
              ) : (
                <div className="divide-y divide-white/6">
                  {charges.map(c => (
                    <div key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                      <CreditCard className="w-3.5 h-3.5 text-white/25 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/70 font-mono truncate">
                          {c.customerEmail ?? c.customerId ?? c.id}
                        </p>
                        <p className="text-[10px] text-white/30 font-mono">{c.id} · {c.description ?? 'Subscription'}</p>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${STATUS_COLORS[c.refunded ? 'refunded' : c.status] ?? 'bg-white/8 text-white/40'}`}>
                        {c.refunded ? 'refunded' : c.status}
                      </span>
                      <span className="text-sm font-bold font-mono text-emerald-400 shrink-0 w-16 text-right">{usd(c.amount)}</span>
                      <span className="text-[10px] text-white/25 font-mono shrink-0 w-32 text-right">{fmtDate(c.created)}</span>
                      <a
                        href={`https://dashboard.stripe.com/payments/${c.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/20 hover:text-white/50"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Subscriptions */}
        {tab === 'subscriptions' && (
          <Card className="bg-white/3 border-white/8">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
              ) : activeSubs.length === 0 ? (
                <p className="text-center py-12 text-white/25 text-sm">No active subscriptions.</p>
              ) : (
                <div className="divide-y divide-white/6">
                  {activeSubs.map(s => {
                    const matchedCustomer = customers.find(c => c.stripeCustomerId === s.customerId);
                    return (
                      <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                        <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white/80 font-mono truncate">
                            {matchedCustomer?.email ?? s.customerId}
                          </p>
                          <p className="text-[10px] text-white/30 font-mono">
                            {s.id} · Renews {fmtDate(s.currentPeriodEnd)}
                            {s.cancelAtPeriodEnd && ' · Cancels at period end'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {matchedCustomer?.hasLocalAccount ? (
                            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Linked
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              className="h-7 text-[10px] font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30"
                              onClick={() => matchedCustomer && openProvision(matchedCustomer)}
                              disabled={!matchedCustomer}
                            >
                              <UserPlus className="w-3 h-3 mr-1" /> Provision
                            </Button>
                          )}
                          <span className="text-sm font-bold font-mono text-white/70">{usd(s.amount)}/{s.interval}</span>
                          <a
                            href={`https://dashboard.stripe.com/subscriptions/${s.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white/20 hover:text-white/50"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Unresolved Payments */}
        {tab === 'unresolved' && (
          <div className="space-y-4">
            {/* Unresolved webhook sessions */}
            {(sessionsLoading || sessions.length > 0) && (
              <Card className="bg-white/3 border-white/8">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <CardTitle className="text-sm font-mono text-white/60">Webhook Payments — User Not Found</CardTitle>
                  </div>
                  <p className="text-[11px] text-white/35 mt-1">
                    These payments arrived via Stripe webhook but could not be matched to a platform account.
                    Enter the user's platform email below to apply their tier.
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  {sessionsLoading ? (
                    <div className="p-4 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
                  ) : (
                    <div className="divide-y divide-white/6">
                      {sessions.map(s => {
                        const meta = s.metadata ?? {};
                        return (
                          <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-white/80 font-mono truncate">
                                  {meta.stripeEmail ?? meta.customerId ?? '—'}
                                </p>
                                {meta.tier && (
                                  <Badge className={`text-[9px] border capitalize ${TIER_COLORS[meta.tier] ?? 'bg-white/8 text-white/35 border-white/15'}`}>
                                    {meta.tier}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[10px] text-white/30 font-mono">
                                {meta.customerId ?? '—'} · {meta.amountTotal ? usd(meta.amountTotal) : '—'} · {fmtIso(s.createdAt)}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              className="h-7 text-[10px] font-mono bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 shrink-0"
                              onClick={() => openProvisionFromSession(s)}
                            >
                              <UserPlus className="w-3 h-3 mr-1" /> Provision
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Unprovisioned Stripe customers (no local account) */}
            {(loading || unprovisioned.length > 0) && (
              <Card className="bg-white/3 border-white/8">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-amber-400" />
                    <CardTitle className="text-sm font-mono text-white/60">Stripe Customers — No Platform Account</CardTitle>
                  </div>
                  <p className="text-[11px] text-white/35 mt-1">
                    These Stripe customers have no matching account on the platform.
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  {loading ? (
                    <div className="p-4 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
                  ) : (
                    <div className="divide-y divide-white/6">
                      {unprovisioned.map(c => (
                        <div key={c.stripeCustomerId} className="flex items-center gap-3 px-4 py-3">
                          <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[11px] font-mono text-white/40 shrink-0">
                            {c.email ? c.email.slice(0, 2).toUpperCase() : '??'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white/80 font-mono truncate">{c.email ?? '—'}</p>
                            <p className="text-[10px] text-white/30 font-mono">{c.stripeCustomerId} · {fmtDate(c.created)}</p>
                          </div>
                          <Button
                            size="sm"
                            className="h-7 text-[10px] font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 shrink-0"
                            onClick={() => openProvision(c)}
                          >
                            <UserPlus className="w-3 h-3 mr-1" /> Provision User
                          </Button>
                          <a
                            href={`https://dashboard.stripe.com/customers/${c.stripeCustomerId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white/20 hover:text-white/50 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {!loading && !sessionsLoading && totalUnresolved === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-400/40" />
                <p className="text-white/30 text-sm font-mono">All payments are resolved — nothing needs attention.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Provision User Dialog */}
      <Dialog open={provisionOpen} onOpenChange={setProvisionOpen}>
        <DialogContent className="bg-[#07070f] border-white/12 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white font-mono">Provision Platform Account</DialogTitle>
            <DialogDescription className="text-white/40">
              Apply the correct tier to a platform account. If the Stripe email doesn't match the
              user's platform email, update the email field below to find the right account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <p className="text-xs font-mono text-white/40 mb-1">Stripe Customer</p>
              <p className="text-sm font-mono text-white/80">{provisionCustomer?.email ?? '—'}</p>
              <p className="text-[10px] font-mono text-white/30">{provisionCustomer?.stripeCustomerId}</p>
            </div>
            <div>
              <p className="text-xs font-mono text-white/40 mb-1.5">
                Platform Email
                <span className="text-white/25 ml-1">(search by this email to find or create account)</span>
              </p>
              <Input
                value={provisionEmail}
                onChange={e => setProvisionEmail(e.target.value)}
                placeholder="user@example.com"
                className="bg-white/5 border-white/15 text-white font-mono text-sm"
              />
            </div>
            <div>
              <p className="text-xs font-mono text-white/40 mb-1.5">Plan Tier</p>
              <Select value={provisionTier} onValueChange={setProvisionTier}>
                <SelectTrigger className="bg-white/5 border-white/15">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="builder">Builder — $29/mo · 2,500 credits</SelectItem>
                  <SelectItem value="operator">Operator — $99/mo · 10,000 credits</SelectItem>
                  <SelectItem value="empire">Empire — $499/mo · 50,000 credits</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {provisionNotificationId && (
              <p className="text-[11px] text-white/30 font-mono">
                The admin notification will be marked resolved after provisioning.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProvisionOpen(false)} disabled={provisionSaving}
              className="border-white/15 text-white/60">
              Cancel
            </Button>
            <Button
              onClick={submitProvision}
              disabled={provisionSaving || !provisionEmail.trim()}
              className="bg-primary text-black font-semibold"
            >
              {provisionSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Provisioning…</> : 'Provision User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminStripePanel;
