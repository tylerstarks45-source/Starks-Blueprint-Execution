
import React from 'react';
import { Search, ShieldCheck, CheckCircle2, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const QUICK_FILTERS = ['Make Money', 'Automation', 'Content Creation', 'Marketing', 'Business'];

const MarketplaceHeroSection = ({ searchTerm, onSearchChange, onQuickFilter, onExploreSystems }) => {
  return (
    <section className="relative min-h-[65dvh] flex flex-col items-center justify-center overflow-hidden bg-background pt-24 pb-20">
      {/* Background Image - No Dark Overlays */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1642132652866-6fa262d3161f?auto=format&fit=crop&q=80&w=2000" 
          alt="Abstract dark futuristic neural network" 
          className="w-full h-full object-cover object-center"
          loading="lazy"
        />
      </div>

      <div className="relative z-20 container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-4xl mx-auto"
        >
          {/* Trust Badges */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 border border-white/20 text-xs font-bold text-white backdrop-blur-md shadow-lg">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 drop-shadow-md" /> Tested Tools
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 border border-white/20 text-xs font-bold text-white backdrop-blur-md shadow-lg">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 drop-shadow-md" /> Verified Systems
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 border border-white/20 text-xs font-bold text-white backdrop-blur-md shadow-lg">
              <Zap className="w-3.5 h-3.5 text-orange-400 drop-shadow-md" /> Real Workflows
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white leading-tight mb-6 text-balance [text-shadow:_0_4px_24px_rgb(0_0_0_/_100%),_0_2px_8px_rgb(0_0_0_/_80%)]">
            Discover AI Tools That Actually Work in <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">Real Systems</span>
          </h1>
          
          <p className="text-lg md:text-xl text-zinc-100 max-w-2xl mx-auto mb-10 font-semibold leading-relaxed [text-shadow:_0_4px_16px_rgb(0_0_0_/_100%),_0_2px_4px_rgb(0_0_0_/_80%)]">
            Stop guessing which tools to use. Explore our curated marketplace of tested software, pre-built automations, and complete business blueprints.
          </p>

          {/* Search Bar */}
          <div className="w-full max-w-2xl mx-auto mb-8 relative group">
            <div className="relative flex items-center bg-card/60 backdrop-blur-xl border-2 border-white/20 rounded-2xl p-2 shadow-2xl focus-within:border-primary/80 transition-colors">
              <div className="pl-4 pr-2">
                <Search className="w-6 h-6 text-white drop-shadow-md group-focus-within:text-primary transition-colors" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search tools, systems, or categories..."
                className="w-full bg-transparent border-none text-white placeholder:text-zinc-300 text-lg font-medium focus:ring-0 px-2 py-3 drop-shadow-md"
              />
              <button className="hidden sm:block saas-button px-8 py-3 shrink-0 ml-2 shadow-xl">
                Search
              </button>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            <span className="text-sm font-bold text-white mr-2 hidden sm:inline-block [text-shadow:_0_2px_8px_rgb(0_0_0_/_100%)]">Quick searches:</span>
            {QUICK_FILTERS.map((filter) => (
              <button
                key={filter}
                onClick={() => onQuickFilter(filter)}
                className="text-xs sm:text-sm font-bold bg-black/40 hover:bg-primary/40 text-white border border-white/20 hover:border-primary/60 px-4 py-2 rounded-full backdrop-blur-md transition-all duration-300 shadow-lg [text-shadow:_0_2px_4px_rgb(0_0_0_/_80%)]"
              >
                {filter}
              </button>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={onExploreSystems} className="w-full sm:w-auto saas-button text-lg px-8 py-4 shadow-2xl">
              Explore Systems
            </button>
            <button onClick={() => onQuickFilter('Beginner')} className="w-full sm:w-auto saas-button-secondary bg-black/40 backdrop-blur-md text-white border-white/20 text-lg px-8 py-4 shadow-2xl [text-shadow:_0_2px_4px_rgb(0_0_0_/_80%)]">
              Start With Beginner Tools
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default MarketplaceHeroSection;
