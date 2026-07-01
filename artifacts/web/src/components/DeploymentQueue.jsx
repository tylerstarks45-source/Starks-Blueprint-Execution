import React, { useState, useEffect } from 'react';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Server, Clock, Terminal, RotateCcw, AlertCircle } from 'lucide-react';
import SystemStatusBadge from './SystemStatusBadge';
import { formatDistanceToNow } from 'date-fns';

const DeploymentQueue = ({ systemId }) => {
  const { currentUser } = useAuth();
  const [deployments, setDeployments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDeployments = async () => {
      if (!currentUser) return;
      try {
        let filter = `user_id="${currentUser.id}"`;
        if (systemId) filter += ` && system_id="${systemId}"`;
        
        const records = await pb.collection('deployments').getList(1, 10, {
          filter,
          sort: '-created_at',
          $autoCancel: false
        });
        setDeployments(records.items);
      } catch (error) {
        console.error("Failed to fetch deployments:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDeployments();
  }, [currentUser, systemId]);

  if (isLoading) return <div className="h-32 flex items-center justify-center"><Server className="w-6 h-6 animate-pulse text-muted-foreground" /></div>;

  return (
    <Card className="bg-card border-border shadow-none">
      <CardHeader className="pb-3 border-b border-border/50">
        <CardTitle className="text-lg font-mono flex items-center gap-2">
          <Server className="w-5 h-5 text-primary" /> Deployment Pipeline
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {deployments.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">No deployment history found.</div>
        ) : (
          <div className="space-y-4">
            {deployments.map((dep, idx) => (
              <div key={dep.id} className="p-4 bg-muted/20 border border-border rounded-xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-foreground">Deploy #{String(dep.id).slice(-6)}</span>
                      {idx === 0 && dep.status === 'queued' && (
                        <span className="text-[10px] bg-secondary/20 text-secondary px-2 py-0.5 rounded font-bold uppercase tracking-wider">Pos: {dep.queue_position || 1}</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatDistanceToNow(new Date(dep.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <SystemStatusBadge status={dep.status === 'completed' ? 'Running' : dep.status === 'failed' ? 'Error' : 'Deploying'} />
                </div>
                
                {dep.status === 'deploying' && (
                  <div className="w-full bg-background rounded-full h-1.5 mb-3">
                    <div className="bg-primary h-1.5 rounded-full animate-pulse" style={{ width: '65%' }}></div>
                  </div>
                )}

                <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                  <Button variant="outline" size="sm" className="h-8 text-xs border-border hover:bg-muted">
                    <Terminal className="w-3.5 h-3.5 mr-1.5" /> Logs
                  </Button>
                  {dep.status === 'completed' && (
                    <Button variant="outline" size="sm" className="h-8 text-xs border-border hover:bg-destructive/10 hover:text-destructive">
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Rollback
                    </Button>
                  )}
                  {dep.status === 'failed' && (
                    <Button variant="outline" size="sm" className="h-8 text-xs border-border hover:bg-primary/10 hover:text-primary">
                      <AlertCircle className="w-3.5 h-3.5 mr-1.5" /> Retry
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DeploymentQueue;