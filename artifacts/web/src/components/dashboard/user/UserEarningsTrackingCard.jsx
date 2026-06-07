import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Layers, Server, Coins, Cpu } from 'lucide-react';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const ACTIVE_STATUSES = new Set(['active', 'building', 'running', 'in_progress']);

const StatBox = ({ icon: Icon, label, value, color, sub }) => (
  <div className="p-3 rounded-xl border border-white/10 bg-black/60 text-center flex flex-col items-center gap-1">
    <Icon className={`w-4 h-4 ${color}`} />
    <p className={`text-xl font-bold font-mono tracking-tight ${color}`}>{value}</p>
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium leading-tight">{label}</p>
    {sub && <p className="text-[9px] text-muted-foreground/60">{sub}</p>}
  </div>
);

const UserEarningsTrackingCard = () => {
  const [stats, setStats] = useState({ total: 0, active: 0, creditsUsed: 0, buildSessions: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [siRes, txRes] = await Promise.all([
          fetch('/api/system-instances', { headers: authHeaders() }).then(r => r.ok ? r.json() : []),
          fetch('/api/credits/transactions', { headers: authHeaders() }).then(r => r.ok ? r.json() : []),
        ]);

        const systems = Array.isArray(siRes) ? siRes : [];
        const active = systems.filter(s =>
          ACTIVE_STATUSES.has((s.buildStatus || s.healthStatus || '').toLowerCase())
        ).length;
        const building = systems.filter(s => s.buildStatus === 'building').length;

        const txs = Array.isArray(txRes) ? txRes : [];
        const creditsUsed = txs
          .filter(t => t.type === 'usage')
          .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

        setStats({ total: systems.length, active, creditsUsed, building });
      } catch {
        setStats({ total: 0, active: 0, creditsUsed: 0, building: 0 });
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const metrics = [
    { label: 'Systems Built', value: stats.total, icon: Layers, color: 'text-primary', sub: 'all time' },
    { label: 'Live Now',      value: stats.active,  icon: Server, color: 'text-emerald-400', sub: 'running' },
    { label: 'Building',      value: stats.building, icon: Cpu,   color: 'text-blue-400', sub: 'in progress' },
    { label: 'Credits Used',  value: stats.creditsUsed.toLocaleString(), icon: Coins, color: 'text-amber-400', sub: 'AI tokens' },
  ];

  return (
    <Card className="border-white/10 bg-black/80 backdrop-blur-sm shadow-xl">
      <CardHeader className="pb-2 border-b border-white/10">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" /> Account Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 pb-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2 animate-pulse">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-white/5 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {metrics.map(m => (
              <StatBox key={m.label} {...m} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserEarningsTrackingCard;
