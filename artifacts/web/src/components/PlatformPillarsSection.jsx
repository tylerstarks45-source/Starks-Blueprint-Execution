import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Sparkles, Workflow, Zap } from 'lucide-react';

const PILLARS = [
  {
    icon: Shield,
    title: 'Tested AI Systems',
    description: 'Every blueprint and tool stack is reviewed and tested before being published.',
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/20'
  },
  {
    icon: Sparkles,
    title: 'Curated AI Tools',
    description: 'We focus on quality over quantity — only proven tools make it onto the platform.',
    color: 'text-accent',
    bg: 'bg-accent/10',
    border: 'border-accent/20'
  },
  {
    icon: Workflow,
    title: 'Built For Real Automation',
    description: 'Systems are designed around actual business workflows, not theory.',
    color: 'text-secondary',
    bg: 'bg-secondary/10',
    border: 'border-secondary/20'
  },
  {
    icon: Zap,
    title: 'Beginner-Friendly Structure',
    description: 'Clear step-by-step architectures designed to reduce overwhelm.',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/20'
  }
];

const PlatformPillarsSection = () => {
  return (
    <section className="py-20 md:py-28 bg-background relative border-y border-white/5">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl relative z-10">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-extrabold text-foreground tracking-tight text-balance mb-4"
          >
            Why People Use This Platform
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-muted-foreground font-medium"
          >
            Built using real automation workflows. Designed for clarity and execution.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {PILLARS.map((pillar, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              className="bg-card border border-border p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow group"
            >
              <div className={`w-14 h-14 rounded-xl ${pillar.bg} ${pillar.border} border flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <pillar.icon className={`w-7 h-7 ${pillar.color}`} />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">{pillar.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{pillar.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PlatformPillarsSection;