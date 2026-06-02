import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Sparkles, ArrowRight, Box } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useSystemGenerator } from '@/hooks/useSystemGenerator.js';
import { useToolSave } from '@/hooks/useToolSave.js';

import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import SystemPlanCard from '@/components/SystemPlanCard.jsx';
import ToolStackCard from '@/components/ToolStackCard.jsx';
import SystemStatusCard from '@/components/SystemStatusCard.jsx';

const SUGGESTIONS = [
  "Affiliate marketing system",
  "Lead generation system",
  "AI video automation",
  "Email marketing funnel"
];

const SystemBuilderPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { generateSystem, isGenerating, results } = useSystemGenerator();
  const { isToolSaved, toggleToolSave } = useToolSave();
  
  const [query, setQuery] = useState('');
  const [activeSystem, setActiveSystem] = useState(null);
  const [savedTools, setSavedTools] = useState([]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!currentUser) return;
      try {
        // Fetch active system
        const sysRecords = await pb.collection('saved_systems').getList(1, 1, {
          filter: `userId="${currentUser.id}" && status != "Completed"`,
          sort: '-updated',
          $autoCancel: false
        });
        
        if (sysRecords.items.length > 0) {
          const sys = sysRecords.items[0];
          const bp = await pb.collection('blueprints').getOne(sys.blueprintId, { $autoCancel: false });
          setActiveSystem({ ...sys, blueprint: bp });
        }

        // Fetch saved tools
        const toolRecords = await pb.collection('saved_tools').getFullList({
          filter: `userId="${currentUser.id}"`,
          $autoCancel: false
        });
        
        if (toolRecords.length > 0) {
          const toolIds = toolRecords.map(t => `id="${t.toolId}"`).join(' || ');
          const tools = await pb.collection('tools').getFullList({ filter: toolIds, $autoCancel: false });
          setSavedTools(tools);
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
      }
    };
    fetchUserData();
  }, [currentUser]);

  const handleSearch = (e) => {
    e.preventDefault();
    generateSystem(query);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col bg-grid-pattern">
      <Helmet>
        <title>System Builder | Starks Global Group</title>
      </Helmet>
      
      <Header />
      
      <main className="flex-grow pt-24 pb-24">
        <div className="container mx-auto px-4 max-w-5xl">
          
          {/* Hero & Input */}
          <div className="text-center mb-16">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-4xl md:text-6xl font-extrabold text-foreground mb-4 text-glow">
                Build Your AI System
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Describe what you want to achieve, and our engine will architect the perfect automation stack for you.
              </p>
            </motion.div>

            <motion.form 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              onSubmit={handleSearch} 
              className="relative max-w-3xl mx-auto group"
            >
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
              <div className="relative flex items-center bg-input border-2 border-border rounded-2xl overflow-hidden focus-within:border-primary focus-within:shadow-[0_0_20px_hsl(var(--primary)/0.3)] transition-all duration-300">
                <Search className="w-6 h-6 text-muted-foreground ml-6" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="What do you want to build?"
                  className="w-full bg-transparent border-none text-foreground text-lg px-4 py-6 focus:ring-0 placeholder:text-muted-foreground/50"
                />
                <button 
                  type="submit"
                  disabled={isGenerating || !query.trim()}
                  className="mr-3 saas-button py-3 px-8"
                >
                  {isGenerating ? <Sparkles className="w-5 h-5 animate-spin" /> : 'Generate'}
                </button>
              </div>
            </motion.form>

            <div className="flex flex-wrap justify-center gap-3 mt-6">
              {SUGGESTIONS.map((sug, i) => (
                <button 
                  key={i}
                  onClick={() => { setQuery(sug); generateSystem(sug); }}
                  className="text-xs font-medium px-4 py-2 rounded-full bg-card border border-border hover:border-primary/50 hover:text-primary transition-colors"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Results Section */}
          {results && (
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-20 space-y-12"
            >
              <div className="flex items-center gap-3 mb-8">
                <Sparkles className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-bold">Generated Architecture</h2>
              </div>

              {results.length === 0 ? (
                <div className="mission-card p-12 text-center border-dashed">
                  <p className="text-lg text-muted-foreground">No exact blueprints found for your query. Try adjusting your keywords or browse the marketplace.</p>
                </div>
              ) : (
                results.map(bp => (
                  <div key={bp.id} className="space-y-8 pb-12 border-b border-border/50 last:border-0">
                    <SystemPlanCard system={bp} />
                    
                    {bp.expand?.required_tools && (
                      <div>
                        <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Required Tool Stack</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {bp.expand.required_tools.map(tool => (
                            <ToolStackCard 
                              key={tool.id} 
                              tool={tool} 
                              isSaved={isToolSaved(tool.id)}
                              onAdd={toggleToolSave}
                              onRemove={toggleToolSave}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button 
                        onClick={() => navigate(`/blueprints/${bp.slug}`)}
                        className="saas-button text-lg px-8 py-4 shadow-[0_0_30px_hsl(var(--primary)/0.4)] pulse-neon"
                      >
                        Start Building This System <ArrowRight className="w-5 h-5 ml-2" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}

          {/* Conditional Sections */}
          {!results && (
            <div className="space-y-12">
              {activeSystem && (
                <section>
                  <h2 className="text-xl font-bold mb-6">Your Active System</h2>
                  <SystemStatusCard system={activeSystem} />
                </section>
              )}

              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">Saved Tools</h2>
                  <button onClick={() => navigate('/marketplace')} className="text-sm text-primary hover:underline">Browse More</button>
                </div>
                
                {savedTools.length === 0 ? (
                  <div className="mission-card p-8 text-center border-dashed">
                    <Box className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-muted-foreground">You haven't saved any tools yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {savedTools.slice(0, 3).map(tool => (
                      <ToolStackCard 
                        key={tool.id} 
                        tool={tool} 
                        isSaved={true}
                        onRemove={toggleToolSave}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default SystemBuilderPage;