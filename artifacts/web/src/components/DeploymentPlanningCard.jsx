import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Map, BookOpen, ChevronRight, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const DeploymentPlanningCard = () => {
  const [blueprints, setBlueprints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/blueprints?limit=3')
      .then(r => r.ok ? r.json() : { items: [] })
      .then(d => setBlueprints((d.items || []).slice(0, 3)))
      .catch(() => {}).finally(() => setIsLoading(false));
  }, []);

  return (
    <Card className="bg-card border-border shadow-none">
      <CardHeader className="pb-3 border-b border-border/50">
        <CardTitle className="text-lg font-mono flex items-center gap-2">
          <Map className="w-5 h-5 text-blue-400" /> Deployment Planning
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <p className="text-xs text-muted-foreground mb-3">Choose a blueprint to deploy your next AI system.</p>
        {isLoading ? (
          <div className="space-y-2 animate-pulse">{[0,1,2].map(i=><div key={i} className="h-10 bg-muted/40 rounded-lg"/>)}</div>
        ) : (
          <div className="space-y-2">
            {blueprints.map(b => (
              <Link key={b.id} to={`/blueprints/${b.slug || b.id}`}
                className="flex items-center gap-2 bg-muted/10 rounded-lg px-3 py-2 border border-border/30 hover:border-primary/30 hover:bg-primary/5 transition-colors text-sm group">
                <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate font-medium text-foreground">{b.name}</span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground ml-auto shrink-0 group-hover:text-primary transition-colors" />
              </Link>
            ))}
            <Link to="/blueprints" className="flex items-center gap-2 text-xs text-primary hover:underline mt-2 px-1">
              <BookOpen className="w-3 h-3" /> View all blueprints →
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DeploymentPlanningCard;