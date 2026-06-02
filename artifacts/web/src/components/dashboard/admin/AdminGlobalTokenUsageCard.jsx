import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cpu } from 'lucide-react';

const AdminGlobalTokenUsageCard = () => {
  return (
    <Card className="h-full shadow-sm border-border/50 flex flex-col bg-muted/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Cpu className="w-4 h-4" /> Global Token Volume
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center">
        <div className="text-center mb-2">
          <p className="text-5xl font-bold font-mono text-primary tracking-tighter">84.2M</p>
          <p className="text-sm font-medium text-muted-foreground mt-2">Tokens consumed this billing cycle</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminGlobalTokenUsageCard;