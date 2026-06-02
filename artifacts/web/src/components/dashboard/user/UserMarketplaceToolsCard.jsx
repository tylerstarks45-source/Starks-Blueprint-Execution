import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const UserMarketplaceToolsCard = () => {
  return (
    <Card className="h-full flex flex-col shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-purple-500" /> Marketplace
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="grid grid-cols-1 gap-3 flex-1 mb-6">
          <div className="p-3 rounded-lg border border-border/50 bg-muted/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-purple-500/10 flex items-center justify-center shrink-0">
              <span className="font-bold text-purple-500 text-xs">AI</span>
            </div>
            <div>
              <p className="font-medium text-sm">Content Generators</p>
              <p className="text-xs text-muted-foreground line-clamp-1">Automate your writing.</p>
            </div>
          </div>
          <div className="p-3 rounded-lg border border-border/50 bg-muted/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-blue-500/10 flex items-center justify-center shrink-0">
              <span className="font-bold text-blue-500 text-xs">CRM</span>
            </div>
            <div>
              <p className="font-medium text-sm">Sales Automation</p>
              <p className="text-xs text-muted-foreground line-clamp-1">Convert leads faster.</p>
            </div>
          </div>
        </div>
        <Button variant="outline" className="w-full mt-auto" asChild>
          <Link to="/marketplace">
            Browse Tools <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export default UserMarketplaceToolsCard;