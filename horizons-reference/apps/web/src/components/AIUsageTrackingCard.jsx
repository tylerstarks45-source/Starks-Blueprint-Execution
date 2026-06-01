import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart } from 'lucide-react';

const AIUsageTrackingCard = () => {
  return (
    <Card className="bg-card border-border shadow-none">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-mono flex items-center gap-2">
            <BarChart className="w-5 h-5 text-emerald-400" /> AI Usage
          </CardTitle>
          <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/20 text-[10px] uppercase tracking-wider">
            Coming Soon
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Usage metrics and tracking will be displayed here. Token consumption, cost analytics, and per-system usage breakdown.
        </p>
      </CardContent>
    </Card>
  );
};

export default AIUsageTrackingCard;