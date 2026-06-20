
import React, { useState, useMemo, useEffect } from 'react';
import PageMeta from '@/components/PageMeta.jsx';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, ArrowRight, Target, Clock, Zap, ChevronDown,
  Star, ShoppingBag, Users, PlusCircle, Loader2,
} from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import VideoBackground from '@/components/VideoBackground.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';

const DIFF_COLORS = {
  beginner:     'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  intermediate: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  advanced:     'bg-rose-500/20 text-rose-400 border-rose-500/30',
};

const SOURCE_BADGE = {
  platform:  { label: 'Official',   cls: 'bg-primary/20 text-primary border-primary/30' },
  admin:     { label: 'Official',   cls: 'bg-primary/20 text-primary border-primary/30' },
  community: { label: 'Community',  cls: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
};

const StarRating = ({ avg = 0, count = 0 }) => {
  if (count === 0) return null;
  return (
    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400">
      <Star className="w-3 h-3 fill-amber-400" />
      {Number(avg).toFixed(1)} <span className="text-zinc-400">({count})</span>
    </span>
  );
};

const BlueprintsPage = () => {
  const { currentUser } = useAuth();

  const [blueprints, setBlueprints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [activeFilters, setActiveFilters] = useState({ difficulty: [] });
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/blueprints');
        if (res.ok) {
          const data = await res.json();
          // Show platform blueprints + approved community blueprints
          const isOfficial = s => s === 'platform' || s === 'admin';
          const visible = data.filter(
            bp => isOfficial(bp.source) || (bp.source === 'community' && bp.reviewStatus === 'approved'),
          );
          setBlueprints(visible);
        }
      } catch {
        // silently fallback to empty
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const handleFilterToggle = (category, option) => {
    setActiveFilters(prev => {
      const current = prev[category];
      const updated = current.includes(option) ? current.filter(i => i !== option) : [...current, option];
      return { ...prev, [category]: updated };
    });
  };

  const clearFilters = () => {
    setActiveFilters({ difficulty: [] });
    setSearchQuery('');
    setSourceFilter('all');
  };

  const filteredAndSorted = useMemo(() => {
    let result = blueprints.filter(bp => {
      const q = searchQuery.toLowerCase();
      if (q && !bp.name?.toLowerCase().includes(q) && !bp.description?.toLowerCase().includes(q)) return false;
      if (activeFilters.difficulty.length > 0 && !activeFilters.difficulty.map(d => d.toLowerCase()).includes(bp.difficulty?.toLowerCase())) return false;
      if (sourceFilter === 'platform' && bp.source !== 'platform' && bp.source !== 'admin') return false;
      if (sourceFilter === 'community' && bp.source !== 'community') return false;
      return true;
    });

    result.sort((a, b) => {
      if (sortBy === 'popular') return (b.salesCount ?? 0) - (a.salesCount ?? 0);
      if (sortBy === 'newest')  return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'rating')  return (b.ratingAvg ?? 0) - (a.ratingAvg ?? 0);
      if (sortBy === 'price-asc')  return (a.priceCredits ?? 0) - (b.priceCredits ?? 0);
      if (sortBy === 'price-desc') return (b.priceCredits ?? 0) - (a.priceCredits ?? 0);
      if (sortBy === 'difficulty') {
        const s = { beginner: 1, intermediate: 2, advanced: 3 };
        return (s[a.difficulty?.toLowerCase()] ?? 2) - (s[b.difficulty?.toLowerCase()] ?? 2);
      }
      return 0;
    });
    return result;
  }, [blueprints, searchQuery, activeFilters, sortBy, sourceFilter]);

  const activeFilterCount = Object.values(activeFilters).flat().length + (sourceFilter !== 'all' ? 1 : 0);

  return (
    <VideoBackground>
      <PageMeta
        title="AI System Blueprints | System Vault — Starks Global Group"
        description="Step-by-step systems to build real AI-powered income streams. Browse our full blueprint library and start building your automated business today."
      />
      <Header />
      <main className="flex-grow pt-16">

        {/* Hero */}
        <section className="relative py-20 px-4 border-b border-white/10 overflow-hidden bg-background/50 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent" />
          <div className="max-w-7xl mx-auto relative z-10 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <h1 className="text-4xl md:text-6xl font-extrabold text-foreground mb-6 tracking-tight text-shadow-lg uppercase">
                AI System Blueprints
              </h1>
              <p className="text-lg md:text-xl text-zinc-100 max-w-2xl mx-auto font-bold text-shadow-sm">
                Step-by-step systems to build real AI-powered income streams. Select an architecture, connect the tools, and deploy.
              </p>
              {currentUser && (
                <Link
                  to="/blueprints/submit"
                  className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded-xl font-bold text-sm hover:bg-violet-500/30 transition-colors"
                >
                  <PlusCircle className="w-4 h-4" /> Submit Your Blueprint
                </Link>
              )}
            </motion.div>
          </div>
        </section>

        {/* Sticky filter bar */}
        <section className="sticky top-16 z-40 bg-card/80 backdrop-blur-xl border-b border-white/10 py-4 px-4 shadow-xl">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center w-full sm:w-auto gap-3">
              <button
                onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
                className="lg:hidden flex items-center gap-2 px-4 py-2 bg-background/80 border border-white/20 rounded-lg text-sm font-bold text-white"
              >
                <Filter className="w-4 h-4" /> Filters
                {activeFilterCount > 0 && <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>}
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
              {/* Source tabs */}
              <div className="flex gap-1 p-0.5 bg-muted/30 rounded-lg border border-white/10 text-xs font-bold">
                {[['all','All'], ['platform','Official'], ['community','Community']].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setSourceFilter(val)}
                    className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${sourceFilter === val ? 'bg-primary text-primary-foreground' : 'text-zinc-300 hover:text-white'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search blueprints..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-background/80 border border-white/20 rounded-lg pl-9 pr-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium"
                />
              </div>
              <div className="relative shrink-0">
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="appearance-none bg-background/80 border border-white/20 rounded-lg pl-4 pr-10 py-2 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer font-medium"
                >
                  <option value="popular">Most Popular</option>
                  <option value="newest">Newest Added</option>
                  <option value="rating">Highest Rated</option>
                  <option value="price-asc">Price: Low → High</option>
                  <option value="price-desc">Price: High → Low</option>
                  <option value="difficulty">Difficulty</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </section>

        {/* Main content */}
        <section className="py-8 px-4 bg-background/30 backdrop-blur-sm min-h-screen">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">

            {/* Sidebar filters */}
            <aside className={`lg:w-64 shrink-0 ${isMobileFiltersOpen ? 'block' : 'hidden lg:block'}`}>
              <div className="sticky top-36 space-y-8 bg-card/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-white/10 pb-2">Difficulty Level</h3>
                  <div className="space-y-2">
                    {['Beginner', 'Intermediate', 'Advanced'].map(option => (
                      <label key={option} className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative flex items-center justify-center w-5 h-5 border border-white/20 rounded bg-background/80 group-hover:border-primary/50 transition-colors">
                          <input type="checkbox" className="peer sr-only" checked={activeFilters.difficulty.includes(option)} onChange={() => handleFilterToggle('difficulty', option)} />
                          <div className="absolute inset-0 bg-primary rounded opacity-0 peer-checked:opacity-100 transition-opacity" />
                          <svg className="w-3 h-3 text-primary-foreground absolute opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <span className="text-sm text-zinc-300 font-bold group-hover:text-foreground transition-colors">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="pt-4 border-t border-white/10 space-y-2 text-xs text-zinc-400">
                  <p className="flex items-center gap-2"><ShoppingBag className="w-3 h-3" /> {blueprints.filter(b => b.source === 'platform' || b.source === 'admin').length} official blueprints</p>
                  <p className="flex items-center gap-2"><Users className="w-3 h-3" /> {blueprints.filter(b => b.source === 'community').length} community blueprints</p>
                </div>
              </div>
            </aside>

            {/* Grid */}
            <div className="flex-grow">
              {isLoading ? (
                <div className="flex items-center justify-center py-24">
                  <Loader2 className="w-10 h-10 animate-spin text-primary" />
                </div>
              ) : filteredAndSorted.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center border border-white/20 rounded-2xl bg-card/80 backdrop-blur-xl shadow-xl">
                  <Target className="w-12 h-12 text-zinc-400 mb-4" />
                  <h3 className="text-xl font-bold text-foreground mb-2">No blueprints found</h3>
                  <p className="text-zinc-300 font-medium mb-6">Try adjusting your filters or search query.</p>
                  <button onClick={clearFilters} className="text-primary hover:underline text-sm font-bold">Clear all filters</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  <AnimatePresence mode="popLayout">
                    {filteredAndSorted.map((bp, index) => {
                      const diffKey = bp.difficulty?.toLowerCase() || 'intermediate';
                      const diffBadge = DIFF_COLORS[diffKey] || DIFF_COLORS.intermediate;
                      const srcBadge = SOURCE_BADGE[bp.source] ?? SOURCE_BADGE.platform;
                      const isFree = (bp.priceCredits ?? 0) === 0;
                      return (
                        <motion.div
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.3, delay: index * 0.04 }}
                          key={bp.id}
                        >
                          <Link
                            to={`/blueprints/${bp.slug}`}
                            className="group flex flex-col h-full overflow-hidden bg-card/90 backdrop-blur-xl border border-white/10 rounded-2xl hover:border-primary/50 transition-all duration-300 shadow-xl hover:shadow-[0_0_20px_rgba(0,212,255,0.3)]"
                          >
                            {/* Badges row */}
                            <div className="p-5 pb-0 flex flex-wrap gap-1.5">
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${diffBadge}`}>
                                {bp.difficulty || 'Intermediate'}
                              </span>
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${srcBadge.cls}`}>
                                {srcBadge.label}
                              </span>
                              {bp.estimatedTime && (
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-secondary/20 text-secondary border border-secondary/30 flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" /> {bp.estimatedTime}
                                </span>
                              )}
                            </div>

                            <div className="p-5 flex-grow">
                              <h3 className="text-base font-bold text-foreground leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2">
                                {bp.name}
                              </h3>
                              <p className="text-sm text-zinc-300 font-medium line-clamp-3 mb-3">
                                {bp.description || 'AI-powered automation system for building scalable income streams.'}
                              </p>
                              {/* Rating */}
                              <StarRating avg={bp.ratingAvg} count={bp.ratingCount} />
                            </div>

                            {/* Footer */}
                            <div className="p-5 pt-0 mt-auto">
                              <div className="flex items-center justify-between mb-3">
                                {/* Price */}
                                <span className={`text-sm font-bold ${isFree ? 'text-emerald-400' : 'text-amber-400'}`}>
                                  {isFree ? 'Free' : `${bp.priceCredits} credits`}
                                </span>
                                {bp.salesCount > 0 && (
                                  <span className="flex items-center gap-1 text-xs text-zinc-400">
                                    <ShoppingBag className="w-3 h-3" /> {bp.salesCount}
                                  </span>
                                )}
                              </div>
                              <div className="w-full py-2.5 px-4 bg-primary/20 text-primary font-bold text-sm text-center rounded-lg border border-primary/30 group-hover:bg-primary group-hover:text-primary-foreground transition-colors flex items-center justify-center gap-2">
                                View Blueprint <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                              </div>
                            </div>
                          </Link>
                        </motion.div>
                      );
                    })}
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
