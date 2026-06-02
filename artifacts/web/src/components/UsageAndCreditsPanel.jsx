import React, { useState, useEffect } from 'react';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Coins, Zap, Server, Activity } from 'lucide-react';

const UsageAndCreditsPanel = () => {
  const { currentUser } = useAuth();
  const [credits, setCredits] = useState({ balance: 0 });
  const [metrics, setMetrics] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      try {
        const [creditRes, metricRes] = await Promise.all([
          pb.collection('credits').getFirstListItem(`user_id="${currentUser.id}"`, { $autoCancel: false }).catch(() => ({ balance: 5000 })),
          pb.collection('usage_metrics').getList(1, 10, { filter: `user_id="${currentUser.id}"`, $autoCancel: false })
        ]);
        setCredits(creditRes);
        setMetrics(metricRes.items);
      } catch (error) {
        console.error("Failed to fetch usage data:", error);
      }
    };
    fetchData();
  }, [currentUser]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="bg-gradient-to-br from-card to-background border-border">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Compute Credits</p>
              <h3 className="text-4xl font-extrabold font-mono text-foreground">{credits.balance.toLocaleString()}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Monthly Allocation</span>
              <span>{credits.balance.toLocaleString()} / 10,000</span>
            </div>
            <Progress value={(credits.balance / 10000) * 100} className="h-1.5 bg-muted" indicatorClassName="bg-primary" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Usage Breakdown</p>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium text-foreground">AI Requests</span>
              </div>
              <span className="text-sm font-mono text-muted-foreground">1,240</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium text-foreground">Executions</span>
              </div>
              <span className="text-sm font-mono text-muted-foreground">8,432</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-secondary" />
                <span className="text-sm font-medium text-foreground">Deployments</span>
              </div>
              <span className="text-sm font-mono text-muted-foreground">12</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsageAndCreditsPanel;