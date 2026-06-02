import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity } from 'lucide-react';
import { useAdminData } from '@/contexts/AdminDataContext.jsx';
import { num } from '@/lib/adminFormat.js';

const AdminAIRuntimeMonitoringCard = () => {
  const { analytics, loading, error } = useAdminData();
  const p = analytics?.platform;
  const ai = analytics?.ai;

  const rows = [
    { label: 'Active Systems', value: p ? num(p.activeSystemInstances) : '—', tone: 'text-primary' },
    { label: 'Building', value: p ? num(p.buildingSystemInstances) : '—', tone: 'text-amber-500' },
    { label: 'Requests (24h)', value: ai ? num(ai.requestsLast24h) : '—', tone: 'text-foreground' },
  ];

  return (
    <Card className="h-full shadow-sm border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Activity className="w-4 h-4" /> Runtime Monitor
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {error ? (
          <p className="text-sm text-destructive">Unable to load runtime</p>
        ) : loading ? (
          <div className="space-y-2"><Skeleton className="h-11 w-full" /><Skeleton className="h-11 w-full" /><Skeleton className="h-11 w-full" /></div>
        ) : (
          rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between p-3 bg-muted/10 rounded-lg mb-2 border border-border/30 last:mb-0">
              <span className="text-sm font-medium">{r.label}</span>
              <span className={`font-mono font-bold ${r.tone}`}>{r.value}</span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default AdminAIRuntimeMonitoringCard;
