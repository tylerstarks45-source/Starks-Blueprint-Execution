import React, { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import apiServerClient from '@/lib/apiServerClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';

const UsageOverviewCard = () => {
  const { currentUser: user, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState(null);
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
          setStats({
            totalTokens: data?.totalTokens || 0,
            averagePerRequest: data?.averagePerRequest || 0
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
        <CardTitle className="text-sm font-medium">Token Usage</CardTitle>
        <Zap className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2 mt-1">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-4 w-20" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive mt-2">No usage data available</p>
        ) : (
          <div className="flex flex-col">
            <span className="text-2xl font-bold tracking-tight">
              {new Intl.NumberFormat('en-US').format(stats.totalTokens)} <span className="text-sm font-normal text-muted-foreground">tokens</span>
            </span>
            <span className="text-xs text-muted-foreground mt-1">
              ~{new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(stats.averagePerRequest)} tokens/request
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UsageOverviewCard;