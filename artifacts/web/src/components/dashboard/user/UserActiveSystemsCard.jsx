import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Server, ArrowRight, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDashboard } from '@/contexts/DashboardContext.jsx';

const UserActiveSystemsCard = () => {
  const { isLoading } = useDashboard();

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
        ) : (
          <div className="space-y-4 flex-1">
            {/* Mock System Item */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/10">
              <div>
                <p className="font-semibold text-sm">Lead Gen Funnel</p>
                <p className="text-xs text-muted-foreground mt-1">Updated 2h ago</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Active</Badge>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/10">
              <div>
                <p className="font-semibold text-sm">Content Engine</p>
                <p className="text-xs text-muted-foreground mt-1">Updated 1d ago</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">Paused</Badge>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
        <div className="mt-6 pt-4 border-t border-border/40">
          <Button className="w-full" variant="outline" asChild>
            <Link to="/blueprints">
              <Plus className="w-4 h-4 mr-2" /> Create New System
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserActiveSystemsCard;