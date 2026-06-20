
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, PlusCircle, Clock, CheckCircle2, XCircle, Star, ShoppingBag, Eye, Loader2, TrendingUp, DollarSign } from 'lucide-react';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return { Authorization: `Bearer ${token}` };
};

const REVIEW_STATUS = {
  pending_review: { label: 'Pending Review', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: Clock },
  approved:       { label: 'Approved',       cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
  rejected:       { label: 'Rejected',       cls: 'bg-rose-500/15 text-rose-400 border-rose-500/30', icon: XCircle },
};

const UserMyBlueprintsPanel = () => {
  const [blueprints, setBlueprints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/blueprints/my', { headers: authHeaders() });
        if (res.ok) setBlueprints(await res.json());
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">My Submitted Blueprints</h2>
        </div>
        <Link
          to="/blueprints/submit"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/15 text-violet-400 border border-violet-500/30 rounded-lg text-sm font-medium hover:bg-violet-500/25 transition-colors"
        >
          <PlusCircle className="w-4 h-4" /> Submit Blueprint
        </Link>
      </div>

      {/* Earnings summary */}
      {!isLoading && blueprints.length > 0 && (() => {
        const totalEarnings = blueprints.reduce((sum, bp) => sum + Math.floor((bp.salesCount ?? 0) * (bp.priceCredits ?? 0) * 0.7), 0);
        const totalSales = blueprints.reduce((sum, bp) => sum + (bp.salesCount ?? 0), 0);
        const approved = blueprints.filter(bp => bp.reviewStatus === 'approved').length;
        return (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
              <DollarSign className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
              <p className="text-lg font-black text-emerald-400">{totalEarnings}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Credits Earned</p>
            </div>
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-center">
              <ShoppingBag className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-lg font-black text-primary">{totalSales}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Sales</p>
            </div>
            <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3 text-center">
              <TrendingUp className="w-4 h-4 text-violet-400 mx-auto mb-1" />
              <p className="text-lg font-black text-violet-400">{approved}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Live</p>
            </div>
          </div>
        );
      })()}

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : blueprints.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border/40 rounded-xl bg-card/30">
          <Layers className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm font-medium mb-4">You haven't submitted any blueprints yet.</p>
          <Link
            to="/blueprints/submit"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary border border-primary/30 rounded-lg text-sm font-bold hover:bg-primary/30 transition-colors"
          >
            <PlusCircle className="w-4 h-4" /> Submit Your First Blueprint
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {blueprints.map(bp => {
            const status = REVIEW_STATUS[bp.reviewStatus] ?? REVIEW_STATUS.pending_review;
            const StatusIcon = status.icon;
            return (
              <div
                key={bp.id}
                className="flex items-start gap-4 p-4 bg-card/60 border border-border/40 rounded-xl backdrop-blur-sm"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2 mb-1">
                    <Link to={`/blueprints/${bp.slug}`} className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
                      {bp.name}
                    </Link>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${status.cls}`}>
                      <StatusIcon className="w-2.5 h-2.5" /> {status.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mt-1">
                    <span>{bp.difficulty || 'Beginner'}</span>
                    <span>{(bp.priceCredits ?? 0) > 0 ? `${bp.priceCredits} credits` : 'Free'}</span>
                    {bp.salesCount > 0 && (
                      <span className="flex items-center gap-1"><ShoppingBag className="w-3 h-3" /> {bp.salesCount} sales</span>
                    )}
                    {bp.ratingCount > 0 && (
                      <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400" /> {Number(bp.ratingAvg).toFixed(1)} ({bp.ratingCount})</span>
                    )}
                    <span>Submitted {new Date(bp.createdAt).toLocaleDateString()}</span>
                  </div>

                  {bp.reviewStatus === 'rejected' && bp.rejectionReason && (
                    <p className="mt-1.5 text-xs text-rose-400 bg-rose-500/10 rounded px-2 py-1 border border-rose-500/20">
                      {bp.rejectionReason}
                    </p>
                  )}
                </div>

                <Link
                  to={`/blueprints/${bp.slug}`}
                  className="shrink-0 p-2 rounded-lg border border-border/40 hover:bg-muted/30 transition-colors text-muted-foreground"
                  title="View blueprint"
                >
                  <Eye className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UserMyBlueprintsPanel;
