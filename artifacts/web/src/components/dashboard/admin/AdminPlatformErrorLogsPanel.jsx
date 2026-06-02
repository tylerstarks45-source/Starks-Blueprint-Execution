import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

const AdminPlatformErrorLogsPanel = () => {
  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="pb-3 border-b border-border/30">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-destructive" /> Recent Error Logs
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 p-0">
        <div className="divide-y divide-border/30">
          <div className="p-4 hover:bg-muted/10 transition-colors">
            <div className="flex justify-between items-start mb-1">
              <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30 bg-destructive/5 uppercase tracking-wider">Timeout</Badge>
              <span className="text-xs font-mono text-muted-foreground">10:42 AM</span>
            </div>
            <p className="text-sm font-medium mt-2">OpenRouter API timeout on Claude 3.5 Sonnet</p>
          </div>
          <div className="p-4 hover:bg-muted/10 transition-colors">
            <div className="flex justify-between items-start mb-1">
              <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30 bg-amber-500/5 uppercase tracking-wider">Rate Limit</Badge>
              <span className="text-xs font-mono text-muted-foreground">09:15 AM</span>
            </div>
            <p className="text-sm font-medium mt-2">Rate limit exceeded for user integration #4829</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminPlatformErrorLogsPanel;