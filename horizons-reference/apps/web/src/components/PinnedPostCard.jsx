import React from 'react';
import { Link } from 'react-router-dom';
import { Pin, ArrowUpRight, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const PinnedPostCard = ({ post }) => {
  const getPostTypeBadge = (type) => {
    switch(type) {
      case 'system_drop': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-600/10 text-blue-500 border border-blue-600/20 text-[10px] font-extrabold uppercase tracking-wider"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div> System Drop</span>;
      case 'tool_drop': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-extrabold uppercase tracking-wider"><div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></div> Tool Drop</span>;
      case 'update': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-700/10 text-blue-600 border border-blue-700/20 text-[10px] font-extrabold uppercase tracking-wider"><div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></div> Update</span>;
      case 'insight': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-400/10 text-blue-300 border border-blue-400/20 text-[10px] font-extrabold uppercase tracking-wider"><div className="w-1.5 h-1.5 rounded-full bg-blue-300 animate-pulse"></div> Insight</span>;
      default: return null;
    }
  };

  return (
    <article className="relative group bg-card/60 backdrop-blur-md border border-primary/30 rounded-2xl overflow-hidden shadow-[0_0_20px_hsl(var(--primary)/0.1)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.2)] transition-all duration-500 mb-6 flex flex-col">
      {/* Top Glow Accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-80"></div>
      
      {/* Pinned Indicator */}
      <div className="absolute top-4 right-4 z-20 bg-background/80 backdrop-blur-md border border-primary/30 text-primary px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold shadow-[0_0_15px_hsl(var(--primary)/0.2)]">
        <Pin className="w-3.5 h-3.5 fill-primary/20" /> Pinned
      </div>

      {/* Image Banner */}
      {post.image_url && (
        <div className="w-full h-48 sm:h-56 overflow-hidden relative bg-black/50 border-b border-border">
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent z-10"></div>
          <img 
            src={post.image_url} 
            alt={post.title} 
            className="w-full h-full object-cover object-center transform transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      )}

      <div className="p-5 sm:p-6 flex flex-col flex-1 relative z-20">
        <div className="flex items-center gap-3 mb-3">
          {getPostTypeBadge(post.post_type)}
          <span className="text-xs font-medium text-muted-foreground">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </span>
        </div>

        <h3 className="text-xl sm:text-2xl font-extrabold text-foreground leading-tight mb-3 group-hover:text-primary transition-colors duration-300 text-balance">
          {post.title}
        </h3>

        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-6 line-clamp-3">
          {post.description}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-3 pt-2">
          {post.primary_cta_text && post.primary_cta_link && (
            <Link 
              to={post.primary_cta_link}
              className="bg-primary text-primary-foreground font-bold px-5 py-2.5 rounded-full hover:bg-blue-700 shadow-[0_0_15px_hsl(var(--primary)/0.2)] hover:shadow-[0_0_25px_hsl(var(--primary)/0.4)] active:scale-95 transition-all flex items-center gap-2 text-sm"
            >
              {post.primary_cta_text} <ArrowUpRight className="w-4 h-4" />
            </Link>
          )}
          {post.secondary_cta_text && post.secondary_cta_link && (
            <Link 
              to={post.secondary_cta_link}
              className="bg-secondary/50 border border-border text-foreground font-bold px-5 py-2.5 rounded-full hover:bg-secondary active:scale-95 transition-all flex items-center gap-2 text-sm"
            >
              {post.secondary_cta_text} <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
};

export default PinnedPostCard;