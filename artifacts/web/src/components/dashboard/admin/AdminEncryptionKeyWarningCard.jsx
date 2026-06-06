import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert, ShieldCheck, KeyRound } from 'lucide-react';
import { useAdminData } from '@/contexts/AdminDataContext.jsx';

const AdminEncryptionKeyWarningCard = () => {
  const { dashboard, dashboardLoading, dashboardError } = useAdminData();
  const status = dashboard?.encryptionKeyStatus ?? null;

  const needsRotation = status ? status.needsRotation : true;
  const tone = needsRotation
    ? 'bg-amber-500/5 border-amber-500/30'
    : 'bg-emerald-500/5 border-emerald-500/20';
  const titleTone = needsRotation
    ? 'text-amber-500 dark:text-amber-400'
    : 'text-emerald-600 dark:text-emerald-400';
  const Icon = needsRotation ? ShieldAlert : ShieldCheck;

  function ageLabel() {
    if (!status) return 'Key age unknown';
    if (status.daysSinceRotation === null) return 'Key age unknown — set CREDENTIAL_KEY_ROTATED_AT';
    if (status.daysSinceRotation === 0) return 'Rotated today';
    if (status.daysSinceRotation === 1) return 'Rotated 1 day ago';
    return `Rotated ${status.daysSinceRotation} days ago`;
  }

  function lastRotatedLabel() {
    if (!status?.lastRotatedAt) return null;
    try {
      return new Date(status.lastRotatedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return status.lastRotatedAt;
    }
  }

  return (
    <Card className={`h-full shadow-sm border-border/50 ${tone}`}>
      <CardHeader className="pb-2">
        <CardTitle className={`text-sm font-medium uppercase tracking-wider ${titleTone} flex items-center gap-2`}>
          <KeyRound className="w-4 h-4" />
          Encryption Key
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {dashboardError ? (
          <p className="text-sm text-destructive">Unable to load key status</p>
        ) : dashboardLoading && !dashboard ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-24" />
          </div>
        ) : (
          <div className="space-y-2">
            <div className={`flex items-center gap-2 text-sm font-semibold ${titleTone}`}>
              <Icon className="w-4 h-4 shrink-0" />
              {needsRotation ? 'Rotation Recommended' : 'Key Is Current'}
            </div>
            <p className="text-xs text-muted-foreground">{ageLabel()}</p>
            {lastRotatedLabel() && (
              <p className="text-xs text-muted-foreground">Last rotated: {lastRotatedLabel()}</p>
            )}
            {needsRotation && (
              <p className="text-xs text-amber-600 dark:text-amber-400/80 leading-relaxed">
                Run <code className="font-mono bg-amber-500/10 px-1 rounded">rotate-credentials</code> then update <code className="font-mono bg-amber-500/10 px-1 rounded">CREDENTIAL_KEY_ROTATED_AT</code>.
              </p>
            )}
            <p className="text-xs text-muted-foreground/60">
              Threshold: {status?.warningThresholdDays ?? 90} days
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminEncryptionKeyWarningCard;
