import React from 'react';
import { Button } from '@/components/ui/button';
import { LifeBuoy } from 'lucide-react';

const UserRequestSupportButton = () => {
  return (
    <Button variant="secondary" className="w-full flex items-center justify-center gap-2 py-6 bg-muted/50 hover:bg-muted transition-all" asChild>
      <a href="/contact">
        <LifeBuoy className="w-5 h-5 text-muted-foreground" />
        <span className="font-medium">Contact Support</span>
      </a>
    </Button>
  );
};

export default UserRequestSupportButton;