import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Sparkles } from 'lucide-react';

const UserAIAssistantCard = () => {
  return (
    <Card className="h-full flex flex-col shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-500" /> AI Co-Pilot
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between pt-4">
        <div className="bg-muted/20 rounded-xl p-4 border border-border/50 text-sm text-muted-foreground italic mb-6">
          "I noticed your Content Engine system has been paused. Would you like me to review the setup logs?"
        </div>
        <Button className="w-full bg-indigo-500 hover:bg-indigo-600 text-white">
          <Sparkles className="w-4 h-4 mr-2" /> Chat with AI
        </Button>
      </CardContent>
    </Card>
  );
};

export default UserAIAssistantCard;