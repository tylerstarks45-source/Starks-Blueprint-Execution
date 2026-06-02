import React, { useState, useEffect, useRef } from 'react';
import { Search, ArrowRight, ExternalLink, Layers, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { systemsData } from '@/data/SystemsData.js';
import { productsData } from '@/data/ProductsData.js';

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState({ systems: [], tools: [] });
  const [intent, setIntent] = useState('neutral'); // 'system', 'tool', 'neutral'
  const wrapperRef = useRef(null);
  const navigate = useNavigate();

  const systemKeywords = ['system', 'build', 'create', 'setup', 'automate', 'funnel', 'email', 'agency', 'blueprint'];
  const toolKeywords = ['tool', 'software', 'app', 'platform', 'ai', 'generator', 'builder'];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ systems: [], tools: [] });
      setIntent('neutral');
      return;
    }

    const lowerQuery = query.toLowerCase();
    
    // Intent detection
    let currentIntent = 'neutral';
    if (systemKeywords.some(kw => lowerQuery.includes(kw))) currentIntent = 'system';
    else if (toolKeywords.some(kw => lowerQuery.includes(kw))) currentIntent = 'tool';
    setIntent(currentIntent);

    // Filter Systems
    const filteredSystems = systemsData.filter(sys => 
      sys.name.toLowerCase().includes(lowerQuery) || 
      sys.description.toLowerCase().includes(lowerQuery) ||
      (sys.outcome && sys.outcome.toLowerCase().includes(lowerQuery))
    ).slice(0, 4);

    // Filter Tools
    const filteredTools = productsData.filter(tool => 
      tool.name.toLowerCase().includes(lowerQuery) || 
      tool.description.toLowerCase().includes(lowerQuery) ||
      tool.category.toLowerCase().includes(lowerQuery)
    ).slice(0, 4);

    setResults({ systems: filteredSystems, tools: filteredTools });
    setIsOpen(true);
  }, [query]);

  const handleSystemClick = (slug) => {
    setIsOpen(false);
    navigate(`/blueprint/${slug}`);
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto mb-16 z-50" ref={wrapperRef}>
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
          <Search className="h-6 w-6 text-muted-foreground group-focus-within:text-primary transition-colors" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && setIsOpen(true)}
          className="block w-full pl-14 pr-6 py-5 bg-card/90 border-2 border-border/50 rounded-2xl text-foreground placeholder-muted-foreground focus:ring-0 focus:border-primary/50 focus:bg-card backdrop-blur-xl text-lg shadow-[0_10px_40px_rgba(0,0,0,0.2)] transition-all"
          placeholder="Tell us what you want to build or what tool you need…"
        />
      </div>

      {isOpen && (results.systems.length > 0 || results.tools.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-3 bg-card/95 backdrop-blur-2xl border border-border rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col max-h-[70vh]">
          <div className="overflow-y-auto p-4 space-y-6">
            
            {/* Systems Results */}
            {(intent === 'system' || intent === 'neutral') && results.systems.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2 px-2">
                  <Layers className="w-4 h-4" /> Systems
                </h3>
                <div className="space-y-2">
                  {results.systems.map(sys => (
                    <div 
                      key={sys.id} 
                      onClick={() => handleSystemClick(sys.slug)}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl hover:bg-primary/5 border border-transparent hover:border-primary/20 cursor-pointer transition-all group"
                    >
                      <div className="mb-3 sm:mb-0 pr-4">
                        <h4 className="font-bold text-foreground group-hover:text-primary transition-colors text-lg">{sys.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{sys.outcome}</p>
                        <p className="text-xs text-muted-foreground/80 mt-2 font-medium">Tools: {sys.tools_preview?.join(', ')}</p>
                      </div>
                      <button className="shrink-0 inline-flex items-center justify-center px-4 py-2 bg-primary/10 text-primary font-bold rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors text-sm">
                        View System Setup <ArrowRight className="w-4 h-4 ml-1" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tools Results */}
            {(intent === 'tool' || intent === 'neutral' || (intent === 'system' && results.systems.length === 0)) && results.tools.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2 px-2">
                  <Wrench className="w-4 h-4" /> Tools
                </h3>
                <div className="space-y-2">
                  {results.tools.map(tool => (
                    <div 
                      key={tool.id} 
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl hover:bg-secondary/5 border border-transparent hover:border-secondary/20 transition-all group"
                    >
                      <div className="mb-3 sm:mb-0 pr-4">
                        <h4 className="font-bold text-foreground group-hover:text-secondary transition-colors text-lg">{tool.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{tool.description}</p>
                      </div>
                      <a 
                        href={tool.affiliate_link || '#'} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="shrink-0 inline-flex items-center justify-center px-4 py-2 bg-secondary/10 text-secondary font-bold rounded-lg hover:bg-secondary hover:text-secondary-foreground transition-colors text-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Access Tool <ExternalLink className="w-4 h-4 ml-1" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;