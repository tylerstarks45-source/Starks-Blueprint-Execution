import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Share2, Magnet, Rocket, Cpu } from 'lucide-react';

const GOALS = [
  { id: 'Make Money with AI', title: 'Make Money with AI', icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  { id: 'Grow Social Media', title: 'Grow Social Media', icon: Share2, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  { id: 'Generate Leads', title: 'Generate Leads', icon: Magnet, color: 'text-orange-400', bg: 'bg-orange-400/10' },
  { id: 'Start Online Business', title: 'Start Online Business', icon: Rocket, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  { id: 'Build Automation Systems', title: 'Build Automation Systems', icon: Cpu, color: 'text-primary', bg: 'bg-primary/10' }
];

const GoalSelectionSection = ({ selectedGoal, onSelectGoal }) => {
  // Fallback function if onSelectGoal is not provided
  const handleGoalSelect = onSelectGoal || ((goalId) => {
    console.warn('onSelectGoal prop not provided to GoalSelectionSection. Goal selected:', goalId);
  });

  return (
    <section className="py-16 relative z-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1400px]">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">Filter By Objective</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-medium">
            Select an objective below to discover the exact systems and tools we recommend to achieve it.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {GOALS.map((goal, index) => {
            const Icon = goal.icon;
            const isSelected = selectedGoal === goal.id;
            
            return (
              <motion.button
                key={goal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                onClick={() => handleGoalSelect(goal.id)}
                className={`premium-card rounded-2xl p-6 flex flex-col items-center justify-center text-center group h-full min-h-[200px] transition-all duration-300 ${
                  isSelected 
                    ? 'border-primary shadow-[0_0_25px_hsl(var(--primary)/0.2)] bg-primary/5 scale-105' 
                    : 'border-white/5 hover:-translate-y-1 hover:border-white/20'
                }`}
              >
                <div className={`w-16 h-16 rounded-2xl ${goal.bg} flex items-center justify-center mb-4 transition-transform duration-300 ${isSelected ? 'scale-110' : 'group-hover:scale-110'}`}>
                  <Icon className={`w-8 h-8 ${goal.color}`} />
                </div>
                <h3 className={`text-lg font-bold transition-colors ${isSelected ? 'text-primary' : 'text-foreground group-hover:text-primary'}`}>
                  {goal.title}
                </h3>
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default GoalSelectionSection;