import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const UserAIBuildAgentCard = () => {
  return (
    <Card className="h-full flex flex-col shadow-sm border-primary/20 bg-gradient-to-br from-card to-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" /> AI Build Agent
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between pt-4">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Agent Online & Ready</span>
          </div>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            Your personal AI architect is standing by. Describe the business outcome you want, and the agent will assemble the perfect system.
          </p>
        </div>
        
        <Button className="w-full shadow-lg" size="lg" asChild>
          <Link to="/system-builder">
            <Zap className="w-4 h-4 mr-2" /> Launch AI Builder
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export default UserAIBuildAgentCard;