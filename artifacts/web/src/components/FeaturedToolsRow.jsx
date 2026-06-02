import React from 'react';
import ProductCard from './ProductCard.jsx';
import { Flame } from 'lucide-react';

const FeaturedToolsRow = ({ tools, compareMode, selectedForCompare, onToggleCompare }) => {
  if (!tools || tools.length === 0) return null;

  return (
    <div className="mb-16">
      <div className="flex items-center gap-3 mb-8">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <Flame className="w-5 h-5 text-orange-500" />
        </div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">Best Tools to Start With</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {tools.slice(0, 3).map(tool => (
          <ProductCard 
            key={tool.id} 
            product={tool} 
            featured={true} 
            compareMode={compareMode}
            isSelectedForCompare={selectedForCompare.some(t => t.id === tool.id)}
            onToggleCompare={onToggleCompare}
          />
        ))}
      </div>
    </div>
  );
};

export default FeaturedToolsRow;