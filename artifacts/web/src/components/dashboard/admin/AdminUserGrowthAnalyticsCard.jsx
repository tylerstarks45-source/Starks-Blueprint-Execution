import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

const AdminUserGrowthAnalyticsCard = () => {
  return (
    <Card className="h-full shadow-sm border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <TrendingUp className="w-4 h-4" /> Growth Trend
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2 flex flex-col justify-center text-center">
        <p className="text-4xl font-bold font-mono text-primary">+482</p>
        <p className="text-xs text-muted-foreground mt-2 uppercase tracking-wider font-semibold">New users this week</p>
      </CardContent>
    </Card>
  );
};

export default AdminUserGrowthAnalyticsCard;