import React from 'react';
import { motion } from 'framer-motion';
import { XCircle, CheckCircle2 } from 'lucide-react';

const failurePoints = [
  {
    problem: 'Too Many Confusing Tools',
    solution: 'We provide the exact, tested tool stack.'
  },
  {
    problem: 'No Clear Roadmap',
    solution: 'Follow our proven, step-by-step blueprints.'
  },
  {
    problem: 'Wasting Money on Wrong Software',
    solution: 'Use the cheapest, most effective tools.'
  },
  {
    problem: 'Trying to Learn Everything at Once',
    solution: 'Start with ONE system and scale later.'
  },
  {
    problem: 'No Proven Systems',
    solution: 'Copy tested blueprints that actually work.'
  },
  {
    problem: 'Feeling Overwhelmed and Alone',
    solution: 'Join 1,200+ builders on the same path.'
  }
];

const WhyPeopleFailSection = () => {
  return (
    <section className="py-24 bg-background relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            Why Most People Fail With AI <br className="hidden md:block" />
            <span className="text-primary">(And How We Fix It)</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Stop making the same expensive mistakes. We've removed the friction so you can launch faster.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {failurePoints.map((point, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="glass-panel overflow-hidden flex flex-col sm:flex-row"
            >
              {/* Problem Side */}
              <div className="flex-1 p-6 bg-rose-500/5 border-b sm:border-b-0 sm:border-r border-rose-500/10 flex items-start gap-4">
                <XCircle className="w-6 h-6 text-rose-500 shrink-0 mt-1" />
                <div>
                  <div className="text-xs font-bold text-rose-500 uppercase tracking-wider mb-1">The Problem</div>
                  <div className="text-foreground font-medium">{point.problem}</div>
                </div>
              </div>
              
              {/* Solution Side */}
              <div className="flex-1 p-6 bg-emerald-500/5 flex items-start gap-4">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-1" />
                <div>
                  <div className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1">The Fix</div>
                  <div className="text-foreground font-medium">{point.solution}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyPeopleFailSection;