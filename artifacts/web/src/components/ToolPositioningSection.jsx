import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';

const ToolPositioningSection = () => {
  return (
    <section className="py-16 md:py-24 bg-background relative overflow-hidden border-t border-white/5">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 border border-secondary/20 text-secondary-foreground text-sm font-semibold tracking-wide uppercase mb-6">
            <ShieldCheck className="w-4 h-4 text-secondary" />
            Tested before being recommended
          </div>
          
          <h2 className="text-3xl md:text-5xl font-extrabold text-foreground mb-8 tracking-tight text-balance">
            Not Thousands Of AI Tools.<br className="hidden md:block" /> 
            <span className="text-primary drop-shadow-[0_0_15px_rgba(0,180,255,0.2)]">Only The Ones That Actually Work.</span>
          </h2>
          
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed font-medium text-balance max-w-3xl mx-auto mb-8">
            Most AI marketplaces overwhelm users with endless software listings and hype-driven recommendations. We take a different approach. Every tool featured on this platform has been researched, tested, and used inside real automation systems before being recommended. If a tool does not perform inside real-world workflows, it does not belong on this platform.
          </p>
          
          <div className="flex items-center justify-center gap-2 text-sm text-zinc-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
            No fluff. No fake tools. Stop guessing which tools to use.
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ToolPositioningSection;