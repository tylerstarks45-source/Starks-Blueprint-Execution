import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Rocket, TrendingUp, ShoppingCart, Users, Megaphone,
  Wand2, ChevronRight, ChevronLeft, X, CheckCircle2,
  Zap, DollarSign, Clock, Plug, ArrowRight, Sparkles,
  Globe, Star, Target,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const GOALS = [
  {
    id: 'content',
    label: 'Content & YouTube',
    description: 'Build automated content channels that earn ad revenue and sponsorships',
    icon: Megaphone,
    color: 'text-rose-400',
    bg: 'bg-rose-500/15 border-rose-500/30 hover:border-rose-400/60',
    active: 'bg-rose-500/25 border-rose-400/70 shadow-rose-500/20',
    keywords: ['video', 'youtube', 'content', 'tiktok', 'social'],
    prompt: 'YouTube automation channel with AI-generated content that earns ad revenue',
  },
  {
    id: 'affiliate',
    label: 'Affiliate Marketing',
    description: 'Promote products and earn commissions with AI-powered funnels',
    icon: TrendingUp,
    color: 'text-amber-400',
    bg: 'bg-amber-500/15 border-amber-500/30 hover:border-amber-400/60',
    active: 'bg-amber-500/25 border-amber-400/70 shadow-amber-500/20',
    keywords: ['affiliate', 'commission', 'funnel'],
    prompt: 'AI affiliate marketing system with automated content funnels and email sequences',
  },
  {
    id: 'ecommerce',
    label: 'E-Commerce & Products',
    description: 'Launch a store with automated product sourcing and customer emails',
    icon: ShoppingCart,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15 border-emerald-500/30 hover:border-emerald-400/60',
    active: 'bg-emerald-500/25 border-emerald-400/70 shadow-emerald-500/20',
    keywords: ['ecommerce', 'shopify', 'store', 'dropshipping', 'product'],
    prompt: 'Automated e-commerce store with AI product descriptions and email marketing',
  },
  {
    id: 'leadgen',
    label: 'Lead Generation & Agency',
    description: 'Capture leads and close clients with AI appointment systems',
    icon: Target,
    color: 'text-violet-400',
    bg: 'bg-violet-500/15 border-violet-500/30 hover:border-violet-400/60',
    active: 'bg-violet-500/25 border-violet-400/70 shadow-violet-500/20',
    keywords: ['lead', 'agency', 'appointment', 'client', 'outreach'],
    prompt: 'AI lead generation system with automated outreach and appointment setting',
  },
  {
    id: 'social',
    label: 'Social Media Growth',
    description: 'Grow accounts on autopilot with AI content and engagement',
    icon: Globe,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/15 border-cyan-500/30 hover:border-cyan-400/60',
    active: 'bg-cyan-500/25 border-cyan-400/70 shadow-cyan-500/20',
    keywords: ['social', 'instagram', 'growth', 'followers'],
    prompt: 'Social media growth automation system for building an audience and monetizing',
  },
  {
    id: 'other',
    label: 'Something Custom',
    description: "I'll describe my own idea and let ASH figure it out",
    icon: Wand2,
    color: 'text-pink-400',
    bg: 'bg-pink-500/15 border-pink-500/30 hover:border-pink-400/60',
    active: 'bg-pink-500/25 border-pink-400/70 shadow-pink-500/20',
    keywords: [],
    prompt: '',
  },
];

const STEP_LABELS = ['Your Goal', 'Recommended Blueprint', 'Connect Tools', 'Launch'];

const TOOL_ICONS = ['🔗', '📧', '💳', '📱', '🎬', '🤖'];

function matchBlueprint(blueprints, goalId) {
  if (!blueprints?.length) return null;
  const goal = GOALS.find(g => g.id === goalId);
  if (!goal || !goal.keywords.length) return blueprints[0];
  const lower = (s) => (s || '').toLowerCase();
  const scored = blueprints.map(bp => {
    const text = `${lower(bp.name)} ${lower(bp.description)} ${lower(bp.category)}`;
    const score = goal.keywords.filter(kw => text.includes(kw)).length;
    return { bp, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].bp;
}

const ProgressBar = ({ step, total }) => (
  <div className="flex items-center gap-0 mb-8">
    {STEP_LABELS.map((label, i) => {
      const done = i < step;
      const active = i === step;
      return (
        <React.Fragment key={label}>
          <div className="flex flex-col items-center gap-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
              done
                ? 'bg-primary border-primary text-black'
                : active
                ? 'bg-primary/20 border-primary text-primary animate-pulse'
                : 'bg-white/5 border-white/15 text-white/25'
            }`}>
              {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-[9px] font-mono uppercase tracking-wider whitespace-nowrap ${
              done ? 'text-primary' : active ? 'text-primary/80' : 'text-white/20'
            }`}>{label}</span>
          </div>
          {i < total - 1 && (
            <div className={`h-px flex-1 mx-2 mb-4 transition-all ${done ? 'bg-primary/60' : 'bg-white/8'}`} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

const OnboardingWizard = () => {
  const { currentUser, isLoading, completeOnboarding } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [blueprints, setBlueprints] = useState([]);
  const [recommendedBp, setRecommendedBp] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [completing, setCompleting] = useState(false);

  const show = !isLoading && currentUser && !currentUser.onboardingCompleted && !dismissed;

  useEffect(() => {
    if (show) {
      const token = localStorage.getItem('sbep_auth_token');
      fetch('/api/blueprints', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then(r => r.json())
        .then(data => setBlueprints(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
  }, [show]);

  useEffect(() => {
    if (selectedGoal && blueprints.length) {
      setRecommendedBp(matchBlueprint(blueprints, selectedGoal.id));
    }
  }, [selectedGoal, blueprints]);

  const handleSkip = async () => {
    setDismissed(true);
    await completeOnboarding();
  };

  const handleLaunch = async () => {
    setCompleting(true);
    await completeOnboarding();
    const goal = selectedGoal?.id === 'other'
      ? ''
      : (selectedGoal?.prompt || recommendedBp?.name || '');
    navigate(`/builder${goal ? `?goal=${encodeURIComponent(goal)}` : ''}`);
  };

  if (!show) return null;

  const goalObj = GOALS.find(g => g.id === selectedGoal?.id);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-2xl bg-[#080c14] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        style={{ boxShadow: '0 0 80px rgba(0, 212, 255, 0.08), 0 25px 50px rgba(0,0,0,0.6)' }}
      >
        {/* Header glow */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

        <div className="p-8">
          {/* Skip button */}
          <button
            onClick={handleSkip}
            className="absolute top-5 right-5 p-2 text-white/30 hover:text-white/60 transition-colors rounded-lg hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Badge */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-primary/70">ASH AI Platform</p>
              <p className="text-xs text-white/40">Welcome{currentUser?.name ? `, ${currentUser.name.split(' ')[0]}` : ''}</p>
            </div>
          </div>

          <ProgressBar step={step} total={4} />

          <AnimatePresence mode="wait">
            {/* STEP 0 — GOAL SELECTION */}
            {step === 0 && (
              <motion.div key="step0"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}>
                <h2 className="text-2xl font-bold text-white mb-1">What's your goal?</h2>
                <p className="text-sm text-white/40 mb-6">ASH will build the perfect automated income system for you.</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {GOALS.map(goal => {
                    const Icon = goal.icon;
                    const isSelected = selectedGoal?.id === goal.id;
                    return (
                      <button
                        key={goal.id}
                        onClick={() => setSelectedGoal(goal)}
                        className={`relative text-left rounded-xl border p-4 transition-all active:scale-[0.98] ${
                          isSelected
                            ? `${goal.active} shadow-lg`
                            : `${goal.bg}`
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle2 className={`w-3.5 h-3.5 ${goal.color}`} />
                          </div>
                        )}
                        <Icon className={`w-5 h-5 ${goal.color} mb-2`} />
                        <p className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-white/70'} mb-1`}>
                          {goal.label}
                        </p>
                        <p className="text-[11px] text-white/35 leading-relaxed">{goal.description}</p>
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-end mt-6">
                  <Button
                    disabled={!selectedGoal}
                    onClick={() => setStep(1)}
                    className="gap-2"
                  >
                    Continue <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 1 — BLUEPRINT RECOMMENDATION */}
            {step === 1 && (
              <motion.div key="step1"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}>
                <h2 className="text-2xl font-bold text-white mb-1">Here's your blueprint</h2>
                <p className="text-sm text-white/40 mb-6">
                  Based on your goal, ASH recommends this proven system.
                </p>

                {recommendedBp ? (
                  <div className="rounded-xl border border-primary/30 bg-primary/8 p-5 mb-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <Badge variant="outline" className="text-[9px] border-primary/30 text-primary/70 mb-2">
                          RECOMMENDED
                        </Badge>
                        <h3 className="text-lg font-bold text-white">{recommendedBp.name}</h3>
                        <p className="text-sm text-white/50 mt-1 leading-relaxed">{recommendedBp.description}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-white/8 text-[11px] text-white/40 font-mono">
                      {recommendedBp.estimatedCost && (
                        <span className="flex items-center gap-1.5">
                          <DollarSign className="w-3 h-3 text-emerald-400" />
                          ~{recommendedBp.estimatedCost}/mo potential
                        </span>
                      )}
                      {recommendedBp.estimatedTime && (
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-amber-400" />
                          {recommendedBp.estimatedTime} to set up
                        </span>
                      )}
                      {recommendedBp.difficulty && (
                        <span className="flex items-center gap-1.5">
                          <Zap className="w-3 h-3 text-violet-400" />
                          {recommendedBp.difficulty}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/3 p-5 mb-4 text-center">
                    <Sparkles className="w-8 h-8 text-primary/40 mx-auto mb-2 animate-pulse" />
                    <p className="text-sm text-white/40">ASH will custom-build a system based on your description.</p>
                  </div>
                )}

                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/8 border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <p className="text-xs text-emerald-300/70">
                    ASH will guide you through every step of building this system — no technical knowledge required.
                  </p>
                </div>

                <div className="flex items-center justify-between mt-6">
                  <button onClick={() => setStep(0)} className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/60 transition-colors">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <Button onClick={() => setStep(2)} className="gap-2">
                    Looks good <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 2 — CONNECT TOOLS */}
            {step === 2 && (
              <motion.div key="step2"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}>
                <h2 className="text-2xl font-bold text-white mb-1">Connect your tools</h2>
                <p className="text-sm text-white/40 mb-6">
                  ASH works best when connected to your existing accounts and tools.
                </p>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  {[
                    { icon: '📧', label: 'Email Platform', desc: 'Mailchimp, ConvertKit, SendGrid', color: 'border-blue-500/20 bg-blue-500/8' },
                    { icon: '💳', label: 'Payment Processor', desc: 'Stripe, PayPal, Gumroad', color: 'border-emerald-500/20 bg-emerald-500/8' },
                    { icon: '📱', label: 'Social Media', desc: 'Instagram, TikTok, Twitter', color: 'border-pink-500/20 bg-pink-500/8' },
                    { icon: '🤖', label: 'Automation', desc: 'Zapier, Make, GoHighLevel', color: 'border-violet-500/20 bg-violet-500/8' },
                  ].map(tool => (
                    <div key={tool.label} className={`rounded-xl border p-4 ${tool.color}`}>
                      <span className="text-2xl mb-2 block">{tool.icon}</span>
                      <p className="text-sm font-semibold text-white/80 mb-0.5">{tool.label}</p>
                      <p className="text-[11px] text-white/35">{tool.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-white/3 border border-white/8 mb-2">
                  <Plug className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-white/70 font-medium mb-1">You can connect tools now or later</p>
                    <p className="text-xs text-white/35 leading-relaxed">
                      ASH can still build your system blueprint without connected tools. You can add your API keys anytime from the Connections Hub.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-6">
                  <button onClick={() => setStep(1)} className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/60 transition-colors">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { completeOnboarding(); navigate('/connections'); }}
                      className="text-sm text-primary/70 hover:text-primary transition-colors px-3 py-2"
                    >
                      Connect Tools Now
                    </button>
                    <Button onClick={() => setStep(3)} className="gap-2">
                      Skip for now <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3 — LAUNCH */}
            {step === 3 && (
              <motion.div key="step3"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}>
                <div className="text-center py-4">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                    className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center mx-auto mb-5"
                    style={{ boxShadow: '0 0 40px rgba(0, 212, 255, 0.25)' }}
                  >
                    <Rocket className="w-9 h-9 text-primary" />
                  </motion.div>

                  <h2 className="text-2xl font-bold text-white mb-2">You're ready to launch</h2>
                  <p className="text-sm text-white/40 mb-6 max-w-md mx-auto">
                    ASH will now build your {goalObj?.label?.toLowerCase() || 'income'} system step by step.
                    Tell ASH more details and it'll architect the perfect money-making machine.
                  </p>

                  <div className="grid grid-cols-3 gap-3 mb-6 text-center">
                    {[
                      { icon: <Zap className="w-4 h-4 text-emerald-400" />, label: 'AI-Powered', desc: 'Built by ASH' },
                      { icon: <DollarSign className="w-4 h-4 text-amber-400" />, label: 'Income Ready', desc: 'Monetized setup' },
                      { icon: <Star className="w-4 h-4 text-violet-400" />, label: 'Automated', desc: 'Runs 24/7' },
                    ].map(f => (
                      <div key={f.label} className="rounded-xl bg-white/4 border border-white/8 p-3">
                        <div className="flex justify-center mb-1">{f.icon}</div>
                        <p className="text-xs font-semibold text-white/70">{f.label}</p>
                        <p className="text-[10px] text-white/30">{f.desc}</p>
                      </div>
                    ))}
                  </div>

                  <Button
                    size="lg"
                    className="w-full gap-2 h-12 text-base font-semibold"
                    onClick={handleLaunch}
                    disabled={completing}
                  >
                    {completing ? (
                      <><span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Launching…</>
                    ) : (
                      <><Rocket className="w-5 h-5" /> Launch My System with ASH <ArrowRight className="w-5 h-5" /></>
                    )}
                  </Button>

                  <button onClick={() => setStep(2)} className="flex items-center justify-center gap-1.5 text-sm text-white/30 hover:text-white/50 transition-colors mx-auto mt-4">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-8 py-3 border-t border-white/5 flex items-center justify-between">
          <p className="text-[10px] text-white/20 font-mono">Step {step + 1} of 4</p>
          <button onClick={handleSkip} className="text-[10px] text-white/20 hover:text-white/40 transition-colors">
            Skip setup
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default OnboardingWizard;
