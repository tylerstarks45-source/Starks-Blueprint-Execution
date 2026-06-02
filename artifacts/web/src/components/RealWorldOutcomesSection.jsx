import React from 'react';
import { motion } from 'framer-motion';
import { Target } from 'lucide-react';

const OUTCOMES = [
  'Lead Generation',
  'Content Creation',
  'Appointment Booking',
  'Sales Funnels',
  'Customer Follow-up',
  'Social Media Distribution',
  'AI-Assisted Operations'
];

const RealWorldOutcomesSection = () => {
  return (
    <section className="py-20 md:py-28 bg-[linear-gradient(to_bottom,hsl(var(--background)),hsl(var(--muted)/0.3))] relative border-t border-white/5">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-semibold tracking-wide uppercase mb-6">
            <Target className="w-4 h-4" />
            AI tools designed for real business outcomes
          </div>
          
          <h2 className="text-3xl md:text-5xl font-extrabold text-foreground mb-10 tracking-tight text-balance">
            Built For Real-World Outcomes
          </h2>
          
          <div className="flex flex-wrap justify-center gap-3 md:gap-4 mb-12">
            {OUTCOMES.map((outcome, idx) => (
              <span 
                key={idx} 
                className="px-5 py-3 rounded-lg bg-card border border-border text-foreground font-medium text-sm md:text-base shadow-sm hover:border-primary/50 transition-colors"
              >
                {outcome}
              </span>
            ))}
          </div>

          <div className="bg-primary/5 border border-primary/20 p-8 rounded-2xl max-w-3xl mx-auto backdrop-blur-sm">
            <p className="text-xl md:text-2xl text-foreground font-bold leading-relaxed text-balance">
              The goal is simple: help users build scalable online systems faster using AI and automation.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default RealWorldOutcomesSection;