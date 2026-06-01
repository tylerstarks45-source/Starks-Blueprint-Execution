import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings2, CheckCircle2 } from 'lucide-react';

const AdminSystemDiagnosticsPanel = () => {
  return (
    <Card className="h-full shadow-sm border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Settings2 className="w-4 h-4" /> Component Diagnostics
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Database (PocketBase)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">API Gateway</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Redis Cache</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Builder Mailer</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminSystemDiagnosticsPanel;