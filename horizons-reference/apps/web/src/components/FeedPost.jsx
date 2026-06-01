import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const FeedPost = ({ post }) => {
  const getPostTypeBadge = (type) => {
    switch(type) {
      case 'system_drop': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-600/10 text-blue-500 border border-blue-600/20 text-[10px] font-extrabold uppercase tracking-wider">System Drop</span>;
      case 'tool_drop': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-extrabold uppercase tracking-wider">Tool Drop</span>;
      case 'update': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-700/10 text-blue-600 border border-blue-700/20 text-[10px] font-extrabold uppercase tracking-wider">Update</span>;
      case 'insight': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-400/10 text-blue-300 border border-blue-400/20 text-[10px] font-extrabold uppercase tracking-wider">Insight</span>;
      default: return null;
    }
  };

  return (
    <article className="group bg-card border border-border rounded-2xl overflow-hidden hover:bg-card/80 hover:border-primary/30 transition-all duration-300 mb-6 flex flex-col">
      {/* Image Banner */}
      {post.image_url && (
        <div className="w-full h-40 sm:h-48 overflow-hidden relative bg-black/50 border-b border-border">
          <img 
            src={post.image_url} 
            alt={post.title} 
            className="w-full h-full object-cover object-center transform transition-transform duration-700 group-hover:scale-105 opacity-90 group-hover:opacity-100"
            loading="lazy"
          />
        </div>
      )}

      <div className="p-5 sm:p-6 flex flex-col flex-1">
        <div className="flex items-center gap-3 mb-3">
          {getPostTypeBadge(post.post_type)}
          <span className="text-xs font-medium text-muted-foreground">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </span>
        </div>

        <h3 className="text-lg sm:text-xl font-bold text-foreground leading-snug mb-2 group-hover:text-primary transition-colors duration-300 text-balance">
          {post.title}
        </h3>

        <p className="text-sm text-muted-foreground leading-relaxed mb-5 line-clamp-3">
          {post.description}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-3 pt-2">
          {post.primary_cta_text && post.primary_cta_link && (
            <Link 
              to={post.primary_cta_link}
              className="bg-primary/10 text-primary font-bold px-4 py-2 rounded-full hover:bg-primary hover:text-primary-foreground active:scale-95 transition-all flex items-center gap-2 text-sm border border-primary/20 hover:border-transparent"
            >
              {post.primary_cta_text} <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          )}
          {post.secondary_cta_text && post.secondary_cta_link && (
            <Link 
              to={post.secondary_cta_link}
              className="text-muted-foreground hover:text-foreground font-medium px-2 py-2 transition-colors flex items-center gap-1 text-sm"
            >
              {post.secondary_cta_text} <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
};

export default FeedPost;