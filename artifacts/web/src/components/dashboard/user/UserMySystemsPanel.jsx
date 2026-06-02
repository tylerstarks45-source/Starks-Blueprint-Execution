import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Layers, Settings, Trash2, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient.js';
import { toast } from 'sonner';

const STATUS_STYLES = {
  running:    'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  active:     'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  building:   'bg-blue-500/10 text-blue-500 border-blue-500/20',
  draft:      'bg-muted text-muted-foreground',
  paused:     'bg-amber-500/10 text-amber-500 border-amber-500/20',
  error:      'bg-destructive/10 text-destructive border-destructive/20',
  completed:  'bg-purple-500/10 text-purple-500 border-purple-500/20',
};

const UserMySystemsPanel = () => {
  const { currentUser } = useAuth();
  const [systems, setSystems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSystems = async () => {
      if (!currentUser) return;
      try {
        const result = await pb.collection('system_instances').getList(1, 20, {
          filter: `userId="${currentUser.id}"`,
          sort: '-updated',
        });
        setSystems(result.items || []);
      } catch (err) {
        console.error('Error fetching systems:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSystems();
  }, [currentUser]);

  const handleDelete = async (id) => {
    try {
      await pb.collection('system_instances').delete(id);
      setSystems(prev => prev.filter(s => s.id !== id));
      toast.success('System removed.');
    } catch {
      toast.error('Failed to remove system.');
    }
  };

  return (
    <Card className="shadow-sm overflow-hidden border-border/50">
      <CardHeader className="pb-3 border-b border-border/40 bg-muted/5 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" /> My Systems
        </CardTitle>
        <Button size="sm" variant="outline" asChild>
          <Link to="/system-builder"><Plus className="w-3.5 h-3.5 mr-1.5" /> New System</Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2].map(i => <div key={i} className="h-10 bg-muted/30 rounded animate-pulse" />)}
          </div>
        ) : systems.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Layers className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No systems yet</p>
            <p className="text-xs mt-1 mb-4">Use the System Builder to launch your first automated system.</p>
            <Button size="sm" asChild>
              <Link to="/system-builder"><Plus className="w-3.5 h-3.5 mr-1.5" /> Build First System</Link>
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-muted/10">
                <TableHead>System Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {systems.map((sys) => (
                <TableRow key={sys.id}>
                  <TableCell className="font-medium text-sm">{sys.name || `System #${sys.id}`}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_STYLES[sys.status?.toLowerCase()] || STATUS_STYLES.draft}>
                      {sys.status || 'Draft'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    {sys.createdAt ? new Date(sys.createdAt).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <Link to={`/system-builder?system=${sys.id}`}><Settings className="w-4 h-4" /></Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(sys.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default UserMySystemsPanel;
