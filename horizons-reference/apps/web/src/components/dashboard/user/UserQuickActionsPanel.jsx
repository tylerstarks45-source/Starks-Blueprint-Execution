import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Video, Key } from 'lucide-react';

const UserQuickActionsPanel = () => {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 grid grid-cols-3 gap-4">
        <Button variant="outline" className="h-auto py-3 flex flex-col gap-2 bg-muted/10">
          <BookOpen className="w-5 h-5 text-muted-foreground" />
          <span className="text-xs">Docs</span>
        </Button>
        <Button variant="outline" className="h-auto py-3 flex flex-col gap-2 bg-muted/10">
          <Video className="w-5 h-5 text-muted-foreground" />
          <span className="text-xs">Tutorials</span>
        </Button>
        <Button variant="outline" className="h-auto py-3 flex flex-col gap-2 bg-muted/10">
          <Key className="w-5 h-5 text-muted-foreground" />
          <span className="text-xs">API Keys</span>
        </Button>
      </CardContent>
    </Card>
  );
};

export default UserQuickActionsPanel;