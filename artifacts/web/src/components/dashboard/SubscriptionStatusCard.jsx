import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Crown, Check, ArrowUpRight } from 'lucide-react';

const SubscriptionStatusCard = () => {
  return (
    <Card className="bg-card/40 backdrop-blur-md border-border/50 shadow-lg transition-all duration-300 hover:shadow-xl hover:border-primary/20 h-full flex flex-col">
      <CardHeader className="pb-4 border-b border-border/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium tracking-tight flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" /> Subscription Plan
          </CardTitle>
          <Badge className="bg-amber-400/10 text-amber-400 border-amber-400/20 font-semibold tracking-wide">
            OPERATOR TIER
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6 flex-grow flex flex-col">
        <div className="space-y-6 flex-grow">
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-foreground/80">Active Workflows</span>
              <span className="font-mono text-muted-foreground">12 / 20</span>
            </div>
            <Progress value={60} className="h-2 bg-muted/50" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-foreground/80">AI Build Agent Uses</span>
              <span className="font-mono text-muted-foreground">45 / 100</span>
            </div>
            <Progress value={45} className="h-2 bg-muted/50" />
          </div>

          <div className="pt-4 border-t border-border/30">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Included Features</p>
            <ul className="space-y-2.5">
              {['Advanced AI Orchestration', 'Priority Model Routing', 'Custom Integrations', 'Premium Support'].map((feature, i) => (
                <li key={i} className="flex items-center text-sm text-foreground/80">
                  <Check className="w-4 h-4 text-emerald-500 mr-2 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Button className="w-full mt-6 transition-all duration-200 active:scale-[0.98]" variant="outline">
          Upgrade Plan <ArrowUpRight className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default SubscriptionStatusCard;