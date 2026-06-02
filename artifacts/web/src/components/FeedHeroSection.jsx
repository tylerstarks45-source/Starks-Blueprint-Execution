
import React from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';

const FeedHeroSection = () => {
  return (
    <div className="relative overflow-hidden py-24 md:py-32 bg-background border-b border-white/5 flex items-center justify-center min-h-[40vh]">
      {/* Animated Futuristic Background - No Dark Overlays */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.15]" />
      
      {/* Soft Neon Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center justify-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 bg-card/40 backdrop-blur-md border border-primary/30 rounded-full shadow-lg">
            <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))] animate-pulse" />
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-primary drop-shadow-md">Live Transmissions</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 tracking-tighter [text-shadow:_0_4px_24px_rgb(0_0_0_/_100%),_0_2px_8px_rgb(0_0_0_/_80%)]" style={{ letterSpacing: '-0.03em' }}>
            AI <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-secondary drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">Feed</span>
          </h1>
          
          <p className="text-lg md:text-xl text-zinc-100 font-semibold max-w-2xl mx-auto leading-relaxed [text-shadow:_0_4px_16px_rgb(0_0_0_/_100%),_0_2px_4px_rgb(0_0_0_/_80%)]">
            Live updates on new AI tools, systems, releases & platform innovations — stay ahead in real time.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default FeedHeroSection;
