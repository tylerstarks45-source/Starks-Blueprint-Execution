import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Network, History, Cpu, Activity } from 'lucide-react';

const QuickActionsPanel = () => {
  const actions = [
    { icon: Network, label: 'Test AI Network', desc: 'Run system-wide diagnostic', color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
    { icon: History, label: 'View AI Activity', desc: 'Check recent operations', color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
    { icon: Cpu, label: 'Check Compute', desc: 'Review usage metrics', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
    { icon: Activity, label: 'System Health', desc: 'Monitor engine status', color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
  ];

  return (
    <Card className="bg-card/40 backdrop-blur-md border-border/50 shadow-lg">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {actions.map((action, idx) => (
            <Button 
              key={idx} 
              variant="outline" 
              className="h-auto py-4 px-4 flex flex-col items-start justify-start gap-3 bg-background/50 border-border/50 hover:bg-muted/30 hover:border-border transition-all duration-200 active:scale-[0.98]"
            >
              <div className={`w-10 h-10 rounded-lg ${action.bg} flex items-center justify-center border ${action.border}`}>
                <action.icon className={`w-5 h-5 ${action.color}`} />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground/90">{action.label}</p>
                <p className="text-xs text-muted-foreground font-normal mt-0.5">{action.desc}</p>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActionsPanel;