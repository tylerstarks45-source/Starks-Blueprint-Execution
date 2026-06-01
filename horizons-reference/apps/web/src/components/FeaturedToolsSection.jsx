import React from 'react';
import ProductCard from './ProductCard.jsx';
import { Flame, Star } from 'lucide-react';

const FEATURED_BADGES = [
  ['Beginner-friendly', 'Fast Setup'],
  ['Popular Choice', 'High ROI'],
  ['Industry Standard', 'Verified'],
  ['Agency Favorite']
];

const FeaturedToolsSection = ({ tools }) => {
  if (!tools || tools.length === 0) return null;

  // Take up to 3 featured tools to ensure they fit nicely in a row
  const displayTools = tools.slice(0, 3).map((tool, idx) => ({
    ...tool,
    custom_badges: FEATURED_BADGES[idx % FEATURED_BADGES.length]
  }));

  return (
    <div className="mb-20">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <Flame className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-foreground flex items-center gap-2">
              Best Tools to Start With
            </h2>
            <p className="text-muted-foreground text-sm font-medium mt-1">
              Highly recommended tools for immediate impact.
            </p>
          </div>
        </div>
        
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-xs font-bold text-primary">
          <Star className="w-3.5 h-3.5 fill-current" /> Premium Selection
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {displayTools.map(tool => (
          <ProductCard 
            key={`featured-${tool.id}`} 
            product={tool} 
            featured={true} 
          />
        ))}
      </div>
    </div>
  );
};

export default FeaturedToolsSection;