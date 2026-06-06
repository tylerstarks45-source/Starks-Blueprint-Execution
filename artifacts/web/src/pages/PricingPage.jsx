import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Check, Zap, Crown, Building2, Loader2, Package, Gift } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { toast } from 'sonner';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';

const FREE_PLAN = {
  key: 'free',
  name: 'Free',
  price: '$0',
  period: '/mo',
  icon: Gift,
  color: 'text-emerald-400',
  border: 'border-emerald-500/30',
  description: 'Try SBEP with no commitment.',
  features: [
    '50 AI credits (one-time)',
    '1 active system',
    'Blueprint library access',
    'Full marketplace access',
    'AI tool directory',
    'Credential vault',
  ],
  cta: 'Get Started Free',
  ctaStyle: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20',
};

const PAID_PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    price: '$29',
    period: '/mo',
    icon: Zap,
    color: 'text-blue-400',
    border: 'border-blue-500/40',
    badge: 'Most Popular',
    description: 'Launch your first AI income system.',
    features: [
      'AI Build Agent (STARK)',
      '500 AI credits/month',
      'Up to 3 active systems',
      'Blueprint library access',
      'Marketplace & affiliate tools',
      'Credential vault',
      'System health monitoring',
      'Revenue tracking',
      'Basic analytics',
      'Email support',
    ],
    cta: 'Get Started',
    ctaStyle: 'bg-blue-500 text-white hover:bg-blue-600',
  },
  {
    key: 'operator',
    name: 'Operator',
    price: '$99',
    period: '/mo',
    icon: Crown,
    color: 'text-violet-400',
    border: 'border-violet-500/40',
    description: 'Scale multiple AI systems simultaneously.',
    features: [
      'Everything in Starter',
      '2,500 AI credits/month',
      'Up to 15 active systems',
      'Priority AI processing',
      'Advanced System Builder',
      'Multi-system dashboard',
      'Advanced revenue tracking',
      'Tool stack optimization',
      'AI recommendations engine',
      'Performance reports',
      'Priority support',
    ],
    cta: 'Upgrade to Operator',
    ctaStyle: 'bg-violet-500 text-white hover:bg-violet-600',
  },
  {
    key: 'empire',
    name: 'Empire',
    price: '$299',
    period: '/mo',
    icon: Building2,
    color: 'text-amber-400',
    border: 'border-amber-500/40',
    badge: 'Max Power',
    description: 'Run an entire automated business ecosystem.',
    features: [
      'Everything in Operator',
      '10,000 AI credits/month',
      'Unlimited active systems',
      'Highest priority AI queue',
      'Full AI Skill Engine',
      'Enterprise automation builder',
      'Advanced revenue intelligence',
      'Advanced analytics dashboard',
      'Team support',
      'Future white-label eligibility',
      'Future API access',
    ],
    cta: 'Go Empire',
    ctaStyle: 'bg-amber-500 text-black font-bold hover:bg-amber-400',
  },
];

const CREDIT_PACKS = [
  { id: 'small',  name: 'Small',  credits: '100',   price: '$10',  sub: '≈ 100K tokens' },
  { id: 'medium', name: 'Medium', credits: '300',   price: '$25',  sub: '≈ 300K tokens' },
  { id: 'large',  name: 'Large',  credits: '700',   price: '$50',  sub: '≈ 700K tokens' },
  { id: 'xl',     name: 'XL',     credits: '1,500', price: '$100', sub: '≈ 1.5M tokens' },
];

const PricingPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const userTier = currentUser?.membershipTier || 'free';

  const [loadingTier, setLoadingTier] = React.useState(null);
  const [loadingPack, setLoadingPack] = React.useState(null);

  const handleUpgrade = async (plan) => {
    if (!currentUser) { navigate('/signup'); return; }
    setLoadingTier(plan.key);
    try {
      const resp = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('sbep_auth_token')}`,
        },
        body: JSON.stringify({ tier: plan.key }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        if (data.code === 'stripe_prices_not_configured') {
          toast.info('Payment system launching soon. Contact us to upgrade manually.');
        } else {
          toast.error(data.error || 'Failed to start checkout');
        }
        return;
      }
      if (data.url) window.location.href = data.url;
    } catch {
      toast.error('Could not connect to payment system. Please try again.');
    } finally {
      setLoadingTier(null);
    }
  };

  const handleBuyPack = async (pack) => {
    if (!currentUser) { navigate('/signup'); return; }
    setLoadingPack(pack.id);
    try {
      const resp = await fetch('/api/credits/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('sbep_auth_token')}`,
        },
        body: JSON.stringify({ pack: pack.id }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        toast.error(data.error || 'Failed to start checkout');
        return;
      }
      if (data.url) window.location.href = data.url;
    } catch {
      toast.error('Could not connect to payment system. Please try again.');
    } finally {
      setLoadingPack(null);
    }
  };

  // Handle Stripe return
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === '1') {
      toast.success(`Plan upgraded! Welcome to the ${params.get('tier') || 'new'} tier.`);
      window.history.replaceState({}, '', '/pricing');
    } else if (params.get('canceled') === '1') {
      toast.info('Checkout canceled. Your plan was not changed.');
      window.history.replaceState({}, '', '/pricing');
    }
  }, []);

  const isCurrentPlan = (key) => userTier === key || (key === 'starter' && userTier === 'builder');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet><title>Pricing | Starks Global Group</title></Helmet>
      <Header />

      <main className="flex-grow pt-28 pb-20 px-4">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-14"
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-mono uppercase tracking-wider px-3 py-1.5 rounded-full mb-6">
              <Crown className="w-3.5 h-3.5" /> Subscription Plans
            </div>
            <h1 className="text-4xl md:text-5xl font-bold font-mono mb-4">
              Build AI Income Systems
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start free. Upgrade anytime as your systems grow. Pay-as-you-go credits available on every plan.
            </p>
          </motion.div>

          {/* Free Tier Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className={`relative rounded-2xl border ${FREE_PLAN.border} bg-emerald-500/5 backdrop-blur-sm p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}
          >
            {isCurrentPlan('free') && (
              <div className="absolute -top-3 right-4 px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full">
                Active
              </div>
            )}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Gift className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold font-mono text-foreground">Free Plan</h2>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">$0/mo</span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  50 one-time AI credits · 1 active system · Full marketplace access · No credit card required
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {FREE_PLAN.features.slice(0, 3).map((f, i) => (
                <div key={i} className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground">
                  <Check className="w-3 h-3 text-emerald-400" />
                  {f}
                </div>
              ))}
              {!currentUser ? (
                <button
                  onClick={() => navigate('/signup')}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all whitespace-nowrap"
                >
                  Get Started Free
                </button>
              ) : isCurrentPlan('free') ? (
                <span className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500/20 text-emerald-400 whitespace-nowrap">
                  ✓ Current Plan
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Included with account</span>
              )}
            </div>
          </motion.div>

          {/* Paid Plans grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
            {PAID_PLANS.map((plan, idx) => {
              const Icon = plan.icon;
              const active = isCurrentPlan(plan.key);
              return (
                <motion.div
                  key={plan.key}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + idx * 0.08 }}
                  className={`relative flex flex-col rounded-2xl border ${plan.border} bg-card/60 backdrop-blur-sm p-6 ${plan.badge === 'Most Popular' ? 'shadow-lg shadow-blue-500/10' : plan.badge === 'Max Power' ? 'shadow-lg shadow-amber-500/10' : ''}`}
                >
                  {plan.badge && (
                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-white text-xs font-bold rounded-full whitespace-nowrap ${plan.badge === 'Most Popular' ? 'bg-blue-500' : 'bg-amber-500 text-black'}`}>
                      {plan.badge}
                    </div>
                  )}
                  {active && (
                    <div className="absolute -top-3 right-4 px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full">
                      Active
                    </div>
                  )}

                  <div className={`w-10 h-10 rounded-xl bg-current/10 flex items-center justify-center mb-4 ${plan.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <h2 className="text-xl font-bold font-mono mb-1">{plan.name}</h2>
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-3xl font-bold font-mono">{plan.price}</span>
                    <span className="text-muted-foreground text-sm">{plan.period}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>

                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleUpgrade(plan)}
                    disabled={active || loadingTier === plan.key}
                    className={`w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${active ? 'bg-emerald-500/20 text-emerald-400 cursor-default' : plan.ctaStyle}`}
                  >
                    {loadingTier === plan.key ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting…</>
                    ) : active ? '✓ Current Plan' : plan.cta}
                  </button>
                </motion.div>
              );
            })}
          </div>

          {/* Pay-As-You-Go Credit Packs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mb-16"
          >
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 text-xs font-mono uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
                <Package className="w-3.5 h-3.5" /> Pay-As-You-Go
              </div>
              <h2 className="text-2xl font-bold font-mono mb-2">Need More Credits?</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Top up anytime on any plan — including Free. Credits never expire and stack with your monthly allotment.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {CREDIT_PACKS.map((pack, idx) => (
                <motion.div
                  key={pack.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + idx * 0.05 }}
                  className="rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm p-5 flex flex-col items-center text-center hover:border-emerald-500/40 hover:bg-card/60 transition-all"
                >
                  <span className="text-2xl font-bold font-mono text-emerald-400">{pack.price}</span>
                  <span className="text-xs text-muted-foreground mt-1 mb-2">{pack.name} Pack</span>
                  <span className="text-lg font-bold font-mono mb-1">{pack.credits} credits</span>
                  <span className="text-xs text-muted-foreground">{pack.sub}</span>
                  <button
                    onClick={() => handleBuyPack(pack)}
                    disabled={!!loadingPack}
                    className="mt-4 w-full py-2 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors border border-emerald-500/20 disabled:opacity-60 flex items-center justify-center gap-1"
                  >
                    {loadingPack === pack.id ? (
                      <><Loader2 className="w-3 h-3 animate-spin" /> Loading…</>
                    ) : `Buy ${pack.name}`}
                  </button>
                </motion.div>
              ))}
            </div>

            <p className="text-center text-xs text-muted-foreground mt-6">
              Credits are valid indefinitely and never reset. Available on all plans including Free.
            </p>
          </motion.div>

          {/* System limits comparison */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm p-8 mb-10"
          >
            <h3 className="text-lg font-bold font-mono mb-6 text-center">Plan Comparison</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { tier: 'Free',     systems: '1',         credits: '50 one-time', price: '$0' },
                { tier: 'Starter',  systems: '3',         credits: '500/mo',      price: '$29' },
                { tier: 'Operator', systems: '15',        credits: '2,500/mo',    price: '$99' },
                { tier: 'Empire',   systems: 'Unlimited', credits: '10,000/mo',   price: '$299' },
              ].map((row) => (
                <div key={row.tier} className="text-center">
                  <div className="text-sm font-mono text-muted-foreground mb-2">{row.tier}</div>
                  <div className="text-3xl font-bold font-mono text-primary mb-1">{row.systems}</div>
                  <div className="text-xs text-muted-foreground">active systems</div>
                  <div className="text-sm font-medium mt-2">{row.credits}</div>
                  <div className="text-xs text-muted-foreground">{row.price}/mo</div>
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground mt-6">
              All plans include marketplace access. Pay-as-you-go credit packs available on every plan.
            </p>
          </motion.div>

          <p className="text-center text-sm text-muted-foreground">
            All plans include access to the Starks Global Group marketplace and affiliate tools.{' '}
            <Link to="/contact" className="text-primary hover:underline">Contact us</Link> for enterprise pricing.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PricingPage;
