import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ShieldAlert, ShieldCheck, KeyRound, AlertTriangle, RotateCcw, Loader2, CheckCircle2 } from 'lucide-react';
import { useAdminData } from '@/contexts/AdminDataContext.jsx';
import adminApi from '@/lib/adminApi.js';

const AdminEncryptionKeyWarningCard = () => {
  const { dashboard, dashboardLoading, dashboardError, reloadDashboard } = useAdminData();
  const status = dashboard?.encryptionKeyStatus ?? null;
  const insecureCount = dashboard?.insecureCredentialsCount ?? 0;

  const [modalOpen, setModalOpen] = useState(false);
  const [newKeyHex, setNewKeyHex] = useState('');
  const [rotating, setRotating] = useState(false);
  const [rotateError, setRotateError] = useState(null);
  const [rotateResult, setRotateResult] = useState(null);

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

  const isValidKey = newKeyHex.trim().length === 64 && /^[0-9a-fA-F]{64}$/.test(newKeyHex.trim());

  function openModal() {
    setNewKeyHex('');
    setRotateError(null);
    setRotateResult(null);
    setModalOpen(true);
  }

  function closeModal() {
    if (rotating) return;
    setModalOpen(false);
    setNewKeyHex('');
    setRotateError(null);
    setRotateResult(null);
  }

  async function handleRotate() {
    if (!isValidKey || rotating) return;
    setRotating(true);
    setRotateError(null);
    setRotateResult(null);
    try {
      const result = await adminApi.rotateKey(newKeyHex.trim());
      setRotateResult(result);
      reloadDashboard();
    } catch (err) {
      setRotateError(err.message || 'Rotation failed. Check server logs for details.');
    } finally {
      setRotating(false);
    }
  }

  return (
    <>
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
              <Button
                size="sm"
                variant="outline"
                className="mt-1 w-full text-xs gap-1.5 border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-500"
                onClick={openModal}
              >
                <RotateCcw className="w-3 h-3" />
                Rotate Key
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={closeModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-500" />
              Rotate Encryption Key
            </DialogTitle>
            <DialogDescription>
              All credential rows will be re-encrypted with your new key inside a single database transaction. The operation is atomic — if any row fails, nothing is changed.
            </DialogDescription>
          </DialogHeader>

          {rotateResult ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Rotation complete
              </div>
              <p className="text-sm text-muted-foreground">
                <strong>{rotateResult.rotatedCount}</strong> credential{rotateResult.rotatedCount !== 1 ? 's' : ''} re-encrypted.
                {rotateResult.skippedCount > 0 && (
                  <> <strong>{rotateResult.skippedCount}</strong> already on the new key (skipped).</>
                )}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400/80 leading-relaxed">
                <strong>Next step:</strong> update the <code className="font-mono bg-amber-500/10 px-1 rounded">CREDENTIAL_ENCRYPTION_KEY</code> environment variable to the new key, then restart the server. Until you do, the old key is still active in memory.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
                  New key (64-character hex string)
                </label>
                <Textarea
                  placeholder="Paste your new 64-hex key here…"
                  value={newKeyHex}
                  onChange={(e) => {
                    setNewKeyHex(e.target.value);
                    setRotateError(null);
                  }}
                  className="font-mono text-xs resize-none h-20"
                  disabled={rotating}
                  spellCheck={false}
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Generate one with:{' '}
                  <code className="font-mono bg-muted px-1 rounded text-[10px]">
                    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
                  </code>
                </p>
              </div>

              {!isValidKey && newKeyHex.trim().length > 0 && (
                <p className="text-xs text-destructive">
                  Key must be exactly 64 hexadecimal characters.
                </p>
              )}

              {rotateError && (
                <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2">
                  {rotateError}
                </p>
              )}

              <p className="text-xs text-muted-foreground/70 leading-relaxed">
                After rotation, update <code className="font-mono bg-muted px-1 rounded text-[10px]">CREDENTIAL_ENCRYPTION_KEY</code> in your environment to the new key and restart the server.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={closeModal} disabled={rotating}>
              {rotateResult ? 'Close' : 'Cancel'}
            </Button>
            {!rotateResult && (
              <Button
                variant="default"
                onClick={handleRotate}
                disabled={!isValidKey || rotating}
                className="gap-1.5"
              >
                {rotating ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Rotating…
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3 h-3" />
                    Confirm Rotation
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminEncryptionKeyWarningCard;
