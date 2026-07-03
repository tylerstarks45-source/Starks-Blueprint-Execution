import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Zap, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import VideoBackground from '@/components/VideoBackground.jsx';
import Header from '@/components/Header.jsx';

const TIER_LABELS = {
  builder:  { name: 'Builder',  color: 'text-blue-400',   border: 'border-blue-500/40',   glow: 'shadow-blue-500/20' },
  operator: { name: 'Operator', color: 'text-violet-400', border: 'border-violet-500/40', glow: 'shadow-violet-500/20' },
  empire:   { name: 'Empire',   color: 'text-amber-400',  border: 'border-amber-500/40',  glow: 'shadow-amber-500/20' },
};

const NEXT_STEPS = {
  builder: [
    'Open the Builder and launch your first AI system',
    'Connect your tools in the Connections Hub',
    'Explore blueprints and pick your income model',
  ],
  operator: [
    'Start multiple AI systems simultaneously',
    'Use ASH Operations Mode for autonomous monitoring',
    'Set up your content calendar for automated posting',
  ],
  empire: [
    'Activate White Label branding for your agency',
    'Connect your API key for direct integrations',
    'Onboard clients with the Client Portal',
  ],
};

export default function SubscribeSuccessPage() {
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const tierParam = searchParams.get('tier') ?? 'builder';
  const tier = TIER_LABELS[tierParam] ? tierParam : 'builder';
  const config = TIER_LABELS[tier];
  const steps = NEXT_STEPS[tier] ?? NEXT_STEPS.builder;

  const [confirmedTier, setConfirmedTier] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('sbep_auth_token');
    if (!token) { setLoading(false); return; }
    fetch('/api/subscriptions/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.subscription?.tier) setConfirmedTier(data.subscription.tier);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const displayTier = confirmedTier ?? tierParam;
  const displayConfig = TIER_LABELS[displayTier] ?? config;

  return (
    <VideoBackground>
      <Header />
      <main className="flex-grow flex items-center justify-center px-4 py-24">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-lg w-full text-center"
        >
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full border-2 ${displayConfig.border} mb-8 shadow-xl ${displayConfig.glow}`}>
            {loading ? (
              <Loader2 className={`w-9 h-9 ${displayConfig.color} animate-spin`} />
            ) : (
              <CheckCircle2 className={`w-9 h-9 ${displayConfig.color}`} />
            )}
          </div>

          <h1 className="text-4xl font-bold font-mono mb-3">
            You're on <span className={displayConfig.color}>{displayConfig.name}!</span>
          </h1>
          <p className="text-white/50 text-lg mb-10">
            {currentUser?.name
              ? `Welcome, ${currentUser.name.split(' ')[0]}. Your subscription is active.`
              : 'Your subscription is active and ready to go.'}
          </p>

          <div className="bg-white/4 border border-white/10 rounded-2xl p-6 mb-8 text-left">
            <p className="text-xs font-mono uppercase tracking-widest text-white/30 mb-4">Next steps</p>
            <ul className="space-y-3">
              {steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold font-mono border ${displayConfig.border} ${displayConfig.color}`}>
                    {i + 1}
                  </span>
                  <span className="text-white/70 text-sm leading-relaxed">{step}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/builder"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-all shadow-lg shadow-violet-500/25"
            >
              <Zap className="w-4 h-4" />
              Build with ASH
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-white/15 text-white/70 hover:text-white hover:bg-white/5 font-semibold text-sm transition-all"
            >
              Go to Dashboard
            </Link>
          </div>
        </motion.div>
      </main>
    </VideoBackground>
  );
}
