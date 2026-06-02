import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Layers, ArrowRight } from 'lucide-react';

const ScrollHookSection = () => {
  return (
    <section className="py-20 bg-card/40 relative border-b border-border overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.1)_0%,transparent_50%)] pointer-events-none" />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-6 shadow-[0_0_30px_hsl(var(--primary)/0.2)]">
            <Layers className="w-8 h-8" />
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold mb-6 leading-tight">
            Most AI Tools Don't Make You Money — <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-400">Systems Do</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Tools alone don't create results. Systems do. That's why every tool on this platform is curated specifically as part of a working, revenue-generating automation system.
          </p>
          <Link 
            to="/blueprints" 
            className="saas-button text-lg px-8 py-4 shadow-[0_0_20px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)] group"
          >
            View Proven Systems
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default ScrollHookSection;