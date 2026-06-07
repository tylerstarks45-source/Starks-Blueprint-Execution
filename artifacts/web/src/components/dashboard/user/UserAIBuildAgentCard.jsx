import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, Zap, ArrowRight, Layers, Clock, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';

const DIFFICULTY_COLORS = {
  beginner:     'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  intermediate: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  advanced:     'bg-rose-500/15 text-rose-400 border-rose-500/30',
};

const UserAIBuildAgentCard = () => {
  const [blueprints, setBlueprints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/blueprints?status=published')
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        setBlueprints(Array.isArray(data) ? data.slice(0, 3) : []);
      })
      .catch(() => setBlueprints([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card className="flex flex-col border-white/10 bg-gradient-to-br from-primary/15 to-black/80 backdrop-blur-sm shadow-xl">
      <CardHeader className="pb-3 border-b border-white/10">
        <CardTitle className="text-base font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            AI Build Agent
          </span>
          <span className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs font-normal text-emerald-400">Online</span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col pt-4 gap-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Describe your income goal, and the AI agent will pick the right blueprint, recommend every tool you need with signup links, and build your entire automated system.
        </p>

        {!loading && blueprints.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
              Featured Blueprints — {blueprints.length} of {blueprints.length}+ available
            </p>
            <div className="space-y-2">
              {blueprints.map(bp => (
                <Link
                  key={bp.id}
                  to={`/blueprints`}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg border border-white/8 bg-white/3 hover:bg-white/8 hover:border-primary/30 transition-colors group"
                >
                  <div className="w-7 h-7 rounded-md bg-primary/15 flex items-center justify-center shrink-0">
                    <Layers className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{bp.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {bp.estimatedCost && (
                        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <DollarSign className="w-2.5 h-2.5" />{bp.estimatedCost}
                        </span>
                      )}
                      {bp.estimatedTime && (
                        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <Clock className="w-2.5 h-2.5" />{bp.estimatedTime}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="outline" className={`text-[9px] px-1 py-0 capitalize ${DIFFICULTY_COLORS[bp.difficulty?.toLowerCase()] ?? DIFFICULTY_COLORS.beginner}`}>
                      {bp.difficulty ?? 'beginner'}
                    </Badge>
                    <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />)}
          </div>
        )}

        <div className="mt-auto space-y-2">
          <Button className="w-full gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20" size="lg" asChild>
            <Link to="/system-builder">
              <Zap className="w-4 h-4" /> Launch AI Builder
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="w-full border-white/15 text-muted-foreground hover:text-foreground gap-1.5" asChild>
            <Link to="/blueprints">
              <Layers className="w-3.5 h-3.5" /> Browse All Blueprints
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserAIBuildAgentCard;
