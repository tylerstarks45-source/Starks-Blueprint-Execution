import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Magnet, Share2, Rocket, Cpu } from 'lucide-react';

const OUTCOMES = [
  { id: 'Make Money with AI', title: 'Make Money with AI', icon: DollarSign, color: 'text-emerald-400', border: 'hover:border-emerald-400/50', shadow: 'hover:shadow-[0_0_20px_rgba(52,211,153,0.2)]' },
  { id: 'Generate Leads', title: 'Generate Leads', icon: Magnet, color: 'text-orange-400', border: 'hover:border-orange-400/50', shadow: 'hover:shadow-[0_0_20px_rgba(251,146,60,0.2)]' },
  { id: 'Grow Social Media', title: 'Grow Social Media', icon: Share2, color: 'text-blue-400', border: 'hover:border-blue-400/50', shadow: 'hover:shadow-[0_0_20px_rgba(96,165,250,0.2)]' },
  { id: 'Start Online Business', title: 'Start Online Business', icon: Rocket, color: 'text-purple-400', border: 'hover:border-purple-400/50', shadow: 'hover:shadow-[0_0_20px_rgba(192,132,252,0.2)]' },
  { id: 'Build Automation Systems', title: 'Build Automation Systems', icon: Cpu, color: 'text-primary', border: 'hover:border-primary/50', shadow: 'hover:shadow-[0_0_20px_hsl(var(--primary)/0.2)]' }
];

const StartHereStrip = ({ selectedGoal, onSelectGoal }) => {
  return (
    <section className="py-12 border-b border-border/50 bg-card/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Start Here — Choose Your Outcome</h2>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {OUTCOMES.map((outcome, index) => {
            const Icon = outcome.icon;
            const isSelected = selectedGoal === outcome.id;
            
            return (
              <motion.button
                key={outcome.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                onClick={() => onSelectGoal(outcome.id)}
                className={`flex flex-col items-center justify-center p-6 rounded-2xl border transition-all duration-300 bg-card ${outcome.border} ${outcome.shadow} ${
                  isSelected 
                    ? 'border-primary shadow-[0_0_20px_hsl(var(--primary)/0.3)] bg-primary/5' 
                    : 'border-border'
                }`}
              >
                <Icon className={`w-8 h-8 mb-3 ${outcome.color} ${isSelected ? 'animate-pulse' : ''}`} />
                <span className={`text-sm font-bold text-center ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {outcome.title}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default StartHereStrip;