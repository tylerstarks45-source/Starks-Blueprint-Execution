import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Cpu, TrendingUp, AlertCircle } from 'lucide-react';

const AIComputeMetricsCard = () => {
  // Mock data for visual representation
  const totalLimit = 1000000;
  const used = 425000;
  const percentage = (used / totalLimit) * 100;
  const burnRate = 14500; // units per day
  const projected = used + (burnRate * 15); // assuming 15 days left

  return (
    <Card className="bg-card/40 backdrop-blur-md border-border/50 shadow-lg transition-all duration-300 hover:shadow-xl hover:border-primary/20 h-full flex flex-col">
      <CardHeader className="pb-4 border-b border-border/30">
        <CardTitle className="text-lg font-medium tracking-tight flex items-center gap-2">
          <Cpu className="w-5 h-5 text-blue-400" /> Compute Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 flex-grow flex flex-col justify-between">
        
        <div className="mb-8">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-3xl font-bold font-mono tracking-tight text-foreground">{used.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground font-medium">Units used this month</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-mono text-muted-foreground">{totalLimit.toLocaleString()} limit</p>
            </div>
          </div>
          <Progress value={percentage} className="h-3 bg-muted/50" indicatorClassName={percentage > 80 ? 'bg-destructive' : 'bg-blue-500'} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/10 p-4 rounded-xl border border-border/30 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Burn Rate</p>
            </div>
            <p className="text-lg font-bold font-mono text-foreground/90">{burnRate.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">units / day</p>
          </div>
          
          <div className="bg-muted/10 p-4 rounded-xl border border-border/30 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <AlertCircle className="w-4 h-4 text-muted-foreground" />
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Projected</p>
            </div>
            <p className="text-lg font-bold font-mono text-foreground/90">{projected.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">end of month</p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
          <p className="text-sm text-blue-400/90 font-medium leading-relaxed">
            Your compute usage is on track. You have <span className="font-bold text-blue-400">{(totalLimit - used).toLocaleString()}</span> units remaining for the current billing cycle.
          </p>
        </div>

      </CardContent>
    </Card>
  );
};

export default AIComputeMetricsCard;