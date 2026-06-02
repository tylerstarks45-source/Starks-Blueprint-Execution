import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAdminData } from '@/contexts/AdminDataContext.jsx';
import { relativeTime } from '@/lib/adminFormat.js';

const AdminPlatformErrorLogsPanel = () => {
  const { analytics, loading, error } = useAdminData();
  const errors = analytics?.recentErrors ?? [];

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="pb-3 border-b border-border/30">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-destructive" /> Recent Error Logs
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 p-0">
        {error ? (
          <p className="text-sm text-destructive p-4">Unable to load error logs</p>
        ) : loading ? (
          <div className="p-4 space-y-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
        ) : errors.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            <p className="text-sm italic">No recent errors.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {errors.map((e) => (
              <div key={e.id} className="p-4 hover:bg-muted/10 transition-colors">
                <div className="flex justify-between items-start mb-1">
                  <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30 bg-destructive/5 uppercase tracking-wider">
                    {e.model || 'Error'}
                  </Badge>
                  <span className="text-xs font-mono text-muted-foreground">{relativeTime(e.createdAt)}</span>
                </div>
                <p className="text-sm font-medium mt-2 break-words">{e.errorMessage || 'Unknown error'}</p>
                {e.userId != null && (
                  <p className="text-xs text-muted-foreground font-mono mt-1">User #{e.userId}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminPlatformErrorLogsPanel;
