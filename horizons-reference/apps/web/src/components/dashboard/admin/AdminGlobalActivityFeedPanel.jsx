import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { History } from 'lucide-react';

const AdminGlobalActivityFeedPanel = () => {
  return (
    <Card className="h-full shadow-sm border-border/50">
      <CardHeader className="pb-3 border-b border-border/30">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-500" /> Global Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
            <div>
              <p className="text-sm font-medium">User "dev@starks.com" deployed Blueprint #241</p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">2 mins ago</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0"></div>
            <div>
              <p className="text-sm font-medium">New subscription: Pro Tier created</p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">14 mins ago</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0"></div>
            <div>
              <p className="text-sm font-medium">Admin changed model routing fallback</p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">1 hr ago</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminGlobalActivityFeedPanel;