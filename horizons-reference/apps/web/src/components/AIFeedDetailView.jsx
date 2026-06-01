import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Clock, ShieldCheck, Eye, Flag } from 'lucide-react';
import CommentThread from './CommentThread.jsx';

const AIFeedDetailView = ({ post, author, onClose }) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => document.body.style.overflow = 'auto';
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-background/95 backdrop-blur-md overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
        className="w-full max-w-3xl min-h-screen bg-card border-x border-white/5 relative flex flex-col"
      >
        <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-xl border-b border-white/5">
          <div className="font-bold text-lg text-foreground">Post Detail</div>
          <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 p-6 md:p-8">
          <header className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary text-lg font-bold border border-primary/30">
                  {author?.name ? author.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <h3 className="font-bold text-foreground flex items-center gap-1">
                    {author?.name || 'Anonymous'} {post.is_official && <ShieldCheck className="w-4 h-4 text-primary" />}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" /> {new Date(post.created).toLocaleDateString()}
                    <span>•</span>
                    <span className="text-primary font-mono uppercase">{post.category}</span>
                  </div>
                </div>
              </div>
              <button className="text-muted-foreground hover:text-destructive transition-colors" title="Report Post">
                <Flag className="w-4 h-4" />
              </button>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-foreground mb-4">{post.title}</h1>
          </header>

          {post.image_url && (
            <div className="mb-8 rounded-xl overflow-hidden border border-white/5 bg-black">
              <img src={post.image_url} alt={post.title} className="w-full h-auto max-h-[60vh] object-contain" />
            </div>
          )}

          <article className="prose prose-invert prose-lg max-w-none mb-8">
            <div className="whitespace-pre-wrap text-foreground/90 leading-relaxed">{post.long_form_content || post.short_text}</div>
          </article>

          <div className="flex items-center gap-4 py-4 border-y border-white/5 text-sm text-muted-foreground mb-8">
            <span className="flex items-center gap-1"><Eye className="w-4 h-4" /> {post.views_count || 0} Views</span>
          </div>

          <CommentThread postId={post.id} />
        </div>
      </motion.div>
    </div>
  );
};

export default AIFeedDetailView;