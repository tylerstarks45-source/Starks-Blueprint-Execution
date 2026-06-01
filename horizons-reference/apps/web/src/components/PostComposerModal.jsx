import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Image as ImageIcon, Video, Send, Loader2, Sparkles, AlignLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient.js';
import { toast } from 'sonner';

const CATEGORIES = ['AI Tools', 'Systems', 'Automation', 'Marketing', 'Updates', 'Case Studies'];

const PostComposerModal = ({ onClose, onSuccess, initialContent = '' }) => {
  const { currentUser } = useAuth();
  const [content, setContent] = useState(initialContent);
  const [longContent, setLongContent] = useState('');
  const [showLongContent, setShowLongContent] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return toast.error("Post cannot be empty");
    if (!currentUser) return toast.error("You must be logged in to post");

    setIsSubmitting(true);
    try {
      const firstLine = content.split('\n')[0];
      const title = firstLine.length > 60 ? firstLine.substring(0, 60) + '...' : firstLine;
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now().toString().slice(-6);

      await pb.collection('ai_feed_posts').create({
        author_id: currentUser.id,
        title: title,
        slug: slug,
        short_text: content,
        long_form_content: longContent,
        category: category,
        image_url: imageUrl,
        video_url: videoUrl,
        likes_count: 0,
        comments_count: 0,
        views_count: 0,
        is_official: currentUser.role === 'admin' || category === 'Updates',
        is_pinned: false
      }, { $autoCancel: false });

      toast.success("Post published successfully");
      if (onSuccess) onSuccess();
      if (onClose) onClose();
      setContent('');
      setLongContent('');
      setImageUrl('');
      setVideoUrl('');
    } catch (err) {
      console.error(err);
      toast.error("Failed to publish post. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start pt-[8vh] justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, y: -20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-[600px] bg-card border border-white/10 shadow-2xl rounded-2xl overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <button onClick={onClose} className="p-2 text-foreground hover:bg-white/10 rounded-full transition-colors active:scale-95">
            <X className="w-5 h-5" />
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !content.trim()} 
            className="px-5 py-1.5 bg-primary text-primary-foreground font-bold rounded-full hover:bg-primary/90 hover:shadow-[0_0_15px_hsl(var(--primary)/0.4)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Post
          </button>
        </div>

        <div className="flex flex-col flex-1 p-4 overflow-y-auto max-h-[75vh] hide-scrollbar">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0 border border-primary/30">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex-1 w-full">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's happening in AI today?"
                className="w-full bg-transparent text-foreground text-xl placeholder:text-muted-foreground resize-none outline-none min-h-[100px] py-2"
                autoFocus
              />

              {showLongContent && (
                <motion.textarea
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  value={longContent}
                  onChange={(e) => setLongContent(e.target.value)}
                  placeholder="Add deep dive content, code snippets, or extended context here... (Optional)"
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-foreground text-sm placeholder:text-muted-foreground resize-y outline-none min-h-[150px] mt-2 mb-2 focus:border-primary/50 transition-colors"
                />
              )}
              
              {(imageUrl || videoUrl) && (
                <div className="mt-2 mb-4 space-y-2">
                  {imageUrl && <img src={imageUrl} alt="Preview" className="rounded-xl border border-white/10 max-h-64 object-cover w-full" />}
                  {videoUrl && <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-xs text-muted-foreground flex items-center gap-2"><Video className="w-4 h-4" /> Video attached: {videoUrl}</div>}
                </div>
              )}
            </div>
          </div>
          
          <div className="border-t border-white/10 mt-4 pt-4 flex flex-col gap-4 ml-13 pl-13">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Category</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                      category === cat 
                        ? 'bg-primary/20 text-primary border-primary/50 shadow-[0_0_10px_hsl(var(--primary)/0.2)]' 
                        : 'bg-transparent text-muted-foreground border-white/10 hover:bg-white/5 hover:text-foreground'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              <div className="flex items-center bg-black/20 border border-white/10 rounded-full px-3 py-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
                <ImageIcon className="w-4 h-4 text-muted-foreground mr-2 shrink-0" />
                <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Image URL..." className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70" />
              </div>
              <div className="flex items-center bg-black/20 border border-white/10 rounded-full px-3 py-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
                <Video className="w-4 h-4 text-muted-foreground mr-2 shrink-0" />
                <input type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Video URL..." className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70" />
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-2">
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => setShowLongContent(!showLongContent)}
                  className={`text-sm font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${showLongContent ? 'bg-white/10 text-foreground' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'}`}
                >
                  <AlignLeft className="w-4 h-4" /> {showLongContent ? '- Remove Long Form' : '+ Long Form Text'}
                </button>
              </div>
              <button type="button" className="text-primary text-sm font-medium hover:text-primary/80 flex items-center gap-1.5 transition-colors px-3 py-1.5 rounded-full hover:bg-primary/10">
                <Sparkles className="w-4 h-4" /> AI Assist
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PostComposerModal;