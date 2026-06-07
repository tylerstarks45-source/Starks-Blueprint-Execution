import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HeartPulse, Zap, Clock, ArrowRight, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const HEALTH_CONFIG = {
  healthy:  { label: 'Healthy',  ring: 'ring-emerald-500/40', dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  degraded: { label: 'Degraded', ring: 'ring-amber-500/40',   dot: 'bg-amber-400',   text: 'text-amber-400',   bg: 'bg-amber-500/10' },
  error:    { label: 'Error',    ring: 'ring-rose-500/40',    dot: 'bg-rose-400',    text: 'text-rose-400',    bg: 'bg-rose-500/10' },
  unknown:  { label: 'Pending',  ring: 'ring-muted/40',       dot: 'bg-muted-foreground', text: 'text-muted-foreground', bg: 'bg-muted/10' },
};

const BUILD_LABEL = {
  active: 'Live',
  building: 'Building',
  pending: 'Queued',
  error: 'Failed',
  completed: 'Done',
};

const timeAgo = (d) => {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return days === 1 ? '1 day ago' : `${days} days ago`;
};

const runtimeSince = (d) => {
  if (!d) return null;
  const diff = Date.now() - new Date(d).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return '< 1 hr';
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
};

const HealthRing = ({ health }) => {
  const cfg = HEALTH_CONFIG[health] ?? HEALTH_CONFIG.unknown;
  return (
    <div className={`w-10 h-10 rounded-full ring-2 ${cfg.ring} ${cfg.bg} flex items-center justify-center`}>
      <span className={`w-3 h-3 rounded-full ${cfg.dot} ${health === 'healthy' ? 'animate-pulse' : ''}`} />
    </div>
  );
};

const SystemHealthRow = ({ sys, blueprintName, steps }) => {
  const health = sys.healthStatus?.toLowerCase() ?? 'unknown';
  const build = sys.buildStatus?.toLowerCase() ?? 'pending';
  const cfg = HEALTH_CONFIG[health] ?? HEALTH_CONFIG.unknown;
  const done = steps?.filter(s => s.status === 'completed').length ?? 0;
  const total = steps?.length ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : (build === 'active' ? 100 : 0);

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-white/8 bg-white/3 hover:bg-white/5 transition-colors group">
      <HealthRing health={health} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold truncate">{sys.name || `System #${sys.id}`}</p>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 ${cfg.bg} ${cfg.text} border-current/20`}>
            {cfg.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{blueprintName ?? '—'}</p>
        <div className="flex items-center gap-4 mt-1.5">
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Zap className="w-2.5 h-2.5" />
            {BUILD_LABEL[build] ?? build}  {pct}%
          </span>
          {build === 'active' && sys.updatedAt && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="w-2.5 h-2.5" />
              {runtimeSince(sys.updatedAt)} runtime
            </span>
          )}
        </div>
      </div>
      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" asChild>
        <Link to={`/systems/${sys.id}`}>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </Button>
    </div>
  );
};

const UserBlueprintHealthCard = () => {
  const [systems, setSystems] = useState([]);
  const [blueprintMap, setBlueprintMap] = useState({});
  const [progressMap, setProgressMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    else setRefreshing(true);
    try {
      const [siRes, bpRes] = await Promise.all([
        fetch('/api/system-instances', { headers: authHeaders() }),
        fetch('/api/blueprints?status=published'),
      ]);
      const instances = siRes.ok ? await siRes.json() : [];
      const blueprints = bpRes.ok ? await bpRes.json() : [];
      const bpMap = {};
      if (Array.isArray(blueprints)) blueprints.forEach(b => { bpMap[b.id] = b.name; });
      setBlueprintMap(bpMap);
      const items = Array.isArray(instances) ? instances : [];
      setSystems(items.slice(0, 6));

      const progResults = await Promise.allSettled(
        items.slice(0, 6).map(async sys => {
          const r = await fetch(`/api/build-engine/${sys.id}/status`, { headers: authHeaders() });
          if (!r.ok) return { id: sys.id, steps: [] };
          const d = await r.json();
          return { id: sys.id, steps: d.steps ?? [] };
        })
      );
      const pMap = {};
      progResults.forEach(r => { if (r.status === 'fulfilled') pMap[r.value.id] = r.value.steps; });
      setProgressMap(pMap);
    } catch { /* silent */ } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const healthySystems = systems.filter(s => s.healthStatus === 'healthy').length;
  const activeSystems = systems.filter(s => s.buildStatus === 'active').length;

  return (
    <Card className="border-white/10 bg-black/80 backdrop-blur-sm shadow-xl">
      <CardHeader className="pb-3 border-b border-white/10 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <HeartPulse className="w-5 h-5 text-rose-400" /> System Health
        </CardTitle>
        <div className="flex items-center gap-3">
          {!isLoading && systems.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="text-emerald-400 font-semibold">{healthySystems}</span>/<span>{systems.length}</span> healthy
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => load(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}
          </div>
        ) : systems.length === 0 ? (
          <div className="text-center py-8">
            <HeartPulse className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No systems to monitor</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Deploy a blueprint to see health stats</p>
          </div>
        ) : (
          <>
            {activeSystems > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <p className="text-lg font-bold font-mono text-emerald-400">{activeSystems}</p>
                  <p className="text-[10px] uppercase tracking-wider text-emerald-400/70">Live Now</p>
                </div>
                <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-center">
                  <p className="text-lg font-bold font-mono text-primary">{systems.length}</p>
                  <p className="text-[10px] uppercase tracking-wider text-primary/70">Total Systems</p>
                </div>
              </div>
            )}
            <div className="space-y-2">
              {systems.map(sys => (
                <SystemHealthRow
                  key={sys.id}
                  sys={sys}
                  blueprintName={blueprintMap[sys.blueprintId]}
                  steps={progressMap[sys.id]}
                />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default UserBlueprintHealthCard;
