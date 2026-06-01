import React from 'react';
import { motion } from 'framer-motion';

const FILTERS = [
  'All',
  'AI Tools',
  'Systems & Blueprints',
  'Platform Updates',
  'New Releases',
  'Community Tips',
  'My Posts'
];

const FilterBar = ({ activeFilter, onFilterChange }) => {
  return (
    <div className="sticky top-[80px] md:top-[88px] z-30 w-full bg-background/80 backdrop-blur-xl border-b border-white/5 py-3 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1 -mb-1">
          {FILTERS.map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => onFilterChange(filter)}
                className={`relative px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 outline-none ${
                  isActive 
                    ? 'text-primary-foreground' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="feedActiveFilter"
                    className="absolute inset-0 bg-primary/20 border border-primary/50 rounded-full shadow-[0_0_15px_hsl(var(--primary)/0.3)]"
                    initial={false}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10">{filter}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FilterBar;