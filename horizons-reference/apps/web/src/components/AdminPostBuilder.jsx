import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, Save } from 'lucide-react';
import pb from '@/lib/pocketbaseClient.js';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext.jsx';

const POST_TYPES = [
  { value: 'system_drop', label: 'System Drop' },
  { value: 'tool_drop', label: 'Tool Drop' },
  { value: 'update', label: 'Platform Update' },
  { value: 'insight', label: 'Insight / Intel' }
];

const AdminPostBuilder = ({ existingPost = null, onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    post_type: 'system_drop',
    title: '',
    short_text: '',
    image_url: '',
    video_url: '',
    primary_cta_text: 'View Details',
    primary_cta_link: '',
    secondary_cta_text: '',
    secondary_cta_link: '',
    is_published: true
  });

  useEffect(() => {
    if (existingPost) {
      setFormData({
        post_type: existingPost.post_type || 'system_drop',
        title: existingPost.title || '',
        short_text: existingPost.short_text || '',
        image_url: existingPost.image_url || '',
        video_url: existingPost.video_url || '',
        primary_cta_text: existingPost.primary_cta_text || '',
        primary_cta_link: existingPost.primary_cta_link || '',
        secondary_cta_text: existingPost.secondary_cta_text || '',
        secondary_cta_link: existingPost.secondary_cta_link || '',
        is_published: existingPost.is_published !== false
      });
    }
  }, [existingPost]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.short_text || !formData.primary_cta_text || !formData.primary_cta_link) {
      return toast.error("Please fill in all required fields (Title, Description, Primary CTA text and link).");
    }

    setIsSubmitting(true);
    try {
      const slug = formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now().toString().slice(-6);
      
      const payload = {
        ...formData,
        slug: existingPost ? existingPost.slug : slug,
        created_by: currentUser?.id,
        // Ensure numbers are properly initialized for new posts
        ...(existingPost ? {} : { views_count: 0, clicks_count: 0 })
      };

      if (existingPost) {
        await pb.collection('ai_feed_posts').update(existingPost.id, payload, { $autoCancel: false });
        toast.success("Post updated successfully");
      } else {
        await pb.collection('ai_feed_posts').create(payload, { $autoCancel: false });
        toast.success("Post published successfully");
      }

      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to save post");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/90 backdrop-blur-sm overflow-y-auto py-10">
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-[800px] bg-card border border-white/10 shadow-[0_0_40px_hsl(var(--primary)/0.15)] rounded-2xl overflow-hidden flex flex-col my-auto"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/20">
          <h2 className="text-xl font-bold text-foreground">
            {existingPost ? 'Edit Feed Post' : 'Create New Feed Post'}
          </h2>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Post Type *</label>
              <select 
                name="post_type" 
                value={formData.post_type} 
                onChange={handleChange}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              >
                {POST_TYPES.map(type => (
                  <option key={type.value} value={type.value} className="bg-card text-foreground">{type.label}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Title *</label>
              <input 
                type="text" 
                name="title" 
                value={formData.title} 
                onChange={handleChange}
                placeholder="Enter post title"
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Description *</label>
            <textarea 
              name="short_text" 
              value={formData.short_text} 
              onChange={handleChange}
              placeholder="Main post content..."
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all min-h-[120px] resize-y"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Image URL</label>
              <input 
                type="url" 
                name="image_url" 
                value={formData.image_url} 
                onChange={handleChange}
                placeholder="https://..."
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Video URL (Autoplay)</label>
              <input 
                type="url" 
                name="video_url" 
                value={formData.video_url} 
                onChange={handleChange}
                placeholder="https://... (mp4 format preferred)"
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/10">
            <div className="space-y-4">
              <h3 className="font-bold text-foreground">Primary CTA *</h3>
              <div className="space-y-2">
                <input 
                  type="text" 
                  name="primary_cta_text" 
                  value={formData.primary_cta_text} 
                  onChange={handleChange}
                  placeholder="Button Text (e.g. View Blueprint)"
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-foreground focus:border-primary outline-none"
                />
              </div>
              <div className="space-y-2">
                <input 
                  type="text" 
                  name="primary_cta_link" 
                  value={formData.primary_cta_link} 
                  onChange={handleChange}
                  placeholder="Button Link (e.g. /blueprints)"
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-foreground focus:border-primary outline-none"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-bold text-foreground">Secondary CTA (Optional)</h3>
              <div className="space-y-2">
                <input 
                  type="text" 
                  name="secondary_cta_text" 
                  value={formData.secondary_cta_text} 
                  onChange={handleChange}
                  placeholder="Button Text"
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-foreground focus:border-primary outline-none"
                />
              </div>
              <div className="space-y-2">
                <input 
                  type="text" 
                  name="secondary_cta_link" 
                  value={formData.secondary_cta_link} 
                  onChange={handleChange}
                  placeholder="Button Link"
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-foreground focus:border-primary outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-white/10">
            <input 
              type="checkbox" 
              id="is_published"
              name="is_published"
              checked={formData.is_published}
              onChange={handleChange}
              className="w-5 h-5 rounded border-white/20 bg-black/20 text-primary focus:ring-primary focus:ring-offset-background"
            />
            <label htmlFor="is_published" className="text-foreground font-medium cursor-pointer">
              Publish immediately
            </label>
          </div>

          <div className="flex justify-end gap-4 pt-6">
            <button 
              type="button" 
              onClick={onClose}
              className="px-6 py-2.5 rounded-full font-bold text-foreground bg-white/5 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="px-8 py-2.5 rounded-full font-bold bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_0_20px_hsl(var(--primary)/0.4)] transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {existingPost ? 'Save Changes' : 'Publish Post'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default AdminPostBuilder;