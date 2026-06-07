import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import {
  Check, Zap, Crown, Gift, Loader2, Package,
  ArrowRight, X, Bot, Cpu, Globe, BarChart2, Shield,
  Users, Rocket, Star,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { toast } from 'sonner';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import VideoBackground from '@/components/VideoBackground.jsx';

// ─── Plan Data ────────────────────────────────────────────────────────────────
const PLANS = [
  {
    key: 'free',
    name: 'Free',
    price: '$0',
    period: '/mo',
    icon: Gift,
    color: 'text-emerald-400',
    glow: 'shadow-emerald-500/10',
    border: 'border-emerald-500/30',
    highlight: false,
    description: 'Explore the platform. No credit card required.',
    credits: '50 monthly AI credits',
    cta: 'Start Free',
    features: [
      { text: 'STARKS AI Agent trial access', included: true },
      { text: '50 monthly AI credits', included: true },
      { text: 'Browse all blueprints', included: true },
      { text: 'Full marketplace access', included: true },
      { text: 'Save favorite blueprints', included: true },
      { text: 'Build 1 active system', included: true },
      { text: 'Host 1 system', included: true },
      { text: 'Connect up to 3 platforms', included: true },
      { text: 'Basic dashboard & analytics', included: true },
      { text: 'Community support', included: true },
      { text: 'Revenue tracking', included: false },
      { text: 'System health monitoring', included: false },
      { text: 'Priority AI processing', included: false },
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '$49',
    period: '/mo',
    icon: Zap,
    color: 'text-blue-400',
    glow: 'shadow-blue-500/20',
    border: 'border-blue-500/50',
    highlight: true,
    badge: 'MOST POPULAR',
    badgeColor: 'bg-blue-500',
    description: 'For entrepreneurs ready to build and scale AI systems.',
    credits: '1,000 monthly AI credits',
    cta: 'Start Pro',
    features: [
      { text: 'Full STARKS AI Agent access', included: true },
      { text: '1,000 monthly AI credits', included: true },
      { text: 'Build up to 25 systems', included: true },
      { text: 'Host up to 10 systems', included: true },
      { text: 'Connect up to 25 platforms', included: true },
      { text: 'Unlimited blueprint access', included: true },
      { text: 'Revenue dashboard', included: true },
      { text: 'Advanced analytics', included: true },
      { text: 'System health monitoring', included: true },
      { text: 'Priority build queue', included: true },
      { text: 'Automation features', included: true },
      { text: 'Email support', included: true },
      { text: 'API access', included: false },
    ],
  },
  {
    key: 'empire',
    name: 'Empire',
    price: '$199',
    period: '/mo',
    icon: Crown,
    color: 'text-amber-400',
    glow: 'shadow-amber-500/10',
    border: 'border-amber-500/40',
    highlight: false,
    badge: 'FOR FOUNDERS & AGENCIES',
    badgeColor: 'bg-amber-500/80',
    description: 'Unlimited power for agencies, founders, and power users.',
    credits: '5,000 monthly AI credits',
    cta: 'Go Empire',
    features: [
      { text: 'Full STARKS AI Agent access', included: true },
      { text: '5,000 monthly AI credits', included: true },
      { text: 'Unlimited system builds', included: true },
      { text: 'Unlimited hosting', included: true },
      { text: 'Unlimited connections', included: true },
      { text: 'Priority agent processing', included: true },
      { text: 'Team management features', included: true },
      { text: 'Enterprise analytics', included: true },
      { text: 'White label ready', included: true },
      { text: 'API access', included: true },
      { text: 'Advanced revenue intelligence', included: true },
      { text: 'Priority support', included: true },
      { text: 'Custom onboarding', included: true },
    ],
  },
];

// ─── Credit Pack Data ─────────────────────────────────────────────────────────
const CREDIT_PACKS = [
  {
    id: 'starter',
    name: 'Starter Pack',
    credits: 100,
    price: '$9',
    note: 'Best for testing',
    color: 'text-blue-400',
    border: 'border-blue-500/25',
  },
  {
    id: 'growth',
    name: 'Growth Pack',
    credits: 500,
    price: '$39',
    note: 'Most popular',
    color: 'text-violet-400',
    border: 'border-violet-500/25',
    popular: true,
  },
  {
    id: 'builder',
    name: 'Builder Pack',
    credits: 1000,
    price: '$69',
    note: 'Best value',
    color: 'text-emerald-400',
    border: 'border-emerald-500/25',
  },
  {
    id: 'pro',
    name: 'Pro Pack',
    credits: 5000,
    price: '$249',
    note: 'Power users',
    color: 'text-amber-400',
    border: 'border-amber-500/25',
  },
  {
    id: 'empire',
    name: 'Empire Pack',
    credits: 10000,
    price: '$449',
    note: 'Agencies',
    color: 'text-rose-400',
    border: 'border-rose-500/25',
  },
];

// ─── Comparison table rows ────────────────────────────────────────────────────
const COMPARISON = [
  { label: 'Monthly AI Credits',   free: '50',          pro: '1,000',      empire: '5,000' },
  { label: 'Active Systems',       free: '1',           pro: '25',         empire: 'Unlimited' },
  { label: 'Hosted Systems',       free: '1',           pro: '10',         empire: 'Unlimited' },
  { label: 'Platform Connections', free: '3',           pro: '25',         empire: 'Unlimited' },
  { label: 'STARKS AI Agent',      free: 'Trial',       pro: 'Full',       empire: 'Priority' },
  { label: 'Blueprint Library',    free: 'Browse only', pro: 'Full access', empire: 'Full access' },
  { label: 'Revenue Tracking',     free: '✗',           pro: '✓',          empire: '✓' },
  { label: 'System Monitoring',    free: '✗',           pro: '✓',          empire: '✓' },
  { label: 'API Access',           free: '✗',           pro: '✗',          empire: '✓' },
  { label: 'White Label',          free: '✗',           pro: '✗',          empire: '✓' },
  { label: 'Team Features',        free: '✗',           pro: '✗',          empire: '✓' },
  { label: 'Support',              free: 'Community',   pro: 'Email',      empire: 'Priority' },
];

const authHeaders = () => {
  const t = localStorage.getItem('sbep_auth_token');
  return t
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }
    : { 'Content-Type': 'application/json' };
};

// ─── PricingPage ──────────────────────────────────────────────────────────────
const PricingPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const userTier = currentUser?.membershipTier || 'free';

  const [loadingTier, setLoadingTier] = useState(null);
  const [loadingPack, setLoadingPack] = useState(null);
  const [showComparison, setShowComparison] = useState(false);

  const isCurrentPlan = (key) => {
    if (key === userTier) return true;
    // normalise legacy tiers
    if (key === 'pro' && (userTier === 'starter' || userTier === 'builder')) return true;
    if (key === 'empire' && userTier === 'operator') return true;
    return false;
  };

  const handlePlanSelect = async (plan) => {
    if (plan.key === 'free') {
      if (!currentUser) navigate('/signup?plan=free');
      return;
    }
    if (!currentUser) {
      navigate(`/signup?plan=${plan.key}`);
      return;
    }
    setLoadingTier(plan.key);
    try {
      const resp = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: authHeaders(),
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
        headers: authHeaders(),
        body: JSON.stringify({ pack: pack.id }),
      });
      const data = await resp.json();
      if (!resp.ok) { toast.error(data.error || 'Failed to start checkout'); return; }
      if (data.url) window.location.href = data.url;
    } catch {
      toast.error('Could not connect to payment system. Please try again.');
    } finally {
      setLoadingPack(null);
    }
  };

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === '1') {
      toast.success(`Plan activated! Welcome to ${params.get('tier') || 'your new'} tier.`);
      window.history.replaceState({}, '', '/pricing');
    } else if (params.get('canceled') === '1') {
      toast.info('Checkout canceled. Your plan was not changed.');
      window.history.replaceState({}, '', '/pricing');
    }
  }, []);

  return (
    <VideoBackground>
      <Helmet>
        <title>Pricing | Starks Global Group</title>
        <meta name="description" content="Choose the plan that fits your goals. Free, Pro, or Empire — build and scale AI-powered business systems." />
      </Helmet>
      <Header />

      <main className="flex-grow">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="pt-32 pb-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-mono uppercase tracking-wider px-4 py-2 rounded-full border border-primary/20 mb-8">
                <Bot className="w-3.5 h-3.5" />
                Powered By The STARKS AI Agent
              </div>
              <h1 className="text-5xl md:text-6xl font-bold font-mono mb-6 leading-tight">
                Build It. Launch It.
                <br />
                <span className="text-primary">Host It. Run It.</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
                One platform for AI blueprints, autonomous system building, hosting, monitoring, and revenue growth. Start free, scale when you're ready.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <button
                  onClick={() => navigate('/signup?plan=free')}
                  className="px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                  Start Free
                </button>
                <button
                  onClick={() => setShowComparison(true)}
                  className="px-8 py-3.5 rounded-xl border border-white/15 text-foreground font-semibold text-sm hover:bg-white/5 transition-all"
                >
                  Compare Plans
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Plan Cards ───────────────────────────────────────────────────── */}
        <section className="px-4 pb-24">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {PLANS.map((plan, idx) => {
                const Icon = plan.icon;
                const active = isCurrentPlan(plan.key);
                return (
                  <motion.div
                    key={plan.key}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`relative flex flex-col rounded-2xl border ${plan.border} ${
                      plan.highlight
                        ? 'bg-blue-950/30 shadow-2xl shadow-blue-500/15 scale-[1.02]'
                        : 'bg-black/50'
                    } backdrop-blur-sm p-7`}
                  >
                    {plan.badge && (
                      <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 ${plan.badgeColor} text-white text-[10px] font-bold font-mono tracking-widest px-4 py-1 rounded-full whitespace-nowrap`}>
                        {plan.badge}
                      </div>
                    )}
                    {active && (
                      <div className="absolute -top-3.5 right-5 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-full">
                        ACTIVE
                      </div>
                    )}

                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${plan.highlight ? 'bg-blue-500/20' : 'bg-white/5'}`}>
                      <Icon className={`w-5 h-5 ${plan.color}`} />
                    </div>

                    <h2 className="text-2xl font-bold font-mono mb-1">{plan.name}</h2>
                    <div className="flex items-baseline gap-1 mb-3">
                      <span className="text-4xl font-bold font-mono">{plan.price}</span>
                      <span className="text-muted-foreground">{plan.period}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{plan.description}</p>
                    <div className={`inline-flex items-center gap-1.5 text-xs font-mono ${plan.color} mb-6`}>
                      <Cpu className="w-3 h-3" />
                      {plan.credits}
                    </div>

                    <ul className="space-y-2.5 mb-8 flex-1">
                      {plan.features.map((f, i) => (
                        <li key={i} className={`flex items-start gap-2.5 text-sm ${f.included ? '' : 'opacity-35'}`}>
                          {f.included
                            ? <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                            : <X className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />}
                          <span>{f.text}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => handlePlanSelect(plan)}
                      disabled={active || !!loadingTier}
                      className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                        active
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 cursor-default'
                          : plan.highlight
                          ? 'bg-blue-500 text-white hover:bg-blue-400 shadow-lg shadow-blue-500/25'
                          : plan.key === 'empire'
                          ? 'bg-amber-500/90 text-black hover:bg-amber-400'
                          : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                      }`}
                    >
                      {loadingTier === plan.key
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting…</>
                        : active
                        ? '✓ Current Plan'
                        : <>{plan.cta} <ArrowRight className="w-4 h-4" /></>}
                    </button>
                  </motion.div>
                );
              })}
            </div>

            <p className="text-center text-xs text-muted-foreground mt-8">
              All plans include pay-as-you-go credit top-ups. Credits never expire.{' '}
              <button onClick={() => setShowComparison(s => !s)} className="text-primary hover:underline">
                {showComparison ? 'Hide' : 'View'} full comparison →
              </button>
            </p>
          </div>
        </section>

        {/* ── Full Comparison Table ─────────────────────────────────────────── */}
        {showComparison && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 pb-24"
          >
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold font-mono text-center mb-8">Full Plan Comparison</h2>
              <div className="rounded-2xl border border-white/10 bg-black/50 backdrop-blur-sm overflow-hidden">
                <div className="grid grid-cols-4 text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground bg-white/4 px-6 py-4">
                  <div>Feature</div>
                  <div className="text-center text-emerald-400">Free</div>
                  <div className="text-center text-blue-400">Pro</div>
                  <div className="text-center text-amber-400">Empire</div>
                </div>
                {COMPARISON.map((row, i) => (
                  <div key={i} className={`grid grid-cols-4 px-6 py-3.5 text-sm ${i % 2 === 0 ? 'bg-white/2' : ''} border-t border-white/5`}>
                    <div className="text-muted-foreground">{row.label}</div>
                    <div className="text-center font-mono text-xs">{row.free === '✓' ? <span className="text-emerald-400">✓</span> : row.free === '✗' ? <span className="opacity-25">✗</span> : row.free}</div>
                    <div className="text-center font-mono text-xs">{row.pro === '✓' ? <span className="text-emerald-400">✓</span> : row.pro === '✗' ? <span className="opacity-25">✗</span> : row.pro}</div>
                    <div className="text-center font-mono text-xs">{row.empire === '✓' ? <span className="text-emerald-400">✓</span> : row.empire === '✗' ? <span className="opacity-25">✗</span> : row.empire}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.section>
        )}

        {/* ── AI Credits explanation ───────────────────────────────────────── */}
        <section className="px-4 pb-20">
          <div className="max-w-5xl mx-auto">
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-primary/5 to-transparent backdrop-blur-sm p-8 md:p-10">
              <div className="flex flex-col md:flex-row items-start gap-8">
                <div className="flex-1">
                  <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-mono uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
                    <Cpu className="w-3.5 h-3.5" /> AI Credits
                  </div>
                  <h2 className="text-2xl font-bold font-mono mb-3">What Powers Everything</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                    AI Credits power all STARKS agent actions — system builds, blueprint execution, content generation, automation tasks, and future AI features. Every plan includes a monthly allotment. Unused credits expire at renewal; purchased top-up credits never expire.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: Bot, text: 'AI Agent Actions' },
                      { icon: Rocket, text: 'System Builds' },
                      { icon: Globe, text: 'Automation Tasks' },
                      { icon: BarChart2, text: 'Analytics & Reports' },
                    ].map(({ icon: Icon, text }) => (
                      <div key={text} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Icon className="w-3.5 h-3.5 text-primary/60 shrink-0" />
                        {text}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="md:w-64 shrink-0">
                  <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">Monthly Allotment</div>
                  {PLANS.map(p => (
                    <div key={p.key} className="flex items-center justify-between py-2.5 border-b border-white/6 last:border-0">
                      <span className={`text-sm font-semibold ${p.color}`}>{p.name}</span>
                      <span className="text-sm font-mono text-foreground">{p.credits.split(' ')[0]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Pay-As-You-Go Credit Packs ───────────────────────────────────── */}
        <section className="px-4 pb-24">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 text-xs font-mono uppercase tracking-wider px-3 py-1.5 rounded-full border border-emerald-500/20 mb-4">
                <Package className="w-3.5 h-3.5" /> Pay-As-You-Go
              </div>
              <h2 className="text-3xl font-bold font-mono mb-3">Need More Credits?</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Top up anytime on any plan. Credits are added instantly and never expire. Works alongside your monthly allotment.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {CREDIT_PACKS.map((pack, idx) => (
                <motion.div
                  key={pack.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * idx }}
                  className={`relative rounded-xl border ${pack.border} bg-black/40 backdrop-blur-sm p-5 flex flex-col items-center text-center hover:bg-white/5 transition-all group`}
                >
                  {pack.popular && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-violet-500 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full">
                      POPULAR
                    </div>
                  )}
                  <span className={`text-2xl font-bold font-mono ${pack.color} mb-1`}>{pack.price}</span>
                  <span className="text-xs text-muted-foreground mb-2">{pack.name}</span>
                  <span className="text-lg font-bold font-mono mb-1">{pack.credits.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground/60 mb-4">credits</span>
                  <span className="text-[10px] text-muted-foreground/50 mb-4">{pack.note}</span>
                  <button
                    onClick={() => handleBuyPack(pack)}
                    disabled={!!loadingPack}
                    className={`w-full py-2 rounded-lg text-xs font-semibold border ${pack.border} ${pack.color} bg-white/3 hover:bg-white/8 transition-colors disabled:opacity-50 flex items-center justify-center gap-1`}
                  >
                    {loadingPack === pack.id
                      ? <><Loader2 className="w-3 h-3 animate-spin" /> Loading…</>
                      : 'Buy Now'}
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features grid ───────────────────────────────────────────────── */}
        <section className="px-4 pb-24">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold font-mono mb-3">Everything You Need</h2>
              <p className="text-muted-foreground">Every plan includes the full platform foundation.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { icon: Bot, title: 'STARKS AI Agent', desc: 'Autonomous system builder that works for you' },
                { icon: Rocket, title: 'Blueprint Library', desc: '8+ proven AI business blueprints' },
                { icon: Globe, title: 'Marketplace', desc: '17 curated tools across 8 categories' },
                { icon: Shield, title: 'Credential Vault', desc: 'Encrypted storage for all your API keys' },
                { icon: BarChart2, title: 'Analytics Dashboard', desc: 'Track revenue, AI usage, and system health' },
                { icon: Users, title: 'Connection Hub', desc: 'Connect 30+ platforms and services' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="rounded-xl border border-white/8 bg-black/30 p-5 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold mb-0.5">{title}</div>
                    <div className="text-xs text-muted-foreground">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────────────── */}
        <section className="px-4 pb-24">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold font-mono text-center mb-8">Common Questions</h2>
            <div className="space-y-4">
              {[
                { q: 'What are AI Credits?', a: 'Credits power every AI action on the platform — building systems, running blueprints, generating content, and all STARKS agent operations. Each plan includes a monthly allotment. You can buy more at any time.' },
                { q: 'Do unused monthly credits roll over?', a: 'Monthly plan credits reset at renewal. Credits purchased as pay-as-you-go top-ups never expire and stack on top of your monthly allotment.' },
                { q: 'Can I change plans anytime?', a: 'Yes. Upgrade or downgrade at any time through your billing dashboard. Upgrades take effect immediately; downgrades apply at the next billing cycle.' },
                { q: 'What does system hosting mean?', a: 'When you build a system with STARK, we host and run it for you — no server setup required. Your system runs 24/7 and you can monitor it from your dashboard.' },
                { q: 'Is there a free trial for paid plans?', a: 'The Free plan gives you a genuine taste of the platform with 50 AI credits and 1 system. You can upgrade to Pro or Empire whenever you\'re ready.' },
              ].map((faq, i) => (
                <div key={i} className="rounded-xl border border-white/8 bg-black/30 p-5">
                  <div className="font-semibold text-sm mb-2">{faq.q}</div>
                  <div className="text-sm text-muted-foreground leading-relaxed">{faq.a}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────────────────────── */}
        <section className="px-4 pb-32">
          <div className="max-w-2xl mx-auto text-center">
            <div className="rounded-2xl border border-primary/20 bg-primary/5 backdrop-blur-sm p-10">
              <Star className="w-8 h-8 text-primary mx-auto mb-4" />
              <h2 className="text-3xl font-bold font-mono mb-3">Start Building Today</h2>
              <p className="text-muted-foreground mb-8">
                No credit card required for the Free plan. Upgrade when you're ready to scale.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <button
                  onClick={() => navigate('/signup?plan=free')}
                  className="px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                  Start Free
                </button>
                <button
                  onClick={() => handlePlanSelect(PLANS[1])}
                  className="px-8 py-3.5 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-400 transition-all"
                >
                  Start Pro — $49/mo
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Cancel anytime · Instant access · No setup fees
              </p>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </VideoBackground>
  );
};

export default PricingPage;
