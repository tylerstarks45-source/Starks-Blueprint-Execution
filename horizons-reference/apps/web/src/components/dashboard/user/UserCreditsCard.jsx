import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Coins, ArrowRight } from 'lucide-react';
import { useDashboard } from '@/contexts/DashboardContext.jsx';

const UserCreditsCard = () => {
  const { isLoading } = useDashboard();
  
  // Mock data
  const credits = 2450;
  const limit = 5000;
  const percentage = (credits / limit) * 100;

  return (
    <Card className="h-full flex flex-col shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Coins className="w-5 h-5 text-amber-500" /> API Credits
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col pt-4">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted/50 rounded w-1/2"></div>
            <div className="h-2 bg-muted/50 rounded-full"></div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-3xl font-bold font-mono tracking-tight">{credits.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground font-mono">/ {limit.toLocaleString()}</span>
              </div>
              <Progress value={percentage} className="h-2.5" />
              <p className="text-xs text-muted-foreground mt-3 text-right">Resets in 14 days</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-6 flex-1">
              <div className="bg-muted/20 p-3 rounded-lg border border-border/50 text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Burn Rate</p>
                <p className="text-sm font-semibold">120 / day</p>
              </div>
              <div className="bg-muted/20 p-3 rounded-lg border border-border/50 text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Usage</p>
                <p className="text-sm font-semibold">{percentage.toFixed(1)}%</p>
              </div>
            </div>

            <Button variant="outline" className="w-full mt-auto">
              View Usage History <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default UserCreditsCard;