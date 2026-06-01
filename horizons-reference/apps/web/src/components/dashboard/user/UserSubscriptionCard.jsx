import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Check } from 'lucide-react';
import { useDashboard } from '@/contexts/DashboardContext.jsx';

const UserSubscriptionCard = () => {
  const { isLoading } = useDashboard();

  return (
    <Card className="h-full flex flex-col shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Crown className="w-5 h-5 text-blue-500" /> Subscription
          </CardTitle>
          <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">Starter</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col pt-4">
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted/50 rounded w-3/4"></div>
            <div className="h-4 bg-muted/50 rounded w-1/2"></div>
            <div className="h-4 bg-muted/50 rounded w-2/3"></div>
          </div>
        ) : (
          <>
            <ul className="space-y-3 mb-6 flex-1">
              {['3 Active Systems', 'Standard Support', '5,000 Credits/mo', 'Basic Templates'].map((feature, i) => (
                <li key={i} className="flex items-center text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-emerald-500 mr-2 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <div className="pt-4 border-t border-border/40 mt-auto">
              <Button className="w-full bg-foreground text-background hover:bg-foreground/90">
                Upgrade Plan
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default UserSubscriptionCard;