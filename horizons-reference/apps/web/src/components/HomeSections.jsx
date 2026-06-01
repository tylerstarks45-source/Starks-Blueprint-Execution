import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import pb from '@/lib/pocketbaseClient.js';
import { format } from 'date-fns';
import { 
  ArrowRight, Wrench, Layers, AlertCircle, Clock, Calendar, 
  Zap, BellRing, Target, Activity, CheckCircle2, Filter, Loader2 
} from 'lucide-react';
import { motion } from 'framer-motion';

export const TrendingToolsSection = () => {
  const [tools, setTools] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [redirectingMap, setRedirectingMap] = useState({});

  // Filters state
  const [activeCategory, setActiveCategory] = useState('');
  const [activeSort, setActiveSort] = useState('-created');

  const fetchTools = async (pageNum, append = false) => {
    if (pageNum === 1) setIsLoading(true);
    else setIsLoadingMore(true);
    
    try {
      let filterStr = 'status != "INACTIVE"';
      if (activeCategory) {
        filterStr += ` && category = "${activeCategory}"`;
      }

      const result = await pb.collection('tools').getList(pageNum, 8, {
        sort: activeSort,
        filter: filterStr,
        $autoCancel: false
      });
      
      if (append) {
        setTools(prev => [...prev, ...result.items]);
      } else {
        setTools(result.items);
      }
      
      setHasMore(result.page < result.totalPages);
    } catch (err) {
      console.error("Error fetching trending tools:", err);
      if (pageNum === 1) setError("Failed to load tools.");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchTools(1, false);
  }, [activeCategory, activeSort]);

  const handleAffiliateClick = (e, t) => {
    if (!t.affiliate_link || !/^https?:\/\//i.test(t.affiliate_link.trim())) {
      e.preventDefault();
      return;
    }
    setRedirectingMap(prev => ({ ...prev, [t.id]: true }));
    setTimeout(() => setRedirectingMap(prev => ({ ...prev, [t.id]: false })), 500);
  };

  const loadMore = () => {
    if (!hasMore || isLoadingMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchTools(nextPage, true);
  };

  const getOutcomeText = (tool) => {
    if (tool.big_outcome) return tool.big_outcome;
    if (tool.core_problem) return `Solves: ${tool.core_problem}`;
    return "Optimized for automated workflow generation.";
  };

  if (error) {
    return (
      <div className="p-8 text-center bg-destructive/10 rounded-2xl border border-destructive/20 text-destructive">
        <AlertCircle className="w-8 h-8 mx-auto mb-3 opacity-80" />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Interactive Filter + Sort Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card/50 p-4 rounded-xl border border-border/60 backdrop-blur-sm">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Filter className="w-5 h-5 text-muted-foreground" />
          <select 
            value={activeCategory} 
            onChange={(e) => setActiveCategory(e.target.value)}
            className="bg-background border border-border text-foreground text-sm rounded-lg focus:ring-primary focus:border-primary block w-full sm:w-48 p-2.5"
          >
            <option value="">All Categories</option>
            <option value="AI Software">AI Software</option>
            <option value="Automation Systems">Automation Systems</option>
            <option value="Marketing Tools">Marketing Tools</option>
            <option value="AI Content Creation">Content Creation</option>
            <option value="Sales & Outreach">Sales & Outreach</option>
          </select>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">Sort by:</span>
          <select 
            value={activeSort} 
            onChange={(e) => setActiveSort(e.target.value)}
            className="bg-background border border-border text-foreground text-sm rounded-lg focus:ring-primary focus:border-primary block w-full sm:w-48 p-2.5"
          >
            <option value="-created">Newest Added</option>
            <option value="-updated">Trending Now</option>
            <option value="pain_level">High ROI (Pain Level)</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          [...Array(8)].map((_, i) => (
            <div key={i} className="saas-panel p-6 h-64 animate-pulse flex flex-col bg-card/40">
              <div className="flex justify-between mb-4">
                <div className="w-12 h-12 bg-muted rounded-xl" />
                <div className="w-20 h-5 bg-muted rounded-full" />
              </div>
              <div className="h-6 w-3/4 bg-muted rounded mb-3" />
              <div className="h-4 w-full bg-muted/50 rounded mb-auto" />
              <div className="h-10 w-full bg-muted/30 rounded mt-4" />
            </div>
          ))
        ) : tools.length === 0 ? (
          <div className="col-span-full p-16 text-center text-muted-foreground bg-card border border-dashed rounded-2xl">
            <Wrench className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">No tools found matching your criteria.</p>
            <button onClick={() => {setActiveCategory(''); setActiveSort('-created');}} className="mt-4 text-primary hover:underline">Clear Filters</button>
          </div>
        ) : (
          tools.map((tool, index) => {
            const isValidLink = tool.affiliate_link && typeof tool.affiliate_link === 'string' && /^https?:\/\//i.test(tool.affiliate_link.trim());

            return (
              <motion.div 
                key={tool.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: (index % 8) * 0.05 }}
                className="saas-panel p-6 flex flex-col group h-full relative overflow-hidden bg-background hover-glow-card"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 smooth-transition" />
                
                <div className="flex items-start justify-between mb-5 relative z-10">
                  <div className="w-14 h-14 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center p-1.5 overflow-hidden group-hover:scale-105 smooth-transition">
                    {tool.image ? (
                      <img src={tool.image} alt={tool.name} className="w-full h-full object-contain" />
                    ) : (
                      <Wrench className="w-7 h-7 text-primary/60" />
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {tool.category && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-secondary/20 text-secondary-foreground border border-border rounded-md backdrop-blur-sm">
                        {tool.category}
                      </span>
                    )}
                    <span className="trust-badge trust-badge-verified">
                      <CheckCircle2 className="w-3 h-3 mr-0.5" /> Verified
                    </span>
                  </div>
                </div>
                
                <h3 className="text-xl font-extrabold text-foreground mb-1 line-clamp-1 group-hover:text-primary smooth-transition">{tool.name}</h3>
                
                {tool.target_audience && (
                  <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1">
                    <Target className="w-3 h-3" /> Best for: {tool.target_audience}
                  </p>
                )}

                <div className="bg-primary/5 rounded-lg p-3 mb-5 border border-primary/10">
                  <p className="text-sm font-semibold text-primary/90 leading-snug line-clamp-2">
                    {getOutcomeText(tool)}
                  </p>
                </div>

                <div className="mt-auto relative z-10 pt-4 border-t border-border/50">
                  {isValidLink && (
                    <a 
                      href={tool.affiliate_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => handleAffiliateClick(e, tool)}
                      className={`w-full flex items-center justify-center px-4 py-3 bg-primary hover:bg-blue-500 text-primary-foreground text-sm font-bold rounded-xl transition-all duration-300 shadow-md hover:shadow-[0_4px_20px_hsl(var(--primary)/0.4)] hover:-translate-y-0.5 active:scale-[0.98] ${redirectingMap[tool.id] ? 'opacity-50 grayscale pointer-events-none' : ''}`}
                    >
                      {redirectingMap[tool.id] ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin"/> Redirecting...
                        </>
                      ) : (
                        <>
                          Access Tool <ArrowRight className="w-4 h-4 ml-1.5" />
                        </>
                      )}
                    </a>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {hasMore && !isLoading && tools.length > 0 && (
        <div className="flex justify-center mt-10">
          <button 
            onClick={loadMore}
            disabled={isLoadingMore}
            className="saas-button-secondary bg-card/80 hover:bg-card px-8 py-3 flex items-center gap-2"
          >
            {isLoadingMore ? <Loader2 className="w-5 h-5 animate-spin" /> : <Layers className="w-5 h-5" />}
            {isLoadingMore ? 'Loading Tools...' : 'Load More Tools'}
          </button>
        </div>
      )}
    </div>
  );
};

export const FeaturedSystemsSection = () => {
  const [systems, setSystems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSystems = async () => {
      try {
        const result = await pb.collection('blueprints').getList(1, 6, {
          sort: '-created',
          $autoCancel: false
        });
        setSystems(result.items);
      } catch (err) {
        console.error("Error fetching systems:", err);
        setError("Failed to load featured systems.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSystems();
  }, []);

  if (error) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {isLoading ? (
        [...Array(3)].map((_, i) => (
          <div key={i} className="saas-panel p-8 h-80 animate-pulse flex flex-col">
            <div className="h-8 w-12 bg-muted rounded mb-4" />
            <div className="h-6 w-3/4 bg-muted rounded mb-3" />
            <div className="h-4 w-full bg-muted/50 rounded mb-8" />
            <div className="space-y-3 mt-auto">
              <div className="h-4 w-full bg-muted/30 rounded" />
              <div className="h-4 w-full bg-muted/30 rounded" />
            </div>
          </div>
        ))
      ) : systems.length === 0 ? (
        <div className="col-span-full p-8 text-center text-muted-foreground bg-card border border-dashed rounded-2xl">
          <Layers className="w-8 h-8 mx-auto mb-3 opacity-50" />
          <p>More system blueprints coming soon.</p>
        </div>
      ) : (
        systems.map((system, index) => (
          <motion.div 
            key={system.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            onClick={() => navigate(`/blueprints/${system.slug || system.id}`)}
            className="saas-panel p-8 cursor-pointer hover-glow-card flex flex-col group relative overflow-hidden border-border/60 bg-gradient-to-b from-card to-background"
          >
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-accent/5 blur-[50px] rounded-full pointer-events-none group-hover:bg-accent/20 smooth-transition" />
            
            <div className="flex justify-between items-center mb-5 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner group-hover:scale-105 smooth-transition">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <span className="trust-badge trust-badge-system">
                <Layers className="w-3 h-3 mr-0.5" /> Tested Workflow
              </span>
            </div>
            
            <h3 className="text-xl font-bold text-foreground mb-3 leading-snug group-hover:text-primary smooth-transition relative z-10">
              {system.name || system.system_name}
            </h3>
            <p className="text-muted-foreground text-sm line-clamp-2 mb-6 relative z-10">
              {system.description || "A structured automation architecture designed to connect tools and generate scalable outcomes."}
            </p>
            
            <div className="grid grid-cols-2 gap-3 mb-6 mt-auto relative z-10">
              <div className="bg-background/80 border border-border/50 rounded-lg p-2.5 flex flex-col">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase mb-1">💰 Income</span>
                <span className="text-sm font-bold text-foreground truncate">{system.income_potential || '$2k - $10k/mo'}</span>
              </div>
              <div className="bg-background/80 border border-border/50 rounded-lg p-2.5 flex flex-col">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase mb-1">⚙️ Auto</span>
                <span className="text-sm font-bold text-foreground truncate">{system.automation_level || 'High Level'}</span>
              </div>
              <div className="bg-background/80 border border-border/50 rounded-lg p-2.5 flex flex-col">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase mb-1">🎯 Best For</span>
                <span className="text-sm font-bold text-foreground truncate">{system.best_for || 'Service Business'}</span>
              </div>
              <div className="bg-background/80 border border-border/50 rounded-lg p-2.5 flex flex-col">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase mb-1">⏱️ Setup</span>
                <span className="text-sm font-bold text-foreground truncate">{system.setup_time || '2-4 Hours'}</span>
              </div>
            </div>
            
            <div className="pt-4 border-t border-border/50 flex items-center justify-between relative z-10">
              <span className="text-xs font-mono text-primary/80 bg-primary/5 px-2 py-1 rounded">Blueprint Active</span>
              <span className="flex items-center text-sm font-extrabold text-foreground group-hover:text-primary smooth-transition">
                View Blueprint <ArrowRight className="w-4 h-4 ml-1.5" />
              </span>
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
};

export const LivePlatformFeedSection = () => {
  const [updates, setUpdates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUpdates = async () => {
      try {
        const result = await pb.collection('updates').getList(1, 6, {
          sort: '-date',
          $autoCancel: false
        });
        setUpdates(result.items);
      } catch (err) {
        console.error("Error fetching updates:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUpdates();
  }, []);

  const getBadgeStyle = (type) => {
    switch(type) {
      case 'New Tool': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'New System': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'Platform Change': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      default: return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  const getIcon = (type) => {
    switch(type) {
      case 'New Tool': return <Wrench className="w-3.5 h-3.5" />;
      case 'New System': return <Layers className="w-3.5 h-3.5" />;
      case 'Platform Change': return <Zap className="w-3.5 h-3.5" />;
      default: return <BellRing className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="saas-panel bg-card border-border/50 overflow-hidden">
      <div className="p-6 border-b border-border/50 flex justify-between items-center bg-muted/10">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" /> Live Feed
        </h3>
        <Link 
          to="/dashboard/updates" 
          className="text-sm font-medium text-muted-foreground hover:text-primary smooth-transition flex items-center"
        >
          View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Link>
      </div>
      
      <div className="p-0">
        {isLoading ? (
          <div className="divide-y divide-border/50">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-6 flex gap-4 animate-pulse">
                <div className="w-2 h-2 rounded-full bg-muted mt-2 shrink-0" />
                <div className="flex-1 space-y-3">
                  <div className="flex justify-between">
                    <div className="h-4 w-1/3 bg-muted rounded" />
                    <div className="h-3 w-16 bg-muted/50 rounded" />
                  </div>
                  <div className="h-3 w-full bg-muted/30 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : updates.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p>No recent updates.</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-[39px] top-6 bottom-6 w-px bg-border/50 hidden sm:block" />
            <div className="divide-y divide-border/50">
              {updates.map((update, index) => (
                <motion.div 
                  key={update.id}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="p-6 flex gap-4 sm:gap-6 hover:bg-muted/10 smooth-transition group"
                >
                  <div className="hidden sm:flex flex-col items-center shrink-0 relative z-10">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-card border ${getBadgeStyle(update.update_type).split(' ')[2]}`}>
                      <div className="w-2 h-2 rounded-full bg-current" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 border rounded flex items-center gap-1.5 ${getBadgeStyle(update.update_type)}`}>
                          {getIcon(update.update_type)}
                          {update.update_type}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {update.date ? format(new Date(update.date), 'MMM d, yyyy') : format(new Date(update.created), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                    
                    <h4 className="text-base font-bold text-foreground mb-1.5 group-hover:text-primary smooth-transition">
                      {update.title}
                    </h4>
                    
                    {update.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {update.description}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};