import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Server, DollarSign, Activity } from 'lucide-react';

const AdminPlatformMetricsCard = () => {
  const metrics = [
    { label: 'Total Users', value: '14,239', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Active Systems', value: '3,842', icon: Server, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'MRR', value: '$124.5k', icon: DollarSign, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Platform Health', value: '99.9%', icon: Activity, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  ];

  return (
    <Card className="shadow-sm border-border/50 bg-card/50 backdrop-blur">
      <CardContent className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {metrics.map((m, i) => (
            <div key={i} className="flex flex-col gap-3">
              <div className={`w-10 h-10 rounded-xl ${m.bg} flex items-center justify-center shrink-0`}>
                <m.icon className={`w-5 h-5 ${m.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono tracking-tight text-foreground">{m.value}</p>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">{m.label}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminPlatformMetricsCard;