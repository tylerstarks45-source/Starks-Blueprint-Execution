import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Layers, Settings, Trash2 } from 'lucide-react';
import { useDashboard } from '@/contexts/DashboardContext.jsx';

const UserMySystemsPanel = () => {
  const { isLoading } = useDashboard();
  
  const systems = [
    { id: 1, name: 'Automated Outreach Flow', type: 'Sales', status: 'Running', date: '2024-05-18' },
    { id: 2, name: 'Newsletter Engine', type: 'Marketing', status: 'Draft', date: '2024-05-15' },
  ];

  return (
    <Card className="shadow-sm overflow-hidden border-border/50">
      <CardHeader className="pb-3 border-b border-border/40 bg-muted/5">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" /> My Systems
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/10">
              <TableHead>System Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date Modified</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {systems.map((sys) => (
              <TableRow key={sys.id}>
                <TableCell className="font-medium text-sm">{sys.name}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{sys.type}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={sys.status === 'Running' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}>
                    {sys.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">{sys.date}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8"><Settings className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default UserMySystemsPanel;