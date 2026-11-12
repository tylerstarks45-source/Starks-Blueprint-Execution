import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Rocket, Loader2, ArrowRight, Clock, DollarSign, Zap, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext.jsx';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
};

const DIFF_STYLE = {
  beginner:     'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  intermediate: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  advanced:     'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

const BP_ICONS = ['🤖', '📧', '📱', '🛒', '📝', '🎯', '💰', '🔥'];

const UserBlueprintLauncherCard = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [blueprints, setBlueprints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [buildingId, setBuildingId] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch('/api/blueprints')
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        setBlueprints(Array.isArray(data) ? data : []);
        if (data?.length > 0) setSelected(data[0].id);
      })
      .catch(() => setBlueprints([]))
      .finally(() => setIsLoading(false));
  }, []);

  const handleBuild = async (blueprint) => {
    if (!currentUser) {
      toast.error("Please log in to build a blueprint");
      navigate('/login');
      return;
    }
    setBuildingId(blueprint.id);
    try {
      const resp = await fetch('/api/system-instances', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ blueprintId: blueprint.id, name: blueprint.name, userId: Number(currentUser.id) }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create system');
      }
      const instance = await resp.json();
      toast.success(`Launching AI Build Agent for "${blueprint.name}"...`);
      navigate(`/systems/${instance.id}`);
    } catch (err) {
      toast.error(err.message || 'Failed to start build');
      setBuildingId(null);
    }
  };

  const activeBlueprint = blueprints.find(b => b.id === selected) || blueprints[0];

  return (
    <div className="rounded-2xl border border-white/10 bg-black/80 backdrop-blur-sm overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Rocket className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Blueprint Launcher</h3>
        </div>
        <button
          onClick={() => navigate('/blueprints')}
          className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
        >
          View all <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : blueprints.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            <Rocket className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No blueprints available.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Blueprint list */}
          <div className="w-48 border-r border-white/8 overflow-y-auto shrink-0 ash-scroll">
            {blueprints.map((bp, i) => {
              const isSelected = selected === bp.id;
              return (
                <button
                  key={bp.id}
                  onClick={() => setSelected(bp.id)}
                  className={`w-full text-left px-3 py-3 border-b border-white/4 transition-all ${
                    isSelected
                      ? 'bg-primary/10 border-l-2 border-l-primary'
                      : 'hover:bg-white/3 border-l-2 border-l-transparent'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-base mt-0.5">{BP_ICONS[i % BP_ICONS.length]}</span>
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold leading-tight truncate ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {bp.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground/50 mt-0.5 capitalize truncate">
                        {bp.difficulty || 'intermediate'}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Blueprint detail */}
          {activeBlueprint && (
            <div className="flex-1 p-5 flex flex-col overflow-y-auto min-w-0 ash-scroll">
              <motion.div
                key={activeBlueprint.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col"
              >
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {activeBlueprint.difficulty && (
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                        DIFF_STYLE[(activeBlueprint.difficulty || '').toLowerCase()] || DIFF_STYLE.intermediate
                      }`}>
                        {activeBlueprint.difficulty}
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-base text-foreground mb-2 leading-tight">
                    {activeBlueprint.name}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                    {activeBlueprint.description}
                  </p>
                </div>

                {/* Meta */}
                <div className="grid grid-cols-2 gap-2 mb-5">
                  {activeBlueprint.estimatedTime && (
                    <div className="p-2 rounded-lg bg-black/60 border border-white/10">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Setup Time</p>
                      </div>
                      <p className="text-xs font-semibold text-foreground">{activeBlueprint.estimatedTime}</p>
                    </div>
                  )}
                  {activeBlueprint.estimatedCost && (
                    <div className="p-2 rounded-lg bg-black/60 border border-white/10">
                      <div className="flex items-center gap-1.5 mb-1">
                        <DollarSign className="w-3 h-3 text-muted-foreground" />
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Est. Cost</p>
                      </div>
                      <p className="text-xs font-semibold text-foreground">{activeBlueprint.estimatedCost}</p>
                    </div>
                  )}
                </div>

                <div className="mt-auto space-y-2">
                  <button
                    onClick={() => handleBuild(activeBlueprint)}
                    disabled={buildingId === activeBlueprint.id}
                    className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.97] transition-all shadow-lg shadow-primary/20 disabled:opacity-60 disabled:pointer-events-none"
                  >
                    {buildingId === activeBlueprint.id ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Launching...</>
                    ) : (
                      <><Zap className="w-4 h-4" /> Build Now <ArrowRight className="w-3 h-3" /></>
                    )}
                  </button>
                  <button
                    onClick={() => navigate(`/blueprints/${activeBlueprint.slug}`)}
                    className="w-full py-2 rounded-xl border border-white/10 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                  >
                    View Full Details →
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserBlueprintLauncherCard;
