import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp } from 'lucide-react';
import { useAdminData } from '@/contexts/AdminDataContext.jsx';
import { num } from '@/lib/adminFormat.js';

const AdminUserGrowthAnalyticsCard = () => {
  const { analytics, loading, error } = useAdminData();
  const week = analytics?.platform?.newUsersThisWeek;
  const today = analytics?.platform?.newUsersToday;

  return (
    <Card className="h-full shadow-sm border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <TrendingUp className="w-4 h-4" /> Growth Trend
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2 flex flex-col justify-center text-center">
        {error ? (
          <p className="text-sm text-destructive">Unable to load growth</p>
        ) : loading ? (
          <Skeleton className="h-10 w-24 mx-auto" />
        ) : (
          <>
            <p className="text-4xl font-bold font-mono text-primary">+{num(week)}</p>
            <p className="text-xs text-muted-foreground mt-2 uppercase tracking-wider font-semibold">
              New users this week{today != null ? ` · +${num(today)} today` : ''}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminUserGrowthAnalyticsCard;
