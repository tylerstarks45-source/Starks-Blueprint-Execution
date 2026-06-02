import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

const AdminAIUsageAnalyticsCard = () => {
  return (
    <Card className="h-full shadow-sm border-border/50 flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <BarChart3 className="w-4 h-4" /> AI Usage Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center">
        <div className="flex items-end gap-2 mb-6">
          <span className="text-4xl font-bold font-mono">1.2M</span>
          <span className="text-sm text-muted-foreground mb-1">tokens / hr</span>
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-foreground">Claude 3.5 Sonnet</span>
              <span className="text-muted-foreground">65%</span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden"><div className="h-full bg-blue-500 w-[65%]"></div></div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-foreground">GPT-4o</span>
              <span className="text-muted-foreground">25%</span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden"><div className="h-full bg-emerald-500 w-[25%]"></div></div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-foreground">Other Models</span>
              <span className="text-muted-foreground">10%</span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden"><div className="h-full bg-amber-500 w-[10%]"></div></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminAIUsageAnalyticsCard;