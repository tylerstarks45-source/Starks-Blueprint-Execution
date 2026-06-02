import React from 'react';
import { Link } from 'react-router-dom';
import { Flame, ArrowRight, Clock, Zap, Target } from 'lucide-react';
import { motion } from 'framer-motion';

const RecommendedSystemCard = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative w-full max-w-5xl mx-auto mb-16 recommended-glow"
    >
      {/* Decorative background glow */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-blue-500 to-accent rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
      
      <div className="relative bg-card/90 backdrop-blur-xl border border-primary/40 rounded-3xl p-8 md:p-10 flex flex-col md:flex-row gap-8 items-center shadow-[0_0_30px_hsl(var(--primary)/0.15)]">
        
        {/* Left Content */}
        <div className="flex-1 w-full">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full badge-fire text-sm font-bold mb-6 border border-orange-500/30">
            <Flame className="w-4 h-4 text-orange-500 fill-orange-500 animate-pulse" />
            <span className="text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]">Best Place to Start</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4 tracking-tight">
            AI Affiliate Content Engine
          </h2>
          
          <p className="text-lg text-muted-foreground font-medium mb-6">
            Easiest system to launch and start generating results using AI tools.
          </p>

          <div className="space-y-4 mb-8 bg-background/50 p-5 rounded-2xl border border-border/50">
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="text-sm text-muted-foreground font-bold uppercase tracking-wider block mb-0.5">Outcome</span>
                <span className="text-foreground font-medium">Generates affiliate income using AI content</span>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="text-sm text-muted-foreground font-bold uppercase tracking-wider block mb-0.5">Best For</span>
                <span className="text-foreground font-medium">Beginners starting affiliate marketing</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Content */}
        <div className="w-full md:w-80 flex flex-col gap-6 shrink-0 bg-background/80 p-6 rounded-2xl border border-border/50 shadow-inner">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground font-bold uppercase tracking-wider mb-3">
              <Clock className="w-4 h-4" /> Commitment
            </div>
            <div className="bg-secondary/20 text-secondary-foreground font-semibold px-4 py-2.5 rounded-xl border border-secondary/20 text-center">
              Beginner • 2–4 Hours Setup
            </div>
          </div>

          <div>
            <div className="text-sm text-muted-foreground font-bold uppercase tracking-wider mb-3">
              Tools Preview
            </div>
            <div className="flex flex-wrap gap-2">
              {['Magai', 'Pollo AI', 'Make.com'].map(tool => (
                <span key={tool} className="bg-card border border-border px-3 py-1.5 rounded-lg text-sm font-medium text-foreground shadow-sm">
                  {tool}
                </span>
              ))}
            </div>
          </div>

          <Link 
            to="/blueprint/ai-affiliate-content-engine" 
            className="w-full mt-2 inline-flex items-center justify-center px-6 py-4 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-[0_0_20px_hsl(var(--primary)/0.4)] group"
          >
            View System Setup <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

      </div>
    </motion.div>
  );
};

export default RecommendedSystemCard;