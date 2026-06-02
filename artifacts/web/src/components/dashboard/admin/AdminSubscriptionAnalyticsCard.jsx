import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Crown } from 'lucide-react';
import { useAdminData } from '@/contexts/AdminDataContext.jsx';
import { num } from '@/lib/adminFormat.js';

const TIER_LABELS = {
  starter: 'Starter',
  builder: 'Builder',
  operator: 'Operator',
  empire: 'Empire',
  none: 'No Tier',
};

const AdminSubscriptionAnalyticsCard = () => {
  const { analytics, loading, error } = useAdminData();
  const subs = analytics?.subscriptions ?? [];
  const paid = analytics?.platform?.paidSubscribers;
  const ordered = [...subs].sort((a, b) => (b.count || 0) - (a.count || 0));

  return (
    <Card className="h-full shadow-sm border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Crown className="w-4 h-4" /> Subscriptions
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {error ? (
          <p className="text-sm text-destructive">Unable to load subscriptions</p>
        ) : loading ? (
          <div className="space-y-3"><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-full" /></div>
        ) : ordered.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No active subscriptions.</p>
        ) : (
          <div className="space-y-4">
            {ordered.map((s) => (
              <div key={s.tier} className="flex justify-between items-center border-b border-border/40 pb-2">
                <span className="text-sm font-medium">{TIER_LABELS[s.tier] ?? s.tier}</span>
                <span className="font-mono font-bold">{num(s.count)}</span>
              </div>
            ))}
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">Paid Subscribers</span>
              <span className="font-mono text-primary font-bold">{num(paid)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminSubscriptionAnalyticsCard;
