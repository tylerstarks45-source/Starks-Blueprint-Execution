import React from 'react';
import { motion } from 'framer-motion';
import { Layers } from 'lucide-react';

const BlueprintPositioningSection = () => {
  return (
    <section className="py-16 md:py-24 bg-card/30 relative overflow-hidden border-y border-white/5">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsla(210,100%,50%,0.05),transparent_50%)] pointer-events-none"></div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl relative z-10">
        <div className="flex flex-col md:flex-row gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex-1"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary-foreground text-sm font-semibold tracking-wide uppercase mb-6">
              <Layers className="w-4 h-4 text-primary" />
              Curated AI systems that actually work
            </div>
            
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-6 tracking-tight text-balance">
              Architectures Built For <span className="text-accent">Speed & Clarity</span>
            </h2>
            
            <p className="text-lg text-muted-foreground leading-relaxed font-medium">
              Every blueprint on this platform is based on real automation systems that have already been planned, tested, and structured using real AI tools and workflows. These are not theory-based tutorials. They are practical AI system architectures designed to help users launch faster and avoid months of confusion and wasted money.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex-1 w-full"
          >
            <div className="bg-background border border-border p-8 rounded-2xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] relative">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Layers className="w-24 h-24 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4">The Blueprint Standard</h3>
              <ul className="space-y-4 relative z-10">
                <li className="flex items-start gap-3 text-muted-foreground">
                  <div className="mt-1 w-2 h-2 rounded-full bg-accent shrink-0"></div>
                  <span>Tested tools mapped to specific process steps</span>
                </li>
                <li className="flex items-start gap-3 text-muted-foreground">
                  <div className="mt-1 w-2 h-2 rounded-full bg-accent shrink-0"></div>
                  <span>Visualized logic flows for clear understanding</span>
                </li>
                <li className="flex items-start gap-3 text-muted-foreground">
                  <div className="mt-1 w-2 h-2 rounded-full bg-accent shrink-0"></div>
                  <span>Actionable steps to build and launch immediately</span>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default BlueprintPositioningSection;