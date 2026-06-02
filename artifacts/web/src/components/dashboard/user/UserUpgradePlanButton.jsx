import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowUpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const UserUpgradePlanButton = () => {
  return (
    <Button variant="outline" className="w-full flex items-center justify-center gap-2 py-6 border-dashed hover:border-solid transition-all" asChild>
      <Link to="/pricing">
        <ArrowUpCircle className="w-5 h-5 text-muted-foreground" />
        <span className="font-medium">Explore Premium Plans</span>
      </Link>
    </Button>
  );
};

export default UserUpgradePlanButton;
