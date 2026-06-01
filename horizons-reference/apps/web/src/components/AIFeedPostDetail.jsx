import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, MoreHorizontal, ShieldCheck, PlayCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import pb from '@/lib/pocketbaseClient.js';
import AIFeedEngagementBar from './AIFeedEngagementBar.jsx';
import CommentThread from './CommentThread.jsx';

const AIFeedPostDetail = ({ post, author, onClose }) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => document.body.style.overflow = 'auto';
  }, []);

  const timeAgo = post.created ? formatDistanceToNow(new Date(post.created), { addSuffix: true }) : 'Recently';

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/80 backdrop-blur-sm overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
        className="w-full max-w-[600px] min-h-screen bg-background border-x border-white/10 flex flex-col"
      >
        <div className="sticky top-0 z-20 flex items-center px-4 py-3 bg-background/80 backdrop-blur-xl border-b border-white/10">
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors mr-4">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="font-bold text-xl text-foreground">Post</div>
        </div>

        <div className="flex-1 p-4 md:p-6 overflow-y-auto hide-scrollbar">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                {author?.name ? author.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <div className="flex items-center gap-1 font-bold text-foreground">
                  {author?.name || 'Anonymous'}
                  {post.is_official && <ShieldCheck className="w-4 h-4 text-primary" />}
                </div>
                <div className="text-muted-foreground text-sm">
                  @{author?.username || author?.name?.toLowerCase().replace(/\s+/g, '') || 'user'}
                </div>
              </div>
            </div>
            <button className="text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-white/5 rounded-full">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>

          <div className="text-lg text-foreground whitespace-pre-wrap leading-relaxed mb-4">
            {post.short_text}
          </div>

          {(post.image_url || post.video_url) && (
            <div className="mb-4 rounded-xl overflow-hidden border border-white/10 bg-white/5 relative">
              {post.image_url && <img src={post.image_url} alt="Post media" className="w-full h-auto max-h-[60vh] object-cover" />}
              {post.video_url && !post.image_url && (
                <div className="aspect-video flex items-center justify-center relative">
                  <PlayCircle className="w-16 h-16 text-primary absolute opacity-80" />
                  <div className="text-sm text-muted-foreground mt-20">Video Content</div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 pb-4 border-b border-white/10">
            <span>{timeAgo}</span>
            <span>•</span>
            <span><strong className="text-foreground">{post.views_count || 0}</strong> Views</span>
          </div>

          <div className="py-2 border-b border-white/10 mb-4">
            <AIFeedEngagementBar post={post} />
          </div>

          <CommentThread postId={post.id} />
        </div>
      </motion.div>
    </div>
  );
};

export default AIFeedPostDetail;