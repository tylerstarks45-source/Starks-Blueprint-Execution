import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, X, Sparkles, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {};
};

const OnboardingChecklist = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [progress, setProgress] = useState(null);
  const [dismissing, setDismissing] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    fetch('/api/dashboard/onboarding-progress', { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setProgress(data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [currentUser]);

  if (!currentUser || !progress || hidden || progress.dismissed) return null;
  if (progress.completedCount >= progress.totalCount) return null;

  const handleDismiss = async (e) => {
    e.stopPropagation();
    setDismissing(true);
    setHidden(true);
    try {
      await fetch('/api/dashboard/onboarding-progress/dismiss', {
        method: 'POST',
        headers: authHeaders(),
      });
    } catch {
      // best-effort — the card stays hidden locally regardless
    } finally {
      setDismissing(false);
    }
  };

  const pct = Math.round((progress.completedCount / progress.totalCount) * 100);

  return (
    <div className="relative rounded-xl border border-primary/20 bg-gradient-to-br from-primary/8 via-violet-500/5 to-transparent p-4 mb-4">
      <button
        onClick={handleDismiss}
        disabled={dismissing}
        aria-label="Dismiss onboarding checklist"
        className="absolute top-3 right-3 p-1 rounded text-muted-foreground/50 hover:text-muted-foreground transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="flex items-center gap-2 mb-3 pr-6">
        <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">Get your first system live</p>
          <p className="text-[11px] text-muted-foreground">
            {progress.completedCount} of {progress.totalCount} steps complete
          </p>
        </div>
      </div>

      <div className="h-1.5 rounded-full bg-white/8 overflow-hidden mb-3">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {progress.steps.map((step) => (
          <button
            key={step.id}
            onClick={() => navigate(step.actionUrl)}
            disabled={step.done}
            className={`group flex items-center gap-2.5 text-left rounded-lg border px-3 py-2.5 transition-all ${
              step.done
                ? 'border-emerald-500/20 bg-emerald-500/5 cursor-default'
                : 'border-white/10 bg-white/[0.02] hover:bg-white/6 hover:border-white/20'
            }`}
          >
            {step.done ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-white/25 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-semibold truncate ${step.done ? 'text-emerald-300/80 line-through decoration-emerald-500/40' : 'text-foreground'}`}>
                {step.label}
              </p>
              {!step.done && (
                <p className="text-[10px] text-muted-foreground truncate">{step.description}</p>
              )}
            </div>
            {!step.done && (
              <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all shrink-0" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default OnboardingChecklist;
