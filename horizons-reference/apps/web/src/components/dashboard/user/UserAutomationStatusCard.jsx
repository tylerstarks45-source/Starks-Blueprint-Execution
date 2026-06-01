import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, CheckCircle2 } from 'lucide-react';

const UserAutomationStatusCard = () => {
  return (
    <Card className="h-full flex flex-col shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Activity className="w-5 h-5 text-rose-500" /> Automations
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pt-4">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium leading-none">Email Campaign Sent</p>
                <p className="text-xs text-muted-foreground mt-1 font-mono">Today, 10:24 AM</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default UserAutomationStatusCard;