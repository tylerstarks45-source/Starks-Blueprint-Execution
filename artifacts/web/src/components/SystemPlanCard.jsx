import React from 'react';
import { motion } from 'framer-motion';
import { Layers, CheckCircle2 } from 'lucide-react';

const SystemPlanCard = ({ system }) => {
  const steps = system.setup_steps || [
    "Configure Foundations",
    "Connect APIs",
    "Launch Automations"
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mission-card p-6 border-primary/30 hover-glow hover-lift"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
          <Layers className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">{system.name || system.system_name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-1">{system.description}</p>
        </div>
      </div>

      <div className="space-y-3 mt-6">
        <h4 className="text-xs font-mono uppercase tracking-wider text-primary">Implementation Plan</h4>
        {steps.map((step, idx) => (
          <div key={idx} className="flex items-start gap-3 bg-background/50 p-3 rounded-lg border border-border">
            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[10px] font-bold text-primary">{idx + 1}</span>
            </div>
            <p className="text-sm font-medium text-foreground">{typeof step === 'string' ? step : step.title}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default SystemPlanCard;