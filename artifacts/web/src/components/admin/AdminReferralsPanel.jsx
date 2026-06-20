import React, { useEffect, useState } from 'react';
import { Users, MousePointerClick, Trophy, Coins, Loader2, RefreshCw } from 'lucide-react';

const AdminReferralsPanel = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('sbep_auth_token');
      const res = await fetch('/api/admin/referrals', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-muted-foreground text-sm">
        <p className="mb-3">Failed to load referral analytics.</p>
        <button onClick={fetchData} className="px-4 py-2 text-xs bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg transition-all">
          Retry
        </button>
      </div>
    );
  }

  const metrics = [
    { icon: Users,            label: 'Referral Codes',   value: data?.totalCodes ?? 0,         color: 'text-blue-400' },
    { icon: MousePointerClick, label: 'Total Clicks',    value: (data?.totalClicks ?? 0).toLocaleString(), color: 'text-violet-400' },
    { icon: Trophy,           label: 'Conversions',      value: (data?.totalConversions ?? 0).toLocaleString(), color: 'text-amber-400' },
    { icon: Coins,            label: 'Credits Awarded',  value: (data?.totalCreditsAwarded ?? 0).toLocaleString(), color: 'text-emerald-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Referral Program Analytics</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Platform-wide referral performance</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted/20 hover:bg-muted/40 border border-border/40 rounded-lg transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {metrics.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-card/60 border border-border/50 rounded-xl p-4">
            <Icon className={`w-5 h-5 mb-2 ${color}`} />
            <div className="text-2xl font-bold text-foreground">{value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Top referrers */}
      <div className="bg-card/50 border border-border/50 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border/40">
          <h3 className="text-sm font-semibold text-foreground">Top Referrers</h3>
        </div>
        {(data?.topReferrers ?? []).length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">No referral data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium">User</th>
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium">Code</th>
                  <th className="text-right px-4 py-2 text-muted-foreground font-medium">Clicks</th>
                  <th className="text-right px-4 py-2 text-muted-foreground font-medium">Conversions</th>
                </tr>
              </thead>
              <tbody>
                {(data.topReferrers).map((r) => (
                  <tr key={r.userId} className="border-b border-border/20 last:border-0 hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-2.5 text-foreground/80">{r.name || r.email || `User #${r.userId}`}</td>
                    <td className="px-4 py-2.5 font-mono text-primary/80">{r.code}</td>
                    <td className="px-4 py-2.5 text-right text-foreground/70">{(r.clicks ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-amber-400">{r.conversions ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent events */}
      <div className="bg-card/50 border border-border/50 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border/40">
          <h3 className="text-sm font-semibold text-foreground">Recent Events</h3>
        </div>
        {(data?.recentEvents ?? []).length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">No events yet.</p>
        ) : (
          <div className="divide-y divide-border/20">
            {(data.recentEvents).map((ev) => (
              <div key={ev.id} className="px-4 py-2.5 flex items-center justify-between gap-4">
                <div>
                  <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide mr-2 ${
                    ev.eventType === 'conversion' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' :
                    'bg-blue-500/15 text-blue-400 border border-blue-500/25'
                  }`}>
                    {ev.eventType}
                  </span>
                  <span className="text-xs text-muted-foreground">{ev.referrerEmail ?? 'unknown'}</span>
                </div>
                <div className="flex items-center gap-3 text-right shrink-0">
                  {ev.creditsAwarded > 0 && (
                    <span className="text-xs font-bold text-emerald-400">+{ev.creditsAwarded.toLocaleString()} cr</span>
                  )}
                  <span className="text-[10px] text-muted-foreground/60">
                    {new Date(ev.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReferralsPanel;
