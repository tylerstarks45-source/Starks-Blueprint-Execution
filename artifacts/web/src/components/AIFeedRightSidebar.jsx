import React, { useState, useEffect } from 'react';
import { Loader2, ArrowRight, Zap, Target, BarChart2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import pb from '@/lib/pocketbaseClient.js';

const AIFeedRightSidebar = () => {
  const [systemDrops, setSystemDrops] = useState([]);
  const [toolDrops, setToolDrops] = useState([]);
  const [trendingSystems, setTrendingSystems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSidebarData = async () => {
      try {
        const [sysRes, toolRes, trendRes] = await Promise.all([
          pb.collection('ai_feed_posts').getList(1, 3, {
            filter: 'post_type="system_drop" && is_published=true',
            sort: '-created',
            $autoCancel: false
          }),
          pb.collection('ai_feed_posts').getList(1, 3, {
            filter: 'post_type="tool_drop" && is_published=true',
            sort: '-created',
            $autoCancel: false
          }),
          pb.collection('ai_feed_posts').getList(1, 3, {
            filter: 'post_type="system_drop" && is_published=true',
            sort: '-views_count,-created',
            $autoCancel: false
          })
        ]);
        
        setSystemDrops(sysRes.items);
        setToolDrops(toolRes.items);
        setTrendingSystems(trendRes.items);
      } catch (e) {
        console.error("Error fetching right sidebar data:", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSidebarData();
  }, []);

  if (isLoading) {
    return (
      <div className="hidden lg:flex flex-col w-[350px] pt-4 px-6 h-screen sticky top-0 justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto opacity-50" />
      </div>
    );
  }

  return (
    <div className="hidden lg:flex flex-col w-[350px] pt-4 px-6 h-screen sticky top-0 overflow-y-auto hide-scrollbar pb-20">
      
      {/* Latest System Drops */}
      {systemDrops.length > 0 && (
        <div className="bg-card border border-white/5 rounded-2xl mb-6 overflow-hidden shadow-lg relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <h2 className="font-extrabold text-lg text-foreground px-5 py-4 border-b border-white/5 flex items-center gap-2">
            <Target className="w-5 h-5 text-orange-500" /> Latest System Drops
          </h2>
          <div className="divide-y divide-white/5">
            {systemDrops.map((post) => (
              <div key={post.id} className="p-5 hover:bg-white/[0.02] transition-colors relative z-10">
                <h3 className="font-bold text-foreground leading-tight mb-1">{post.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3">{post.short_text}</p>
                <Link to="/blueprints" className="inline-flex items-center text-xs font-bold text-orange-500 hover:text-orange-400 transition-colors group/link">
                  View Blueprint <ArrowRight className="w-3 h-3 ml-1 group-hover/link:translate-x-1 transition-transform" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Tools Added */}
      {toolDrops.length > 0 && (
        <div className="bg-card border border-white/5 rounded-2xl mb-6 overflow-hidden shadow-lg relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <h2 className="font-extrabold text-lg text-foreground px-5 py-4 border-b border-white/5 flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-500" /> New Tools Added
          </h2>
          <div className="divide-y divide-white/5">
            {toolDrops.map((post) => (
              <div key={post.id} className="p-5 hover:bg-white/[0.02] transition-colors relative z-10">
                <h3 className="font-bold text-foreground leading-tight mb-1">{post.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3">{post.short_text}</p>
                <Link to="/marketplace" className="inline-flex items-center text-xs font-bold text-blue-500 hover:text-blue-400 transition-colors group/link">
                  View Tool <ArrowRight className="w-3 h-3 ml-1 group-hover/link:translate-x-1 transition-transform" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trending Systems */}
      {trendingSystems.length > 0 && (
        <div className="bg-card border border-white/5 rounded-2xl mb-6 overflow-hidden shadow-lg relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <h2 className="font-extrabold text-lg text-foreground px-5 py-4 border-b border-white/5 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" /> Trending Systems
          </h2>
          <div className="divide-y divide-white/5">
            {trendingSystems.map((post, index) => (
              <div key={post.id} className="p-5 hover:bg-white/[0.02] transition-colors relative z-10 flex gap-4">
                <span className="text-2xl font-black text-white/10 mt-[-4px]">{index + 1}</span>
                <div>
                  <h3 className="font-bold text-foreground leading-tight mb-1 line-clamp-2">{post.title}</h3>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] font-medium text-muted-foreground bg-white/5 px-2 py-0.5 rounded">{post.views_count || 0} views</span>
                    <Link to="/blueprints" className="text-[10px] font-bold text-primary hover:underline">
                      Explore
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-muted-foreground mt-2 opacity-60 hover:opacity-100 transition-opacity">
        <Link to="/terms" className="hover:underline hover:text-primary transition-colors">Terms</Link>
        <Link to="/privacy-policy" className="hover:underline hover:text-primary transition-colors">Privacy</Link>
        <Link to="/cookie-policy" className="hover:underline hover:text-primary transition-colors">Cookies</Link>
        <span className="w-full mt-1">© 2026 Starks Global Group</span>
      </div>
    </div>
  );
};

export default AIFeedRightSidebar;