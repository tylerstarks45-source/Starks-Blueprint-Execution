import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import HomeProductCard from './HomeProductCard.jsx';
import { productsData as toolsData } from '@/data/ProductsData.js';

const RECOMMENDED_SECTION_IMAGES = [
  'https://images.unsplash.com/photo-1692914274476-0e6920cc80cf',
  'https://images.unsplash.com/photo-1693917001031-13e513507793',
  'https://images.unsplash.com/photo-1608222351212-18fe0ec7b13b'
];

const getMappedImage = (category, id, index) => {
  return RECOMMENDED_SECTION_IMAGES[index % RECOMMENDED_SECTION_IMAGES.length];
};

const RecommendedForYouSection = () => {
  const recommendedTools = useMemo(() => {
    if (!toolsData || !Array.isArray(toolsData)) return [];
    // Just grab a few beginner-friendly tools
    return toolsData.filter(t => 
      t.category === 'AI Software' || 
      t.category === 'AI Content Creation' || 
      t.category === 'Website Builders'
    ).slice(0, 3);
  }, []);

  if (!recommendedTools || recommendedTools.length === 0) return null;

  return (
    <section className="py-24 bg-background relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-sm font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" /> Easy Setup
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4">👉 Beginner-Friendly Tools (Fastest Way to Start)</h2>
            <p className="text-lg text-muted-foreground font-medium">
              Low learning curve. High impact. Start here if you want to deploy your first system today.
            </p>
          </div>
          <Link to="/marketplace" className="saas-button-secondary shrink-0 hidden md:flex">
            View All <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendedTools.map((tool, index) => (
            <div key={tool.id} className="h-full">
              <HomeProductCard 
                tool={tool} 
                featured={false} 
                homepageImage={getMappedImage(tool.category, tool.id, index)} 
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RecommendedForYouSection;