
import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Clock, Star, ShoppingBag, Eye, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
};

const STATUS_BADGE = {
  pending_review: { label: 'Pending Review', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  approved:       { label: 'Approved',       cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  rejected:       { label: 'Rejected',       cls: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
};

const AdminCommunityBlueprintsPanel = () => {
  const [pending, setPending] = useState([]);
  const [all, setAll] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [reviewing, setReviewing] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(null);

  const load = async () => {
    setIsLoading(true);
    try {
      const [pendingRes, allRes] = await Promise.all([
        fetch('/api/admin/blueprints/pending', { headers: authHeaders() }),
        fetch('/api/blueprints?source=community', { headers: authHeaders() }),
      ]);
      if (pendingRes.ok) setPending(await pendingRes.json());
      if (allRes.ok) setAll(await allRes.json());
    } catch {
      toast.error('Failed to load community blueprints');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const approve = async (id, name) => {
    setReviewing(id);
    try {
      const res = await fetch(`/api/admin/blueprints/${id}/review-status`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ reviewStatus: 'approved' }),
      });
      if (!res.ok) throw new Error('Failed to approve');
      toast.success(`"${name}" approved and is now live`);
      load();
    } catch {
      toast.error('Failed to approve blueprint');
    } finally {
      setReviewing(null);
    }
  };

  const reject = async (id, name) => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    setReviewing(id);
    try {
      const res = await fetch(`/api/admin/blueprints/${id}/review-status`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ reviewStatus: 'rejected', rejectionReason: rejectReason }),
      });
      if (!res.ok) throw new Error('Failed to reject');
      toast.success(`"${name}" rejected`);
      setShowRejectModal(null);
      setRejectReason('');
      load();
    } catch {
      toast.error('Failed to reject blueprint');
    } finally {
      setReviewing(null);
    }
  };

  const displayed = activeTab === 'pending' ? pending : all;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Community Blueprints</h2>
          <p className="text-muted-foreground text-sm mt-1">Review user-submitted blueprints for the marketplace</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/40 hover:bg-muted/30 transition-colors text-sm text-muted-foreground">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending Review', value: pending.length, icon: Clock, color: 'amber' },
          { label: 'Total Community', value: all.length, icon: ShoppingBag, color: 'primary' },
          { label: 'Approved', value: all.filter(b => b.reviewStatus === 'approved').length, icon: CheckCircle2, color: 'emerald' },
          { label: 'Rejected', value: all.filter(b => b.reviewStatus === 'rejected').length, icon: XCircle, color: 'rose' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card/60 border border-border/40 rounded-xl p-4 backdrop-blur-sm">
            <div className={`w-8 h-8 rounded-lg bg-${color === 'primary' ? 'primary' : color}-500/20 flex items-center justify-center mb-3`}>
              <Icon className={`w-4 h-4 ${color === 'primary' ? 'text-primary' : `text-${color}-400`}`} />
            </div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted/20 rounded-xl border border-border/40 w-fit">
        {[
          { key: 'pending', label: `Pending Review (${pending.length})` },
          { key: 'all',     label: 'All Community' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === key ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Blueprint list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16 border border-border/40 rounded-xl bg-card/40">
          <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {activeTab === 'pending' ? 'No blueprints awaiting review' : 'No community blueprints yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((bp) => {
            const badge = STATUS_BADGE[bp.reviewStatus] ?? STATUS_BADGE.pending_review;
            const isPending = bp.reviewStatus === 'pending_review';
            return (
              <div key={bp.id} className="bg-card/60 border border-border/40 rounded-xl p-5 backdrop-blur-sm">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2 mb-1">
                      <h3 className="text-base font-semibold text-foreground">{bp.name}</h3>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badge.cls}`}>
                        {badge.label}
                      </span>
                      {bp.priceCredits > 0 && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-primary/15 text-primary border-primary/30">
                          {bp.priceCredits} credits
                        </span>
                      )}
                    </div>
                    {bp.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{bp.description}</p>
                    )}
                    <div className="flex items-center flex-wrap gap-4 text-xs text-muted-foreground">
                      <span>Author ID: #{bp.authorUserId ?? '—'}</span>
                      <span>Difficulty: {bp.difficulty}</span>
                      {bp.salesCount > 0 && (
                        <span className="flex items-center gap-1"><ShoppingBag className="w-3 h-3" /> {bp.salesCount} sales</span>
                      )}
                      {bp.ratingCount > 0 && (
                        <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400" /> {bp.ratingAvg} ({bp.ratingCount})</span>
                      )}
                      <span>Submitted: {new Date(bp.createdAt).toLocaleDateString()}</span>
                    </div>
                    {bp.rejectionReason && (
                      <p className="mt-2 text-xs text-rose-400 bg-rose-500/10 rounded px-3 py-1.5 border border-rose-500/20">
                        Rejection reason: {bp.rejectionReason}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`/blueprints/${bp.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg border border-border/40 hover:bg-muted/30 transition-colors text-muted-foreground"
                      title="Preview blueprint"
                    >
                      <Eye className="w-4 h-4" />
                    </a>
                    {isPending && (
                      <>
                        <button
                          onClick={() => approve(bp.id, bp.name)}
                          disabled={reviewing === bp.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm font-medium hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
                        >
                          {reviewing === bp.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                          Approve
                        </button>
                        <button
                          onClick={() => setShowRejectModal(bp)}
                          disabled={reviewing === bp.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/15 text-rose-400 border border-rose-500/30 rounded-lg text-sm font-medium hover:bg-rose-500/25 transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-3 h-3" /> Reject
                        </button>
                      </>
                    )}
                    {!isPending && bp.reviewStatus === 'approved' && (
                      <button
                        onClick={() => setShowRejectModal(bp)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/30 text-muted-foreground border border-border/40 rounded-lg text-sm font-medium hover:bg-muted/50 transition-colors"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {showRejectModal.reviewStatus === 'approved' ? 'Revoke Approval' : 'Reject Blueprint'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Blueprint: <span className="text-foreground font-medium">"{showRejectModal.name}"</span>
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Provide a reason for rejection..."
              className="w-full bg-muted/20 border border-border rounded-lg p-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none h-28 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowRejectModal(null); setRejectReason(''); }}
                className="flex-1 px-4 py-2 border border-border/40 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted/30 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => reject(showRejectModal.id, showRejectModal.name)}
                disabled={reviewing === showRejectModal.id}
                className="flex-1 px-4 py-2 bg-rose-500/15 text-rose-400 border border-rose-500/30 rounded-lg text-sm font-medium hover:bg-rose-500/25 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {reviewing === showRejectModal.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCommunityBlueprintsPanel;
