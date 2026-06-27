import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import {
  Coins, Zap, Crown, Building2, Gift, Check, ArrowLeft,
  TrendingUp, Star, Flame, Shield, Clock,
  ChevronRight, Loader2, BarChart2, Wallet, Sparkles, DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';
import AuthLayout from '@/components/AuthLayout.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';

const authHeaders = () => {
  const t = localStorage.getItem('sbep_auth_token');
  return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
};

/* ─────────────────────────────────────────────────────────────────────────────
   Wallet Tiers — Phase 2 rates (updated)
   $10=500cr, $25=1500cr, $50=3500cr, $100=8000cr, $250=25000cr
   Permanent credits — never expire — consume monthly credits first
───────────────────────────────────────────────────────────────────────────── */
const WALLET_TIERS = [
  {
    id: 'ten',
    name: '$10',
    credits: 500,
    priceCents: 1000,
    dollarAmount: 10,
    perCredit: '$0.020',
    creditsPerDollar: 50,
    saving: null,
    color: 'text-blue-400',
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/8',
    hoverBg: 'hover:bg-blue-500/15',
    badge: null,
    badgeColor: null,
    icon: Coins,
    description: 'Starter wallet load',
  },
  {
    id: 'twentyfive',
    name: '$25',
    credits: 1500,
    priceCents: 2500,
    dollarAmount: 25,
    perCredit: '$0.0167',
    creditsPerDollar: 60,
    saving: 'Save 20%',
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
    id: 'fifty',
    name: '$50',
    credits: 3500,
    priceCents: 5000,
    dollarAmount: 50,
    perCredit: '$0.0143',
    creditsPerDollar: 70,
    saving: 'Save 40%',
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
    id: 'hundred',
    name: '$100',
    credits: 8000,
    priceCents: 10000,
    dollarAmount: 100,
    perCredit: '$0.0125',
    creditsPerDollar: 80,
    saving: 'Save 60%',
    color: 'text-amber-400',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/8',
    hoverBg: 'hover:bg-amber-500/15',
    badge: 'Power Users',
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    icon: Star,
    description: 'For power users & teams',
  },
  {
    id: 'twofifty',
    name: '$250',
    credits: 25000,
    priceCents: 25000,
    dollarAmount: 250,
    perCredit: '$0.010',
    creditsPerDollar: 100,
    saving: 'Save 100%',
    color: 'text-rose-400',
    border: 'border-rose-500/30',
    bg: 'bg-rose-500/8',
    hoverBg: 'hover:bg-rose-500/15',
    badge: 'Max Savings',
    badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    icon: Crown,
    description: 'Maximum savings — never expire',
  },
];

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    price: '$0',
    period: '/mo',
    credits: 250,
    systems: 1,
    icon: Gift,
    color: 'text-white/60',
    border: 'border-white/15',
    bg: 'bg-white/5',
    features: ['250 AI credits / month', '1 active system', 'Blueprint library access', 'Marketplace access', 'Connection Hub access'],
    cta: 'Current (Free)',
    ctaStyle: 'bg-white/10 text-white/50 cursor-default',
    disabled: true,
  },
  {
    key: 'builder',
    name: 'Builder',
    price: '$29',
    period: '/mo',
    credits: 2500,
    systems: 5,
    icon: Zap,
    color: 'text-blue-400',
    border: 'border-blue-500/40',
    bg: 'bg-blue-500/8',
    badge: 'Most Popular',
    badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    features: [
      '2,500 AI credits / month',
      'Up to 5 active systems',
      'Full ASH AI Build Agent',
      'Revenue tracking & analytics',
      'Email support',
    ],
    cta: 'Upgrade to Builder',
    ctaStyle: 'bg-blue-500 hover:bg-blue-600 text-white',
  },
  {
    key: 'operator',
    name: 'Operator',
    price: '$99',
    period: '/mo',
    credits: 10000,
    systems: 20,
    icon: Zap,
    color: 'text-violet-400',
    border: 'border-violet-500/40',
    bg: 'bg-violet-500/8',
    badge: 'Scale Faster',
    badgeColor: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    features: [
      '10,000 AI credits / month',
      'Up to 20 active systems',
      'Priority build queue',
      'Team management features',
      'Email & chat support',
    ],
    cta: 'Upgrade to Operator',
    ctaStyle: 'bg-violet-500 hover:bg-violet-600 text-white',
  },
  {
    key: 'empire',
    name: 'Empire',
    price: '$499',
    period: '/mo',
    credits: 50000,
    systems: 999,
    icon: Building2,
    color: 'text-amber-400',
    border: 'border-amber-400/50',
    bg: 'bg-amber-500/8',
    badge: 'For Founders & Agencies',
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    features: [
      '50,000 AI credits / month',
      'Unlimited active systems',
      'Priority AI processing',
      'API access + white label',
      'Custom onboarding',
      'Priority support',
    ],
    cta: 'Upgrade to Empire',
    ctaStyle: 'bg-amber-500 hover:bg-amber-400 text-black font-bold',
  },
];

const BASE_CREDITS_PER_DOLLAR = 50; // custom purchase rate

const PANEL = 'bg-black/80 backdrop-blur-md border border-white/10 rounded-xl';

const CreditsPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [credits, setCredits] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingKey, setLoadingKey] = useState(null);
  const [customDollars, setCustomDollars] = useState('');
  const [customLoading, setCustomLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('wallet_topped_up') === '1') {
      toast.success('Credits added to your wallet! Balance will update shortly.');
      window.history.replaceState({}, '', '/credits');
    } else if (params.get('wallet_canceled') === '1') {
      toast.info('Purchase canceled. No charges were made.');
      window.history.replaceState({}, '', '/credits');
    }
  }, []);

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
        // silently fail — user still sees wallet tiers
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleBuyWallet = async (tierId) => {
    if (!currentUser) { navigate('/login'); return; }
    setLoadingKey(tierId);
    try {
      const resp = await fetch('/api/credits/checkout', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ walletTier: tierId }),
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

  const handleBuyCustom = async () => {
    if (!currentUser) { navigate('/login'); return; }
    const dollars = parseInt(customDollars, 10);
    if (!dollars || dollars < 10) { toast.error('Minimum purchase is $10.'); return; }
    if (dollars > 10000) { toast.error('Maximum purchase is $10,000 per transaction.'); return; }
    setCustomLoading(true);
    try {
      const resp = await fetch('/api/credits/checkout/custom', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ dollars }),
      });
      const data = await resp.json();
      if (!resp.ok) { toast.error(data.error || 'Failed to start checkout'); return; }
      if (data.url) window.location.href = data.url;
    } catch {
      toast.error('Could not connect to payment provider. Please try again.');
    } finally {
      setCustomLoading(false);
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

  const customCredits = customDollars && parseInt(customDollars, 10) >= 10
    ? parseInt(customDollars, 10) * BASE_CREDITS_PER_DOLLAR
    : null;

  const monthlyBalance = credits?.balance      ?? 0;
  const walletBalance  = credits?.walletBalance ?? 0;
  const totalBalance   = monthlyBalance + walletBalance;
  const allotment      = credits?.tierAllotment ?? 0;
  const tier           = credits?.tier ?? 'free';
  const credPct        = allotment > 0 ? Math.round((monthlyBalance / allotment) * 100) : 100;

  const fmtTx = (tx) => {
    if (!tx.createdAt) return '';
    return new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const txColor = (type, amount) => {
    if (type === 'usage') return 'text-rose-400';
    if (amount > 0) return 'text-emerald-400';
    return 'text-white/60';
  };

  const txLabel = (type) => ({
    signup_grant:   'Welcome Grant',
    tier_grant:     'Monthly Allotment',
    purchase:       'Credit Purchase',
    wallet_purchase:'Wallet Top-up',
    usage:          'AI Usage',
    admin_adjust:   'Admin Adjustment',
  }[type] ?? type);

  return (
    <AuthLayout>
      <Helmet><title>Credits & Plans | Starks Global Group</title></Helmet>

      {/* ── YouTube video background ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        <iframe
          src="https://www.youtube.com/embed/z0KyhEobCC0?autoplay=1&mute=1&loop=1&playlist=z0KyhEobCC0&controls=0&showinfo=0&rel=0&modestbranding=1&disablekb=1&iv_load_policy=3"
          allow="autoplay; encrypted-media"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width: 'max(100%, 177.78vh)', height: 'max(100%, 56.25vw)', minWidth: '100%', minHeight: '100%', border: 'none' }}
          title="bg"
        />
        <div className="absolute inset-0 bg-black/80" />
      </div>

      <main className="flex-grow pt-8 pb-24 px-4 sm:px-6 lg:px-8 container mx-auto max-w-[1200px] relative" style={{ zIndex: 1 }}>

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
              <p className="text-sm text-white/50 font-mono">Monthly credits reset · wallet credits never expire</p>
            </div>
          </div>
          {loading ? (
            <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
          ) : (
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-3xl font-bold font-mono text-amber-400 tabular-nums"
                  style={{ textShadow: '0 0 20px rgba(0,0,0,0.9), 0 0 40px rgba(245,158,11,0.2)' }}>
                  {totalBalance.toLocaleString()}
                </p>
                <p className="text-xs text-white/40 font-mono">total credits</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold font-mono text-white uppercase">{tier}</p>
                <p className="text-xs text-white/40 font-mono">current plan</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Dual Balance Display ─────────────────────────────────────────────── */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {/* Monthly balance */}
            <div className={`${PANEL} p-5`}>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-blue-400" />
                <p className="text-xs font-bold text-white/60 uppercase tracking-widest font-mono">Monthly Allotment</p>
              </div>
              <p className="text-2xl font-bold font-mono text-blue-400 tabular-nums mb-1">
                {monthlyBalance.toLocaleString()}
                <span className="text-sm text-white/30 ml-1">/ {allotment.toLocaleString()}</span>
              </p>
              {allotment > 0 && (
                <div className="h-2 bg-black/60 border border-white/8 rounded-full overflow-hidden mt-2">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      credPct > 60 ? 'bg-gradient-to-r from-blue-500 to-blue-400' :
                      credPct > 25 ? 'bg-gradient-to-r from-orange-500 to-amber-400' :
                      'bg-gradient-to-r from-rose-600 to-rose-400'
                    }`}
                    style={{ width: `${Math.min(100, credPct)}%` }}
                  />
                </div>
              )}
              <p className="text-[10px] text-white/30 font-mono mt-2">Resets each billing cycle · unused credits do not roll over</p>
            </div>

            {/* Wallet balance */}
            <div className={`${PANEL} p-5`}>
              <div className="flex items-center gap-2 mb-3">
                <Wallet className="w-4 h-4 text-amber-400" />
                <p className="text-xs font-bold text-white/60 uppercase tracking-widest font-mono">Credit Wallet</p>
              </div>
              <p className="text-2xl font-bold font-mono text-amber-400 tabular-nums mb-1">
                {walletBalance.toLocaleString()}
              </p>
              <p className="text-[10px] text-white/30 font-mono mt-2">Permanent credits — never expire · consumed after monthly credits</p>
            </div>
          </div>
        )}

        {/* ── Buy Additional Credits ───────────────────────────────────────────── */}
        <div className={`${PANEL} p-5 mb-6`}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-widest font-mono"
                style={{ textShadow: '0 0 10px rgba(0,0,0,0.9)' }}>
                Buy Additional Credits
              </h2>
              <p className="text-xs text-white/40 font-mono mt-0.5">Permanent wallet credits · never expire · stack on any plan · credits never expire</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] font-bold text-emerald-400 font-mono uppercase tracking-wide">Secure Checkout</span>
            </div>
          </div>

          {/* ─ Preset tiers ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-5">
            {WALLET_TIERS.map(wt => {
              const isLoading = loadingKey === wt.id;
              return (
                <div
                  key={wt.id}
                  className={`relative flex flex-col rounded-2xl border p-5 transition-all duration-200 ${wt.border} ${wt.bg} ${wt.hoverBg} cursor-pointer group`}
                  onClick={() => !loadingKey && !customLoading && handleBuyWallet(wt.id)}
                >
                  {wt.badge && (
                    <div className={`absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full border text-[10px] font-bold font-mono uppercase tracking-wide whitespace-nowrap ${wt.badgeColor}`}>
                      {wt.badge}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-black/40 border ${wt.border}`}>
                      <wt.icon className={`w-4 h-4 ${wt.color}`} />
                    </div>
                    <span className={`text-sm font-bold font-mono ${wt.color}`}>{wt.name}</span>
                  </div>

                  <div className="flex-1 mb-3">
                    <p className={`text-2xl font-bold font-mono tabular-nums ${wt.color}`}
                      style={{ textShadow: '0 0 15px rgba(0,0,0,0.9)' }}>
                      {wt.credits.toLocaleString()}
                    </p>
                    <p className="text-xs text-white/50 font-mono mt-0.5">credits</p>
                    {wt.saving && (
                      <span className="inline-block mt-1.5 text-[10px] font-bold font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full">
                        {wt.saving}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-white/40 font-mono mb-1">{wt.perCredit} per credit</p>
                  <p className="text-[11px] text-white/50 mb-4 leading-relaxed">{wt.description}</p>

                  <button
                    disabled={!!loadingKey || customLoading}
                    className={`w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all border ${wt.border}
                      bg-black/40 group-hover:bg-black/60 disabled:opacity-50 flex items-center justify-center gap-2`}
                  >
                    {isLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                    ) : (
                      <>Add {wt.credits.toLocaleString()} cr <ChevronRight className="w-4 h-4" /></>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* ─ Custom amount ────────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-primary/25 bg-primary/5 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-sm font-bold font-mono text-white">Custom Amount</span>
              <span className="text-[10px] font-mono text-white/40 ml-1">· minimum $10 · 50 credits per dollar</span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[160px]">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="number"
                  min="10"
                  max="10000"
                  placeholder="Enter amount"
                  value={customDollars}
                  onChange={e => setCustomDollars(e.target.value)}
                  className="w-full bg-black/60 border border-white/15 rounded-xl pl-9 pr-4 py-2.5 text-sm font-mono text-white placeholder:text-white/25 focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
              <div className="flex items-center gap-2">
                {customCredits ? (
                  <div className="px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/25">
                    <span className="text-sm font-bold font-mono text-primary tabular-nums">{customCredits.toLocaleString()}</span>
                    <span className="text-xs text-white/40 font-mono ml-1">credits</span>
                  </div>
                ) : (
                  <div className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-xs text-white/25 font-mono">— credits</span>
                  </div>
                )}
                <button
                  onClick={handleBuyCustom}
                  disabled={!customCredits || customLoading || !!loadingKey}
                  className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold font-mono hover:bg-primary/90 transition-all disabled:opacity-40 flex items-center gap-2"
                >
                  {customLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</> : 'Buy Credits'}
                </button>
              </div>
            </div>

            <p className="text-[10px] text-white/25 font-mono mt-3">
              Custom credits use the base rate (50 cr/$). Preset tiers above offer up to 100 cr/$ for larger purchases.
            </p>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <p className="text-[11px] text-amber-400/70 font-mono text-center">
              🔒 Wallet credits never expire · Monthly subscription credits consumed first · Powered by Stripe · 256-bit SSL
            </p>
          </div>
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
                      {plan.credits.toLocaleString()} credits/mo · {plan.systems >= 999 ? '∞' : plan.systems} systems
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
    </AuthLayout>
  );
};

export default CreditsPage;
