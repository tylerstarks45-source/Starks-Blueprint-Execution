import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Layers, Key } from 'lucide-react';
import { Link } from 'react-router-dom';

const UserQuickActionsPanel = () => {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 grid grid-cols-3 gap-4">
        <Button variant="outline" className="h-auto py-3 flex flex-col gap-2 bg-muted/10" asChild>
          <Link to="/how-it-works">
            <BookOpen className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs">How It Works</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-3 flex flex-col gap-2 bg-muted/10" asChild>
          <Link to="/blueprints">
            <Layers className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs">Blueprints</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-3 flex flex-col gap-2 bg-muted/10" asChild>
          <Link to="/my-stack">
            <Key className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs">My Stack</span>
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export default UserQuickActionsPanel;
