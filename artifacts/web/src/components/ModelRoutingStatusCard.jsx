import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GitBranch, CheckCircle2 } from 'lucide-react';

const ROUTES = [
  { task: 'Blueprint Matching', model: 'gpt-4o-mini', provider: 'OpenRouter', status: 'active' },
  { task: 'System Generation', model: 'gpt-4o-mini', provider: 'OpenRouter', status: 'active' },
  { task: 'Content Tasks',     model: 'gpt-4o-mini', provider: 'OpenRouter', status: 'active' },
];

const ModelRoutingStatusCard = () => {
  return (
    <Card className="bg-card border-border shadow-none">
      <CardHeader className="pb-3 border-b border-border/50">
        <CardTitle className="text-lg font-mono flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-accent" /> Model Routing
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-2">
        {ROUTES.map((r, i) => (
          <div key={i} className="flex items-center gap-3 bg-muted/10 rounded-lg px-3 py-2.5 border border-border/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{r.task}</p>
              <p className="text-[10px] text-muted-foreground">{r.model} · {r.provider}</p>
            </div>
            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold shrink-0">Live</span>
          </div>
        ))}
        <p className="text-[10px] text-muted-foreground pt-1 px-1">All routes via OpenRouter. Fallback: gpt-4o-mini.</p>
      </CardContent>
    </Card>
  );
};

export default ModelRoutingStatusCard;