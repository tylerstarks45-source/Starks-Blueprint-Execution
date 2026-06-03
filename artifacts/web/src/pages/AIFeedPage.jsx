import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient.js';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import FeedPost from '@/components/FeedPost.jsx';
import { HARDCODED_POSTS } from '@/components/AIFeedCentralFeed.jsx';
import { Zap, Bell, Box, BookOpen, Wrench } from 'lucide-react';

const AIFeedPage = () => {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const records = await pb.collection('ai_feed_posts').getList(1, 20, {
          sort: '-created',
          filter: 'is_published = true',
          expand: 'created_by',
          $autoCancel: false
        });
        setPosts(records.items);
      } catch {
        // silently fallback to hardcoded posts
      } finally {
        setIsLoading(false);
      }
    };
    fetchFeed();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col bg-grid-pattern selection:bg-primary/20">
      <Helmet><title>Intel Feed | Starks Global Group</title></Helmet>
      <Header />
      
      <main className="flex-grow pt-24 pb-20 container mx-auto px-4 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Sidebar: System Activity */}
          <div className="hidden lg:block lg:col-span-3 space-y-6">
            <div className="cinematic-card p-5 sticky top-28">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 border-b border-border/50 pb-2 flex items-center gap-2">
                <Bell className="w-4 h-4" /> Platform Pulse
              </h3>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-emerald-400 shrink-0"></div>
                  <div>
                    <p className="text-xs font-bold text-foreground mb-0.5">Platform Live</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">All systems operational. AI agent routing active.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-blue-400 shrink-0"></div>
                  <div>
                    <p className="text-xs font-bold text-foreground mb-0.5">8 Blueprints Available</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">Pick a blueprint and start building your automated income system.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-amber-400 shrink-0"></div>
                  <div>
                    <p className="text-xs font-bold text-foreground mb-0.5">New Tools Added</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">17 tools now in the marketplace across 8 categories.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Center Feed */}
          <div className="lg:col-span-6 space-y-6">
            <div className="mb-6 border-b border-border/50 pb-6">
              <h1 className="text-3xl font-extrabold text-foreground font-mono tracking-tight">Intel & Updates</h1>
              <p className="text-muted-foreground text-sm mt-2">Latest tool drops, architecture updates, and automation insights.</p>
            </div>

            {isLoading ? (
              <div className="py-20 flex justify-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {(posts.length > 0 ? posts : HARDCODED_POSTS).map(post => (
                  <FeedPost key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>

          {/* Right Sidebar: Build Agent Placeholder */}
          <div className="lg:col-span-3 space-y-6">
            <div className="cinematic-card p-6 border-accent/20 bg-[radial-gradient(ellipse_at_top_right,hsla(180,100%,50%,0.08),transparent_50%)] sticky top-28">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4 border border-accent/30 shadow-[0_0_15px_hsl(var(--accent)/0.2)]">
                <Zap className="w-5 h-5 text-accent" />
              </div>
              <h3 className="font-bold text-foreground text-lg mb-2 font-mono">AI Build Agent</h3>
              <div className="inline-block px-2 py-0.5 bg-accent/10 text-accent text-[10px] uppercase font-bold tracking-wider rounded border border-accent/20 mb-3">
                Coming Soon
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                The next evolution of Starks Global Group. Command your systems via conversational AI. Ask the agent to build pipelines, route data, and monitor health automatically.
              </p>
              <div className="p-3 bg-[#0a0a0a] rounded-lg border border-border/50">
                <p className="text-[10px] text-emerald-400 font-mono">&gt; agent deploy --system lead-gen</p>
                <p className="text-[10px] text-muted-foreground font-mono mt-1">Status: Provisioning infrastructure...</p>
              </div>
            </div>
            
            <div className="cinematic-card p-5">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 border-b border-border/50 pb-2 flex items-center gap-2">
                <Box className="w-4 h-4" /> Quick Links
              </h3>
              <div className="space-y-2">
                <a href="/blueprints" className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors p-2 rounded-lg hover:bg-primary/5">
                  <BookOpen className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-medium">Browse Blueprints</span>
                </a>
                <a href="/marketplace" className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors p-2 rounded-lg hover:bg-primary/5">
                  <Wrench className="w-4 h-4 text-secondary shrink-0" />
                  <span className="font-medium">Tool Marketplace</span>
                </a>
                <a href="/dashboard" className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors p-2 rounded-lg hover:bg-primary/5">
                  <Zap className="w-4 h-4 text-accent shrink-0" />
                  <span className="font-medium">My Dashboard</span>
                </a>
              </div>
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AIFeedPage;