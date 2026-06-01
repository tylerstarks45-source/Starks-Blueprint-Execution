
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import VideoBackground from '@/components/VideoBackground.jsx';

// Premium Positioning Components
import PremiumSalesSection from '@/components/PremiumSalesSection.jsx';
import PremiumStatCards from '@/components/PremiumStatCards.jsx';
import ToolPositioningSection from '@/components/ToolPositioningSection.jsx';
import BlueprintPositioningSection from '@/components/BlueprintPositioningSection.jsx';
import PlatformPillarsSection from '@/components/PlatformPillarsSection.jsx';
import RealWorldOutcomesSection from '@/components/RealWorldOutcomesSection.jsx';

// Existing Sections
import TrustAndSocialProofSection from '@/components/TrustAndSocialProofSection.jsx';
import BeginnerRoadmapSection from '@/components/BeginnerRoadmapSection.jsx';
import ResultsScrollingStrip from '@/components/ResultsScrollingStrip.jsx';
import WhyPeopleFailSection from '@/components/WhyPeopleFailSection.jsx';
import FeaturedSuccessPathsSection from '@/components/FeaturedSuccessPathsSection.jsx';
import FounderHumanizationSection from '@/components/FounderHumanizationSection.jsx';
import StartHereSection from '@/components/StartHereSection.jsx';
import RecommendedForYouSection from '@/components/RecommendedForYouSection.jsx';
import FinalCTASection from '@/components/FinalCTASection.jsx';
import TrustCredibilitySection from '@/components/TrustCredibilitySection.jsx';

const QUICK_FILTERS = ['Make Money', 'Automation', 'Content Creation', 'Marketing', 'Business Tools'];

const HomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleSearch = e => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/marketplace?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleCategoryClick = category => {
    navigate(`/marketplace?category=${encodeURIComponent(category)}`);
  };

  if (isLoading || isAuthenticated) {
    return <div className="min-h-screen" />;
  }

  return (
    <VideoBackground>
      <Helmet>
        <title>Starks Global Group - Turn AI Into Income</title>
        <meta name="description" content="Discover proven tools, real systems, and step-by-step blueprints designed to help you automate work and generate revenue." />
      </Helmet>

      <Header />

      <main className="flex-grow">
        {/* ENHANCED HERO SECTION */}
        <section className="relative min-h-[90dvh] flex flex-col items-center justify-center pt-24 pb-16">
          <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: "easeOut" }} className="flex flex-col items-center w-full max-w-6xl mx-auto text-center">
              <div className="activity-signal mb-8 shadow-[0_4px_20px_rgba(0,0,0,0.5)] border border-primary/30 bg-background/60 backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                </span>
                <span className="text-foreground font-medium">Built using real automation workflows.</span>
              </div>
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.1] mb-6 tracking-tight text-balance text-shadow-lg">
                Build Automated AI Systems That Generate<br className="hidden md:block" /> 
                <span className="text-gradient-blue drop-shadow-[0_2px_15px_rgba(0,180,255,0.4)]">Leads, Content, Sales, and Daily Income</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-zinc-100 max-w-4xl mx-auto mb-10 leading-relaxed font-medium text-balance text-shadow-lg">
                We don’t flood you with thousands of random AI tools. Every tool on this platform has been tested inside real automated systems.
              </p>

              {/* Search Bar */}
              <div className="w-full max-w-2xl mx-auto mb-8 shadow-[0_10px_50px_rgba(0,0,0,0.7)] rounded-2xl relative">
                <form onSubmit={handleSearch} className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                    <Search className="h-5 w-5 text-zinc-400 group-focus-within:text-primary transition-colors" />
                  </div>
                  <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="block w-full pl-12 pr-40 py-5 bg-card/80 border-2 border-white/10 rounded-2xl text-white placeholder-zinc-400 focus:ring-0 focus:border-primary/50 focus:bg-card backdrop-blur-xl text-lg shadow-xl transition-all" placeholder="Search AI tools, systems, automation..." />
                  <button type="submit" className="absolute right-2 top-2 bottom-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 rounded-xl shadow-[0_0_15px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_25px_hsl(var(--primary)/0.6)] transition-all active:scale-95">
                    Search
                  </button>
                </form>
              </div>

              {/* Quick Filters */}
              <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
                <span className="text-sm font-medium text-zinc-100 text-shadow-sm mr-2">Quick filters:</span>
                {QUICK_FILTERS.map(filter => <button key={filter} onClick={() => handleCategoryClick(filter)} className="text-sm font-medium bg-black/50 hover:bg-primary/30 text-white border border-white/20 hover:border-primary/60 px-4 py-1.5 rounded-full backdrop-blur-md shadow-[0_4px_15px_rgba(0,0,0,0.5)] transition-all">
                    {filter}
                  </button>)}
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-5 justify-center w-full sm:w-auto mb-6">
                <Link to="/marketplace" className="saas-button text-lg px-8 py-4">
                  Start My AI Journey
                </Link>
                <Link to="/blueprints" className="saas-button-secondary text-lg px-8 py-4 bg-card/80 backdrop-blur-md">
                  Copy Proven Systems
                </Link>
              </div>

              {/* Micro Trust Text */}
              <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 mt-6 text-sm md:text-base text-zinc-100 font-medium text-shadow-sm">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-accent drop-shadow-md" /> Tested AI Tool Stacks</span>
                <span className="hidden md:inline text-zinc-300">•</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-accent drop-shadow-md" /> Real Automation Workflows</span>
                <span className="hidden md:inline text-zinc-300">•</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-accent drop-shadow-md" /> Beginner-Friendly Systems</span>
                <span className="hidden md:inline text-zinc-300">•</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-accent drop-shadow-md" /> Built Using Real Software</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* --- FEATURES SECTION: PREMIUM OFFERINGS & STATS --- */}
        <section className="section-padding border-t border-white/5 relative overflow-hidden bg-background/40 backdrop-blur-sm text-foreground">
          <div className="section-container relative z-10 text-center mb-16">
            <h2 className="section-title">The Tools Behind 7-Figure Operations</h2>
            <p className="section-subtitle">
              We don't deal in theory. These are the exact software stacks and systems actively running in successful businesses today.
            </p>
          </div>
          <div className="relative z-10">
            <PremiumSalesSection />
            <div className="mt-24">
              <PremiumStatCards />
            </div>
          </div>
        </section>

        {/* --- HOW IT WORKS: ECOSYSTEM & BLUEPRINTS --- */}
        <section className="section-padding border-y border-white/5 relative overflow-hidden bg-background/50 backdrop-blur-sm">
          <div className="section-container text-center mb-16 relative z-10">
            <h2 className="section-title">A Complete Architecture for Growth</h2>
            <p className="section-subtitle">
              Stop duct-taping random tools together. Our marketplace identifies the core pillars you need to establish a solid business foundation.
            </p>
          </div>
          <div className="relative z-10">
            <ToolPositioningSection />
            <div className="mt-24">
              <PlatformPillarsSection />
            </div>
            
            <div className="mt-32 text-center mb-16">
              <h2 className="section-title">Actionable Blueprints & Systems</h2>
              <p className="section-subtitle">
                Follow step-by-step roadmaps designed by industry experts. Copy our automated workflows and deploy them into your own business immediately.
              </p>
            </div>
            <BlueprintPositioningSection />
            <div className="mt-24">
              <BeginnerRoadmapSection />
            </div>
          </div>
        </section>

        {/* --- TESTIMONIALS & PROOF SECTION --- */}
        <section className="section-padding relative overflow-hidden bg-background/60 backdrop-blur-md">
          <div className="section-container mb-24 relative z-10 text-center">
            <p className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-zinc-100 text-balance max-w-5xl mx-auto leading-tight text-shadow-lg">
              Modern businesses are built on systems.<br />
              <span className="text-white mt-4 block text-glow">The right tech stack changes everything.</span>
            </p>
          </div>
          <div className="relative z-10">
            <TrustAndSocialProofSection />
          </div>

          <div className="section-container text-center mt-32 mb-16 relative z-10">
            <h2 className="section-title">Don't Just Take Our Word For It</h2>
            <p className="section-subtitle">
              See how everyday entrepreneurs are transforming their operations using the systems and tools discovered on our platform.
            </p>
          </div>
          
          <div className="relative z-10">
            <ResultsScrollingStrip />
            <div className="mt-24"><FeaturedSuccessPathsSection /></div>
            <div className="mt-24"><RealWorldOutcomesSection /></div>
          </div>
        </section>

        {/* --- THE REALITY OF BUILDING & FOUNDER STORY --- */}
        <section className="section-padding border-y border-white/5 relative overflow-hidden bg-background/80 backdrop-blur-lg">
          <div className="section-container text-center mb-16 relative z-10">
            <h2 className="section-title">Why Most Creators Fail</h2>
            <p className="section-subtitle">
              It’s not a lack of effort. It’s a lack of the right systems, clear direction, and proper execution frameworks.
            </p>
          </div>
          <div className="relative z-10">
            <WhyPeopleFailSection />
            <div className="mt-32"><FounderHumanizationSection /></div>
          </div>
        </section>

        {/* --- FINAL CTA SECTION --- */}
        <section className="pt-24 pb-12 relative overflow-hidden text-foreground bg-background/40 backdrop-blur-sm">
          <div className="section-container text-center mb-16 relative z-10">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6 text-shadow-lg">
              Your Journey Begins Here
            </h2>
            <p className="section-subtitle">
              Select your path below. Whether you need an individual tool or a comprehensive automated system, we have you covered.
            </p>
          </div>

          <div className="relative z-10">
            <StartHereSection />
            <div className="mt-24"><RecommendedForYouSection /></div>
            <div className="mt-32"><FinalCTASection /></div>
            <div className="mt-20"><TrustCredibilitySection /></div>
          </div>
        </section>
        
      </main>

      <Footer />
    </VideoBackground>
  );
};

export default HomePage;
