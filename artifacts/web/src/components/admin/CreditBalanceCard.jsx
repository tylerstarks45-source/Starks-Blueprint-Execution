import React from 'react';
import { Wallet } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { useAdminData } from '@/contexts/AdminDataContext.jsx';
import { num } from '@/lib/adminFormat.js';

const CreditBalanceCard = () => {
  const { analytics, loading, error } = useAdminData();
  const outstanding = analytics?.credits?.outstandingBalance;

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium">Outstanding Credits</CardTitle>
        <Wallet className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24 mt-1" />
        ) : error ? (
          <p className="text-sm text-destructive mt-2">Unable to load balance</p>
        ) : (
          <div className="flex flex-col">
            <span className="text-2xl font-bold tracking-tight">{num(outstanding)}</span>
            <span className="text-xs text-muted-foreground mt-1">Credits held across all user accounts</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CreditBalanceCard;
