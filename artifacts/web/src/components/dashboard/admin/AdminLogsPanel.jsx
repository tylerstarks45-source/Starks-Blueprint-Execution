import React from 'react';
import LogsPanel from '@/components/logs/LogsPanel.jsx';

export default function AdminLogsPanel() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold font-mono text-foreground">Platform Logs</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Unified activity across every system and business — builds, deploys, automation, connections, errors, and recovery actions.
        </p>
      </div>
      <LogsPanel endpoint="/api/admin/logs" title="Platform-wide Activity Logs" pageSize={50} />
    </div>
  );
}
