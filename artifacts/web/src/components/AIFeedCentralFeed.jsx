import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Zap, Target, ArrowRight, Sparkles } from 'lucide-react';
import PinnedPostCard from './PinnedPostCard.jsx';
import FeedPost from './FeedPost.jsx';

// Hardcoded seed data as requested
const HARDCODED_POSTS = [
  {
    id: 'post_01',
    title: '🚀 AI Affiliate Content Engine Released',
    description: "We just launched a fully automated content-to-income system designed to generate affiliate revenue using AI videos and short-form content. This system handles:\n• Script generation\n• Video creation\n• Distribution\n• Monetization.\nIf you've been looking for a scalable way to make money with AI—this is it.",
    image_url: 'https://images.unsplash.com/photo-1651505942687-efc26cb528ba',
    primary_cta_text: 'View Blueprint System',
    primary_cta_link: '/dashboard/blueprints',
    secondary_cta_text: 'See How It Works',
    secondary_cta_link: '/dashboard/blueprints',
    post_type: 'system_drop',
    is_pinned: true,
    created_at: '2026-04-14T09:15:00Z'
  },
  {
    id: 'post_02',
    title: '💰 Funnel & Email Automation System Now Live',
    description: "We've deployed a high-conversion funnel system that captures leads, nurtures them automatically, and turns traffic into consistent revenue. Includes:\n• Funnel builders\n• Email automation\n• Follow-up sequences\n• Revenue tracking.\nThis is the backbone of almost every online business.",
    image_url: 'https://images.unsplash.com/photo-1611763870988-3de839ad97df',
    primary_cta_text: 'Launch Funnel System',
    primary_cta_link: '/dashboard/blueprints',
    secondary_cta_text: 'Explore Features',
    secondary_cta_link: '/dashboard/blueprints',
    post_type: 'system_drop',
    is_pinned: true,
    created_at: '2026-04-14T10:40:00Z'
  },
  {
    id: 'post_03',
    title: '📈 AI Lead Generation & Appointment System Deployed',
    description: "This is where high-ticket money lives. We built a system that:\n• Finds leads automatically\n• Sends AI-personalized outreach\n• Books calls directly into your calendar.\nPerfect for agencies and service-based businesses.",
    image_url: 'https://images.unsplash.com/photo-1694166967060-18377799447c',
    primary_cta_text: 'View Lead Gen Blueprint',
    primary_cta_link: '/dashboard/blueprints',
    secondary_cta_text: 'Launch Setup',
    secondary_cta_link: '/dashboard/blueprints',
    post_type: 'system_drop',
    is_pinned: false,
    created_at: '2026-04-14T12:05:00Z'
  },
  {
    id: 'post_04',
    title: '🧰 New AI Tools Added to Marketplace',
    description: "We've added new verified tools to the platform, including:\n• AI content generators\n• Automation platforms\n• Email marketing systems.\nAll tools are tested and mapped into real systems.",
    image_url: 'https://images.unsplash.com/photo-1675361770627-763fd7dc3e6f',
    primary_cta_text: 'Browse Tools',
    primary_cta_link: '/dashboard/marketplace',
    secondary_cta_text: 'View All Tools',
    secondary_cta_link: '/dashboard/marketplace',
    post_type: 'tool_drop',
    is_pinned: false,
    created_at: '2026-04-14T13:30:00Z'
  },
  {
    id: 'post_05',
    title: '🚀 Platform Growth Update — Systems Expanding Fast',
    description: "Starks Global Group is growing fast. We're actively building and releasing new automation systems weekly, expanding the marketplace, and improving the platform to give users real, deployable AI infrastructure. This isn't theory. This is execution.",
    image_url: 'https://images.unsplash.com/photo-1600783595435-54b51f7fc04d',
    primary_cta_text: 'Explore Platform',
    primary_cta_link: '/dashboard',
    secondary_cta_text: 'View Updates',
    secondary_cta_link: '/dashboard',
    post_type: 'update',
    is_pinned: false,
    created_at: '2026-04-14T15:00:00Z'
  }
];

const PremiumEmptyState = () => (
  <div className="bg-card/50 backdrop-blur-sm border border-white/10 rounded-3xl p-8 sm:p-10 text-center relative overflow-hidden shadow-2xl my-8">
    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50 pointer-events-none"></div>
    <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 blur-[80px] rounded-full pointer-events-none"></div>
    
    <div className="relative z-10">
      <div className="w-16 h-16 bg-primary/10 border border-primary/30 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_hsl(var(--primary)/0.2)]">
        <Sparkles className="w-8 h-8 text-primary" />
      </div>
      
      <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-4 tracking-tight">
        🚀 Live AI System Broadcast Feed
      </h2>
      <p className="text-muted-foreground text-base sm:text-lg max-w-lg mx-auto mb-10 leading-relaxed">
        Real-time drops of AI tools, automation systems, and platform updates designed to help you build and scale faster.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left mb-10">
        <div className="bg-black/20 border border-white/5 rounded-2xl p-6">
          <h3 className="font-bold text-foreground flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-primary" /> What You'll See Here
          </h3>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0"></div> New AI systems</li>
            <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0"></div> Verified tools</li>
            <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0"></div> Platform updates</li>
            <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0"></div> Real automation strategies</li>
          </ul>
        </div>
        <div className="bg-black/20 border border-white/5 rounded-2xl p-6">
          <h3 className="font-bold text-foreground flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-accent" /> Why This Feed Exists
          </h3>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0"></div> We don't just list tools; we show you how to connect them into revenue-generating systems.</li>
            <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0"></div> Stay ahead of the curve with deployable infrastructure.</li>
          </ul>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link to="/dashboard/blueprints" className="w-full sm:w-auto bg-primary text-primary-foreground font-bold px-8 py-3.5 rounded-full hover:bg-primary/90 shadow-[0_0_20px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)] transition-all active:scale-95">
          Explore Blueprint Systems
        </Link>
        <Link to="/dashboard/marketplace" className="w-full sm:w-auto bg-white/5 border border-white/10 text-foreground font-bold px-8 py-3.5 rounded-full hover:bg-white/10 transition-all active:scale-95">
          Browse AI Tools
        </Link>
      </div>
    </div>
  </div>
);

const AIFeedCentralFeed = ({ activeFilter = 'all' }) => {
  // Filter posts based on activeFilter if needed, but for now we show all hardcoded
  const displayPosts = HARDCODED_POSTS.filter(post => 
    activeFilter === 'all' || post.post_type === activeFilter
  );

  const pinnedPosts = displayPosts.filter(p => p.is_pinned);
  const regularPosts = displayPosts.filter(p => !p.is_pinned);

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto min-h-screen pb-32">
      {/* Header Section */}
      <div className="mb-8 pt-4 sm:pt-8 px-4 sm:px-0">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_hsl(var(--primary)/0.2)]">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Official Platform Feed
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1.5 leading-relaxed">
              Verified system and tool broadcasts from Starks Global Group.
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-0">
        {displayPosts.length === 0 ? (
          <PremiumEmptyState />
        ) : (
          <>
            {/* Pinned Broadcasts Section */}
            {pinnedPosts.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center gap-2 mb-4 px-1">
                  <div className="h-px flex-1 bg-gradient-to-r from-primary/50 to-transparent"></div>
                  <span className="text-xs font-bold text-primary uppercase tracking-widest">Pinned Broadcasts</span>
                  <div className="h-px flex-1 bg-gradient-to-l from-primary/50 to-transparent"></div>
                </div>
                <div className="space-y-6">
                  {pinnedPosts.map(post => (
                    <PinnedPostCard key={post.id} post={post} />
                  ))}
                </div>
              </div>
            )}

            {/* Regular Feed Section */}
            {regularPosts.length > 0 && (
              <div className="space-y-6">
                {regularPosts.map(post => (
                  <FeedPost key={post.id} post={post} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Footer CTA Section */}
        <div className="mt-16 bg-card/30 border border-white/5 rounded-2xl p-8 text-center">
          <h3 className="text-xl font-bold text-foreground mb-6">Ready to build your own system?</h3>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/dashboard/blueprints" className="text-sm font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
              👉 Explore Blueprints <ArrowRight className="w-4 h-4" />
            </Link>
            <span className="hidden sm:block text-white/10">•</span>
            <Link to="/dashboard/marketplace" className="text-sm font-bold text-foreground hover:text-primary transition-colors flex items-center gap-1">
              👉 Browse Marketplace <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIFeedCentralFeed;