import React from 'react';
import { ChevronRight, Terminal, MousePointerClick, MapPin } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const InstructionStep = ({ step, index }) => {
  return (
    <div className="instruction-step-container mb-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="absolute top-0 left-0 w-1.5 h-full bg-primary opacity-80" />
      
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 shrink-0 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-extrabold text-lg">
          {index + 1}
        </div>
        
        <div className="flex-1">
          <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3 tracking-tight">
            {step.title}
          </h3>
          
          <div className="space-y-4">
            {/* Location & Action */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm font-medium">
              <span className="flex items-center gap-1.5 text-zinc-400 bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                <MapPin className="w-4 h-4 text-blue-400" /> {step.location}
              </span>
              {step.action && (
                <span className="flex items-center gap-1.5 text-zinc-300">
                  <ChevronRight className="w-4 h-4 text-primary" /> {step.action}
                </span>
              )}
            </div>

            {/* Click / Type Instructions */}
            {(step.whatToClick || step.whatToType) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {step.whatToClick && (
                  <div className="bg-background rounded-lg p-4 border border-border">
                    <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      <MousePointerClick className="w-4 h-4 text-emerald-400" /> Action
                    </span>
                    <p className="text-sm text-foreground font-medium">Click: <span className="text-primary">{step.whatToClick}</span></p>
                  </div>
                )}
                {step.whatToType && (
                  <div className="bg-background rounded-lg p-4 border border-border">
                    <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      <Terminal className="w-4 h-4 text-orange-400" /> Input
                    </span>
                    <p className="text-sm text-foreground font-medium">Enter: <span className="font-mono text-xs bg-white/10 px-1.5 py-0.5 rounded text-orange-200">{step.whatToType}</span></p>
                  </div>
                )}
              </div>
            )}

            {/* Expandable Details for Prompts / Expected Output */}
            {(step.details || step.expectedOutput) && (
              <Accordion type="single" collapsible className="w-full mt-4 border border-white/5 rounded-lg bg-black/20">
                <AccordionItem value="details" className="border-none">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-white/5 rounded-lg transition-colors text-sm font-medium">
                    View Step Details & Expected Output
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 pt-1 space-y-4">
                    {step.details && (
                      <div>
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Details / Prompt</h4>
                        <div className="bg-background p-3 rounded-md border border-border font-mono text-sm text-zinc-300 whitespace-pre-wrap">
                          {step.details}
                        </div>
                      </div>
                    )}
                    {step.expectedOutput && (
                      <div>
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Expected Output</h4>
                        <p className="text-sm text-emerald-400/90 font-medium bg-emerald-500/10 p-3 rounded-md border border-emerald-500/20">
                          ✓ {step.expectedOutput}
                        </p>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstructionStep;