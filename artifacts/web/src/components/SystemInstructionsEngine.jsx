import React, { useState } from 'react';
import { Layers, CheckSquare, DollarSign, Target, Settings2 } from 'lucide-react';
import ToolStackCard from './ToolStackCard.jsx';
import InstructionStep from './InstructionStep.jsx';
import WorkflowDiagram from './WorkflowDiagram.jsx';
import InteractiveChecklist from './InteractiveChecklist.jsx';

const SystemInstructionsEngine = ({ 
  tools = [], 
  instructions = [], 
  workflow = [], 
  monetization, 
  checklist = [],
  systemId
}) => {
  return (
    <div className="space-y-24">
      
      {/* 1. HOW IT WORKS - DIAGRAM */}
      {workflow && workflow.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-8">
            <Target className="w-8 h-8 text-primary" />
            <h2 className="text-3xl font-extrabold text-foreground">How The System Works</h2>
          </div>
          <WorkflowDiagram workflow={workflow} />
        </section>
      )}

      {/* 2. REQUIRED SOFTWARE STACK */}
      {tools && tools.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-8">
            <Layers className="w-8 h-8 text-primary" />
            <h2 className="text-3xl font-extrabold text-foreground">Required Software Stack</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.map((tool, idx) => (
              <ToolStackCard key={idx} tool={tool} />
            ))}
          </div>
        </section>
      )}

      {/* 3. STEP-BY-STEP BUILD INSTRUCTIONS */}
      {instructions && instructions.length > 0 && (
        <section id="build-instructions">
          <div className="flex items-center gap-3 mb-8">
            <Settings2 className="w-8 h-8 text-primary" />
            <h2 className="text-3xl font-extrabold text-foreground">Step-by-Step Build Instructions</h2>
          </div>
          <div className="max-w-4xl">
            {instructions.map((step, idx) => (
              <InstructionStep key={idx} step={step} index={idx} />
            ))}
          </div>
        </section>
      )}

      {/* 4. MONETIZATION SETUP */}
      {monetization && (
        <section>
          <div className="flex items-center gap-3 mb-8">
            <DollarSign className="w-8 h-8 text-emerald-400" />
            <h2 className="text-3xl font-extrabold text-foreground">Monetization Strategy</h2>
          </div>
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-8 md:p-10 shadow-sm">
            <h3 className="text-xl font-bold text-emerald-400 mb-4">How this generates revenue:</h3>
            <div className="text-zinc-300 leading-relaxed whitespace-pre-wrap space-y-4">
              {typeof monetization === 'string' ? <p>{monetization}</p> : (
                <ul className="list-disc pl-5 space-y-2">
                  {monetization.map((item, idx) => <li key={idx}>{item}</li>)}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 5. INTERACTIVE CHECKLIST */}
      {checklist && checklist.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-8">
            <CheckSquare className="w-8 h-8 text-primary" />
            <h2 className="text-3xl font-extrabold text-foreground">Final Launch Checklist</h2>
          </div>
          <InteractiveChecklist items={checklist} systemId={systemId || 'default'} />
        </section>
      )}
      
    </div>
  );
};

export default SystemInstructionsEngine;