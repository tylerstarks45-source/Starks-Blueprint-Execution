import React, { useState, useEffect } from 'react';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Play, Calendar, Terminal } from 'lucide-react';
import SystemStatusBadge from './SystemStatusBadge';
import { formatDistanceToNow } from 'date-fns';

const ExecutionMonitor = ({ systemId }) => {
  const { currentUser } = useAuth();
  const [executions, setExecutions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchExecutions = async () => {
      if (!currentUser) return;
      try {
        let filter = `user_id="${currentUser.id}"`;
        if (systemId) filter += ` && system_id="${systemId}"`;
        
        const records = await pb.collection('executions').getList(1, 5, {
          filter,
          sort: '-created_at',
          $autoCancel: false
        });
        setExecutions(records.items);
      } catch (error) {
        console.error("Failed to fetch executions:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchExecutions();
  }, [currentUser, systemId]);

  if (isLoading) return <div className="h-32 flex items-center justify-center"><Activity className="w-6 h-6 animate-pulse text-muted-foreground" /></div>;

  return (
    <Card className="bg-card border-border shadow-none">
      <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-mono flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-400" /> Execution Engine
        </CardTitle>
        <Button size="sm" variant="outline" className="h-8 border-border hover:bg-muted">
          <Calendar className="w-3.5 h-3.5 mr-1.5" /> Schedule
        </Button>
      </CardHeader>
      <CardContent className="pt-4">
        {executions.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">No recent executions.</div>
        ) : (
          <div className="space-y-3">
            {executions.map((exec) => (
              <div key={exec.id} className="flex items-center justify-between p-3 bg-muted/20 border border-border rounded-lg">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-foreground">Run #{String(exec.id).slice(-6)}</span>
                    <SystemStatusBadge status={exec.status === 'completed' ? 'Running' : exec.status === 'failed' ? 'Error' : 'Deploying'} size="sm" />
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(exec.created_at), { addSuffix: true })} 
                    {exec.duration && ` • ${exec.duration}ms`}
                  </span>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                  <Terminal className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExecutionMonitor;