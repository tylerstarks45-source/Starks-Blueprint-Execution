
import React from 'react';
import { motion } from 'framer-motion';
import { Bell, Plus, Flame } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';

const AIFeedHeroSection = ({ onOpenComposer }) => {
  const { currentUser } = useAuth();

  return (
    <div className="sticky top-16 z-40 backdrop-blur-2xl border-b border-white/10 overflow-hidden">
      <div className="absolute inset-0 bg-grid-neon opacity-20 pointer-events-none mix-blend-screen" />
      <div className="absolute top-0 right-1/4 w-64 h-64 bg-secondary/20 blur-[100px] pointer-events-none rounded-full" />
      <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-primary/20 blur-[100px] pointer-events-none rounded-full" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 relative z-10 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2 [text-shadow:_0_2px_10px_rgb(0_0_0_/_80%)]">
            AI Feed <span className="w-2 h-2 rounded-full bg-accent animate-pulse shadow-[0_0_10px_hsl(var(--accent))]" />
          </h1>
          <p className="text-xs md:text-sm text-zinc-200 font-mono font-bold uppercase tracking-wider mt-1 hidden sm:block [text-shadow:_0_2px_8px_rgb(0_0_0_/_80%)]">
            Live • Real-time AI tools, systems, updates & community wins
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {currentUser && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/60 backdrop-blur-md border border-white/20 shadow-lg">
              <Flame className="w-4 h-4 text-accent drop-shadow-md" />
              <span className="text-xs font-bold text-white drop-shadow-md">3-Day Streak</span>
              <span className="text-xs text-zinc-300 font-bold border-l border-white/20 pl-2 ml-1 drop-shadow-md">+50 pts</span>
            </div>
          )}
          
          <button className="relative p-2 rounded-full hover:bg-white/20 transition-colors text-white drop-shadow-md">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full shadow-[0_0_5px_hsl(var(--accent))]" />
          </button>
          
          <button onClick={onOpenComposer} className="saas-button hidden sm:flex py-2 px-4 text-sm shadow-[0_0_15px_hsl(var(--primary)/0.4)]">
            <Plus className="w-4 h-4 mr-2" /> Post Now
          </button>
          
          <button onClick={onOpenComposer} className="w-10 h-10 bg-primary/40 backdrop-blur-md text-white border border-primary/60 rounded-full flex items-center justify-center shadow-[0_0_15px_hsl(var(--primary)/0.5)] sm:hidden">
            <Plus className="w-5 h-5 drop-shadow-md" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIFeedHeroSection;
