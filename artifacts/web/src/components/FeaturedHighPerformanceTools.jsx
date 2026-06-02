import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Star, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import HomeProductCard from './HomeProductCard.jsx';
import { productsData as toolsData } from '@/data/ProductsData.js';
import { applyCategoryDiversity } from '@/lib/toolUtils.js';

const FEATURED_SECTION_IMAGES = [
  'https://images.unsplash.com/photo-1678995635432-d9e89c7a8fc5',
  'https://images.unsplash.com/photo-1676573411058-8054a4d2bc10',
  'https://images.unsplash.com/photo-1680489880375-243dc8c15eeb'
];

const getMappedImage = (category, id, index) => {
  return FEATURED_SECTION_IMAGES[index % FEATURED_SECTION_IMAGES.length];
};

const FeaturedHighPerformanceTools = ({
  filteredGoal
}) => {
  const featuredTools = useMemo(() => {
    try {
      if (!toolsData || !Array.isArray(toolsData)) return [];
      let filtered = toolsData.filter(tool => tool.isFeatured === true || tool.system_tags && tool.system_tags.length > 0);
      if (filteredGoal) {
        const goalLower = filteredGoal.toLowerCase();
        filtered = filtered.filter(tool => tool.system_tags && tool.system_tags.some(tag => tag.toLowerCase().includes(goalLower)) || tool.category && tool.category.toLowerCase().includes(goalLower) || tool.description && tool.description.toLowerCase().includes(goalLower) || tool.core_problem && tool.core_problem.toLowerCase().includes(goalLower));
      }
      const baseTools = filtered.length >= 3 ? filtered : toolsData;
      return applyCategoryDiversity(baseTools, 2, 6);
    } catch (error) {
      console.error("Error processing featured tools:", error);
      return [];
    }
  }, [filteredGoal]);

  if (!featuredTools || featuredTools.length === 0) {
    return <section className="py-24 bg-gradient-dark border-b border-white/5" id="tools-section">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex flex-col items-center text-center mb-16">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Loading tools...</h2>
          </div>
        </div>
      </section>;
  }

  return <section className="py-24 relative bg-gradient-dark border-y border-white/5" id="tools-section">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-primary/10 text-primary border border-primary/20 text-sm font-bold uppercase tracking-wider">
              <Star className="w-4 h-4" /> Premium Selection
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4 text-white">These Are Some Of The Exact Tools Used Inside Our Systems</h2>
            <p className="text-lg text-zinc-400 font-medium mb-3">
              {filteredGoal ? `Showing the best tools specifically curated for: ${filteredGoal}` : 'Every tool below is used inside real automation systems — no guesswork.'}
            </p>
            <div className="inline-flex items-center gap-2 text-primary font-semibold text-sm bg-primary/5 px-3 py-1 rounded-md mt-2">
              <Sparkles className="w-4 h-4" /> New tools added weekly
            </div>
          </div>
          <Link to="/marketplace" className="saas-button-secondary bg-white/5 border-white/10 text-white hover:bg-white/10 shrink-0 hidden md:flex">
            View All Tools <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuredTools.map((tool, index) => <div key={tool.id} className="h-full">
              <HomeProductCard tool={tool} featured={true} homepageImage={getMappedImage(tool.category, tool.id, index)} />
            </div>)}
        </div>
        
        <div className="mt-12 flex justify-center md:hidden">
          <Link to="/marketplace" className="saas-button-secondary w-full bg-white/5 border-white/10 text-white">
            View All Tools <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </div>
    </section>;
};

export default FeaturedHighPerformanceTools;