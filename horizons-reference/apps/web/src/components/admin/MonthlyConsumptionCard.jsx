import React, { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import apiServerClient from '@/lib/apiServerClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';

const MonthlyConsumptionCard = () => {
  const { currentUser: user, isLoading: authLoading } = useAuth();
  const [consumption, setConsumption] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Auth guard: wait for auth to finish loading and ensure user exists
    if (authLoading || !user) {
      setLoading(true);
      return;
    }

    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(false);
        const response = await apiServerClient.fetch('/credits/stats');
        if (!response.ok) throw new Error('Failed to fetch');
        
        const json = await response.json();
        if (isMounted) {
          const data = json?.data ?? json;
          setConsumption({
            spent: data?.spent || 0,
            usageRate: data?.usageRate || 0
          });
        }
      } catch (err) {
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchStats();

    return () => {
      isMounted = false;
    };
  }, [user, authLoading]);

  // Combined loading state for render
  const isLoading = authLoading || loading;

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium">Monthly Consumption</CardTitle>
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2 mt-1">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive mt-2">No spending data available</p>
        ) : (
          <div className="flex flex-col">
            <span className="text-2xl font-bold tracking-tight">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(consumption.spent)}
            </span>
            <span className="text-xs text-muted-foreground mt-1">
              Rate: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(consumption.usageRate)}/day
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MonthlyConsumptionCard;