import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, PlayCircle, Star } from 'lucide-react';

const PostCard = ({ post }) => {
  const hasVideo = !!post.video_url;
  
  return (
    <Link 
      to={`/dashboard/ai-feed/${post.slug}`}
      className="glass-panel rounded-2xl overflow-hidden flex flex-col h-full hover:border-primary/50 group bg-card"
    >
      {/* Media Thumbnail */}
      <div className="relative w-full aspect-[16/9] bg-muted overflow-hidden shrink-0">
        {post.image_url ? (
          <img 
            src={post.image_url} 
            alt={post.title} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-background">
            <span className="text-4xl font-bold text-muted-foreground/20">{post.category?.charAt(0) || 'AI'}</span>
          </div>
        )}
        
        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-60" />
        
        {hasVideo && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-foreground shadow-lg group-hover:scale-110 transition-transform">
              <PlayCircle className="w-6 h-6" />
            </div>
          </div>
        )}
        
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="px-2.5 py-1 bg-background/80 backdrop-blur-md border border-border/50 text-xs font-semibold rounded-md text-foreground">
            {post.category}
          </span>
          {post.featured && (
            <span className="px-2.5 py-1 bg-primary/20 backdrop-blur-md border border-primary/30 text-primary text-xs font-semibold rounded-md flex items-center gap-1">
              <Star className="w-3 h-3 fill-current" /> Featured
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {post.title}
        </h3>
        <p className="text-sm text-muted-foreground font-medium line-clamp-3 mb-4 flex-grow">
          {post.short_text}
        </p>
        
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
          <span className="text-xs text-muted-foreground font-mono">
            {new Date(post.created).toLocaleDateString()}
          </span>
          <span className="text-sm font-bold text-primary flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            Read More <ArrowRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    </Link>
  );
};

export default PostCard;