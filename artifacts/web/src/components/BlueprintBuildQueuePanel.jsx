import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Layers } from 'lucide-react';

const BlueprintBuildQueuePanel = () => {
  return (
    <Card className="bg-card border-border shadow-none">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-mono flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" /> Build Queue
          </CardTitle>
          <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/20 text-[10px] uppercase tracking-wider">
            Coming Soon
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Build queue status will appear here. Automated provisioning, deployment pipeline, and build progress tracking.
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Queue Position</span>
              <span className="font-mono text-foreground">—</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BlueprintBuildQueuePanel;