import React from 'react';
import { motion } from 'framer-motion';

const GOALS = [
  { id: 'Make Money', label: 'Make Money' },
  { id: 'Generate Leads', label: 'Generate Leads' },
  { id: 'Automate Work', label: 'Automate Work' },
  { id: 'Grow Social Media', label: 'Grow Social Media' },
  { id: 'Build a Business', label: 'Build a Business' }
];

const GoalBasedFilterStrip = ({ activeGoal, onSelectGoal }) => {
  return (
    <div className="w-full bg-card border-y border-border py-6 overflow-x-auto custom-scrollbar relative z-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
          What are you trying to do?
        </h3>
        <div className="flex items-center gap-3 min-w-max pb-2">
          <button
            onClick={() => onSelectGoal('')}
            className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 border ${
              !activeGoal 
                ? 'bg-foreground text-background border-foreground shadow-md' 
                : 'bg-secondary/50 text-muted-foreground border-transparent hover:bg-secondary hover:text-foreground'
            }`}
          >
            All Goals
          </button>
          
          {GOALS.map((goal) => {
            const isActive = activeGoal === goal.id;
            return (
              <button
                key={goal.id}
                onClick={() => onSelectGoal(goal.id)}
                className={`relative px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 border ${
                  isActive 
                    ? 'bg-primary/10 text-primary border-primary shadow-[0_0_15px_hsl(var(--primary)/0.2)]' 
                    : 'bg-secondary/50 text-muted-foreground border-transparent hover:bg-secondary hover:text-foreground'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeGoalIndicator"
                    className="absolute inset-0 rounded-full border border-primary/50 bg-primary/5"
                    initial={false}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10">{goal.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GoalBasedFilterStrip;