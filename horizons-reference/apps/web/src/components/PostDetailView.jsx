import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Clock, Zap, Layers, ArrowUpRight } from 'lucide-react';
import pb from '@/lib/pocketbaseClient.js';
import { Link } from 'react-router-dom';
import CommentThread from './CommentThread.jsx';

const PostDetailView = ({ post, author, onClose }) => {
  useEffect(() => {
    // Lock body scroll
    document.body.style.overflow = 'hidden';
    return () => document.body.style.overflow = 'auto';
  }, []);

  const renderVideo = (url) => {
    if (!url) return null;
    let embedUrl = url;
    
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.split('v=')[1]?.split('&')[0] || url.split('youtu.be/')[1];
      if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`;
    } else if (url.includes('vimeo.com')) {
      const videoId = url.split('vimeo.com/')[1];
      if (videoId) embedUrl = `https://player.vimeo.com/video/${videoId}?autoplay=1&muted=1`;
    } else if (url.endsWith('.mp4')) {
      return (
         <video src={url} controls autoPlay muted className="w-full h-auto max-h-[70vh] rounded-xl border border-white/10" />
      );
    }

    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-black mb-8">
        <iframe
          src={embedUrl}
          title={post.title}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-background/95 backdrop-blur-md overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="w-full max-w-4xl min-h-screen bg-card border-x border-white/5 relative flex flex-col"
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-xl border-b border-white/5 shadow-sm">
          <div className="font-bold text-lg text-foreground truncate mr-4">Post Thread</div>
          <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors shrink-0 group">
            <X className="w-6 h-6 text-muted-foreground group-hover:text-foreground" />
          </button>
        </div>

        <div className="flex-1 p-6 md:p-10">
          {/* Post Header */}
          <header className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center text-primary text-xl font-bold border border-primary/30 shadow-[0_0_15px_hsl(var(--primary)/0.2)]">
                {author?.name ? author.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <h3 className="font-bold text-foreground text-lg">{author?.name || 'Anonymous User'}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-block px-2.5 py-0.5 bg-primary/10 text-primary text-xs font-mono uppercase tracking-widest rounded border border-primary/20">
                    {post.category || 'Update'}
                  </span>
                  <span className="text-muted-foreground text-sm flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(post.created_at || post.created).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-extrabold text-foreground leading-tight tracking-tight mb-6">
              {post.title}
            </h1>
          </header>

          {/* Media */}
          {post.video_url ? (
            renderVideo(post.video_url)
          ) : post.image_url ? (
            <div className="mb-8 rounded-xl overflow-hidden border border-white/5 shadow-2xl bg-black">
              <img 
                src={post.image_url} 
                alt={post.title} 
                className="w-full h-auto max-h-[70vh] object-contain"
              />
            </div>
          ) : null}

          {/* Content */}
          <article className="prose prose-invert prose-lg max-w-none prose-headings:text-foreground prose-headings:font-bold prose-p:text-foreground/90 prose-p:leading-relaxed prose-a:text-primary hover:prose-a:text-primary/80 mb-12">
            <div className="whitespace-pre-wrap">{post.long_form_content || post.short_text}</div>
          </article>

          {/* Strategic CTAs */}
          {(post.related_blueprint_id || (post.related_tool_ids && post.related_tool_ids.length > 0)) && (
            <div className="border-t border-white/5 pt-10 mt-10">
              <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" /> Referenced Assets
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {post.related_blueprint_id && (
                  <Link 
                    to={`/system/${post.related_blueprint_id}`}
                    onClick={onClose}
                    className="glass-card p-6 rounded-xl group border-primary/20 hover:border-primary/50"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Zap className="w-5 h-5" />
                    </div>
                    <h4 className="text-base font-bold text-foreground mb-2">View Blueprint</h4>
                    <p className="text-sm text-muted-foreground mb-4">Access the architecture discussed in this post.</p>
                    <span className="text-sm font-bold text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                      Open Architecture <ArrowUpRight className="w-4 h-4" />
                    </span>
                  </Link>
                )}
                
                {post.related_tool_ids && post.related_tool_ids.length > 0 && (
                  <Link 
                    to="/marketplace"
                    onClick={onClose}
                    className="glass-card p-6 rounded-xl group border-accent/20 hover:border-accent/50"
                  >
                    <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Layers className="w-5 h-5" />
                    </div>
                    <h4 className="text-base font-bold text-foreground mb-2">Procure Tools</h4>
                    <p className="text-sm text-muted-foreground mb-4">View the software stack mentioned here.</p>
                    <span className="text-sm font-bold text-accent flex items-center gap-1 group-hover:gap-2 transition-all">
                      Open Marketplace <ArrowUpRight className="w-4 h-4" />
                    </span>
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Comments */}
          <CommentThread postId={post.id} />
        </div>
      </motion.div>
    </div>
  );
};

export default PostDetailView;