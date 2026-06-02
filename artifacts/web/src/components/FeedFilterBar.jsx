import React from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';

const FILTERS = ['For You', 'Following', 'All', 'AI Tools', 'Systems', 'Updates', 'New Releases', 'Community', 'My Activity'];

const FeedFilterBar = ({ activeFilter, onFilterChange, searchQuery, onSearchChange }) => {
  return (
    <div className="sticky top-[88px] md:top-[96px] z-30 w-full bg-background/90 backdrop-blur-xl border-b border-white/5 py-2 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar w-full md:w-auto pb-1 md:pb-0">
          {FILTERS.map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => onFilterChange(filter)}
                className={`relative px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 outline-none ${
                  isActive ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="feedFilterTab"
                    className="absolute inset-0 bg-primary border border-primary/50 rounded-full shadow-[0_0_10px_hsl(var(--primary)/0.4)]"
                    initial={false}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10">{filter}</span>
              </button>
            );
          })}
        </div>
        
        <div className="relative w-full md:w-64 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search feed..."
            className="w-full bg-card border border-white/10 rounded-full pl-9 pr-4 py-1.5 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
          />
        </div>
      </div>
    </div>
  );
};

export default FeedFilterBar;