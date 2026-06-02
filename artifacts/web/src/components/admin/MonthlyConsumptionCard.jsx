import React from 'react';
import { TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { useAdminData } from '@/contexts/AdminDataContext.jsx';
import { num } from '@/lib/adminFormat.js';

const MonthlyConsumptionCard = () => {
  const { analytics, loading, error } = useAdminData();
  const purchased = analytics?.credits?.totalPurchased;
  const granted = analytics?.credits?.totalGranted;

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium">Credits Purchased</CardTitle>
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2 mt-1"><Skeleton className="h-8 w-24" /><Skeleton className="h-4 w-24" /></div>
        ) : error ? (
          <p className="text-sm text-destructive mt-2">No spending data available</p>
        ) : (
          <div className="flex flex-col">
            <span className="text-2xl font-bold tracking-tight">
              {num(purchased)} <span className="text-sm font-normal text-muted-foreground">credits</span>
            </span>
            <span className="text-xs text-muted-foreground mt-1">{num(granted)} granted (signup + tier + admin)</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MonthlyConsumptionCard;
