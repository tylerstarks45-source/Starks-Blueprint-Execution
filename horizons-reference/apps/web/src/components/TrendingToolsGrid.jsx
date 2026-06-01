import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import HomeProductCard from './HomeProductCard.jsx';
import { productsData as toolsData } from '@/data/ProductsData.js';
import { applyCategoryDiversity, getCategoryWeight } from '@/lib/toolUtils.js';

const TRENDING_SECTION_IMAGES = [
  'https://images.unsplash.com/photo-1533750446969-255bbf191920',
  'https://images.unsplash.com/photo-1701673965151-75b3b70d6807',
  'https://images.unsplash.com/photo-1634084462412-b54873c0a56d',
  'https://images.unsplash.com/photo-1642132652866-6fa262d3161f'
];

const getMappedImage = (category, id, index) => {
  return TRENDING_SECTION_IMAGES[index % TRENDING_SECTION_IMAGES.length];
};

const TrendingToolsGrid = ({ filteredGoal }) => {
  const trendingTools = useMemo(() => {
    try {
      if (!toolsData || !Array.isArray(toolsData)) return [];
      
      let sortedTools = [...toolsData].sort((a, b) => {
        const popA = a.popularity || getCategoryWeight(a.category);
        const popB = b.popularity || getCategoryWeight(b.category);
        return popB - popA;
      });
      
      if (filteredGoal) {
        const goalLower = filteredGoal.toLowerCase();
        sortedTools = sortedTools.filter(tool => 
          (tool.system_tags && tool.system_tags.some(tag => tag.toLowerCase().includes(goalLower))) ||
          (tool.category && tool.category.toLowerCase().includes(goalLower)) ||
          (tool.description && tool.description.toLowerCase().includes(goalLower))
        );
      }
      
      const baseTools = sortedTools.length >= 3 ? sortedTools : toolsData;
      return applyCategoryDiversity(baseTools, 2, 6);
    } catch (error) {
      console.error("Error processing trending tools:", error);
      return [];
    }
  }, [filteredGoal]);

  if (!trendingTools || trendingTools.length === 0) {
    return null;
  }

  return (
    <section className="py-24 bg-background relative border-b border-white/5">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl relative z-10">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-accent/10 text-accent border border-accent/20 text-sm font-bold uppercase tracking-wider shadow-sm">
              <TrendingUp className="w-4 h-4" /> Market Leaders
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4 text-white">Most Used Tools</h2>
            <p className="text-lg text-zinc-400 font-medium mb-3">
              Trending based on real usage and system integrations.
            </p>
            <div className="inline-flex items-center gap-2 text-primary font-semibold text-sm bg-primary/5 px-3 py-1 rounded-md mt-2">
              <Sparkles className="w-4 h-4" /> New tools added weekly
            </div>
          </div>
          <Link to="/marketplace" className="saas-button-secondary shrink-0 hidden md:flex bg-white/5 border-white/10 text-white hover:bg-white/10">
            Explore Marketplace <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {trendingTools.map((tool, index) => (
            <div key={tool.id} className="h-full">
              <HomeProductCard 
                tool={tool} 
                featured={false} 
                homepageImage={getMappedImage(tool.category, tool.id, index)} 
              />
            </div>
          ))}
        </div>

        <div className="mt-12 flex justify-center md:hidden">
          <Link to="/marketplace" className="saas-button-secondary w-full bg-white/5 border-white/10 text-white">
            Explore Marketplace <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default TrendingToolsGrid;