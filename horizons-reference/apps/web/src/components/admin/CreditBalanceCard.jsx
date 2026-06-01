import React, { useState, useEffect } from 'react';
import { Wallet } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import apiServerClient from '@/lib/apiServerClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';

const CreditBalanceCard = () => {
  const { currentUser: user, isLoading: authLoading } = useAuth();
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Auth guard: wait for auth to finish loading and ensure user exists
    if (authLoading || !user) {
      setLoading(true);
      return;
    }

    const fetchBalance = async () => {
      try {
        setLoading(true);
        setError(false);
        const response = await apiServerClient.fetch('/credits/balance');
        if (!response.ok) throw new Error('Failed to fetch');
        
        const json = await response.json();
        if (isMounted) {
          // Handle both { success: true, data: { balance: 100 } } and { balance: 100 } shapes safely
          const bal = json?.data?.balance ?? json?.balance ?? 0;
          setBalance(bal);
        }
      } catch (err) {
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchBalance();

    return () => {
      isMounted = false;
    };
  }, [user, authLoading]);

  // Combined loading state for render
  const isLoading = authLoading || loading;

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium">Available Credits</CardTitle>
        <Wallet className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24 mt-1" />
        ) : error ? (
          <p className="text-sm text-destructive mt-2">Unable to load balance</p>
        ) : (
          <div className="flex flex-col">
            <span className="text-2xl font-bold tracking-tight">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(balance)}
            </span>
            <span className="text-xs text-muted-foreground mt-1">
              Current account balance
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CreditBalanceCard;