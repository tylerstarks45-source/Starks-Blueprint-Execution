import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown } from 'lucide-react';

const AdminSubscriptionAnalyticsCard = () => {
  return (
    <Card className="h-full shadow-sm border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Crown className="w-4 h-4" /> Subscriptions
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-border/40 pb-2">
            <span className="text-sm font-medium">Pro Tier</span>
            <span className="font-mono font-bold">2,104</span>
          </div>
          <div className="flex justify-between items-center border-b border-border/40 pb-2">
            <span className="text-sm font-medium">Enterprise</span>
            <span className="font-mono font-bold">342</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-muted-foreground">Churn Rate</span>
            <span className="font-mono text-destructive font-bold">2.4%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminSubscriptionAnalyticsCard;