import React from 'react';
import { CheckCircle2, Clock, ArrowRight } from 'lucide-react';

const SystemSetupStep = ({ step, index, isLast }) => {
  return (
    <div className="relative flex gap-6 pb-12">
      {/* Timeline Line */}
      {!isLast && (
        <div className="absolute left-6 top-14 bottom-0 w-px bg-border" />
      )}

      {/* Step Number Indicator */}
      <div className="relative z-10 w-12 h-12 rounded-full bg-secondary border-2 border-primary flex items-center justify-center shrink-0 shadow-[0_0_15px_hsl(var(--primary)/0.2)]">
        <span className="font-bold text-foreground">{step.step_number || index + 1}</span>
      </div>

      {/* Step Content */}
      <div className="flex-1 premium-card rounded-2xl p-6 border border-white/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h3 className="text-xl font-bold text-foreground">{step.title}</h3>
          {step.estimated_time && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-secondary px-3 py-1 rounded-full">
              <Clock className="w-3.5 h-3.5" /> {step.estimated_time}
            </span>
          )}
        </div>

        <p className="text-muted-foreground mb-6 leading-relaxed">
          {step.description}
        </p>

        {step.tools_used && step.tools_used.length > 0 && (
          <div className="bg-background/50 rounded-xl p-4 border border-white/5">
            <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" /> Tools needed for this step:
            </h4>
            <div className="flex flex-wrap gap-3">
              {step.tools_used.map((toolName, i) => (
                <div key={i} className="flex items-center gap-2 bg-secondary px-3 py-1.5 rounded-lg text-sm font-medium text-foreground">
                  {toolName}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemSetupStep;