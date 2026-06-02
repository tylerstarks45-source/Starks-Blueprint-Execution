import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Check, Zap, Crown, Rocket, Building2, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { toast } from 'sonner';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';

const PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    price: '$0',
    period: '/mo',
    icon: Zap,
    color: 'text-muted-foreground',
    border: 'border-border/50',
    description: 'Explore blueprints and the marketplace.',
    features: [
      'Access to all 8 blueprints',
      'Full marketplace access',
      'Affiliate tool links',
      'Community support',
      'No AI Build Agent',
    ],
    cta: 'Current Plan',
    ctaStyle: 'bg-muted/30 text-muted-foreground cursor-default',
    disabled: true,
  },
  {
    key: 'builder',
    name: 'Builder',
    price: '$29',
    period: '/mo',
    icon: Rocket,
    color: 'text-blue-400',
    border: 'border-blue-500/40',
    badge: 'Most Popular',
    description: 'Start building AI income systems.',
    features: [
      'Everything in Starter',
      'AI Build Agent (5 builds/mo)',
      '50,000 AI tokens/mo',
      '5 active systems',
      'Email support',
      'Build progress tracking',
    ],
    cta: 'Upgrade to Builder',
    ctaStyle: 'bg-blue-500 text-white hover:bg-blue-600',
    priceId: 'builder_monthly',
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
      'Everything in Builder',
      'AI Build Agent (unlimited builds)',
      '200,000 AI tokens/mo',
      '15 active systems',
      'Priority support',
      'Advanced analytics',
      'Credential vault',
    ],
    cta: 'Upgrade to Operator',
    ctaStyle: 'bg-violet-500 text-white hover:bg-violet-600',
    priceId: 'operator_monthly',
  },
  {
    key: 'empire',
    name: 'Empire',
    price: '$499',
    period: '/mo',
    icon: Building2,
    color: 'text-amber-400',
    border: 'border-amber-500/40',
    description: 'Enterprise-grade AI automation infrastructure.',
    features: [
      'Everything in Operator',
      'Unlimited AI builds',
      '1,000,000 AI tokens/mo',
      'Unlimited active systems',
      'Dedicated support',
      'White-label options',
      'API access',
      'Custom blueprints',
    ],
    cta: 'Go Empire',
    ctaStyle: 'bg-amber-500 text-black font-bold hover:bg-amber-400',
    priceId: 'empire_monthly',
  },
];

const PricingPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const userTier = currentUser?.membershipTier || 'starter';

  const [loadingTier, setLoadingTier] = React.useState(null);

  const handleUpgrade = async (plan) => {
    if (!currentUser) {
      navigate('/signup');
      return;
    }
    if (plan.disabled) return;
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
        if (data.code === 'stripe_not_configured') {
          toast.info('Payment system launching soon. Contact us to upgrade manually.');
        } else {
          toast.error(data.error || 'Failed to start checkout');
        }
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      toast.error('Could not connect to payment system. Please try again.');
    } finally {
      setLoadingTier(null);
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet><title>Pricing | Starks Global Group</title></Helmet>
      <Header />

      <main className="flex-grow pt-28 pb-20 px-4">
        <div className="max-w-6xl mx-auto">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-mono uppercase tracking-wider px-3 py-1.5 rounded-full mb-6">
              <Crown className="w-3.5 h-3.5" /> Subscription Plans
            </div>
            <h1 className="text-4xl md:text-5xl font-bold font-mono mb-4">
              Build AI Income Systems
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that matches your goals. Upgrade anytime as your systems grow.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map((plan, idx) => {
              const Icon = plan.icon;
              const isCurrentPlan = userTier === plan.key;
              return (
                <motion.div
                  key={plan.key}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  className={`relative flex flex-col rounded-2xl border ${plan.border} bg-card/60 backdrop-blur-sm p-6 ${plan.badge ? 'shadow-lg shadow-blue-500/10' : ''}`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full whitespace-nowrap">
                      {plan.badge}
                    </div>
                  )}
                  {isCurrentPlan && (
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
                        <span className={feature.startsWith('No ') ? 'text-muted-foreground line-through' : ''}>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleUpgrade(plan)}
                    disabled={plan.disabled || isCurrentPlan || loadingTier === plan.key}
                    className={`w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${isCurrentPlan ? 'bg-emerald-500/20 text-emerald-400 cursor-default' : plan.ctaStyle}`}
                  >
                    {loadingTier === plan.key ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting...</>
                    ) : isCurrentPlan ? '✓ Current Plan' : plan.cta}
                  </button>
                </motion.div>
              );
            })}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-10">
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
