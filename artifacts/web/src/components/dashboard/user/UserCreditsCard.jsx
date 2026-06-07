import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Coins, ArrowRight, Plus, Loader2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const TX_LABELS = {
  signup_grant: 'Welcome bonus',
  tier_grant: 'Plan allotment',
  purchase: 'Credit purchase',
  usage: 'AI usage',
  admin_adjust: 'Adjustment',
};

const formatDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const UserCreditsCard = () => {
  const [balance, setBalance] = useState(0);
  const [tier, setTier] = useState('starter');
  const [allotment, setAllotment] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [packs, setPacks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPacks, setShowPacks] = useState(false);
  const [checkoutPack, setCheckoutPack] = useState(null);

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
          setTier(me.tier ?? 'starter');
          setAllotment(me.tierAllotment ?? 0);
        }
        if (txRes.ok) {
          const tx = await txRes.json();
          setTransactions(Array.isArray(tx) ? tx.slice(0, 4) : []);
        }
        if (cfgRes.ok) {
          const cfg = await cfgRes.json();
          setPacks(Array.isArray(cfg.packs) ? cfg.packs : []);
        }
      } catch {
        // ignore — card renders an empty/zero state
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const handleBuy = async (packId) => {
    setCheckoutPack(packId);
    try {
      const resp = await fetch('/api/credits/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ pack: packId }),
      });
      if (!resp.ok) throw new Error('checkout failed');
      const data = await resp.json();
      if (data.url) {
        window.location.assign(data.url);
        return;
      }
      throw new Error('no url');
    } catch {
      toast.error('Could not start checkout. Please try again.');
      setCheckoutPack(null);
    }
  };

  const percentage = allotment > 0 ? Math.min(100, (balance / allotment) * 100) : 0;

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
            <div className="h-8 bg-muted/50 rounded w-1/2"></div>
            <div className="h-2 bg-muted/50 rounded-full"></div>
            <div className="h-16 bg-muted/50 rounded"></div>
          </div>
        ) : (
          <>
            <div className="mb-5">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-3xl font-bold font-mono tracking-tight">{balance.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground font-mono">/ {allotment.toLocaleString()} mo</span>
              </div>
              <Progress value={percentage} className="h-2.5" />
              <p className="text-xs text-muted-foreground mt-2 text-right capitalize">{tier} plan</p>
            </div>

            <div className="flex-1 mb-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Recent Activity</p>
              {transactions.length === 0 ? (
                <p className="text-xs text-muted-foreground/60 py-2">No credit activity yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {transactions.map((tx) => {
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
                          <span className={positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}>
                            {positive ? '+' : ''}{tx.amount.toLocaleString()}
                          </span>
                          <span className="text-muted-foreground/50">{formatDate(tx.createdAt)}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {showPacks && packs.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {packs.map((pack) => (
                  <Button
                    key={pack.id}
                    variant="outline"
                    size="sm"
                    className="h-auto py-2 flex flex-col gap-0.5"
                    disabled={checkoutPack !== null}
                    onClick={() => handleBuy(pack.id)}
                  >
                    {checkoutPack === pack.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span className="text-sm font-semibold font-mono">{pack.credits.toLocaleString()}</span>
                        <span className="text-[10px] text-muted-foreground">${(pack.priceCents / 100).toFixed(0)}</span>
                      </>
                    )}
                  </Button>
                ))}
              </div>
            )}

            <div className="mt-auto space-y-2">
              <Button
                className="w-full"
                onClick={() => setShowPacks((v) => !v)}
              >
                <Plus className="w-4 h-4 mr-2" /> {showPacks ? 'Hide credit packs' : 'Buy more credits'}
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
