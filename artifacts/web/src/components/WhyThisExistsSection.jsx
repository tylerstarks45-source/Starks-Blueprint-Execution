import React from 'react';
import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';

const WhyThisExistsSection = () => {
  return (
    <section className="trust-section bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.03)_0%,transparent_70%)] pointer-events-none" />
      <div className="container mx-auto px-[var(--container-px)] sm:px-6 lg:px-8 max-w-5xl text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-6 border border-primary/20 shadow-[0_0_15px_rgba(0,217,255,0.1)]">
            <Lightbulb className="w-8 h-8" />
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6 tracking-tight">
            Why This Exists
          </h2>
          <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-3xl mx-auto font-medium">
            Most people fail with AI tools because they don't know how to connect them. We solve that by giving complete system blueprints.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default WhyThisExistsSection;