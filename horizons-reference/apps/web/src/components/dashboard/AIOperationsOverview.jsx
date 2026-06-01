import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, Cpu, Zap, CheckCircle2, Clock } from 'lucide-react';

const AIOperationsOverview = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <Card className="bg-card/40 backdrop-blur-md border-border/50 shadow-sm hover:shadow-md transition-all duration-300">
        <CardContent className="p-5 flex flex-col justify-center h-full">
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
              <Activity className="w-4 h-4 text-primary" />
            </div>
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Active Operations</p>
          <p className="text-2xl font-bold text-foreground tracking-tight">24</p>
        </CardContent>
      </Card>

      <Card className="bg-card/40 backdrop-blur-md border-border/50 shadow-sm hover:shadow-md transition-all duration-300">
        <CardContent className="p-5 flex flex-col justify-center h-full">
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <Cpu className="w-4 h-4 text-blue-500" />
            </div>
            <span className="text-xs font-medium text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full">Normal</span>
          </div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Compute Usage</p>
          <div className="flex items-end gap-2">
            <p className="text-2xl font-bold text-foreground tracking-tight">42%</p>
            <p className="text-xs text-muted-foreground mb-1">of limit</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/40 backdrop-blur-md border-border/50 shadow-sm hover:shadow-md transition-all duration-300">
        <CardContent className="p-5 flex flex-col justify-center h-full">
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Success Rate</p>
          <p className="text-2xl font-bold text-foreground tracking-tight">99.8%</p>
        </CardContent>
      </Card>

      <Card className="bg-card/40 backdrop-blur-md border-border/50 shadow-sm hover:shadow-md transition-all duration-300">
        <CardContent className="p-5 flex flex-col justify-center h-full">
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
          </div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Avg Processing</p>
          <p className="text-2xl font-bold text-foreground tracking-tight font-mono">840ms</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-primary/10 to-transparent backdrop-blur-md border-primary/20 shadow-sm hover:shadow-md transition-all duration-300">
        <CardContent className="p-5 flex flex-col justify-center h-full">
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">Online</span>
          </div>
          <p className="text-xs font-medium text-primary/80 uppercase tracking-wider mb-1">AI Engine Status</p>
          <p className="text-xl font-bold text-foreground tracking-tight">Operational</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIOperationsOverview;