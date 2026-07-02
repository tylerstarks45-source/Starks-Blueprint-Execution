import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Loader2, Lock, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'admin', 'FOUNDER_ADMIN']);

// Free-tier tiers that are considered "unpaid"
const FREE_TIERS = new Set(['free', '', null, undefined]);

/**
 * SubscriptionGate wraps protected pages.
 * If the user is on a free plan (and is not the founder), they see a paywall
 * instead of the page content, prompting them to subscribe.
 */
const SubscriptionGate = ({ children }) => {
  const { currentUser, isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
      </div>
    );
  }

  // Not logged in — ProtectedRoute handles the redirect, show nothing
  if (!isAuthenticated || !currentUser) return null;

  // Admin accounts bypass all subscription checks
  if (ADMIN_ROLES.has(currentUser.role)) return <>{children}</>;

  const tier = (currentUser.membershipTier || 'free').toLowerCase();
  const isPaid = !FREE_TIERS.has(tier);

  // Paid subscriber — full access
  if (isPaid) return <>{children}</>;

  // Free tier — show paywall
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Lock icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Lock className="w-8 h-8 text-primary" />
          </div>
        </div>

        {/* Heading */}
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Subscription Required
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            You need an active subscription to access the Starks Global Group platform.
            Choose a plan to start building AI-powered income systems with ASH.
          </p>
        </div>

        {/* Feature highlights */}
        <div className="bg-white/3 border border-white/8 rounded-xl p-4 text-left space-y-2.5">
          {[
            'Access to ASH — Autonomous Business Builder',
            'Unlimited income blueprint systems',
            'Connections Hub with 57+ integrations',
            'AI credits to run automated builds',
            'Live system monitoring & analytics',
          ].map((f) => (
            <div key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
              {f}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <Button
            className="w-full h-12 gap-2 text-sm font-semibold"
            onClick={() => navigate('/pricing')}
          >
            View Plans & Pricing
            <ArrowRight className="w-4 h-4" />
          </Button>
          <button
            onClick={() => navigate('/login')}
            className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors underline underline-offset-2"
          >
            Sign in to a different account
          </button>
        </div>

        <p className="text-[10px] text-muted-foreground/30 font-mono">
          Logged in as {currentUser.email}
        </p>
      </div>
    </div>
  );
};

export default SubscriptionGate;
