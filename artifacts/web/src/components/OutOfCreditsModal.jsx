import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Crown, Building2, Package, ArrowRight, ShoppingBag } from 'lucide-react';
import { useCreditsModal } from '@/contexts/CreditsModalContext.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const UPGRADE_PLANS = [
  {
    key: 'builder',
    name: 'Builder',
    price: '$29/mo',
    credits: '1,000 credits/mo',
    icon: Zap,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30 hover:border-blue-500/60',
    cta: 'bg-blue-500 hover:bg-blue-600',
  },
  {
    key: 'operator',
    name: 'Operator',
    price: '$99/mo',
    credits: '5,000 credits/mo',
    icon: Crown,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 hover:bg-violet-500/20 border-violet-500/30 hover:border-violet-500/60',
    cta: 'bg-violet-500 hover:bg-violet-600',
  },
  {
    key: 'empire',
    name: 'Empire',
    price: '$499/mo',
    credits: '25,000 credits/mo',
    icon: Building2,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 hover:border-amber-500/60',
    cta: 'bg-amber-500 hover:bg-amber-400 text-black font-bold',
  },
];

// Wallet tiers — permanent credits, never expire
const CREDIT_PACKS = [
  { id: 'ten',        label: '250 credits',  price: '$10'  },
  { id: 'twentyfive', label: '700 credits',  price: '$25'  },
  { id: 'fifty',      label: '1,500 credits', price: '$50' },
  { id: 'hundred',    label: '3,500 credits', price: '$100' },
];

const OutOfCreditsModal = () => {
  const { open, hide } = useCreditsModal();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loadingKey, setLoadingKey] = useState(null);

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
      if (!resp.ok) {
        toast.error(data.error || 'Failed to start checkout');
        return;
      }
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
      if (!resp.ok) {
        toast.error(data.error || 'Failed to start checkout');
        return;
      }
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
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) hide(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl"
          >
            {/* Close */}
            <button
              onClick={hide}
              className="absolute top-4 right-4 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-6 pb-4">
              {/* Header */}
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold font-mono text-foreground">Credits Exhausted</h2>
                  <p className="text-xs text-muted-foreground font-mono">FREE PLAN · 0 CREDITS REMAINING</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-3 mb-6">
                You've used all your free AI credits. Upgrade to a paid plan to keep building, or top up with a one-time credit pack. Your systems and data are safe.
              </p>

              {/* Upgrade Plans */}
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <Crown className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold font-mono text-foreground">Upgrade Plan</span>
                  <span className="text-xs text-muted-foreground ml-1">— monthly credits that reset every billing cycle</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {UPGRADE_PLANS.map((plan) => {
                    const Icon = plan.icon;
                    const loading = loadingKey === plan.key;
                    return (
                      <button
                        key={plan.key}
                        onClick={() => handleUpgrade(plan.key)}
                        disabled={!!loadingKey}
                        className={`flex flex-col items-start p-4 rounded-xl border transition-all text-left ${plan.bg} disabled:opacity-60`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className={`w-4 h-4 ${plan.color}`} />
                          <span className={`text-sm font-bold font-mono ${plan.color}`}>{plan.name}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mb-3">{plan.credits}</div>
                        <div className={`w-full py-2 rounded-lg text-center text-xs font-semibold text-white transition-colors ${plan.cta}`}>
                          {loading ? 'Loading…' : plan.price}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-border/50" />
                <span className="text-xs text-muted-foreground font-mono">OR</span>
                <div className="flex-1 h-px bg-border/50" />
              </div>

              {/* Wallet Top-ups */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-semibold font-mono text-foreground">Top Up Wallet</span>
                  <span className="text-xs text-muted-foreground ml-1">— permanent credits, never expire, any plan</span>
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
                        <span className="text-xs text-muted-foreground mt-0.5">{pack.label}</span>
                        <span className="mt-2 text-xs font-semibold text-emerald-400">
                          {loading ? 'Loading…' : 'Buy'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Marketplace link — always free */}
              <div className="flex items-center justify-between rounded-xl border border-border/40 bg-white/3 p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Browse the Marketplace</p>
                  <p className="text-xs text-muted-foreground">All AI tools are free to explore — no credits needed.</p>
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
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OutOfCreditsModal;
