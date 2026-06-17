import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Crown, Building2, Package, ArrowRight, ShoppingBag, AlertTriangle, RefreshCw } from 'lucide-react';
import { useCreditsModal } from '@/contexts/CreditsModalContext.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const ADMIN_ROLES = ['FOUNDER_ADMIN', 'SUPER_ADMIN', 'ADMIN'];

const TIER_DISPLAY = {
  free:     { name: 'Free',     credits: '250/mo' },
  builder:  { name: 'Builder',  credits: '2,500/mo' },
  operator: { name: 'Operator', credits: '10,000/mo' },
  empire:   { name: 'Empire',   credits: '50,000/mo' },
  pro:      { name: 'Builder',  credits: '2,500/mo' },
  starter:  { name: 'Builder',  credits: '2,500/mo' },
};

const UPGRADE_PLANS = [
  {
    key: 'builder',
    name: 'Builder',
    price: '$29/mo',
    credits: '2,500 credits/mo',
    icon: Zap,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30 hover:border-blue-500/60',
    cta: 'bg-blue-500 hover:bg-blue-600',
    highlight: false,
  },
  {
    key: 'operator',
    name: 'Operator',
    price: '$99/mo',
    credits: '10,000 credits/mo',
    icon: Crown,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 hover:bg-violet-500/20 border-violet-500/30 hover:border-violet-500/60',
    cta: 'bg-violet-500 hover:bg-violet-600',
    highlight: true,
  },
  {
    key: 'empire',
    name: 'Empire',
    price: '$499/mo',
    credits: '50,000 credits/mo',
    icon: Building2,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 hover:border-amber-500/60',
    cta: 'bg-amber-500 hover:bg-amber-400 text-black font-bold',
    highlight: false,
  },
];

// Real values from backend WALLET_TIERS in credits.ts
const CREDIT_PACKS = [
  { id: 'ten',        label: '500 credits',    price: '$10',  saving: null },
  { id: 'twentyfive', label: '1,500 credits',  price: '$25',  saving: 'Save 20%' },
  { id: 'fifty',      label: '3,500 credits',  price: '$50',  saving: 'Save 40%' },
  { id: 'hundred',    label: '8,000 credits',  price: '$100', saving: 'Save 60%' },
];

const OutOfCreditsModal = () => {
  const { open, hide } = useCreditsModal();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loadingKey, setLoadingKey] = useState(null);

  const role = currentUser?.role ?? 'USER';
  const isAdmin = ADMIN_ROLES.includes(role);
  const creditsBalance = currentUser?.creditsBalance ?? 0;
  const walletBalance = currentUser?.walletBalance ?? 0;
  const totalCredits = creditsBalance + walletBalance;
  const tier = (currentUser?.membershipTier ?? 'free').toLowerCase();
  const tierDisplay = TIER_DISPLAY[tier] ?? { name: tier, credits: '—' };

  // Admins can always close; regular users are hard-blocked when at zero
  const canClose = isAdmin || totalCredits > 0;

  const handleClose = () => {
    if (!canClose) return;
    hide();
  };

  const handleUpgrade = async (planKey) => {
    setLoadingKey(planKey);
    try {
      const resp = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('sbep_auth_token')}`,
        },
        body: JSON.stringify({ tier: planKey }),
      });
      const data = await resp.json();
      if (!resp.ok) { toast.error(data.error || 'Failed to start checkout'); return; }
      if (data.url) window.location.href = data.url;
    } catch {
      toast.error('Could not connect. Please try again.');
    } finally {
      setLoadingKey(null);
    }
  };

  const handleBuyCredits = async (packId) => {
    setLoadingKey(packId);
    try {
      const resp = await fetch('/api/credits/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('sbep_auth_token')}`,
        },
        body: JSON.stringify({ walletTier: packId }),
      });
      const data = await resp.json();
      if (!resp.ok) { toast.error(data.error || 'Failed to start checkout'); return; }
      if (data.url) window.location.href = data.url;
    } catch {
      toast.error('Could not connect. Please try again.');
    } finally {
      setLoadingKey(null);
    }
  };

  const goMarketplace = () => { hide(); navigate('/marketplace'); };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 24 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-red-500/20 bg-card/98 backdrop-blur-xl shadow-2xl"
            style={{ boxShadow: '0 0 80px rgba(239,68,68,0.08), 0 25px 50px rgba(0,0,0,0.5)' }}
          >
            {/* Close — only shown if canClose */}
            {canClose && (
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            <div className="p-6 pb-4">
              {/* Header */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold font-mono text-foreground">AI Credits Exhausted</h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-white/5 border border-border/40 text-muted-foreground uppercase tracking-wider">
                      {tierDisplay.name} Plan
                    </span>
                    <span className="text-xs text-red-400 font-mono font-semibold">0 CREDITS REMAINING</span>
                  </div>
                </div>
              </div>

              {isAdmin && (
                <div className="mb-4 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 font-mono">
                  Admin account — you can dismiss this modal, but regular users will be blocked until they top up.
                </div>
              )}

              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                You've used all your AI credits. All ASH features and AI actions are paused until you top up your wallet or upgrade to a plan with more monthly credits.{' '}
                <span className="text-foreground">Your systems and data are safe.</span>
              </p>

              {/* Upgrade Plans */}
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <Crown className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold font-mono text-foreground">Upgrade Your Plan</span>
                  <span className="text-xs text-muted-foreground ml-1">— credits reset every billing cycle</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {UPGRADE_PLANS.map((plan) => {
                    const Icon = plan.icon;
                    const loading = loadingKey === plan.key;
                    const isCurrent = tier === plan.key;
                    return (
                      <button
                        key={plan.key}
                        onClick={() => !isCurrent && handleUpgrade(plan.key)}
                        disabled={!!loadingKey || isCurrent}
                        className={`relative flex flex-col items-start p-4 rounded-xl border transition-all text-left ${plan.bg} disabled:opacity-60`}
                      >
                        {plan.highlight && !isCurrent && (
                          <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-violet-500 text-white tracking-wide whitespace-nowrap">
                            MOST POPULAR
                          </span>
                        )}
                        {isCurrent && (
                          <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-border text-muted-foreground tracking-wide whitespace-nowrap">
                            CURRENT PLAN
                          </span>
                        )}
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className={`w-4 h-4 ${plan.color}`} />
                          <span className={`text-sm font-bold font-mono ${plan.color}`}>{plan.name}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mb-3">{plan.credits}</div>
                        <div className={`w-full py-2 rounded-lg text-center text-xs font-semibold text-white transition-colors ${isCurrent ? 'bg-white/10 text-muted-foreground' : plan.cta}`}>
                          {loading ? 'Loading…' : isCurrent ? 'Current' : plan.price}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-border/50" />
                <span className="text-xs text-muted-foreground font-mono">OR TOP UP YOUR WALLET</span>
                <div className="flex-1 h-px bg-border/50" />
              </div>

              {/* Wallet Top-ups */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-semibold font-mono text-foreground">One-Time Credit Packs</span>
                  <span className="text-xs text-muted-foreground ml-1">— never expire, any plan</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CREDIT_PACKS.map((pack) => {
                    const loading = loadingKey === pack.id;
                    return (
                      <button
                        key={pack.id}
                        onClick={() => handleBuyCredits(pack.id)}
                        disabled={!!loadingKey}
                        className="flex flex-col items-center p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all disabled:opacity-60"
                      >
                        <span className="text-base font-bold font-mono text-emerald-400">{pack.price}</span>
                        <span className="text-xs text-muted-foreground mt-0.5 text-center">{pack.label}</span>
                        {pack.saving && (
                          <span className="text-[10px] font-semibold text-emerald-500 mt-0.5">{pack.saving}</span>
                        )}
                        <span className="mt-2 text-xs font-semibold text-emerald-400">
                          {loading ? 'Loading…' : 'Buy Now'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Marketplace + renewal note */}
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-xl border border-border/40 bg-white/3 p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Browse the Marketplace</p>
                    <p className="text-xs text-muted-foreground">Explore all AI tools — no credits needed.</p>
                  </div>
                  <button
                    onClick={goMarketplace}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors whitespace-nowrap"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    View Tools
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                {tier !== 'free' && (
                  <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-white/3 px-4 py-3">
                    <RefreshCw className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      On a paid plan? Your <span className="text-foreground font-medium">{tierDisplay.credits}</span> credits will automatically renew at the start of your next billing cycle.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OutOfCreditsModal;
