import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Server, ArrowRight, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient.js';

const STATUS_STYLES = {
  active:       'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  building:     'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'in_progress':'bg-blue-500/10 text-blue-400 border-blue-500/20',
  paused:       'bg-amber-500/10 text-amber-500 border-amber-500/20',
  'not started':'bg-muted/30 text-muted-foreground border-border/30',
  error:        'bg-rose-500/10 text-rose-500 border-rose-500/20',
};

const UserActiveSystemsCard = () => {
  const { currentUser } = useAuth();
  const [systems, setSystems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.id) return;
    const fetchSystems = async () => {
      try {
        const result = await pb.collection('system_instances').getList(1, 3, {
          filter: `userId="${currentUser.id}"`,
          sort: '-createdAt',
        });
        setSystems(result.items || []);
      } catch {
        setSystems([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSystems();
  }, [currentUser?.id]);

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 1) return 'Just now';
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <Card className="h-full flex flex-col shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Server className="w-5 h-5 text-primary" /> Active Systems
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {isLoading ? (
          <div className="animate-pulse space-y-4 flex-1">
            <div className="h-16 bg-muted/50 rounded-lg"></div>
            <div className="h-16 bg-muted/50 rounded-lg"></div>
          </div>
        ) : systems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
            <Server className="w-8 h-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No systems yet.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Deploy your first blueprint to get started.</p>
          </div>
        ) : (
          <div className="space-y-3 flex-1">
            {systems.map((sys) => {
              const statusKey = (sys.status || 'not started').toLowerCase();
              const styleClass = STATUS_STYLES[statusKey] || STATUS_STYLES['not started'];
              return (
                <div key={sys.id} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/10">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{sys.name || `System #${sys.id}`}</p>
                    <p className="text-xs text-muted-foreground mt-1">{timeAgo(sys.updatedAt || sys.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <Badge variant="outline" className={styleClass + ' capitalize text-xs'}>
                      {sys.status || 'Not Started'}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                      <Link to={`/build/${sys.id}`}>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-4 pt-4 border-t border-border/40">
          <Button className="w-full" variant="outline" asChild>
            <Link to="/blueprints">
              <Plus className="w-4 h-4 mr-2" /> Deploy New System
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserActiveSystemsCard;
