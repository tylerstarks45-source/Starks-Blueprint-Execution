import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

const PremiumSalesSection = () => {
  return (
    <section className="py-12 md:py-16 bg-background relative overflow-hidden border-b border-white/5">
      {/* Subtle Background Gradient - Electric Blue */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_center,hsla(210,100%,50%,0.08),transparent_70%)] pointer-events-none"></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center"
        >
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4 tracking-tight text-balance">
            Build AI Systems That Generate <span className="text-gradient-blue">Real Online Income</span>
          </h2>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-4xl mx-auto mb-8 leading-relaxed font-medium text-balance">
            Learn how to build automated AI-powered systems using real tools, real workflows, and step-by-step blueprints designed for beginners and entrepreneurs.
          </p>

          <div className="flex flex-wrap justify-center gap-4 md:gap-8 mb-8">
            {[
              'AI Automation Blueprints',
              'Beginner Friendly Systems',
              'Real Tool Stacks',
              'Built For Long-Term Growth'
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm md:text-base text-foreground font-semibold">
                <CheckCircle2 className="w-5 h-5 text-accent" />
                {item}
              </div>
            ))}
          </div>

          <div className="inline-block bg-card/60 border border-white/10 backdrop-blur-md rounded-xl px-6 py-4 max-w-3xl mx-auto shadow-lg">
            <p className="text-sm md:text-base text-zinc-300">
              <strong className="text-accent font-semibold">Income Potential:</strong> Some users may build systems capable of generating $1k–$10k/month depending on execution, consistency, and the number of systems deployed.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PremiumSalesSection;