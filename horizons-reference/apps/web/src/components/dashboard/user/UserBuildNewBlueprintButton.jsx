import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const UserBuildNewBlueprintButton = () => {
  return (
    <Button 
      asChild 
      size="lg" 
      className="w-full h-auto py-6 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary flex flex-col items-center justify-center gap-3 transition-all duration-300 hover:shadow-md group"
      variant="ghost"
    >
      <Link to="/blueprints">
        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
          <Plus className="w-6 h-6 text-primary" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-base text-foreground">Deploy New System</p>
          <p className="text-xs text-muted-foreground font-normal mt-1">Browse marketplace blueprints</p>
        </div>
      </Link>
    </Button>
  );
};

export default UserBuildNewBlueprintButton;