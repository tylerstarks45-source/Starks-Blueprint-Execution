import React from 'react';
import { ExternalLink, Star, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';

const HomeProductCard = ({ tool, featured, homepageImage }) => {
  if (!tool) return null;

  const displayImage = homepageImage || tool.image;
  
  // Fallbacks for new fields to ensure backward compatibility
  const shortHeadline = tool.shortOutcomeHeadline || tool.description?.substring(0, 60) + '...';
  const description = tool.description || 'Automate workflows and scale your business operations.';
  const benefits = tool.keyBenefits || tool.key_features || tool.use_cases || ['Automate workflows', 'Save time & money', 'Scale operations'];
  const tags = tool.tags || tool.use_cases?.slice(0, 3) || ['Automation', 'Growth'];
  const usedInSystemsText = tool.usedInSystems || "Part of proven automation systems on this platform";

  return (
    <div className="group flex flex-col h-full bg-card-gradient border border-white/10 rounded-[16px] overflow-hidden hover-glow relative transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10">
      {/* Image Section */}
      {displayImage && (
        <div className="w-full h-48 overflow-hidden relative border-b border-white/5 shrink-0 bg-muted">
          <div className="absolute inset-0 bg-primary/10 mix-blend-overlay z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <img
            src={displayImage}
            alt={`${tool.name} - ${tool.category || 'AI Tool'}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            loading="lazy"
          />
          
          {/* Badges over image */}
          <div className="absolute top-3 left-3 z-20 flex gap-2">
            <span className="px-2.5 py-1 bg-black/70 backdrop-blur-md border border-white/10 rounded-md text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
              {tool.category || 'Software'}
            </span>
          </div>
          
          {(featured || tool.popularity) && (
            <div className="absolute top-3 right-3 z-20 flex items-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground rounded-md text-xs font-bold shadow-lg">
              <Star className="w-3 h-3 fill-current" />
              {tool.popularity ? `${tool.popularity}/100` : 'Featured'}
            </div>
          )}
        </div>
      )}

      {/* Content Section */}
      <div className="p-6 flex flex-col flex-grow">
        <h3 className="text-2xl font-bold text-white mb-1 group-hover:text-primary transition-colors">
          {tool.name}
        </h3>
        
        {shortHeadline && (
          <p className="text-sm font-semibold text-primary mb-3 leading-snug">
            {shortHeadline}
          </p>
        )}

        <p className="text-sm text-zinc-300 line-clamp-2 leading-relaxed mb-4">
          {description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {tags.slice(0, 4).map((tag, idx) => (
            <span key={idx} className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-[10px] font-medium text-zinc-300 uppercase tracking-wider">
              {tag}
            </span>
          ))}
        </div>

        {/* Highlights / Benefits */}
        <div className="mb-6 space-y-2.5">
          {benefits.slice(0, 3).map((highlight, idx) => (
            <div key={idx} className="flex items-start gap-2.5 text-sm text-zinc-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="line-clamp-2 leading-snug">{highlight}</span>
            </div>
          ))}
        </div>

        {/* Trust Line & Action Footer */}
        <div className="mt-auto pt-5 border-t border-white/5 flex flex-col gap-4">
          <div className="flex items-center gap-2.5 px-3 py-2.5 bg-white/5 rounded-lg border border-white/5">
            <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="text-xs font-medium text-zinc-300 leading-tight">
              {usedInSystemsText}
            </span>
          </div>

          {tool.affiliate_link ? (
            <a
              href={tool.affiliate_link}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-sm transition-all active:scale-[0.98] shadow-[0_0_15px_hsl(var(--primary)/0.2)] hover:shadow-[0_0_25px_hsl(var(--primary)/0.4)]"
            >
              Access Tool <ArrowRight className="w-4 h-4" />
            </a>
          ) : (
            <button disabled className="w-full py-3.5 bg-white/5 text-zinc-500 font-bold rounded-xl text-sm cursor-not-allowed opacity-50">
              Link Unavailable
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomeProductCard;