import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Sparkles, ArrowRight, Box, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useSystemGenerator } from '@/hooks/useSystemGenerator.js';

import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import SystemPlanCard from '@/components/SystemPlanCard.jsx';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
};

const SUGGESTIONS = [
  "Affiliate marketing system",
  "Lead generation system",
  "AI video automation",
  "Email marketing funnel",
  "Passive income blog",
  "Social media automation",
];

const SystemBuilderPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { generateSystem, isGenerating, results } = useSystemGenerator();

  const [query, setQuery] = useState('');
  const [activeSystem, setActiveSystem] = useState(null);
  const [buildingId, setBuildingId] = useState(null);

  useEffect(() => {
    if (!currentUser?.id) return;
    const fetchActive = async () => {
      try {
        const res = await fetch('/api/system-instances', { headers: authHeaders() });
        if (!res.ok) return;
        const instances = await res.json();
        const notDone = (Array.isArray(instances) ? instances : [])
          .filter(s => s.buildStatus !== 'active')
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        if (notDone.length > 0) setActiveSystem(notDone[0]);
      } catch {
        // silently handle
      }
    };
    fetchActive();
  }, [currentUser?.id]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) generateSystem(query);
  };

  const handleBuild = async (blueprint) => {
    if (!currentUser) {
      navigate('/login', { state: { from: '/system-builder' } });
      return;
    }
    setBuildingId(blueprint.id);
    try {
      const resp = await fetch('/api/system-instances', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ blueprintId: blueprint.id, name: blueprint.name, userId: currentUser.id }),
      });
      if (!resp.ok) throw new Error('Failed to create system');
      const instance = await resp.json();
      navigate(`/systems/${instance.id}`);
    } catch {
      setBuildingId(null);
    }
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
              <h1 className="text-4xl md:text-6xl font-extrabold text-foreground mb-4 text-glow font-mono">
                Build Your AI System
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Describe what you want to achieve, and the AI will architect the perfect automation stack for you.
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
                  placeholder="What do you want to build? e.g. 'passive income from blogging'"
                  className="w-full bg-transparent border-none text-foreground text-lg px-4 py-6 focus:ring-0 placeholder:text-muted-foreground/50"
                />
                <button
                  type="submit"
                  disabled={isGenerating || !query.trim()}
                  className="mr-3 saas-button py-3 px-8 disabled:opacity-50 disabled:pointer-events-none"
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

          {/* Results */}
          {results && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-20 space-y-12"
            >
              <div className="flex items-center gap-3 mb-8">
                <Sparkles className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-bold">Matched Blueprints</h2>
              </div>

              {results.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-border rounded-xl">
                  <p className="text-lg text-muted-foreground">No blueprints found. Try different keywords or browse all blueprints.</p>
                </div>
              ) : (
                results.map(bp => (
                  <div key={bp.id} className="space-y-6 pb-10 border-b border-border/50 last:border-0">
                    <SystemPlanCard system={bp} />
                    <div className="flex items-center gap-4 justify-end">
                      <button
                        onClick={() => navigate(`/blueprints/${bp.slug}`)}
                        className="px-6 py-3 rounded-xl border border-border/50 text-sm font-semibold hover:border-primary/40 transition-colors"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => handleBuild(bp)}
                        disabled={buildingId === bp.id}
                        className="saas-button text-base px-8 py-3 shadow-[0_0_20px_hsl(var(--primary)/0.3)] disabled:opacity-60 flex items-center gap-2"
                      >
                        {buildingId === bp.id ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Launching...</>
                        ) : (
                          <>Build This System <ArrowRight className="w-4 h-4" /></>
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}

          {/* No results yet — show active system + suggestions */}
          {!results && (
            <div className="space-y-12">
              {activeSystem && (
                <section>
                  <h2 className="text-xl font-bold mb-6 font-mono">Your Active System</h2>
                  <div className="p-6 rounded-xl border border-primary/20 bg-primary/5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-foreground">{activeSystem.name}</p>
                        <p className="text-sm text-muted-foreground mt-1 capitalize">
                          Status: {activeSystem.buildStatus || 'pending'} · Health: {activeSystem.healthStatus || 'unknown'}
                        </p>
                      </div>
                      <button
                        onClick={() => navigate(`/systems/${activeSystem.id}`)}
                        className="saas-button py-2 px-6 text-sm whitespace-nowrap"
                      >
                        Continue Building →
                      </button>
                    </div>
                  </div>
                </section>
              )}

              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold font-mono">Browse All Blueprints</h2>
                  <button onClick={() => navigate('/blueprints')} className="text-sm text-primary hover:underline">
                    View All →
                  </button>
                </div>
                <div className="p-8 text-center border border-dashed border-border rounded-xl">
                  <Box className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">Type your goal above to find the perfect blueprint, or browse all available blueprints.</p>
                  <button
                    onClick={() => navigate('/blueprints')}
                    className="mt-4 saas-button py-2 px-6 text-sm"
                  >
                    Browse Blueprints
                  </button>
                </div>
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
