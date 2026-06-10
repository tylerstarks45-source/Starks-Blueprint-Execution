import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import CanonicalUrl from '@/components/CanonicalUrl.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { toast } from 'sonner';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import VideoBackground from '@/components/VideoBackground.jsx';
import { Check, Gift, Zap, Crown, ArrowRight, Loader2 } from 'lucide-react';

// ─── Plan mini-data used for step 1 ──────────────────────────────────────────
const SIGNUP_PLANS = [
  {
    key: 'free',
    name: 'Free',
    price: '$0',
    period: '/mo',
    icon: Gift,
    color: 'text-emerald-400',
    border: 'border-emerald-500/30',
    activeBorder: 'border-emerald-400',
    activeBg: 'bg-emerald-500/10',
    highlights: ['100 AI credits/mo', '1 active system', 'Blueprint library', 'No credit card'],
  },
  {
    key: 'builder',
    name: 'Builder',
    price: '$29',
    period: '/mo',
    icon: Zap,
    color: 'text-blue-400',
    border: 'border-blue-500/30',
    activeBorder: 'border-blue-400',
    activeBg: 'bg-blue-500/10',
    badge: 'Most Popular',
    badgeCls: 'bg-blue-500/20 text-blue-400',
    highlights: ['1,000 AI credits/mo', 'Build up to 5 systems', 'Full ASH AI Agent', 'Revenue tracking'],
  },
  {
    key: 'operator',
    name: 'Operator',
    price: '$99',
    period: '/mo',
    icon: Zap,
    color: 'text-violet-400',
    border: 'border-violet-500/30',
    activeBorder: 'border-violet-400',
    activeBg: 'bg-violet-500/10',
    highlights: ['5,000 AI credits/mo', 'Build up to 10 systems', 'Priority build queue', 'Team features'],
  },
  {
    key: 'empire',
    name: 'Empire',
    price: '$499',
    period: '/mo',
    icon: Crown,
    color: 'text-amber-400',
    border: 'border-amber-500/30',
    activeBorder: 'border-amber-400',
    activeBg: 'bg-amber-500/10',
    highlights: ['25,000 AI credits/mo', 'Up to 10 systems', 'Priority AI processing', 'API access'],
  },
];

const SignupPage = () => {
  const { signup, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Step 1 = plan selection, Step 2 = account form
  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState('free');

  const [formData, setFormData] = useState({ email: '', password: '', passwordConfirm: '' });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Pre-select plan from query string (e.g. /signup?plan=pro from pricing page)
  useEffect(() => {
    const planParam = searchParams.get('plan');
    if (planParam && SIGNUP_PLANS.find(p => p.key === planParam)) {
      setSelectedPlan(planParam);
      // If plan is already specified, skip straight to account form
      setStep(2);
    }
  }, [searchParams]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.passwordConfirm) {
      toast.error('Please fill in all fields.');
      return;
    }
    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      return;
    }
    if (formData.password !== formData.passwordConfirm) {
      toast.error('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    const result = await signup(formData.email, formData.password);
    if (result.success) {
      toast.success('Account created!');
      // For paid plans, redirect to checkout after signup
      if (selectedPlan !== 'free') {
        try {
          const token = localStorage.getItem('sbep_auth_token');
          const resp = await fetch('/api/subscriptions/checkout', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ tier: selectedPlan }),
          });
          const data = await resp.json();
          if (resp.ok && data.url) {
            window.location.href = data.url;
            return;
          } else if (data.code === 'stripe_prices_not_configured') {
            toast.info('Payment system launching soon. You have been placed on the Free plan for now.');
          }
        } catch {
          toast.info('Could not start checkout. You\'ve been signed up on Free — upgrade from your dashboard.');
        }
      }
      navigate('/dashboard', { replace: true });
    } else {
      toast.error(result.error);
    }
    setIsLoading(false);
  };

  const activePlan = SIGNUP_PLANS.find(p => p.key === selectedPlan);

  if (isLoading || isAuthenticated) {
    return <div className="min-h-screen" />;
  }

  return (
    <VideoBackground>
      <CanonicalUrl />
      <Helmet>
        <title>Create Account | Starks Global Group</title>
        <meta name="description" content="Create your free Starks Global Group account and start building AI-powered automated income systems today." />
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <Header />

      <main className="flex-grow flex items-center justify-center px-4 py-24 min-h-screen">
        <div className="w-full max-w-2xl">

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-3 mb-8">
            {['Choose Plan', 'Create Account'].map((label, i) => {
              const num = i + 1;
              const active = step === num;
              const done = step > num;
              return (
                <React.Fragment key={label}>
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      done ? 'bg-emerald-500 text-white'
                      : active ? 'bg-primary text-primary-foreground'
                      : 'bg-white/10 text-muted-foreground'
                    }`}>
                      {done ? '✓' : num}
                    </div>
                    <span className={`text-sm font-medium transition-colors ${active ? 'text-foreground' : 'text-muted-foreground/50'}`}>
                      {label}
                    </span>
                  </div>
                  {i < 1 && <div className="h-px w-8 bg-white/10" />}
                </React.Fragment>
              );
            })}
          </div>

          {/* ── STEP 1: Plan Selection ─────────────────────────────────────── */}
          {step === 1 && (
            <div>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold font-mono mb-2">Choose Your Plan</h1>
                <p className="text-sm text-muted-foreground">Start free or unlock the full platform immediately.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {SIGNUP_PLANS.map(plan => {
                  const Icon = plan.icon;
                  const active = selectedPlan === plan.key;
                  return (
                    <button
                      key={plan.key}
                      onClick={() => setSelectedPlan(plan.key)}
                      className={`relative flex flex-col items-start text-left rounded-xl border p-5 transition-all ${
                        active
                          ? `${plan.activeBorder} ${plan.activeBg} ring-1 ring-current`
                          : `${plan.border} bg-black/40 hover:bg-white/5`
                      }`}
                    >
                      {plan.badge && (
                        <span className={`absolute -top-2.5 right-3 text-[9px] font-bold px-2 py-0.5 rounded-full ${plan.badgeCls}`}>
                          {plan.badge}
                        </span>
                      )}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${active ? 'bg-white/10' : 'bg-white/5'}`}>
                        <Icon className={`w-4 h-4 ${plan.color}`} />
                      </div>
                      <div className="flex items-baseline gap-1 mb-1">
                        <span className="text-xl font-bold font-mono">{plan.price}</span>
                        <span className="text-xs text-muted-foreground">{plan.period}</span>
                      </div>
                      <div className="font-semibold text-sm mb-3">{plan.name}</div>
                      <ul className="space-y-1.5 w-full">
                        {plan.highlights.map(h => (
                          <li key={h} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Check className={`w-3 h-3 shrink-0 ${plan.color}`} />
                            {h}
                          </li>
                        ))}
                      </ul>
                      {active && (
                        <div className={`mt-3 w-full text-center text-xs font-semibold ${plan.color}`}>
                          ✓ Selected
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
              >
                Continue with {activePlan?.name} Plan
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-center text-xs text-muted-foreground mt-4">
                Already have an account?{' '}
                <Link to="/login" className="text-primary hover:underline font-medium">Log In</Link>
              </p>
            </div>
          )}

          {/* ── STEP 2: Account Form ───────────────────────────────────────── */}
          {step === 2 && (
            <div className="bg-card/80 backdrop-blur-xl border border-border rounded-2xl p-8 shadow-2xl shadow-black/50">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-xl font-bold font-mono">Create Your Account</h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {activePlan && (
                      <span>
                        Selected: <span className={`font-semibold ${activePlan.color}`}>{activePlan.name} — {activePlan.price}/mo</span>
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors underline"
                >
                  Change plan
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" htmlFor="email">
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    className="w-full bg-background/90 border border-input text-foreground px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none transition-colors disabled:opacity-50"
                    placeholder="name@company.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" htmlFor="password">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    className="w-full bg-background/90 border border-input text-foreground px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none transition-colors disabled:opacity-50"
                    placeholder="Minimum 8 characters"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" htmlFor="passwordConfirm">
                    Confirm Password
                  </label>
                  <input
                    id="passwordConfirm"
                    name="passwordConfirm"
                    type="password"
                    value={formData.passwordConfirm}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    className="w-full bg-background/90 border border-input text-foreground px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none transition-colors disabled:opacity-50"
                    placeholder="Re-enter your password"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 mt-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 active:scale-[0.98] transition-all shadow-lg hover:shadow-[0_4px_15px_hsl(var(--primary)/0.3)] disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating Account…</>
                    : selectedPlan === 'free'
                    ? 'Create Free Account'
                    : `Create Account & Continue to ${activePlan?.name} Checkout`}
                </button>
              </form>

              <div className="mt-6 pt-4 border-t border-white/8 flex flex-col gap-2 text-xs text-muted-foreground/50 text-center">
                <p>
                  By creating an account you agree to our{' '}
                  <Link to="/terms-and-conditions" className="hover:text-muted-foreground transition-colors">Terms</Link>
                  {' '}and{' '}
                  <Link to="/privacy-policy" className="hover:text-muted-foreground transition-colors">Privacy Policy</Link>.
                </p>
                <p>
                  Already have an account?{' '}
                  <Link to="/login" className="text-primary hover:underline font-medium">Log In</Link>
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </VideoBackground>
  );
};

export default SignupPage;
