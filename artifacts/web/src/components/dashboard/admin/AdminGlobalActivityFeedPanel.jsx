import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { History } from 'lucide-react';
import { useAdminData } from '@/contexts/AdminDataContext.jsx';
import { relativeTime } from '@/lib/adminFormat.js';

const DOT = {
  update_user: 'bg-blue-500',
  adjust_credits: 'bg-emerald-500',
  default: 'bg-amber-500',
};

const describe = (a) => {
  let detail = '';
  try {
    const d = a.details ? JSON.parse(a.details) : null;
    if (a.action === 'adjust_credits' && d) detail = ` (${d.delta > 0 ? '+' : ''}${d.delta} credits)`;
    else if (a.action === 'update_user' && d?.changes) detail = ` (${Object.keys(d.changes).join(', ')})`;
  } catch {
    /* ignore */
  }
  const label = (a.action || 'activity').replace(/_/g, ' ');
  const target = a.resourceType ? ` ${a.resourceType} #${a.resourceId}` : '';
  return `${label}${target}${detail}`;
};

const AdminGlobalActivityFeedPanel = () => {
  const { analytics, loading, error } = useAdminData();
  const items = analytics?.recentActivity ?? [];

  return (
    <Card className="h-full shadow-sm border-border/50">
      <CardHeader className="pb-3 border-b border-border/30">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-500" /> Global Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {error ? (
          <p className="text-sm text-destructive">Unable to load activity</p>
        ) : loading ? (
          <div className="space-y-3"><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-full" /></div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No recent admin activity.</p>
        ) : (
          <div className="space-y-4">
            {items.map((a) => (
              <div key={a.id} className="flex gap-3">
                <div className={`w-2 h-2 rounded-full ${DOT[a.action] ?? DOT.default} mt-1.5 shrink-0`}></div>
                <div>
                  <p className="text-sm font-medium capitalize">{describe(a)}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{relativeTime(a.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminGlobalActivityFeedPanel;
