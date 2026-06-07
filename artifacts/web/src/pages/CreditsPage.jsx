import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import {
  Coins, Zap, Crown, Building2, Gift, Check, ArrowLeft,
  TrendingUp, Package, Star, Flame, Shield, Clock,
  ChevronRight, Loader2, RefreshCw, BarChart2, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import VideoBackground from '@/components/VideoBackground.jsx';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext.jsx';

const authHeaders = () => {
  const t = localStorage.getItem('sbep_auth_token');
  return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
};

/* ─────────────────────────────────────────────────────────────────────────────
   Pricing data
   Credit packs: one-time, never expire
   Cost per credit decreases at higher tiers → rewards bigger purchases
   while maintaining healthy margins at every level.
───────────────────────────────────────────────────────────────────────────── */

const CREDIT_PACKS = [
  {
    id: 'starter',
    name: 'Starter Pack',
    credits: 100,
    priceCents: 900,
    priceLabel: '$9',
    perCredit: '$0.09',
    color: 'text-blue-400',
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/8',
    hoverBg: 'hover:bg-blue-500/15',
    badge: null,
    icon: Package,
    description: 'Great for trying things out',
  },
  {
    id: 'growth',
    name: 'Growth Pack',
    credits: 500,
    priceCents: 3900,
    priceLabel: '$39',
    perCredit: '$0.078',
    color: 'text-violet-400',
    border: 'border-violet-500/30',
    bg: 'bg-violet-500/8',
    hoverBg: 'hover:bg-violet-500/15',
    badge: 'Popular',
    badgeColor: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    icon: TrendingUp,
    description: 'Most popular top-up',
  },
  {
    id: 'builder',
    name: 'Builder Pack',
    credits: 1000,
    priceCents: 6900,
    priceLabel: '$69',
    perCredit: '$0.069',
    color: 'text-emerald-400',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/8',
    hoverBg: 'hover:bg-emerald-500/15',
    badge: 'Best Value',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    icon: Flame,
    description: 'Best value for builders',
  },
  {
    id: 'pro',
    name: 'Pro Pack',
    credits: 5000,
    priceCents: 24900,
    priceLabel: '$249',
    perCredit: '$0.050',
    color: 'text-amber-400',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/8',
    hoverBg: 'hover:bg-amber-500/15',
    badge: 'Power Users',
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    icon: Star,
    description: 'For power users & teams',
  },
];

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    price: '$0',
    period: '/mo',
    credits: 50,
    systems: 1,
    icon: Gift,
    color: 'text-white/60',
    border: 'border-white/15',
    bg: 'bg-white/5',
    features: ['50 AI credits / month', '1 active system', 'Blueprint library access', 'Marketplace access'],
    cta: 'Current (Free)',
    ctaStyle: 'bg-white/10 text-white/50 cursor-default',
    disabled: true,
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '$49',
    period: '/mo',
    credits: 1000,
    systems: 25,
    icon: Zap,
    color: 'text-blue-400',
    border: 'border-blue-500/40',
    bg: 'bg-blue-500/8',
    badge: 'Most Popular',
    badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    features: [
      '1,000 AI credits / month',
      'Up to 25 active systems',
      'STARK AI Build Agent',
      'System health monitoring',
      'Revenue tracking',
      'Priority email support',
    ],
    cta: 'Upgrade to Pro',
    ctaStyle: 'bg-blue-500 hover:bg-blue-600 text-white',
  },
  {
    key: 'empire',
    name: 'Empire',
    price: '$199',
    period: '/mo',
    credits: 5000,
    systems: 999,
    icon: Building2,
    color: 'text-amber-400',
    border: 'border-amber-400/50',
    bg: 'bg-amber-500/8',
    badge: 'For Founders & Agencies',
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    features: [
      '5,000 AI credits / month',
      'Unlimited systems',
      'All Pro features',
      'API access + white label',
      'Team management',
      'Priority support',
    ],
    cta: 'Upgrade to Empire',
    ctaStyle: 'bg-amber-500 hover:bg-amber-400 text-black font-bold',
  },
];

const PANEL = 'bg-black/80 backdrop-blur-md border border-white/10 rounded-xl';
const SUBPANEL = 'bg-black/60 border border-white/8 rounded-lg';

const CreditsPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [credits, setCredits] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingKey, setLoadingKey] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [credRes, txRes] = await Promise.all([
          fetch('/api/credits/me', { headers: authHeaders() }),
          fetch('/api/credits/transactions', { headers: authHeaders() }),
        ]);
        if (credRes.ok) setCredits(await credRes.json());
        if (txRes.ok) {
          const data = await txRes.json();
          setTransactions(Array.isArray(data?.items ?? data) ? (data?.items ?? data) : []);
        }
      } catch {
        // silently fail — user still sees packs
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleBuyPack = async (packId) => {
    if (!currentUser) { navigate('/login'); return; }
    setLoadingKey(packId);
    try {
      const resp = await fetch('/api/credits/checkout', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ pack: packId }),
      });
      const data = await resp.json();
      if (!resp.ok) { toast.error(data.error || 'Failed to start checkout'); return; }
      if (data.url) window.location.href = data.url;
    } catch {
      toast.error('Could not connect to payment provider. Please try again.');
    } finally {
      setLoadingKey(null);
    }
  };

  const handleUpgradePlan = async (planKey) => {
    if (!currentUser) { navigate('/login'); return; }
    setLoadingKey(planKey);
    try {
      const resp = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ tier: planKey }),
      });
      const data = await resp.json();
      if (!resp.ok) { toast.error(data.error || 'Failed to start checkout'); return; }
      if (data.url) window.location.href = data.url;
    } catch {
      toast.error('Could not connect to payment provider. Please try again.');
    } finally {
      setLoadingKey(null);
    }
  };

  const balance   = credits?.balance      ?? 0;
  const allotment = credits?.tierAllotment ?? 0;
  const tier      = credits?.tier ?? 'free';
  const credPct   = allotment > 0 ? Math.round((balance / allotment) * 100) : 100;

  const fmtTx = (tx) => {
    if (!tx.createdAt) return '';
    const d = new Date(tx.createdAt);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const txColor = (type, amount) => {
    if (type === 'usage') return 'text-rose-400';
    if (amount > 0) return 'text-emerald-400';
    return 'text-white/60';
  };

  const txLabel = (type) => ({
    signup_grant: 'Welcome Grant',
    tier_grant:   'Monthly Allotment',
    purchase:     'Credit Purchase',
    usage:        'AI Usage',
    admin_adjust: 'Admin Adjustment',
  }[type] ?? type);

  return (
    <VideoBackground>
      <Helmet><title>Credits & Plans | Starks Global Group</title></Helmet>
      <Header />

      <main className="flex-grow pt-8 pb-24 px-4 sm:px-6 lg:px-8 container mx-auto max-w-[1200px]">

        {/* ── Back + Page Title ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
        </div>

        <div className={`${PANEL} p-5 mb-6 flex items-center justify-between gap-4 flex-wrap`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.15)]">
              <Coins className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white font-mono"
                style={{ textShadow: '0 0 20px rgba(0,0,0,0.9)' }}>
                Credits &amp; Plans
              </h1>
              <p className="text-sm text-white/50 font-mono">Manage your AI fuel — packs never expire</p>
            </div>
          </div>
          {loading ? (
            <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
          ) : (
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-3xl font-bold font-mono text-amber-400 tabular-nums"
                  style={{ textShadow: '0 0 20px rgba(0,0,0,0.9), 0 0 40px rgba(245,158,11,0.2)' }}>
                  {balance.toLocaleString()}
                </p>
                <p className="text-xs text-white/40 font-mono">credits remaining</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold font-mono text-white uppercase">{tier}</p>
                <p className="text-xs text-white/40 font-mono">current plan</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Credit Balance Bar ──────────────────────────────────────────────── */}
        {!loading && allotment > 0 && (
          <div className={`${PANEL} p-5 mb-6`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-white/60 uppercase tracking-widest font-mono">Monthly Allotment Usage</p>
              <p className="text-xs text-white/40 font-mono">{balance.toLocaleString()} / {allotment.toLocaleString()} credits</p>
            </div>
            <div className="h-3 bg-black/60 border border-white/8 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  credPct > 60 ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
                  credPct > 25 ? 'bg-gradient-to-r from-orange-500 to-amber-400' :
                  'bg-gradient-to-r from-rose-600 to-rose-400'
                }`}
                style={{ width: `${credPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-white/30 font-mono">
              <span>{(allotment - balance).toLocaleString()} used this period</span>
              <span>{credPct}% remaining</span>
            </div>
          </div>
        )}

        {/* ── Credit Packs ────────────────────────────────────────────────────── */}
        <div className={`${PANEL} p-5 mb-6`}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-widest font-mono"
                style={{ textShadow: '0 0 10px rgba(0,0,0,0.9)' }}>
                Credit Packs
              </h2>
              <p className="text-xs text-white/40 font-mono mt-0.5">One-time purchase · credits never expire · stack on any plan</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] font-bold text-emerald-400 font-mono uppercase tracking-wide">Secure Checkout</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CREDIT_PACKS.map(pack => {
              const isLoading = loadingKey === pack.id;
              return (
                <div
                  key={pack.id}
                  className={`relative flex flex-col rounded-2xl border p-5 transition-all duration-200 ${pack.border} ${pack.bg} ${pack.hoverBg} cursor-pointer group`}
                  onClick={() => !loadingKey && handleBuyPack(pack.id)}
                >
                  {pack.badge && (
                    <div className={`absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full border text-[10px] font-bold font-mono uppercase tracking-wide whitespace-nowrap ${pack.badgeColor}`}>
                      {pack.badge}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-black/40 border ${pack.border}`}>
                      <pack.icon className={`w-4 h-4 ${pack.color}`} />
                    </div>
                    <span className={`text-sm font-bold font-mono ${pack.color}`}>{pack.name}</span>
                  </div>

                  <div className="flex-1 mb-4">
                    <p className={`text-3xl font-bold font-mono tabular-nums ${pack.color}`}
                      style={{ textShadow: '0 0 15px rgba(0,0,0,0.9)' }}>
                      {pack.priceLabel}
                    </p>
                    <p className="text-lg font-semibold text-white font-mono mt-0.5">
                      {pack.credits.toLocaleString()} <span className="text-sm text-white/50">credits</span>
                    </p>
                    <p className="text-[11px] text-white/40 font-mono mt-1">{pack.perCredit} per credit</p>
                  </div>

                  <p className="text-[11px] text-white/50 mb-4 leading-relaxed">{pack.description}</p>

                  <button
                    disabled={!!loadingKey}
                    className={`w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all border ${pack.border}
                      bg-black/40 group-hover:bg-black/60 disabled:opacity-50 flex items-center justify-center gap-2`}
                  >
                    {isLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                    ) : (
                      <>Buy {pack.name} <ChevronRight className="w-4 h-4" /></>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-white/25 text-center mt-4 font-mono">
            Powered by Stripe · 256-bit SSL encryption · No subscription required for credit packs
          </p>
        </div>

        {/* ── Subscription Plans ──────────────────────────────────────────────── */}
        <div className={`${PANEL} p-5 mb-6`}>
          <div className="mb-5">
            <h2 className="text-base font-bold text-white uppercase tracking-widest font-mono"
              style={{ textShadow: '0 0 10px rgba(0,0,0,0.9)' }}>
              Subscription Plans
            </h2>
            <p className="text-xs text-white/40 font-mono mt-0.5">Monthly credits that reset every billing cycle · cancel anytime</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS.map(plan => {
              const isCurrentTier = tier === plan.key;
              const isLoading = loadingKey === plan.key;
              return (
                <div
                  key={plan.key}
                  className={`relative flex flex-col rounded-2xl border p-5 transition-all ${plan.border} ${plan.bg} ${
                    isCurrentTier ? 'ring-1 ring-white/20' : ''
                  }`}
                >
                  {plan.badge && (
                    <div className={`absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full border text-[10px] font-bold font-mono uppercase tracking-wide whitespace-nowrap ${plan.badgeColor}`}>
                      {plan.badge}
                    </div>
                  )}
                  {isCurrentTier && (
                    <div className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full border border-white/20 bg-white/10 text-[10px] font-bold font-mono text-white uppercase tracking-wide">
                      Current
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-3">
                    <plan.icon className={`w-5 h-5 ${plan.color}`} />
                    <span className={`text-sm font-bold font-mono ${plan.color}`}>{plan.name}</span>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-3xl font-bold text-white font-mono">{plan.price}</span>
                      <span className="text-sm text-white/40 font-mono">{plan.period}</span>
                    </div>
                    <p className="text-xs text-white/50 font-mono mt-0.5">
                      {plan.credits.toLocaleString()} credits/mo · {plan.systems === 999 ? '∞' : plan.systems} systems
                    </p>
                  </div>

                  <ul className="space-y-1.5 mb-5 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-xs text-white/70">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => !plan.disabled && !isCurrentTier && handleUpgradePlan(plan.key)}
                    disabled={!!loadingKey || plan.disabled || isCurrentTier}
                    className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${plan.ctaStyle} disabled:opacity-50 flex items-center justify-center gap-2`}
                  >
                    {isLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                    ) : isCurrentTier ? (
                      <>Active Plan <Check className="w-4 h-4" /></>
                    ) : (
                      plan.cta
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-white/25 text-center mt-4 font-mono">
            Billed monthly · Cancel anytime · Credits reset each billing cycle · Unused credits do not roll over
          </p>
        </div>

        {/* ── Transaction History ─────────────────────────────────────────────── */}
        <div className={`${PANEL} p-5`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-widest font-mono"
                style={{ textShadow: '0 0 10px rgba(0,0,0,0.9)' }}>
                Credit History
              </h2>
              <p className="text-xs text-white/40 font-mono mt-0.5">All credit transactions on your account</p>
            </div>
            <BarChart2 className="w-5 h-5 text-white/30" />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-white/30">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs font-mono">Loading transactions…</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center">
                <Clock className="w-5 h-5 text-white/20" />
              </div>
              <p className="text-sm text-white/40 font-mono">No transactions yet</p>
            </div>
          ) : (
            <div>
              {/* Header */}
              <div className="grid grid-cols-4 gap-3 pb-2 border-b border-white/8 mb-1 px-1">
                {['Date', 'Type', 'Amount', 'Balance After'].map(h => (
                  <div key={h} className="text-[9px] uppercase tracking-widest text-white/30 font-bold">{h}</div>
                ))}
              </div>
              <div className="divide-y divide-white/5">
                {transactions.slice(0, 20).map(tx => (
                  <div key={tx.id} className="grid grid-cols-4 gap-3 py-3 px-1 hover:bg-white/[0.02] rounded-lg transition-colors">
                    <span className="text-xs text-white/40 font-mono">{fmtTx(tx)}</span>
                    <span className="text-xs text-white/70 font-mono truncate">{txLabel(tx.type)}</span>
                    <span className={`text-xs font-bold font-mono tabular-nums ${txColor(tx.type, tx.amount)}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount?.toLocaleString()}
                    </span>
                    <span className="text-xs text-white/50 font-mono tabular-nums">{tx.balanceAfter?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </main>

      <Footer />
    </VideoBackground>
  );
};

export default CreditsPage;
