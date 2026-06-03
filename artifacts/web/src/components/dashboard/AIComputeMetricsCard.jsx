import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Cpu, TrendingUp, Coins } from 'lucide-react';

const TIER_LIMITS = { free: 500, builder: 5000, operator: 25000, empire: 100000 };

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const AIComputeMetricsCard = () => {
  const [credits, setCredits] = useState(null);
  const [tier, setTier] = useState('free');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [credRes, meRes] = await Promise.all([
          fetch('/api/credits/me', { headers: authHeaders() }),
          fetch('/api/auth/me', { headers: authHeaders() }),
        ]);
        if (credRes.ok) {
          const data = await credRes.json();
          setCredits(data);
        }
        if (meRes.ok) {
          const { user } = await meRes.json();
          setTier(user.membershipTier?.toLowerCase() || 'free');
        }
      } catch {
        // silently render with no data
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const balance = credits?.balance ?? 0;
  const limit = TIER_LIMITS[tier] || TIER_LIMITS.free;
  const used = Math.max(0, limit - balance);
  const percentage = Math.min(100, (used / limit) * 100);

  return (
    <Card className="bg-card/40 backdrop-blur-md border-border/50 shadow-lg transition-all duration-300 hover:shadow-xl hover:border-primary/20 h-full flex flex-col">
      <CardHeader className="pb-4 border-b border-border/30">
        <CardTitle className="text-lg font-medium tracking-tight flex items-center gap-2">
          <Cpu className="w-5 h-5 text-blue-400" /> Compute Credits
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 flex-grow flex flex-col justify-between">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted/40 rounded" />
            <div className="h-3 bg-muted/40 rounded" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-20 bg-muted/40 rounded-xl" />
              <div className="h-20 bg-muted/40 rounded-xl" />
            </div>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p className="text-3xl font-bold font-mono tracking-tight text-foreground">{balance.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground font-medium">Credits remaining</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono text-muted-foreground capitalize">{tier} tier</p>
                  <p className="text-xs text-muted-foreground">{limit.toLocaleString()} limit</p>
                </div>
              </div>
              <Progress value={100 - percentage} className="h-3 bg-muted/50" indicatorClassName={percentage > 80 ? 'bg-destructive' : 'bg-blue-500'} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/10 p-4 rounded-xl border border-border/30 shadow-sm">
                <div className="flex items-center gap-2 mb-1.5">
                  <Coins className="w-4 h-4 text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Used</p>
                </div>
                <p className="text-lg font-bold font-mono text-foreground/90">{used.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-0.5">this cycle</p>
              </div>
              <div className="bg-muted/10 p-4 rounded-xl border border-border/30 shadow-sm">
                <div className="flex items-center gap-2 mb-1.5">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Usage</p>
                </div>
                <p className="text-lg font-bold font-mono text-foreground/90">{percentage.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground mt-0.5">of limit</p>
              </div>
            </div>

            <div className={`mt-6 p-4 rounded-xl border ${percentage > 80 ? 'bg-destructive/5 border-destructive/20' : 'bg-blue-500/5 border-blue-500/10'}`}>
              <p className={`text-sm font-medium leading-relaxed ${percentage > 80 ? 'text-destructive' : 'text-blue-400/90'}`}>
                {percentage > 80
                  ? `Low credits — consider upgrading your plan.`
                  : `You have ${balance.toLocaleString()} credits remaining this cycle.`}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AIComputeMetricsCard;