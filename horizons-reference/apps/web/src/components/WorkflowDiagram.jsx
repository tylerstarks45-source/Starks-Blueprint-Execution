import React from 'react';
import { ArrowRight, Clock, Box } from 'lucide-react';

const WorkflowDiagram = ({ workflow }) => {
  if (!workflow || workflow.length === 0) return null;

  return (
    <div className="w-full overflow-x-auto pb-6">
      <div className="flex items-center min-w-max gap-4 p-4">
        {workflow.map((step, index) => (
          <React.Fragment key={index}>
            <div className="bg-card border border-border rounded-xl p-5 w-64 shrink-0 shadow-sm relative group hover:border-primary/50 transition-colors">
              <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-background border-2 border-primary flex items-center justify-center text-primary font-bold text-sm shadow-md">
                {index + 1}
              </div>
              <h4 className="text-lg font-bold text-foreground mb-2 mt-1">{step.phase}</h4>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{step.description}</p>
              
              <div className="space-y-2 mt-auto">
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 bg-white/5 p-1.5 rounded">
                  <Box className="w-3.5 h-3.5 text-primary" /> {step.tool}
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 bg-white/5 p-1.5 rounded">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" /> {step.time}
                </div>
              </div>
            </div>
            
            {index < workflow.length - 1 && (
              <div className="flex flex-col items-center justify-center px-2 shrink-0">
                <ArrowRight className="w-6 h-6 text-muted-foreground opacity-50" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default WorkflowDiagram;