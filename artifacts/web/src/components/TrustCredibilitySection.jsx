import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

const TrustCredibilitySection = () => {
  const points = [
    { title: 'Tested tools only', desc: 'Every tool is vetted in real workflows.' },
    { title: 'No guesswork', desc: 'Clear, step-by-step implementation.' },
    { title: 'Real systems (not theory)', desc: 'Architectures that generate actual results.' },
    { title: 'Built for beginners', desc: 'No coding or advanced technical skills needed.' }
  ];

  return (
    <section className="py-20 md:py-24 bg-gradient-dark relative border-t border-white/5 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl relative z-10">
        
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white">Why People Use This Platform</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {points.map((point, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex flex-col items-center text-center"
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 shadow-[0_0_20px_hsl(var(--neon-blue)/0.15)]">
                <CheckCircle2 className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{point.title}</h3>
              <p className="text-zinc-400 text-sm font-medium">{point.desc}</p>
            </motion.div>
          ))}
        </div>
        
      </div>
    </section>
  );
};

export default TrustCredibilitySection;