import React from 'react';
import { Search, Wrench, FileText, Rocket, ArrowRight } from 'lucide-react';

const WhatHappensNextSection = () => {
  const steps = [
    {
      id: 1,
      title: 'Choose a system',
      icon: Search,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
      border: 'border-blue-400/30'
    },
    {
      id: 2,
      title: 'Review the tools',
      icon: Wrench,
      color: 'text-purple-400',
      bg: 'bg-purple-400/10',
      border: 'border-purple-400/30'
    },
    {
      id: 3,
      title: 'Follow the setup instructions',
      icon: FileText,
      color: 'text-orange-400',
      bg: 'bg-orange-400/10',
      border: 'border-orange-400/30'
    },
    {
      id: 4,
      title: 'Build it using the tools',
      icon: Rocket,
      color: 'text-primary',
      bg: 'bg-primary/10',
      border: 'border-primary/30'
    }
  ];

  return (
    <section className="py-16 mt-12 mb-12 relative border-t border-border">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4 tracking-tight">What Happens Next?</h2>
        <p className="text-lg text-muted-foreground font-medium">Your path from blueprint to live automation.</p>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-center gap-4 lg:gap-6 max-w-6xl mx-auto px-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center text-center w-full md:w-1/4 group relative">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500 group-hover:scale-110 group-hover:shadow-[0_0_25px_hsl(var(--primary)/0.2)] border ${step.bg} ${step.border}`}>
                  <Icon className={`w-10 h-10 ${step.color}`} />
                </div>
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background border border-border text-muted-foreground font-bold text-sm mb-4 absolute top-0 right-1/2 translate-x-12 -translate-y-2 shadow-sm">
                  {step.id}
                </div>
                <h3 className="text-lg font-bold text-foreground leading-snug">{step.title}</h3>
              </div>
              
              {index < steps.length - 1 && (
                <div className="hidden md:flex text-muted-foreground/30 shrink-0">
                  <ArrowRight className="w-6 h-6" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </section>
  );
};

export default WhatHappensNextSection;