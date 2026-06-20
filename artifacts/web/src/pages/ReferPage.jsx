import React, { useEffect, useState, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Copy, Check, Users, MousePointerClick, DollarSign, Trophy, Gift, ChevronRight, Loader2 } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';

const TIER_REWARDS = {
  builder:  { label: 'Builder ($29/mo)',  bonus: 500, share: 290 },
  operator: { label: 'Operator ($99/mo)', bonus: 500, share: 990 },
  empire:   { label: 'Empire ($499/mo)',  bonus: 500, share: 4990 },
};

const ReferPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchStats = useCallback(async () => {
    const token = localStorage.getItem('sbep_auth_token');
    if (!token) { navigate('/login'); return; }
    try {
      const [statsRes, lbRes] = await Promise.all([
        fetch('/api/referrals/my-code', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/referrals/leaderboard'),
      ]);
      if (statsRes.ok) setData(await statsRes.json());
      if (lbRes.ok) setLeaderboard((await lbRes.json()).leaderboard ?? []);
    } catch {}
    setLoading(false);
  }, [navigate]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleCopy = () => {
    if (!data?.link) return;
    navigator.clipboard.writeText(data.link).then(() => {
      setCopied(true);
      toast.success('Referral link copied!');
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <AuthLayout>
      <Helmet><title>Refer & Earn | Starks Global Group</title></Helmet>
      <div className="pt-6 pb-24 px-4 sm:px-6 lg:px-8 container mx-auto max-w-[960px]">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-semibold mb-4">
            <Gift className="w-3.5 h-3.5" /> REFER & EARN
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            Share the platform.<br />
            <span className="text-primary">Earn real credits.</span>
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm leading-relaxed">
            Invite people to Starks Global Group. When they sign up and upgrade, you earn
            500 bonus credits plus 20% of their first month's subscription value.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
          </div>
        ) : (
          <>
            {/* Referral Link */}
            <div className="bg-card/60 border border-border/60 rounded-2xl p-6 mb-6">
              <p className="text-xs font-mono text-muted-foreground mb-2 uppercase tracking-widest">Your Referral Link</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-background/60 border border-border/50 rounded-xl px-4 py-3 font-mono text-sm text-foreground/80 truncate">
                  {data?.link ?? '…'}
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-4 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-semibold transition-all shadow-[0_0_16px_rgba(14,165,233,0.3)] shrink-0"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Referral code: <span className="font-mono text-primary font-bold">{data?.code ?? '—'}</span>
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { icon: MousePointerClick, label: 'Link Clicks',   value: data?.clicks ?? 0,      color: 'text-blue-400' },
                { icon: Users,            label: 'Signups',        value: data?.signups ?? 0,     color: 'text-violet-400' },
                { icon: Trophy,           label: 'Conversions',    value: data?.conversions ?? 0, color: 'text-amber-400' },
                { icon: DollarSign,       label: 'Credits Earned', value: (data?.totalEarned ?? 0).toLocaleString(), color: 'text-emerald-400' },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="bg-card/60 border border-border/60 rounded-xl p-4 text-center">
                  <Icon className={`w-5 h-5 mx-auto mb-2 ${color}`} />
                  <div className="text-2xl font-bold text-foreground">{value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            {/* Reward tiers */}
            <div className="bg-card/60 border border-border/60 rounded-2xl p-6 mb-6">
              <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                <Gift className="w-4 h-4 text-primary" /> Reward Breakdown
              </h2>
              <div className="space-y-3">
                {Object.values(TIER_REWARDS).map(({ label, bonus, share }) => (
                  <div key={label} className="flex items-center justify-between py-3 border-b border-border/30 last:border-0">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground">When your referral upgrades</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-400">+{bonus.toLocaleString()} credits</p>
                      <p className="text-xs text-primary">+{share.toLocaleString()} wallet credits (20%)</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Wallet credits are permanent and never expire. Monthly credits refresh each cycle.
              </p>
            </div>

            {/* Leaderboard */}
            {leaderboard.length > 0 && (
              <div className="bg-card/60 border border-border/60 rounded-2xl p-6 mb-6">
                <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" /> Top Referrers
                </h2>
                <div className="space-y-2">
                  {leaderboard.map((entry) => (
                    <div key={entry.rank} className="flex items-center gap-3 py-2 border-b border-border/20 last:border-0">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        entry.rank === 1 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        entry.rank === 2 ? 'bg-slate-400/20 text-slate-300 border border-slate-400/30' :
                        entry.rank === 3 ? 'bg-orange-600/20 text-orange-400 border border-orange-600/30' :
                        'bg-muted/40 text-muted-foreground border border-border/30'
                      }`}>
                        {entry.rank}
                      </div>
                      <div className="flex-1 text-sm font-medium text-foreground">{entry.displayName}</div>
                      <div className="text-sm font-bold text-primary">{entry.conversions} conversions</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* How it works */}
            <div className="bg-card/40 border border-border/40 rounded-2xl p-6">
              <h2 className="text-sm font-bold text-foreground mb-4">How it works</h2>
              <div className="space-y-3">
                {[
                  { step: '1', text: 'Share your unique referral link with friends, on social media, or in communities.' },
                  { step: '2', text: 'They sign up using your link — you\'re credited as their referrer.' },
                  { step: '3', text: 'When they upgrade to any paid plan, you instantly earn 500 credits + 20% revenue share as permanent wallet credits.' },
                ].map(({ step, text }) => (
                  <div key={step} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center text-xs font-bold text-primary shrink-0 mt-0.5">{step}</div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </AuthLayout>
  );
};

export default ReferPage;
