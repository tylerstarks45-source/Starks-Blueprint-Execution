import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HeartPulse } from 'lucide-react';

const AdminPlatformHealthCard = () => {
  return (
    <Card className="h-full shadow-sm border-border/50 bg-emerald-500/5 border-emerald-500/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
          <HeartPulse className="w-4 h-4" /> Global Status
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-400 mb-1">All Systems Operational</p>
        <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80">Last incident: 14 days ago</p>
      </CardContent>
    </Card>
  );
};

export default AdminPlatformHealthCard;