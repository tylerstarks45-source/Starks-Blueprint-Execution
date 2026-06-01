import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Star } from 'lucide-react';

const ToolCard = ({ tool, featured, homepageImage }) => {
  if (!tool) return null;

  return (
    <div className="group flex flex-col h-full bg-card-gradient border border-white/10 rounded-[16px] overflow-hidden hover-glow relative">
      {featured && (
        <div className="absolute top-4 right-4 text-primary bg-primary/10 p-1.5 rounded-full shadow-[0_0_15px_hsl(var(--primary)/0.3)] z-20">
          <Star className="w-4 h-4 fill-primary" />
        </div>
      )}
      
      {homepageImage && (
        <div className="w-full h-48 overflow-hidden relative border-b border-white/5 shrink-0 bg-muted">
          <div className="absolute inset-0 bg-primary/10 mix-blend-overlay z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <img 
            src={homepageImage} 
            alt={`${tool.name} - ${tool.category || 'AI Tool'}`} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            loading="lazy"
          />
        </div>
      )}

      <div className="p-6 flex flex-col flex-grow">
        <div className="mb-4">
          <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider mb-2 block">
            {tool.category || 'Tool'}
          </span>
          <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary transition-colors">
            {tool.name}
          </h3>
          <p className="text-sm text-zinc-400 line-clamp-3 leading-relaxed">
            {tool.description}
          </p>
        </div>

        <div className="mt-auto pt-6 flex flex-col gap-3">
          <Link 
            to={`/tool/${tool.id}`}
            className="w-full text-center py-2.5 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl text-sm border border-white/10 transition-colors"
          >
            View Details
          </Link>
          
          {tool.affiliate_link && (
            <a 
              href={tool.affiliate_link}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full text-center py-2.5 bg-primary/10 hover:bg-primary/20 text-primary font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
            >
              Access Tool <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default ToolCard;