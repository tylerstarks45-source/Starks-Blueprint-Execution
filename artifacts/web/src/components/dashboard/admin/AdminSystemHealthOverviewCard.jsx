import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';

const AdminSystemHealthOverviewCard = () => {
  return (
    <Card className="h-full shadow-sm border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" /> Security Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2 flex flex-col justify-center items-center h-24">
        <p className="text-sm text-muted-foreground italic">No active security alerts.</p>
      </CardContent>
    </Card>
  );
};

export default AdminSystemHealthOverviewCard;