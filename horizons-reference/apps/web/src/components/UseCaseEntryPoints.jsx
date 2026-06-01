import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Cpu, Share2, Rocket } from 'lucide-react';

const UseCaseEntryPoints = ({ activeUseCase, onSelectUseCase }) => {
  const useCases = [
    {
      id: 'make-money',
      title: 'Make Money',
      icon: DollarSign,
      color: 'from-emerald-500 to-teal-400',
      shadow: 'shadow-emerald-500/20'
    },
    {
      id: 'automate',
      title: 'Automate Work',
      icon: Cpu,
      color: 'from-blue-500 to-indigo-400',
      shadow: 'shadow-blue-500/20'
    },
    {
      id: 'social-media',
      title: 'Grow Social Media',
      icon: Share2,
      color: 'from-purple-500 to-fuchsia-400',
      shadow: 'shadow-purple-500/20'
    },
    {
      id: 'business',
      title: 'Start a Business',
      icon: Rocket,
      color: 'from-orange-500 to-amber-400',
      shadow: 'shadow-orange-500/20'
    }
  ];

  return (
    <section className="py-16 bg-background relative z-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mb-3">What Do You Want to Do With AI?</h2>
          <p className="text-muted-foreground font-medium">Select a goal to filter the marketplace.</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {useCases.map((uc, idx) => {
            const isActive = activeUseCase === uc.id;
            return (
              <motion.button
                key={uc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                onClick={() => onSelectUseCase(isActive ? '' : uc.id)}
                className={`relative flex flex-col items-center justify-center p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 ${
                  isActive 
                    ? `bg-secondary border-transparent shadow-lg ${uc.shadow}` 
                    : 'bg-card border-border hover:bg-secondary/50'
                }`}
              >
                {isActive && (
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${uc.color} opacity-10 blur-xl z-0`} />
                )}
                <div className={`relative z-10 w-14 h-14 rounded-full flex items-center justify-center mb-4 ${isActive ? `bg-gradient-to-br ${uc.color} text-white` : 'bg-muted text-muted-foreground'}`}>
                  <uc.icon className="w-6 h-6" />
                </div>
                <span className={`relative z-10 font-bold ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {uc.title}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default UseCaseEntryPoints;