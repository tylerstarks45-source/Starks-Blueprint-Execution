import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Webhook } from 'lucide-react';

const AdminAPIMonitoringCard = () => {
  return (
    <Card className="h-full shadow-sm border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Webhook className="w-4 h-4" /> External APIs
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Stripe</span>
            <span className="text-xs bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded font-medium">Healthy</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">SendGrid</span>
            <span className="text-xs bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded font-medium">Healthy</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">GitHub</span>
            <span className="text-xs bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded font-medium">Healthy</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminAPIMonitoringCard;