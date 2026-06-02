import React from 'react';
import { motion } from 'framer-motion';
import { Settings } from 'lucide-react';

const WhatWeDoSection = () => {
  return (
    <section className="trust-section bg-secondary/20">
      <div className="container mx-auto px-[var(--container-px)] sm:px-6 lg:px-8 max-w-5xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-6 border border-primary/20 shadow-[0_0_15px_rgba(0,217,255,0.1)]">
            <Settings className="w-8 h-8" />
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6 tracking-tight">
            What We Actually Do
          </h2>
          <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-3xl mx-auto font-medium">
            We research, test, and build real automation systems using AI tools. Every tool listed is part of a working system.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default WhatWeDoSection;