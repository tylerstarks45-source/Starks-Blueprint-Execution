import React from 'react';
import { motion } from 'framer-motion';
import { MousePointerClick, Wrench, PlayCircle, ArrowRight } from 'lucide-react';

const HowItWorksSection = () => {
  const steps = [
    {
      id: 1,
      title: 'Choose a system',
      icon: MousePointerClick,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
      border: 'border-blue-400/30'
    },
    {
      id: 2,
      title: 'Use the recommended tools',
      icon: Wrench,
      color: 'text-purple-400',
      bg: 'bg-purple-400/10',
      border: 'border-purple-400/30'
    },
    {
      id: 3,
      title: 'Follow the setup steps to deploy',
      icon: PlayCircle,
      color: 'text-primary',
      bg: 'bg-primary/10',
      border: 'border-primary/30'
    }
  ];

  return (
    <section className="py-16 mb-16 relative">
      <div className="absolute inset-0 bg-secondary/5 rounded-3xl border border-secondary/10 pointer-events-none"></div>
      
      <div className="relative z-10 px-6 py-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-3 tracking-tight">How These Systems Work</h2>
          <p className="text-lg text-primary font-bold tracking-wider uppercase">Simple = powerful</p>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-6 lg:gap-10">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <React.Fragment key={step.id}>
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.15 }}
                  className="flex flex-col items-center text-center max-w-[240px] group"
                >
                  <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500 group-hover:scale-110 group-hover:shadow-[0_0_25px_hsl(var(--primary)/0.2)] border ${step.bg} ${step.border}`}>
                    <Icon className={`w-10 h-10 ${step.color}`} />
                  </div>
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background border border-border text-muted-foreground font-bold text-sm mb-4">
                    {step.id}
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{step.title}</h3>
                </motion.div>
                
                {index < steps.length - 1 && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: (index * 0.15) + 0.1 }}
                    className="hidden md:flex text-muted-foreground/30"
                  >
                    <ArrowRight className="w-8 h-8" />
                  </motion.div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;