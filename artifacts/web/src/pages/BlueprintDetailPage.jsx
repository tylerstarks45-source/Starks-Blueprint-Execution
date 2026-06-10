import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, useNavigate, Link } from 'react-router-dom';
import CanonicalUrl from '@/components/CanonicalUrl.jsx';
import { motion } from 'framer-motion';
import {
  AlertTriangle, Rocket, Clock, Target, Layers, ArrowRight,
  Box, Code, Copy, CheckCircle2, Zap, Play, Loader2, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
};

const DIFF_COLOR = {
  beginner: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  intermediate: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  advanced: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

const BlueprintDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [blueprint, setBlueprint] = useState(null);
  const [tools, setTools] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuilding, setIsBuilding] = useState(false);
  const [error, setError] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  useEffect(() => {
    if (!slug) return;
    const fetchData = async () => {
      setIsLoading(true);
      setError(false);
      try {
        const [bpRes, toolsRes] = await Promise.all([
          fetch(`/api/blueprints?slug=${encodeURIComponent(slug)}`),
          fetch('/api/tools'),
        ]);

        if (!bpRes.ok) throw new Error('Blueprint not found');
        const bps = await bpRes.json();
        const bp = Array.isArray(bps) ? bps[0] : bps;
        if (!bp) throw new Error('Blueprint not found');
        setBlueprint(bp);

        if (toolsRes.ok) {
          const allTools = await toolsRes.json();
          setTools(Array.isArray(allTools) ? allTools.slice(0, 6) : []);
        }
      } catch (err) {
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [slug]);

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleBuildBlueprint = async () => {
    if (!currentUser) {
      toast.error("Please log in to build this blueprint");
      navigate('/login', { state: { from: `/blueprints/${slug}` } });
      return;
    }
    if (!blueprint) return;

    setIsBuilding(true);
    try {
      const resp = await fetch('/api/system-instances', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ blueprintId: blueprint.id, name: blueprint.name, userId: currentUser.id }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create system instance');
      }

      const instance = await resp.json();
      toast.success(`Launching AI Build Agent for "${blueprint.name}"...`);
      navigate(`/systems/${instance.id}`);
    } catch (err) {
      toast.error(err.message || 'Failed to start build. Please try again.');
    } finally {
      setIsBuilding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground font-mono text-sm">Loading blueprint...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !blueprint) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Helmet><title>Blueprint Not Found</title></Helmet>
        <Header />
        <main className="flex-grow flex items-center justify-center p-4">
          <div className="cinematic-card p-10 text-center max-w-md w-full border-destructive/30">
            <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-3">Blueprint Not Found</h2>
            <p className="text-muted-foreground mb-8">The system architecture you requested does not exist.</p>
            <button onClick={() => navigate('/blueprints')} className="saas-button w-full">
              Back to Blueprints
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const steps = blueprint.setupSteps || blueprint.setup_steps || [];
  const diffKey = (blueprint.difficulty || blueprint.difficultyLevel || 'intermediate').toLowerCase();
  const diffBadge = DIFF_COLOR[diffKey] || DIFF_COLOR.intermediate;

  const prompts = [
    {
      title: "AI System Persona",
      content: `You are an expert automation engineer building the "${blueprint.name}" system. Your goal is to execute each step precisely, verify outputs, and create a reliable automated pipeline.`
    },
    {
      title: "Build Instruction Template",
      content: `Blueprint: ${blueprint.name}\nObjective: ${blueprint.description || 'Automate and scale operations'}\nExecute systematically, test each component, and confirm activation.`
    }
  ];

  const bpDescription = blueprint.description
    ? blueprint.description.slice(0, 155).replace(/\s+\S*$/, '') + (blueprint.description.length > 155 ? '…' : '')
    : `${blueprint.name} — a step-by-step AI system blueprint from Starks Global Group for building automated income streams.`;

  return (
    <div className="min-h-screen bg-background flex flex-col bg-grid-pattern selection:bg-primary/20">
      <CanonicalUrl />
      <Helmet>
        <title>{`${blueprint.name} | System Blueprint`}</title>
        <meta name="description" content={bpDescription} />
      </Helmet>

      <Header />

      <main className="flex-grow pt-24 pb-24">
        <div className="container mx-auto px-4 max-w-5xl">

          {/* Hero Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="cinematic-card p-8 md:p-12 mb-10 border-primary/30 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 mix-blend-screen pointer-events-none">
              <Layers className="w-64 h-64 text-primary" />
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-6 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
                <Rocket className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-mono uppercase tracking-wider border border-primary/20 rounded">
                System Blueprint
              </span>
              {blueprint.difficulty && (
                <span className={`px-3 py-1 text-xs font-mono uppercase tracking-wider border rounded capitalize ${diffBadge}`}>
                  {blueprint.difficulty}
                </span>
              )}
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground mb-4 tracking-tight font-mono relative z-10">
              {blueprint.name}
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-3xl leading-relaxed font-medium relative z-10">
              {blueprint.description}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-border/50 relative z-10">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Setup Time
                </p>
                <p className="font-bold text-foreground text-lg">
                  {blueprint.estimatedTime || blueprint.setup_time || '2-4 Hours'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" /> Difficulty
                </p>
                <p className="font-bold text-foreground text-lg capitalize">
                  {blueprint.difficulty || 'Intermediate'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> Est. Cost
                </p>
                <p className="font-bold text-foreground text-lg">
                  {blueprint.estimatedCost || blueprint.estimated_cost || '$0-50/mo'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" /> Expected Outcome
                </p>
                <p className="font-bold text-emerald-400 text-lg">
                  Automated Pipeline
                </p>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Main content */}
            <div className="lg:col-span-2 space-y-10">

              {/* Architecture Steps */}
              <section>
                <h2 className="text-2xl font-bold flex items-center gap-3 mb-6 font-mono">
                  <span className="w-8 h-8 rounded-lg bg-secondary/20 text-secondary flex items-center justify-center text-sm font-bold border border-secondary/30">1</span>
                  System Architecture
                </h2>
                <div className="space-y-4">
                  {Array.isArray(steps) && steps.length > 0 ? steps.map((step, idx) => (
                    <div key={idx} className="p-6 bg-card border border-border/50 rounded-xl relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1 h-full bg-primary/50 group-hover:bg-primary transition-colors" />
                      <div className="flex items-start gap-4">
                        <span className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-mono font-bold flex items-center justify-center mt-0.5">
                          {idx + 1}
                        </span>
                        <div>
                          <h4 className="font-bold text-foreground mb-1 text-lg">
                            {typeof step === 'string' ? step : (step.title || step.name || `Step ${idx + 1}`)}
                          </h4>
                          {step.description && (
                            <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="p-8 border border-dashed border-border rounded-xl text-center">
                      <Rocket className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground">
                        Detailed step-by-step logic is generated by the AI Build Agent when you start building.
                      </p>
                    </div>
                  )}
                </div>
              </section>

              {/* Core Logic */}
              <section>
                <h2 className="text-2xl font-bold flex items-center gap-3 mb-6 font-mono">
                  <span className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-sm font-bold border border-primary/30">2</span>
                  Core Logic & Templates
                </h2>
                <div className="space-y-6">
                  {prompts.map((prompt, idx) => (
                    <div key={idx} className="cinematic-card overflow-hidden">
                      <div className="bg-muted/50 px-4 py-3 border-b border-border/50 flex justify-between items-center">
                        <span className="text-sm font-bold font-mono text-foreground flex items-center gap-2">
                          <Code className="w-4 h-4 text-primary" /> {prompt.title}
                        </span>
                        <button
                          onClick={() => handleCopy(prompt.content, idx)}
                          className="text-xs flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors bg-background px-2 py-1 rounded border border-border"
                        >
                          {copiedIndex === idx
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            : <Copy className="w-3.5 h-3.5" />}
                          {copiedIndex === idx ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <div className="p-4 bg-[#0a0a0a]">
                        <pre className="text-sm text-emerald-400 font-mono whitespace-pre-wrap leading-relaxed">{prompt.content}</pre>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Recommended Tools */}
              {tools.length > 0 && (
                <section>
                  <h2 className="text-2xl font-bold flex items-center gap-3 mb-6 font-mono">
                    <span className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-bold border border-emerald-500/30">3</span>
                    Recommended Tools
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tools.map(tool => (
                      <div key={tool.id} className="p-4 rounded-xl border border-border/50 bg-card/60 hover:border-primary/40 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm">{tool.name}</p>
                            {tool.pricing && (
                              <p className="text-xs text-primary/80 font-mono mt-0.5">{tool.pricing}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tool.description}</p>
                          </div>
                          {tool.affiliateLink && (
                            <a
                              href={tool.affiliateLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 border border-primary/20 transition-colors"
                            >
                              Get <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">

              {/* Build CTA — PRIMARY ACTION */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="cinematic-card p-6 border-primary/40 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs text-emerald-400 font-mono">AI Agent Ready</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2 font-mono">Build This Blueprint</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Launch the AI Build Agent to construct this system step by step with your tools and credentials.
                  </p>
                  <button
                    onClick={handleBuildBlueprint}
                    disabled={isBuilding}
                    className="w-full py-4 text-base font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all shadow-lg shadow-primary/30 flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none"
                  >
                    {isBuilding ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Launching Agent...
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5" />
                        Build This Blueprint
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  {!currentUser && (
                    <p className="text-xs text-center text-muted-foreground/60 mt-3">
                      <Link to="/login" className="text-primary hover:underline">Log in</Link> to start building
                    </p>
                  )}
                </div>
              </motion.div>

              {/* Required Integrations */}
              <div className="cinematic-card p-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 border-b border-border/50 pb-2">
                  Required Integrations
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted/20 border border-border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Box className="w-4 h-4 text-primary" />
                      <span className="text-sm font-bold">OpenRouter API</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded border border-amber-500/20">Required</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/20 border border-border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Box className="w-4 h-4 text-secondary" />
                      <span className="text-sm font-bold">Webhook Listener</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded border border-emerald-500/20">Supported</span>
                  </div>
                  <Link to="/my-stack" className="block text-center text-xs font-bold text-primary hover:underline mt-4">
                    Manage My Stack →
                  </Link>
                </div>
              </div>

              {/* Back to Blueprints */}
              <Link
                to="/blueprints"
                className="block text-center py-3 rounded-xl border border-border/50 text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
              >
                ← Browse All Blueprints
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BlueprintDetailPage;
