import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart2, Coins, TrendingDown, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';

const authH = () => { const t = localStorage.getItem('sbep_auth_token'); return t ? { Authorization: `Bearer ${t}` } : {}; };

const AIUsageTrackingCard = () => {
  const { currentUser } = useAuth();
  const [credits, setCredits] = useState(null);
  const [txCount, setTxCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.id) { setIsLoading(false); return; }
    Promise.all([
      fetch('/api/credits/me', { headers: authH() }).then(r => r.ok ? r.json() : null),
      fetch('/api/credits/transactions?limit=5', { headers: authH() }).then(r => r.ok ? r.json() : { items: [] }),
    ]).then(([creds, txs]) => {
      if (creds) setCredits(creds);
      setTxCount((txs?.items || []).filter(tx => tx.type?.includes('ai_') || tx.type === 'system_build').length);
    }).catch(() => {}).finally(() => setIsLoading(false));
  }, [currentUser?.id]);

  const balance = credits?.balance ?? 0;
  const spent = credits?.lifetimeSpent ?? 0;

  return (
    <Card className="bg-card border-border shadow-none">
      <CardHeader className="pb-3 border-b border-border/50">
        <CardTitle className="text-lg font-mono flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-emerald-400" /> AI Usage
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {isLoading ? (
          <div className="space-y-3 animate-pulse">{[0,1].map(i=><div key={i} className="h-14 bg-muted/40 rounded-xl"/>)}</div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-muted/10 rounded-xl px-3 py-3 border border-border/30">
              <Coins className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Current Balance</p>
                <p className="text-lg font-bold font-mono text-foreground">{balance.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">credits</span></p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-muted/10 rounded-xl px-3 py-3 border border-border/30">
              <TrendingDown className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Lifetime Spent</p>
                <p className="text-lg font-bold font-mono text-foreground">{spent.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">credits</span></p>
              </div>
            </div>
            {txCount > 0 && (
              <div className="flex items-center gap-3 bg-muted/10 rounded-xl px-3 py-3 border border-border/30">
                <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Recent AI Calls</p>
                  <p className="text-lg font-bold font-mono text-foreground">{txCount} <span className="text-xs font-normal text-muted-foreground">this week</span></p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIUsageTrackingCard;