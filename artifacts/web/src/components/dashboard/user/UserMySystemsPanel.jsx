import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Layers, Settings, Trash2, Plus, ExternalLink, RefreshCw, Activity, Heart, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import AIModelBadge from '@/components/AIModelBadge.jsx';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const BUILD_STATUS = {
  active:    { label: 'Active',    cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  building:  { label: 'Building',  cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  pending:   { label: 'Pending',   cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  error:     { label: 'Error',     cls: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
  completed: { label: 'Completed', cls: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
};

const HEALTH_STATUS = {
  healthy:   { label: 'Healthy',  dot: 'bg-emerald-400', cls: 'text-emerald-400' },
  degraded:  { label: 'Degraded', dot: 'bg-amber-400',   cls: 'text-amber-400' },
  unknown:   { label: 'Unknown',  dot: 'bg-muted-foreground', cls: 'text-muted-foreground' },
  error:     { label: 'Error',    dot: 'bg-rose-400',    cls: 'text-rose-400' },
};

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
};

const timeAgo = (d) => {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const SystemRow = ({ sys, blueprintName, buildProgress, currentModel, onDelete }) => {
  const build = BUILD_STATUS[sys.buildStatus?.toLowerCase()] ?? BUILD_STATUS.pending;
  const health = HEALTH_STATUS[sys.healthStatus?.toLowerCase()] ?? HEALTH_STATUS.unknown;
  const done = buildProgress?.filter(s => s.status === 'completed').length ?? 0;
  const total = buildProgress?.length ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : (sys.buildStatus === 'active' ? 100 : 0);
  const isBuilding = sys.buildStatus?.toLowerCase() === 'building';

  return (
    <div className="p-4 border border-white/8 rounded-xl bg-white/3 hover:bg-white/6 transition-colors group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm text-foreground truncate">{sys.name || `System #${sys.id}`}</p>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${build.cls}`}>
              {build.label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
            <Layers className="w-3 h-3 shrink-0" />
            {blueprintName ?? 'Loading blueprint…'}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5">
            <div className="flex items-center gap-1.5">
              <Heart className="w-3 h-3 text-muted-foreground" />
              <span className={`text-xs font-medium ${health.cls}`}>
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${health.dot} mr-1`} />
                {health.label}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Activity className="w-3 h-3" />
              {timeAgo(sys.updatedAt ?? sys.createdAt)}
            </div>
          </div>

          {(total > 0 || sys.buildStatus === 'active') && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Build Progress</span>
                <div className="flex items-center gap-1.5">
                  {currentModel && (
                    <AIModelBadge model={currentModel} isActive={isBuilding} size="xs" />
                  )}
                  <span className="text-[10px] font-mono text-muted-foreground">{pct}%</span>
                </div>
              </div>
              <Progress value={pct} className="h-1.5" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" asChild>
            <Link to={`/systems/${sys.id}`} title="View Build">
              <Settings className="w-3.5 h-3.5" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-rose-500 hover:bg-rose-500/10"
            onClick={() => onDelete(sys.id)}
            title="Remove System"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Button variant="outline" size="sm" className="h-7 text-xs border-white/15 hover:border-primary/40 gap-1.5" asChild>
          <Link to={`/systems/${sys.id}`}>
            <Activity className="w-3 h-3" /> View Build
          </Link>
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs border-white/15 hover:border-primary/40 gap-1.5" asChild>
          <Link to={`/blueprints`}>
            <ExternalLink className="w-3 h-3" /> Browse More
          </Link>
        </Button>
      </div>
    </div>
  );
};

const UserMySystemsPanel = () => {
  const [systems, setSystems] = useState([]);
  const [blueprintMap, setBlueprintMap] = useState({});
  const [progressMap, setProgressMap] = useState({});
  const [modelMap, setModelMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const [siRes, bpRes] = await Promise.all([
        fetch('/api/system-instances', { headers: authHeaders() }),
        fetch('/api/blueprints?status=published'),
      ]);

      const instances = siRes.ok ? await siRes.json() : [];
      const blueprints = bpRes.ok ? await bpRes.json() : [];

      const bpMap = {};
      if (Array.isArray(blueprints)) {
        blueprints.forEach(b => { bpMap[b.id] = b.name; });
      }
      setBlueprintMap(bpMap);

      const items = Array.isArray(instances) ? instances : [];
      setSystems(items.sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0)));

      // Fetch build progress for each system (limit to first 5)
      const progressResults = await Promise.allSettled(
        items.slice(0, 5).map(async (sys) => {
          const r = await fetch(`/api/build-engine/${sys.id}/status`, { headers: authHeaders() });
          if (!r.ok) return { id: sys.id, steps: [], currentModel: null };
          const data = await r.json();
          return { id: sys.id, steps: data.steps ?? [], currentModel: data.session?.currentModel ?? null };
        })
      );

      const pMap = {};
      const mMap = {};
      progressResults.forEach(r => {
        if (r.status === 'fulfilled') {
          pMap[r.value.id] = r.value.steps;
          if (r.value.currentModel) mMap[r.value.id] = r.value.currentModel;
        }
      });
      setProgressMap(pMap);
      setModelMap(mMap);
    } catch {
      toast.error('Failed to load systems.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id) => {
    try {
      const r = await fetch(`/api/system-instances/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!r.ok) throw new Error();
      setSystems(prev => prev.filter(s => s.id !== id));
      toast.success('System removed.');
    } catch {
      toast.error('Failed to remove system.');
    }
  };

  return (
    <Card className="border-white/10 bg-black/80 backdrop-blur-sm shadow-xl">
      <CardHeader className="pb-3 border-b border-white/10 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" /> My Blueprints & Systems
          {systems.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs">
              {systems.length}
            </Badge>
          )}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs border-primary/40 text-primary hover:bg-primary/10 gap-1.5" asChild>
            <Link to="/system-builder">
              <Plus className="w-3 h-3" /> New System
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-28 bg-white/5 rounded-xl animate-pulse" />)}
          </div>
        ) : systems.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Layers className="w-8 h-8 text-primary/60" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">No systems deployed yet</p>
            <p className="text-xs text-muted-foreground mb-5 max-w-xs mx-auto">
              Pick a blueprint, let the AI agent build your automated system, and track it here.
            </p>
            <div className="flex items-center gap-3 justify-center">
              <Button size="sm" asChild>
                <Link to="/system-builder"><Plus className="w-3.5 h-3.5 mr-1.5" /> Launch AI Builder</Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link to="/blueprints"><Layers className="w-3.5 h-3.5 mr-1.5" /> Browse Blueprints</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {systems.map(sys => (
              <SystemRow
                key={sys.id}
                sys={sys}
                blueprintName={blueprintMap[sys.blueprintId]}
                buildProgress={progressMap[sys.id]}
                currentModel={modelMap[sys.id] ?? null}
                onDelete={handleDelete}
              />
            ))}
            {systems.length >= 5 && (
              <p className="text-xs text-center text-muted-foreground pt-1">
                Showing {systems.length} systems
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserMySystemsPanel;
