import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert, ShieldCheck, KeyRound, AlertTriangle } from 'lucide-react';
import { useAdminData } from '@/contexts/AdminDataContext.jsx';

const AdminEncryptionKeyWarningCard = () => {
  const { dashboard, dashboardLoading, dashboardError } = useAdminData();
  const status = dashboard?.encryptionKeyStatus ?? null;
  const insecureCount = dashboard?.insecureCredentialsCount ?? 0;

  const hasInsecure = insecureCount > 0;
  const needsRotation = status ? status.needsRotation : true;
  const hasAlert = needsRotation || hasInsecure;
  const tone = hasAlert
    ? 'bg-amber-500/5 border-amber-500/30'
    : 'bg-emerald-500/5 border-emerald-500/20';
  const titleTone = hasAlert
    ? 'text-amber-500 dark:text-amber-400'
    : 'text-emerald-600 dark:text-emerald-400';
  const Icon = hasAlert ? ShieldAlert : ShieldCheck;

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
            <Skeleton className="h-4 w-32" />
          </div>
        ) : (
          <div className="space-y-2">
            <div className={`flex items-center gap-2 text-sm font-semibold ${titleTone}`}>
              <Icon className="w-4 h-4 shrink-0" />
              {hasAlert ? 'Action Required' : 'Credentials Secure'}
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
            <div className={`flex items-center gap-1.5 text-xs rounded px-2 py-1 ${hasInsecure ? 'bg-red-500/10 text-red-500 dark:text-red-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
              {hasInsecure ? (
                <>
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span><strong>{insecureCount}</strong> credential{insecureCount !== 1 ? 's' : ''} not yet re-encrypted</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3 h-3 shrink-0" />
                  <span>All credentials encrypted</span>
                </>
              )}
            </div>
            {hasInsecure && (
              <p className="text-xs text-muted-foreground/70 leading-relaxed">
                These rows remain in legacy format. They will be upgraded automatically when the credential owner next authenticates, or can be force-migrated via the rotation script.
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
