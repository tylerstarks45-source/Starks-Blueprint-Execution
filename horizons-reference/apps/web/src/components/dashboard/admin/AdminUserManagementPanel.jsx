import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, MoreHorizontal } from 'lucide-react';

const AdminUserManagementPanel = () => {
  const users = [
    { id: '1', email: 'admin@starks.com', role: 'SUPER_ADMIN', joined: '2024-01-10' },
    { id: '2', email: 'client@company.com', role: 'USER', joined: '2024-05-12' },
    { id: '3', email: 'dev@starks.com', role: 'USER', joined: '2024-04-20' },
  ];

  return (
    <Card className="shadow-sm border-border/50 col-span-full xl:col-span-2">
      <CardHeader className="pb-3 border-b border-border/30 bg-muted/5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> User Management
          </CardTitle>
          <Button variant="outline" size="sm">View All Users</Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/10">
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium text-sm">{user.email}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={user.role === 'SUPER_ADMIN' ? 'bg-primary/10 text-primary' : 'bg-muted'}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground font-mono">{user.joined}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default AdminUserManagementPanel;