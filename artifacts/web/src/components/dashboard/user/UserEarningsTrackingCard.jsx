import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gauge, Server, Coins, Layers } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient.js';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const ACTIVE_STATUSES = new Set(['active', 'building', 'running', 'in_progress']);

const UserEarningsTrackingCard = () => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({ total: 0, active: 0, creditsUsed: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.id) return;
    const load = async () => {
      try {
        const [systemsRes, txRes] = await Promise.all([
          pb.collection('system_instances').getFullList({
            filter: `userId="${currentUser.id}"`,
            $autoCancel: false,
          }).catch(() => []),
          fetch('/api/credits/transactions', { headers: authHeaders() })
            .then((r) => (r.ok ? r.json() : []))
            .catch(() => []),
        ]);

        const systems = Array.isArray(systemsRes) ? systemsRes : [];
        const active = systems.filter((s) =>
          ACTIVE_STATUSES.has((s.buildStatus || s.status || '').toLowerCase())
        ).length;

        const txs = Array.isArray(txRes) ? txRes : [];
        const creditsUsed = txs
          .filter((t) => t.type === 'usage')
          .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

        setStats({ total: systems.length, active, creditsUsed });
      } catch {
        setStats({ total: 0, active: 0, creditsUsed: 0 });
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [currentUser?.id]);

  const metrics = [
    { label: 'Systems Built', value: stats.total, icon: Layers, color: 'text-primary' },
    { label: 'Active Now', value: stats.active, icon: Server, color: 'text-emerald-500' },
    { label: 'Credits Used', value: stats.creditsUsed, icon: Coins, color: 'text-amber-500' },
  ];

  return (
    <Card className="h-full flex flex-col shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Gauge className="w-5 h-5 text-emerald-500" /> Account Snapshot
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center py-4">
        {isLoading ? (
          <div className="grid grid-cols-3 gap-3 animate-pulse">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-muted/50 rounded-lg" />)}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {metrics.map((m) => (
              <div key={m.label} className="bg-muted/20 p-3 rounded-lg border border-border/50 text-center">
                <m.icon className={`w-4 h-4 mx-auto mb-2 ${m.color}`} />
                <p className="text-xl font-bold font-mono tracking-tight">{m.value.toLocaleString()}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mt-1">{m.label}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserEarningsTrackingCard;
