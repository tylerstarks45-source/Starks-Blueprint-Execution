import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers } from 'lucide-react';

const AdminPlatformRequestVolumeCard = () => {
  return (
    <Card className="h-full shadow-sm border-border/50 flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Layers className="w-4 h-4" /> Request Volume
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="grid grid-cols-2 gap-4 h-full">
          <div className="bg-muted/10 p-4 rounded-xl flex flex-col justify-center border border-border/40">
            <p className="text-2xl font-bold font-mono">1.2M</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Total Requests</p>
          </div>
          <div className="bg-muted/10 p-4 rounded-xl flex flex-col justify-center border border-border/40">
            <p className="text-2xl font-bold font-mono text-emerald-500">99.8%</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Success Rate</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminPlatformRequestVolumeCard;