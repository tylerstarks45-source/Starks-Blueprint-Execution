import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, Sparkles, ArrowRight } from 'lucide-react';

const AIActivityLog = () => {
  return (
    <Card className="bg-card border-accent/20 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-5 mix-blend-screen pointer-events-none">
        <Bot className="w-48 h-48 text-accent" />
      </div>
      <CardHeader className="pb-2 relative z-10">
        <CardTitle className="text-lg font-mono flex items-center gap-2">
          <Bot className="w-5 h-5 text-accent" /> AI Orchestration
          <Badge variant="outline" className="ml-2 bg-accent/10 text-accent border-accent/20 text-[10px] uppercase tracking-wider">Coming Soon</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="relative z-10 pt-4">
        <div className="p-6 bg-background/50 border border-border/50 rounded-xl text-center">
          <Sparkles className="w-8 h-8 text-accent/50 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-foreground mb-2">Phase 2.0 Infrastructure</h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4 leading-relaxed">
            The AI Build Agent will soon be able to autonomously provision, configure, and optimize your systems based on natural language commands.
          </p>
          <div className="inline-flex items-center text-xs font-mono text-accent bg-accent/5 px-3 py-1.5 rounded border border-accent/10">
            &gt; agent optimize --system lead-gen <ArrowRight className="w-3 h-3 ml-2" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AIActivityLog;