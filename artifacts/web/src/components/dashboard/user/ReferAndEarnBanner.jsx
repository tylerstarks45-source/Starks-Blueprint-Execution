import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, ChevronRight, X } from 'lucide-react';

const DISMISSED_KEY = 'sbep_refer_banner_dismissed';

const ReferAndEarnBanner = () => {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISSED_KEY) === '1'; } catch { return false; }
  });

  if (dismissed) return null;

  const handleDismiss = (e) => {
    e.stopPropagation();
    localStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  };

  return (
    <div
      onClick={() => navigate('/refer')}
      className="cursor-pointer group relative flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-gradient-to-r from-primary/10 via-violet-500/8 to-emerald-500/8 border border-primary/20 hover:border-primary/40 transition-all mb-4"
    >
      <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
        <Gift className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-foreground">Refer & Earn — share your link, get 500 credits</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
          Earn 500 credits + 20% revenue share for every upgrade referral
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[11px] font-semibold text-primary group-hover:text-primary/80 transition-colors">
          View link
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-primary/70 group-hover:translate-x-0.5 transition-transform" />
      </div>
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-0.5 rounded text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};

export default ReferAndEarnBanner;
