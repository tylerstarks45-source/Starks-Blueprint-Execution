import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Box, ArrowUpRight } from 'lucide-react';

const AdminBlueprintDeploymentMonitoringCard = () => {
  return (
    <Card className="h-full shadow-sm border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Box className="w-4 h-4" /> Deployments
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2 flex flex-col justify-center">
        <div className="flex items-center justify-between mb-4">
          <span className="text-3xl font-bold font-mono">142</span>
          <span className="text-xs font-medium text-emerald-500 flex items-center bg-emerald-500/10 px-2 py-1 rounded-md">
            <ArrowUpRight className="w-3 h-3 mr-1" /> Active
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Systems successfully built from blueprints in the last 24h.</p>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary w-[80%]"></div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminBlueprintDeploymentMonitoringCard;