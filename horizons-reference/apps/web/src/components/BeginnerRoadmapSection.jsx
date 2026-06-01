import React from 'react';
import { motion } from 'framer-motion';
import { Compass, Wrench, FileText, Rocket, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const steps = [
  {
    number: '01',
    title: 'Pick Your Path',
    description: 'Choose a proven beginner system based on your goals (content, leads, or sales).',
    icon: Compass,
    cta: 'View Beginner Systems',
    link: '/blueprints'
  },
  {
    number: '02',
    title: 'Get Your Tools',
    description: 'We recommend the exact, cheapest, and most effective AI tools you need.',
    icon: Wrench,
    cta: 'See Recommended Tools',
    link: '/marketplace'
  },
  {
    number: '03',
    title: 'Follow The Blueprint',
    description: 'Step-by-step instructions. Copy our proven setups without guessing.',
    icon: FileText,
    cta: 'View Step-by-Step Guide',
    link: '/blueprints'
  },
  {
    number: '04',
    title: 'Scale With Automation',
    description: 'Automate the busywork and scale to multiple passive income streams.',
    icon: Rocket,
    cta: 'Learn Scaling Strategies',
    link: '/blueprints'
  }
];

const BeginnerRoadmapSection = () => {
  return (
    <section className="py-24 bg-background relative border-y border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="activity-signal mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Most used by beginners
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            New To AI? Start Here
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Follow this simple path to launch your first AI system in 30 days. No coding required.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {/* Connecting Line (Desktop) */}
          <div className="hidden lg:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-primary/10 via-primary/50 to-primary/10 -translate-y-1/2 z-0"></div>

          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              className="relative z-10 flex flex-col h-full"
            >
              <div className="glass-panel p-8 flex-grow flex flex-col items-center text-center neon-border card-glow bg-card/80 hover:-translate-y-2 transition-transform duration-300">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mb-6 relative">
                  <step.icon className="w-8 h-8 text-primary" />
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-background border border-primary text-primary font-bold flex items-center justify-center text-sm">
                    {step.number}
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-foreground mb-4">{step.title}</h3>
                <p className="text-muted-foreground mb-8 flex-grow">{step.description}</p>
                
                <Link 
                  to={step.link}
                  className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary/80 transition-colors mt-auto"
                >
                  {step.cta} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BeginnerRoadmapSection;