import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Map } from 'lucide-react';

const DeploymentPlanningCard = () => {
  return (
    <Card className="bg-card border-border shadow-none">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-mono flex items-center gap-2">
            <Map className="w-5 h-5 text-blue-400" /> Deployment Planning
          </CardTitle>
          <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/20 text-[10px] uppercase tracking-wider">
            Coming Soon
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Deployment planning tools will be available here. Visual execution plans, architecture mapping, and deployment strategy optimization.
        </p>
      </CardContent>
    </Card>
  );
};

export default DeploymentPlanningCard;