import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';

const AdminAIRuntimeMonitoringCard = () => {
  return (
    <Card className="h-full shadow-sm border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Activity className="w-4 h-4" /> Runtime Monitor
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="flex items-center justify-between p-3 bg-muted/10 rounded-lg mb-2 border border-border/30">
          <span className="text-sm font-medium">Active Pipelines</span>
          <span className="font-mono text-primary font-bold">428</span>
        </div>
        <div className="flex items-center justify-between p-3 bg-muted/10 rounded-lg mb-2 border border-border/30">
          <span className="text-sm font-medium">Avg Execution</span>
          <span className="font-mono text-amber-500 font-bold">1.2s</span>
        </div>
        <div className="flex items-center justify-between p-3 bg-muted/10 rounded-lg border border-border/30">
          <span className="text-sm font-medium">Queue Depth</span>
          <span className="font-mono text-foreground font-bold">12</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminAIRuntimeMonitoringCard;