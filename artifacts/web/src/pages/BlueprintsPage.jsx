
import React, { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, ArrowRight, Target, Users, Wrench, Clock, Zap, ChevronDown, Image as ImageIcon } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import VideoBackground from '@/components/VideoBackground.jsx';

const INITIAL_BLUEPRINTS = [
  {
    id: 'ai-appointment-setter-empire-system',
    title: 'AI APPOINTMENT SETTER EMPIRE SYSTEM',
    description: 'Fully automated AI sales system that finds leads, starts conversations, follows up automatically, qualifies prospects, and books appointments 24/7 without human staff.',
    difficulty: 'Intermediate',
    timeToSetup: '4–8 Hours',
    systemType: 'Lead Generation',
    outcome: 'Books qualified appointments 24/7',
    bestFor: 'Agencies, B2B, and High-Ticket Sales',
    tools: ['Make.com', 'GoHighLevel', 'Magai', 'Apify'],
    slug: 'ai-appointment-setter-empire-system',
    popularity: 105,
    dateAdded: '2026-05-13',
    image: 'https://images.unsplash.com/photo-1585065839901-0685055d8b57',
    routePath: '/blueprints/ai-appointment-setter-empire-system'
  },
  {
    id: 'ai-personal-brand-authority-system',
    title: 'AI Personal Brand Authority System',
    description: 'Build a fully automated AI-powered personal brand system that creates content, grows audiences, captures leads, and monetizes authority across all major social platforms.',
    difficulty: 'Beginner',
    timeToSetup: '3-8 hours',
    systemType: 'Content System',
    outcome: 'Grows audiences and monetizes authority',
    bestFor: 'Creators and entrepreneurs',
    tools: ['Predis.ai', 'Make', 'GoHighLevel', 'Magai'],
    slug: 'ai-personal-brand-authority-system',
    popularity: 100,
    dateAdded: '2026-05-10',
    image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'ai-youtube-cash-cow-system',
    title: 'AI YouTube Cash Cow System',
    description: 'Build a fully automated faceless YouTube channel using AI-generated scripts, AI voiceovers, automated editing workflows, and viral publishing systems designed to scale views, subscribers, and revenue.',
    difficulty: 'Beginner',
    timeToSetup: '4-10 hours',
    systemType: 'Content System',
    outcome: 'Scales views, subscribers, and revenue',
    bestFor: 'Content creators and entrepreneurs',
    tools: ['TubeMagic', 'Zebracat AI', 'Make', 'Magai'],
    slug: 'ai-youtube-cash-cow-system',
    popularity: 99,
    dateAdded: '2026-05-09',
    image: 'https://images.unsplash.com/photo-1638741631188-a42a58d5499c?auto=format&fit=crop&w=800&q=80'
  }
];

const FILTER_CATEGORIES = {
  difficulty: { label: 'Difficulty Level', options: ['Beginner', 'Intermediate', 'Advanced'] },
  systemType: { label: 'System Type', options: ['Content System', 'Lead Generation', 'Automation Systems', 'Monetization Systems', 'Traffic Systems'] },
  timeToSetup: { label: 'Time to Setup', options: ['Under 2 hours', '2-4 hours', '4-6 hours', '6+ hours', '4–8 Hours'] }
};

const BlueprintsPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [activeFilters, setActiveFilters] = useState({ difficulty: [], systemType: [], timeToSetup: [] });
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const handleFilterToggle = (category, option) => {
    setActiveFilters(prev => {
      const current = prev[category];
      const updated = current.includes(option) ? current.filter(item => item !== option) : [...current, option];
      return { ...prev, [category]: updated };
    });
  };

  const clearFilters = () => {
    setActiveFilters({ difficulty: [], systemType: [], timeToSetup: [] });
    setSearchQuery('');
  };

  const filteredAndSortedBlueprints = useMemo(() => {
    let result = INITIAL_BLUEPRINTS.filter(bp => {
      const matchesSearch = bp.title.toLowerCase().includes(searchQuery.toLowerCase()) || bp.description.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      const matchesDifficulty = activeFilters.difficulty.length === 0 || activeFilters.difficulty.includes(bp.difficulty);
      const matchesType = activeFilters.systemType.length === 0 || activeFilters.systemType.includes(bp.systemType);
      let matchesTime = activeFilters.timeToSetup.length === 0;
      if (!matchesTime) {
        if (activeFilters.timeToSetup.includes('Under 2 hours') && bp.timeToSetup.includes('Under 2')) matchesTime = true;
        if (activeFilters.timeToSetup.includes('2-4 hours') && (bp.timeToSetup.includes('2-4') || bp.timeToSetup.includes('2-3') || bp.timeToSetup.includes('3-4'))) matchesTime = true;
        if (activeFilters.timeToSetup.includes('4-6 hours') && (bp.timeToSetup.includes('4-6') || bp.timeToSetup.includes('4-5'))) matchesTime = true;
        if (activeFilters.timeToSetup.includes('6+ hours') && (bp.timeToSetup.includes('6+') || bp.timeToSetup.includes('6-8') || bp.timeToSetup.includes('4-10') || bp.timeToSetup.includes('3-8'))) matchesTime = true;
        if (activeFilters.timeToSetup.includes('4–8 Hours') && (bp.timeToSetup.includes('4–8') || bp.timeToSetup.includes('4-8'))) matchesTime = true;
      }
      return matchesDifficulty && matchesType && matchesTime;
    });

    result.sort((a, b) => {
      if (sortBy === 'popular') return b.popularity - a.popularity;
      if (sortBy === 'newest') return new Date(b.dateAdded) - new Date(a.dateAdded);
      if (sortBy === 'difficulty') {
        const diffScore = { 'Beginner': 1, 'Intermediate': 2, 'Advanced': 3 };
        return diffScore[a.difficulty] - diffScore[b.difficulty];
      }
      return 0;
    });

    return result;
  }, [searchQuery, activeFilters, sortBy]);

  const activeFilterCount = Object.values(activeFilters).flat().length;

  return (
    <VideoBackground>
      <Helmet>
        <title>AI System Blueprints | System Vault</title>
        <meta name="description" content="Step-by-step systems to build real AI-powered income streams." />
      </Helmet>
      
      <Header />
      
      <main className="flex-grow pt-16">
        <section className="relative py-20 px-4 border-b border-white/10 overflow-hidden bg-background/50 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent"></div>
          
          <div className="max-w-7xl mx-auto relative z-10 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <h1 className="text-4xl md:text-6xl font-extrabold text-foreground mb-6 tracking-tight text-shadow-lg uppercase">
                AI System Blueprints
              </h1>
              <p className="text-lg md:text-xl text-zinc-100 max-w-2xl mx-auto font-bold text-shadow-sm">
                Step-by-step systems to build real AI-powered income streams. Select an architecture, connect the tools, and deploy.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="sticky top-16 z-40 bg-card/80 backdrop-blur-xl border-b border-white/10 py-4 px-4 shadow-xl">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center w-full sm:w-auto">
              <button onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)} className="lg:hidden flex items-center gap-2 px-4 py-2 bg-background/80 border border-white/20 rounded-lg text-sm font-bold text-white mr-4">
                <Filter className="w-4 h-4" /> Filters {activeFilterCount > 0 && <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>}
              </button>
              <div className="hidden lg:flex items-center gap-2 text-sm font-bold text-zinc-200">
                <Filter className="w-4 h-4 text-primary" />
                <span>Filter Systems</span>
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="ml-2 text-xs text-primary hover:underline font-bold">Clear All</button>
                )}
              </div>
            </div>

            <div className="flex items-center w-full sm:w-auto gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input 
                  type="text" placeholder="Search blueprints..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-background/80 border border-white/20 rounded-lg pl-9 pr-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium"
                />
              </div>
              <div className="relative shrink-0">
                <select 
                  value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-background/80 border border-white/20 rounded-lg pl-4 pr-10 py-2 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer font-medium"
                >
                  <option value="popular">Most Popular</option>
                  <option value="newest">Newest Added</option>
                  <option value="difficulty">Difficulty</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </section>

        <section className="py-8 px-4 bg-background/30 backdrop-blur-sm min-h-screen">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
            <aside className={`lg:w-64 shrink-0 ${isMobileFiltersOpen ? 'block' : 'hidden lg:block'}`}>
              <div className="sticky top-36 space-y-8 bg-card/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
                {Object.entries(FILTER_CATEGORIES).map(([key, category]) => (
                  <div key={key} className="space-y-3">
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-white/10 pb-2 text-shadow-sm">
                      {category.label}
                    </h3>
                    <div className="space-y-2">
                      {category.options.map(option => (
                        <label key={option} className="flex items-center gap-3 cursor-pointer group">
                          <div className="relative flex items-center justify-center w-5 h-5 border border-white/20 rounded bg-background/80 group-hover:border-primary/50 transition-colors">
                            <input type="checkbox" className="peer sr-only" checked={activeFilters[key].includes(option)} onChange={() => handleFilterToggle(key, option)} />
                            <div className="absolute inset-0 bg-primary rounded opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                            <svg className="w-3 h-3 text-primary-foreground absolute opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <span className="text-sm text-zinc-300 font-bold group-hover:text-foreground transition-colors text-shadow-sm">
                            {option}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </aside>

            <div className="flex-grow">
              {filteredAndSortedBlueprints.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center border border-white/20 rounded-2xl bg-card/80 backdrop-blur-xl shadow-xl">
                  <Target className="w-12 h-12 text-zinc-400 mb-4" />
                  <h3 className="text-xl font-bold text-foreground mb-2 text-shadow-sm">No blueprints found</h3>
                  <p className="text-zinc-300 font-medium mb-6">Try adjusting your filters or search query.</p>
                  <button onClick={clearFilters} className="text-primary hover:underline text-sm font-bold">Clear all filters</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  <AnimatePresence mode="popLayout">
                    {filteredAndSortedBlueprints.map((bp, index) => (
                      <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3, delay: index * 0.05 }} key={bp.id}>
                        <Link to={bp.routePath || `/blueprints/${bp.slug}`} className="blueprint-card group flex flex-col h-full overflow-hidden bg-card/90 backdrop-blur-xl border border-white/10 rounded-2xl hover:border-primary/50 transition-all duration-300 shadow-xl hover:shadow-[0_0_20px_rgba(0,212,255,0.3)]">
                          {bp.image && (
                            <div className="w-full h-40 relative overflow-hidden border-b border-white/10">
                              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent z-10"></div>
                              <img src={bp.image} alt={bp.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            </div>
                          )}
                          <div className="p-5 border-b border-white/10 bg-card/50">
                            <div className="flex flex-wrap gap-2 mb-3">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-primary/20 text-primary border border-primary/30 backdrop-blur-sm">
                                {bp.difficulty}
                              </span>
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-secondary/20 text-secondary border border-secondary/30 flex items-center gap-1 backdrop-blur-sm">
                                <Clock className="w-3 h-3" /> {bp.timeToSetup}
                              </span>
                            </div>
                            <h3 className="text-xl font-bold text-foreground leading-tight mb-2 group-hover:text-primary transition-colors text-shadow-sm">
                              {bp.title}
                            </h3>
                            <p className="text-sm text-zinc-300 font-medium line-clamp-2">
                              {bp.description}
                            </p>
                          </div>
                          <div className="p-5 flex-grow flex flex-col gap-4">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                                <Zap className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <p className="text-xs text-zinc-400 uppercase tracking-wider font-bold mb-0.5 text-shadow-sm">Key Outcome</p>
                                <p className="text-sm font-bold text-foreground">{bp.outcome}</p>
                              </div>
                            </div>
                          </div>
                          <div className="p-5 pt-0 mt-auto">
                            <div className="w-full py-3 px-4 bg-primary/20 text-primary font-bold text-sm text-center rounded-lg border border-primary/30 group-hover:bg-primary group-hover:text-primary-foreground transition-colors flex items-center justify-center gap-2 backdrop-blur-sm">
                              View Blueprint <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </VideoBackground>
  );
};

export default BlueprintsPage;
