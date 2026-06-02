import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GitBranch } from 'lucide-react';

const ModelRoutingStatusCard = () => {
  return (
    <Card className="bg-card border-border shadow-none">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-mono flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-accent" /> Model Routing
          </CardTitle>
          <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/20 text-[10px] uppercase tracking-wider">
            Coming Soon
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Model selection and routing information will appear here. Dynamic fallback logic and cost-optimized AI model routing.
        </p>
      </CardContent>
    </Card>
  );
};

export default ModelRoutingStatusCard;