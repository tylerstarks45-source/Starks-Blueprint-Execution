import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap } from 'lucide-react';

const AdminComputeUsageMetricsCard = () => {
  return (
    <Card className="h-full shadow-sm border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Zap className="w-4 h-4" /> Compute Spend
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="text-center mb-4">
          <p className="text-3xl font-bold font-mono text-destructive">$842.50</p>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider font-semibold">MTD Provider Cost</p>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Anthropic</span>
            <span className="font-mono font-medium">$520.10</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">OpenAI</span>
            <span className="font-mono font-medium">$280.40</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminComputeUsageMetricsCard;