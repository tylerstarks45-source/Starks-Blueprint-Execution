import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ServerCrash } from 'lucide-react';

const AdminAIInfrastructureMonitoringCard = () => {
  return (
    <Card className="h-full shadow-sm border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <ServerCrash className="w-4 h-4" /> Infra Capacity
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2 flex flex-col justify-center">
        <div className="text-center p-4 bg-muted/10 rounded-xl border border-border/40">
          <p className="text-3xl font-bold font-mono tracking-tighter">42%</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">CPU Load Avg</p>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="text-center p-2 bg-muted/5 rounded-lg border border-border/20">
            <p className="text-sm font-mono font-bold">14GB</p>
            <p className="text-[10px] text-muted-foreground uppercase">Memory</p>
          </div>
          <div className="text-center p-2 bg-muted/5 rounded-lg border border-border/20">
            <p className="text-sm font-mono font-bold">2.4TB</p>
            <p className="text-[10px] text-muted-foreground uppercase">Storage</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminAIInfrastructureMonitoringCard;