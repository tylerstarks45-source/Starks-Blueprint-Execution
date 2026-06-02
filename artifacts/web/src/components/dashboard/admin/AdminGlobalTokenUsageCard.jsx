import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Cpu } from 'lucide-react';
import { useAdminData } from '@/contexts/AdminDataContext.jsx';
import { compact } from '@/lib/adminFormat.js';

const AdminGlobalTokenUsageCard = () => {
  const { analytics, loading, error } = useAdminData();
  const tokens = analytics?.ai?.totalTokens;

  return (
    <Card className="h-full shadow-sm border-border/50 flex flex-col bg-muted/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Cpu className="w-4 h-4" /> Global Token Volume
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center">
        <div className="text-center mb-2">
          {error ? (
            <p className="text-sm text-destructive">Unable to load token usage</p>
          ) : loading ? (
            <Skeleton className="h-12 w-40 mx-auto" />
          ) : (
            <p className="text-5xl font-bold font-mono text-primary tracking-tighter">{compact(tokens)}</p>
          )}
          <p className="text-sm font-medium text-muted-foreground mt-2">Tokens consumed across the platform (all-time)</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminGlobalTokenUsageCard;
