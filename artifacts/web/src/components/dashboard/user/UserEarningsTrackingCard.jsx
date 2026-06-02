import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp } from 'lucide-react';

const UserEarningsTrackingCard = () => {
  return (
    <Card className="h-full flex flex-col shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-500" /> Revenue Tracking
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center py-6">
        <div className="text-center mb-6">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Estimated This Month</p>
          <p className="text-4xl font-bold font-mono text-foreground">$1,240.00</p>
          <div className="flex items-center justify-center gap-1 mt-2 text-emerald-500">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium">+14.5% vs last month</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserEarningsTrackingCard;