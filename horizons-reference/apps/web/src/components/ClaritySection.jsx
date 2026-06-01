import React from 'react';
import { CheckCircle2, Info } from 'lucide-react';

const ClaritySection = () => {
  return (
    <section className="mb-12 relative z-10">
      <div className="max-w-4xl mx-auto bg-card/80 backdrop-blur-xl border border-primary/30 rounded-3xl p-8 md:p-10 shadow-[0_0_30px_hsl(var(--primary)/0.1)]">
        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
          <div className="flex-shrink-0 bg-primary/10 p-4 rounded-2xl border border-primary/20">
            <Info className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mb-4 tracking-tight">
              What This Platform Does
            </h2>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-3 text-lg font-medium text-muted-foreground">
                <CheckCircle2 className="w-6 h-6 text-primary shrink-0" />
                The exact system to use
              </li>
              <li className="flex items-center gap-3 text-lg font-medium text-muted-foreground">
                <CheckCircle2 className="w-6 h-6 text-primary shrink-0" />
                The tools required
              </li>
              <li className="flex items-center gap-3 text-lg font-medium text-muted-foreground">
                <CheckCircle2 className="w-6 h-6 text-primary shrink-0" />
                Step-by-step instructions
              </li>
            </ul>
            <div className="bg-secondary/10 border border-secondary/20 rounded-xl p-4">
              <p className="text-secondary-foreground font-semibold">
                You build and run the system using the recommended tools.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ClaritySection;