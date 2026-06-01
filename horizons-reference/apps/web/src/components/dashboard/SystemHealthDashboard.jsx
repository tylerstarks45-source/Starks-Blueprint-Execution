import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Server, ShieldCheck, Wifi } from 'lucide-react';

const SystemHealthDashboard = () => {
  return (
    <Card className="bg-card/40 backdrop-blur-md border-border/50 shadow-lg transition-all duration-300 hover:shadow-xl hover:border-primary/20">
      <CardHeader className="pb-4 border-b border-border/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" /> System Health
          </CardTitle>
          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-medium">
            All Systems Operational
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/5 border border-border/20">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
              <Server className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground/90 mb-1">Starks AI Engine</p>
              <p className="text-xs text-muted-foreground mb-2">Core orchestration and routing</p>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
                <span className="text-xs font-medium text-emerald-500">Online (99.99% Uptime)</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/5 border border-border/20">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0">
              <Wifi className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground/90 mb-1">Network Connectivity</p>
              <p className="text-xs text-muted-foreground mb-2">External API bridges</p>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
                <span className="text-xs font-medium text-emerald-500">Stable (12ms Latency)</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/5 border border-border/20">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20 shrink-0">
              <ShieldCheck className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground/90 mb-1">Processing Performance</p>
              <p className="text-xs text-muted-foreground mb-2">Throughput and capacity</p>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
                <span className="text-xs font-medium text-emerald-500">Optimal (45 req/sec)</span>
              </div>
            </div>
          </div>

        </div>
      </CardContent>
    </Card>
  );
};

export default SystemHealthDashboard;