import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Network, CheckCircle2 } from 'lucide-react';

const AdminOpenRouterHealthCard = () => {
  return (
    <Card className="h-full shadow-sm border-border/50 flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Network className="w-4 h-4" /> OpenRouter Core
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="flex items-center gap-3 mb-6 p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 shrink-0" />
          <div>
            <p className="font-semibold text-emerald-600 dark:text-emerald-400">Connection Stable</p>
            <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 font-mono">Latency: 42ms</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Models Online</p>
            <p className="text-xl font-semibold font-mono">184/185</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Rate Limit</p>
            <p className="text-xl font-semibold font-mono">12%</p>
          </div>
        </div>
        <Button variant="outline" className="w-full mt-auto">Test Connection</Button>
      </CardContent>
    </Card>
  );
};

export default AdminOpenRouterHealthCard;