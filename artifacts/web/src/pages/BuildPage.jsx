import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rocket, ChevronRight, CheckCircle2, AlertCircle,
  ExternalLink, Key, Play, Loader2, ArrowLeft, Sparkles,
  Package, Shield, Zap, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext.jsx';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';

const STAGES = { LOADING: 'loading', TOOL_STACK: 'tool_stack', CREDENTIALS: 'credentials', BUILDING: 'building', COMPLETE: 'complete' };

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('sbep_auth_token')}`,
});

const BuildPage = () => {
  const { systemInstanceId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [stage, setStage] = useState(STAGES.LOADING);
  const [blueprint, setBlueprint] = useState(null);
  const [requiredTools, setRequiredTools] = useState([]);
  const [buildPlan, setBuildPlan] = useState([]);
  const [buildSteps, setBuildSteps] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [buildLog, setBuildLog] = useState([]);
  const [credentials, setCredentials] = useState({});
  const [isExecuting, setIsExecuting] = useState(false);

  const userTier = currentUser?.membershipTier || 'starter';
  const hasAccess = userTier !== 'starter';

  useEffect(() => {
    if (!currentUser) { navigate('/login'); return; }
    loadBuildData();
  }, [systemInstanceId]);

  const loadBuildData = async () => {
    setStage(STAGES.LOADING);
    try {
      const resp = await fetch('/api/build-engine/analyze', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ systemInstanceId: Number(systemInstanceId) }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        if (err.code === 'out_of_credits') {
          toast.error("Out of AI credits. Please top up to continue.");
          navigate('/pricing');
          return;
        }
        throw new Error(err.error || 'Failed to analyze blueprint');
      }
      const data = await resp.json();
      setBlueprint(data.blueprint);
      setRequiredTools(data.requiredTools || []);
      setBuildPlan(data.buildPlan || []);
      setStage(STAGES.TOOL_STACK);
    } catch (err) {
      toast.error('Failed to load build data. Please try again.');
      navigate('/blueprints');
    }
  };

  const handleStartBuild = () => {
    if (!hasAccess) { navigate('/pricing'); return; }
    setStage(STAGES.CREDENTIALS);
  };

  const handleBeginExecution = async () => {
    setStage(STAGES.BUILDING);
    setIsExecuting(true);
    setBuildLog([{ type: 'info', message: `Initializing ${blueprint?.name} build sequence...` }]);

    try {
      // Save credentials via REST API
      if (currentUser?.id) {
        for (const [key, value] of Object.entries(credentials)) {
          if (value?.trim()) {
            await fetch('/api/user-credentials', {
              method: 'POST',
              headers: authHeaders(),
              body: JSON.stringify({
                userId: currentUser.id,
                credentialKey: key,
                credentialValue: value,
              }),
            }).catch(() => null);
          }
        }
      }

      const startResp = await fetch('/api/build-engine/start', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ systemInstanceId: Number(systemInstanceId), buildPlan }),
      });
      if (!startResp.ok) throw new Error('Failed to start build session');
      const { session, steps } = await startResp.json();

      setSessionId(session.id);
      setBuildSteps(steps);
      setBuildLog(prev => [
        ...prev,
        { type: 'success', message: `✓ Build session initialized (ID: ${session.id})` },
        { type: 'info', message: `Starting AI execution across ${steps.length} steps...` },
      ]);

      await executeSteps(steps, session.id, blueprint?.name || '');
    } catch (err) {
      toast.error('Build failed: ' + err.message);
      setIsExecuting(false);
    }
  };

  const executeSteps = async (steps, sid, blueprintName) => {
    const sortedSteps = [...steps].sort((a, b) => a.stepNumber - b.stepNumber);
    for (let i = 0; i < sortedSteps.length; i++) {
      const step = sortedSteps[i];
      const description = step.notes || `Step ${i + 1}`;

      setBuildLog(prev => [...prev, { type: 'working', message: `⚙ [${i + 1}/${sortedSteps.length}] ${description}` }]);

      try {
        const execResp = await fetch('/api/build-engine/execute-step', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            stepId: step.id,
            stepDescription: description,
            blueprintName,
            stepNumber: i + 1,
            totalSteps: sortedSteps.length,
            systemInstanceId: Number(systemInstanceId),
            sessionId: sid,
          }),
        });

        if (execResp.ok) {
          const { output } = await execResp.json();
          setBuildLog(prev => {
            const next = [...prev];
            next[next.length - 1] = { type: 'success', message: `✓ ${output}` };
            return next;
          });
          setCurrentStepIdx(i + 1);
        } else {
          const errData = await execResp.json().catch(() => ({}));
          if (errData.code === 'out_of_credits') {
            setBuildLog(prev => [...prev, { type: 'error', message: '⚠ Out of AI credits. Build paused.' }]);
            setIsExecuting(false);
            toast.error("Out of AI credits. Top up to continue.");
            return;
          }
        }
      } catch {
        setBuildLog(prev => [...prev, { type: 'error', message: `⚠ Step ${i + 1} encountered an issue, continuing...` }]);
      }

      await new Promise(r => setTimeout(r, 800));
    }

    setBuildLog(prev => [
      ...prev,
      { type: 'complete', message: `🎉 ${blueprintName} build complete! System is now active.` },
    ]);
    setIsExecuting(false);
    setStage(STAGES.COMPLETE);
  };

  const requiredCredKeys = [...new Set(
    requiredTools.flatMap(t => t.requiredCredentials || []).filter(Boolean)
  )];

  const progress = buildPlan.length > 0 ? Math.round((currentStepIdx / buildPlan.length) * 100) : 0;

  const groupedTools = requiredTools.reduce((acc, t) => {
    const cat = t.categoryName || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet><title>Build System | Starks Global Group</title></Helmet>
      <Header />
      <main className="flex-grow pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>

          {/* LOADING */}
          {stage === STAGES.LOADING && (
            <div className="flex flex-col items-center justify-center py-32">
              <div className="relative mb-6">
                <div className="w-16 h-16 border-4 border-primary/20 rounded-full" />
                <div className="absolute inset-0 w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-primary" />
              </div>
              <p className="text-foreground font-mono font-semibold mb-2">AI Analyzing Blueprint</p>
              <p className="text-muted-foreground text-sm">Generating your personalized build plan...</p>
            </div>
          )}

          {/* TOOL STACK */}
          {stage === STAGES.TOOL_STACK && blueprint && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="mb-10">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-mono uppercase tracking-wider px-3 py-1 rounded-full mb-4">
                  <Rocket className="w-3.5 h-3.5" /> Step 1 of 3 — Tool Stack
                </div>
                <h1 className="text-3xl md:text-4xl font-bold font-mono mb-3">{blueprint.name}</h1>
                <p className="text-muted-foreground max-w-2xl">{blueprint.description}</p>
              </div>

              {!hasAccess && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8 p-5 rounded-xl border border-amber-500/30 bg-amber-500/5">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-amber-400 mb-1">Builder Plan Required</p>
                      <p className="text-sm text-muted-foreground mb-3">You need a Builder plan ($29/mo) to run the AI Build Agent. Review the tool stack below, then upgrade to start.</p>
                      <Link to="/pricing" className="inline-flex items-center gap-1 text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors">
                        View Plans <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Tools */}
              <div className="mb-10">
                <h2 className="text-lg font-semibold font-mono mb-5 flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" /> Required Tools ({requiredTools.length})
                </h2>
                {Object.keys(groupedTools).length > 0 ? (
                  Object.entries(groupedTools).map(([cat, tools]) => (
                    <div key={cat} className="mb-6">
                      <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono mb-3">{cat}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {tools.map(tool => (
                          <div key={tool.id} className="p-4 rounded-xl border border-border/50 bg-card/60 hover:border-primary/40 transition-colors">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm">{tool.name}</p>
                                {tool.pricing && <p className="text-xs text-primary/80 font-mono mt-0.5">{tool.pricing}</p>}
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tool.description}</p>
                              </div>
                              {tool.affiliateLink && (
                                <a
                                  href={tool.affiliateLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                                >
                                  Get Access <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm italic p-4 rounded-xl border border-dashed border-border">
                    No specific marketplace tools required — the AI will guide you through the setup.
                  </p>
                )}
              </div>

              {/* Build Plan */}
              <div className="mb-10">
                <h2 className="text-lg font-semibold font-mono mb-5 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" /> AI Build Plan ({buildPlan.length} steps)
                </h2>
                <div className="space-y-3">
                  {buildPlan.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-4 p-4 rounded-xl border border-border/30 bg-muted/5">
                      <span className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-mono font-bold flex items-center justify-center">{idx + 1}</span>
                      <p className="text-sm text-muted-foreground mt-0.5">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleStartBuild}
                className="w-full py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-3 bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
              >
                {hasAccess
                  ? <><Rocket className="w-5 h-5" /> Continue to Credentials</>
                  : <><Shield className="w-5 h-5" /> Upgrade to Start Building</>}
              </button>
            </motion.div>
          )}

          {/* CREDENTIALS */}
          {stage === STAGES.CREDENTIALS && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="mb-10">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-mono uppercase tracking-wider px-3 py-1 rounded-full mb-4">
                  <Key className="w-3.5 h-3.5" /> Step 2 of 3 — Credentials
                </div>
                <h1 className="text-3xl font-bold font-mono mb-3">Connect Your Tools</h1>
                <p className="text-muted-foreground">Enter API keys for the tools you've signed up for. These are stored securely in your credential vault.</p>
              </div>

              {requiredCredKeys.length > 0 ? (
                <div className="space-y-4 mb-8">
                  {requiredCredKeys.map(key => {
                    const tool = requiredTools.find(t => (t.requiredCredentials || []).includes(key));
                    return (
                      <div key={key} className="p-5 rounded-xl border border-border/50 bg-card/60">
                        <label className="block text-sm font-semibold mb-1 font-mono">{key}</label>
                        {tool && <p className="text-xs text-muted-foreground mb-3">Required for: {tool.name}</p>}
                        <input
                          type="password"
                          placeholder={`Paste your ${key} here...`}
                          value={credentials[key] || ''}
                          onChange={e => setCredentials(p => ({ ...p, [key]: e.target.value }))}
                          className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-primary transition-colors"
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 mb-8 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
                  <p className="font-semibold mb-1">No Credentials Needed</p>
                  <p className="text-sm text-muted-foreground">This blueprint doesn't require API keys upfront. Ready to build!</p>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => setStage(STAGES.TOOL_STACK)}
                  className="flex-1 py-3 rounded-xl border border-border/50 text-sm font-semibold hover:border-primary/40 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleBeginExecution}
                  className="flex-[3] py-3 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                  <Play className="w-4 h-4" /> Start AI Build Agent
                </button>
              </div>
            </motion.div>
          )}

          {/* BUILDING */}
          {stage === STAGES.BUILDING && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-mono uppercase tracking-wider px-3 py-1 rounded-full mb-4">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" /> Step 3 of 3 — AI Building
                </div>
                <h1 className="text-3xl font-bold font-mono mb-2">Building {blueprint?.name}</h1>
                <p className="text-muted-foreground">The AI agent is constructing your system step by step.</p>
              </div>

              <div className="mb-8">
                <div className="flex justify-between text-sm font-mono mb-2">
                  <span className="text-muted-foreground">Build Progress</span>
                  <span className="text-primary font-bold">{progress}%</span>
                </div>
                <div className="h-3 bg-muted/30 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-2 font-mono">
                  <span>{currentStepIdx} / {buildPlan.length} steps complete</span>
                  {isExecuting && (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin" /> Running...
                    </span>
                  )}
                </div>
              </div>

              {/* Terminal */}
              <div className="rounded-xl border border-border/40 bg-black/40 backdrop-blur-sm overflow-hidden shadow-xl">
                <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="ml-2 text-xs text-muted-foreground font-mono">
                    ASH Build Agent — {blueprint?.name}
                  </span>
                  {isExecuting && (
                    <span className="ml-auto flex items-center gap-1.5 text-xs text-primary font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> LIVE
                    </span>
                  )}
                </div>
                <div className="p-4 font-mono text-sm space-y-1.5 max-h-96 overflow-y-auto">
                  <AnimatePresence>
                    {buildLog.map((entry, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={
                          entry.type === 'success' ? 'text-emerald-400' :
                          entry.type === 'error' ? 'text-rose-400' :
                          entry.type === 'complete' ? 'text-primary font-bold' :
                          entry.type === 'working' ? 'text-amber-400' : 'text-muted-foreground'
                        }
                      >
                        <span className="text-muted-foreground/30 mr-2 select-none">&gt;</span>
                        {entry.message}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {isExecuting && (
                    <div className="text-muted-foreground/30 flex items-center gap-2">
                      <span>&gt;</span><span className="animate-pulse">█</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* COMPLETE */}
          {stage === STAGES.COMPLETE && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-8"
              >
                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              </motion.div>
              <h1 className="text-4xl font-bold font-mono mb-4">System Deployed!</h1>
              <p className="text-muted-foreground max-w-lg mx-auto mb-10">
                Your <span className="text-foreground font-semibold">{blueprint?.name}</span> system has been built and is now active. Manage it from your dashboard.
              </p>
              <div className="flex gap-4 justify-center">
                <Link
                  to="/dashboard"
                  className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                  Go to Dashboard
                </Link>
                <Link
                  to="/blueprints"
                  className="px-8 py-3 rounded-xl border border-border/50 font-semibold hover:border-primary/40 transition-colors"
                >
                  Build Another
                </Link>
              </div>
            </motion.div>
          )}

        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BuildPage;
