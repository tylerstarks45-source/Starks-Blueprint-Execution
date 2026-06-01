import React, { useState, useEffect } from 'react';
import { TrendingUp, Hash, MessageSquare } from 'lucide-react';
import pb from '@/lib/pocketbaseClient.js';

const TrendingSection = () => {
  const [trendingPosts, setTrendingPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const result = await pb.collection('ai_feed_posts').getList(1, 5, {
          sort: '-likes_count,-comments_count',
          filter: 'created >= @now-604800',
          $autoCancel: false
        });
        setTrendingPosts(result.items);
      } catch (err) {
        console.error("Failed to fetch trending", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTrending();
  }, []);

  if (isLoading) return <div className="glass-panel rounded-2xl p-6 animate-pulse h-64 mt-6" />;

  return (
    <div className="glass-panel rounded-2xl p-5 sticky top-[160px]">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-foreground">Hot Right Now</h3>
      </div>
      
      <div className="space-y-4">
        {trendingPosts.length > 0 ? (
          trendingPosts.map((post) => (
            <div key={post.id} className="group cursor-pointer">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono text-primary uppercase px-1.5 py-0.5 bg-primary/10 rounded">
                  {post.category || 'Update'}
                </span>
              </div>
              <h4 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                {post.title}
              </h4>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {post.comments_count || 0}</span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No trending posts this week.</p>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-white/10">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Trending Tags</h4>
        <div className="flex flex-wrap gap-2">
          {['AI Agents', 'Automation', 'OpenAI', 'Sales Funnels', 'Cursor'].map(tag => (
            <span key={tag} className="text-xs px-2 py-1 rounded-md bg-card border border-white/5 text-foreground hover:border-primary/50 cursor-pointer transition-colors flex items-center gap-1">
              <Hash className="w-3 h-3 text-primary" /> {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TrendingSection;