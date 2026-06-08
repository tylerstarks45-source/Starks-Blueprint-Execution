import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Coins, ArrowRight, Plus, Loader2, ArrowUpRight, ArrowDownRight,
  Zap, TrendingDown, Cpu, AlertTriangle, Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext.jsx';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const TX_LABELS = {
  signup_grant:   'Welcome bonus',
  tier_grant:     'Plan allotment',
  purchase:       'Credit purchase',
  wallet_purchase:'Wallet top-up',
  usage:          'AI usage',
  admin_adjust:   'Adjustment',
};

const AI_MODES = {
  fast:     { label: 'Fast',     color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/25' },
  business: { label: 'Business', color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/25' },
  expert:   { label: 'Expert',   color: 'text-violet-400',  bg: 'bg-violet-500/10 border-violet-500/25' },
  empire:   { label: 'Empire',   color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/25' },
};

const formatDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const UserCreditsCard = () => {
  const { currentUser } = useAuth();
  const [balance, setBalance]           = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);
  const [tier, setTier]                 = useState('free');
  const [allotment, setAllotment]       = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [walletTiers, setWalletTiers]   = useState([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [showWallet, setShowWallet]     = useState(false);
  const [checkoutTier, setCheckoutTier] = useState(null);

  const aiModeKey = currentUser?.id ? `sbep_ai_mode_${currentUser.id}` : null;
  const [aiMode, setAiMode] = useState(() => {
    if (!aiModeKey) return 'fast';
    try { return localStorage.getItem(aiModeKey) || 'fast'; } catch { return 'fast'; }
  });

  useEffect(() => {
    if (!aiModeKey) return;
    const stored = localStorage.getItem(aiModeKey);
    if (stored) setAiMode(stored);
  }, [aiModeKey]);

  useEffect(() => {
    const load = async () => {
      try {
        const [meRes, txRes, cfgRes] = await Promise.all([
          fetch('/api/credits/me', { headers: authHeaders() }),
          fetch('/api/credits/transactions', { headers: authHeaders() }),
          fetch('/api/credits/config'),
        ]);
        if (meRes.ok) {
          const me = await meRes.json();
          setBalance(me.balance ?? 0);
          setWalletBalance(me.walletBalance ?? 0);
          setTier(me.tier ?? 'free');
          setAllotment(me.tierAllotment ?? 0);
        }
        if (txRes.ok) {
          const tx = await txRes.json();
          setTransactions(Array.isArray(tx) ? tx.slice(0, 5) : []);
        }
        if (cfgRes.ok) {
          const cfg = await cfgRes.json();
          setWalletTiers(Array.isArray(cfg.walletTiers) ? cfg.walletTiers : []);
        }
      } catch {
        // ignore — card renders an empty/zero state
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const handleBuy = async (tierId) => {
    setCheckoutTier(tierId);
    try {
      const resp = await fetch('/api/credits/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ walletTier: tierId }),
      });
      if (!resp.ok) throw new Error('checkout failed');
      const data = await resp.json();
      if (data.url) { window.location.assign(data.url); return; }
      throw new Error('no url');
    } catch {
      toast.error('Could not start checkout. Please try again.');
      setCheckoutTier(null);
    }
  };

  const burnRate = (() => {
    const usageTx = transactions.filter(tx => tx.amount < 0 && tx.type === 'usage');
    if (usageTx.length === 0) return null;
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const recent = usageTx.filter(tx => new Date(tx.createdAt).getTime() > sevenDaysAgo);
    if (recent.length === 0) return null;
    const total = recent.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    return Math.round(total / 7);
  })();

  const totalBalance = balance + walletBalance;
  const daysLeft = burnRate && burnRate > 0 ? Math.floor(totalBalance / burnRate) : null;
  const isLow = allotment > 0 && totalBalance / allotment < 0.15;
  const percentage = allotment > 0 ? Math.min(100, (balance / allotment) * 100) : 0;
  const modeConfig = AI_MODES[aiMode] || AI_MODES.fast;

  return (
    <Card className="h-full flex flex-col border-white/10 bg-black/80 backdrop-blur-sm shadow-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Coins className="w-5 h-5 text-amber-500" /> AI Credits
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col pt-4">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted/50 rounded w-1/2" />
            <div className="h-2 bg-muted/50 rounded-full" />
            <div className="h-16 bg-muted/50 rounded" />
          </div>
        ) : (
          <>
            {/* Monthly balance + progress */}
            <div className="mb-3">
              <div className="flex items-baseline justify-between mb-1.5">
                <div>
                  <span className="text-3xl font-bold font-mono tracking-tight">{balance.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground font-mono ml-1.5">monthly</span>
                </div>
                <span className="text-sm text-muted-foreground font-mono">/ {allotment.toLocaleString()} mo</span>
              </div>
              <Progress value={percentage} className={`h-2.5 ${isLow ? '[&>div]:bg-rose-500' : '[&>div]:bg-primary'}`} />
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-xs text-muted-foreground capitalize">{tier} plan · resets monthly</p>
                {isLow && (
                  <span className="text-[10px] text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5" /> Low
                  </span>
                )}
              </div>
            </div>

            {/* Wallet balance pill */}
            <div className="flex items-center justify-between mb-4 px-3 py-2 rounded-lg border border-amber-500/20 bg-amber-500/5">
              <div className="flex items-center gap-2">
                <Wallet className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs text-amber-300 font-mono font-bold">Wallet</span>
                <span className="text-[10px] text-amber-400/60 font-mono">never expires</span>
              </div>
              <span className="text-sm font-bold font-mono text-amber-400">{walletBalance.toLocaleString()}</span>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="rounded-lg border border-white/8 bg-white/3 p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingDown className="w-3 h-3 text-muted-foreground/50" />
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50">Burn Rate</span>
                </div>
                {burnRate !== null ? (
                  <>
                    <div className="text-sm font-bold font-mono">{burnRate.toLocaleString()}</div>
                    <div className="text-[10px] text-muted-foreground/50">credits / day</div>
                  </>
                ) : (
                  <div className="text-xs text-muted-foreground/40">No usage yet</div>
                )}
              </div>

              <div className="rounded-lg border border-white/8 bg-white/3 p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Cpu className="w-3 h-3 text-muted-foreground/50" />
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50">AI Mode</span>
                </div>
                <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold font-mono ${modeConfig.bg} ${modeConfig.color}`}>
                  <Zap className="w-2.5 h-2.5" />
                  {modeConfig.label}
                </div>
                {daysLeft !== null && (
                  <div className="text-[10px] text-muted-foreground/40 mt-0.5">~{daysLeft}d remaining</div>
                )}
              </div>
            </div>

            {/* Low-credit prompt */}
            {isLow && (
              <div className="mb-3 px-3 py-2 rounded-lg border border-rose-500/20 bg-rose-500/5 text-xs text-rose-400">
                Running low — top up your wallet or{' '}
                <Link to="/pricing" className="underline hover:text-rose-300">upgrade your plan</Link>.
              </div>
            )}

            {/* Recent transactions */}
            <div className="flex-1 mb-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Recent Activity</p>
              {transactions.length === 0 ? (
                <p className="text-xs text-muted-foreground/60 py-2">No credit activity yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {transactions.slice(0, 4).map((tx) => {
                    const positive = tx.amount >= 0;
                    return (
                      <li key={tx.id} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 min-w-0 text-muted-foreground">
                          {positive
                            ? <ArrowUpRight className="w-3 h-3 text-emerald-500 shrink-0" />
                            : <ArrowDownRight className="w-3 h-3 text-rose-500 shrink-0" />}
                          <span className="truncate">{tx.reason || TX_LABELS[tx.type] || tx.type}</span>
                        </span>
                        <span className="flex items-center gap-2 shrink-0 ml-2 font-mono">
                          <span className={positive ? 'text-emerald-400' : 'text-rose-400'}>
                            {positive ? '+' : ''}{tx.amount.toLocaleString()}
                          </span>
                          <span className="text-muted-foreground/40">{formatDate(tx.createdAt)}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Wallet top-up grid */}
            {showWallet && walletTiers.length > 0 && (
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {walletTiers.slice(0, 5).map((wt) => (
                  <Button
                    key={wt.id}
                    variant="outline"
                    size="sm"
                    className="h-auto py-2 flex flex-col gap-0.5 text-center border-amber-500/20 hover:border-amber-500/50 hover:bg-amber-500/5"
                    disabled={checkoutTier !== null}
                    onClick={() => handleBuy(wt.id)}
                  >
                    {checkoutTier === wt.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span className="text-xs font-bold font-mono text-amber-300">
                          {wt.credits >= 1000 ? `${wt.credits / 1000}k` : wt.credits}
                        </span>
                        <span className="text-[10px] text-muted-foreground">${wt.dollarAmount}</span>
                      </>
                    )}
                  </Button>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="mt-auto space-y-2">
              <Button className="w-full" onClick={() => setShowWallet((v) => !v)}>
                <Wallet className="w-4 h-4 mr-2" />
                {showWallet ? 'Hide wallet top-ups' : 'Top up wallet'}
              </Button>
              <Button variant="ghost" size="sm" className="w-full text-muted-foreground" asChild>
                <Link to="/pricing">
                  Upgrade plan for more <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default UserCreditsCard;
