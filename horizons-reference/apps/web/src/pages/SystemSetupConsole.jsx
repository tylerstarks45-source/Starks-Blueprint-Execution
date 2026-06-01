import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { ArrowLeft, LayoutTemplate, Target, ExternalLink, Copy, CheckCircle2, BookmarkPlus } from 'lucide-react';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext.jsx';

import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';

const SystemSetupConsole = () => {
  const { blueprintId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [blueprint, setBlueprint] = useState(null);
  const [tools, setTools] = useState([]);
  const [steps, setSteps] = useState([]);
  
  const [savedRecordId, setSavedRecordId] = useState(null);
  const [completedSteps, setCompletedSteps] = useState([]);

  useEffect(() => {
    const fetchConsoleData = async () => {
      setIsLoading(true);
      try {
        // Fetch blueprint using ID OR Slug
        let bp;
        try {
          bp = await pb.collection('blueprints').getOne(blueprintId, {
            expand: 'required_tools,tools_required',
            $autoCancel: false
          });
        } catch(e) {
          bp = await pb.collection('blueprints').getFirstListItem(`slug="${blueprintId}"`, {
            expand: 'required_tools,tools_required',
            $autoCancel: false
          });
        }

        setBlueprint(bp);
        
        const requiredTools = bp?.expand?.required_tools || bp?.expand?.tools_required || [];
        setTools(requiredTools);
        
        // Use DB steps or fallback
        const dbSteps = bp.setup_steps || [];
        const formattedSteps = dbSteps.length > 0 
          ? dbSteps.map((s, i) => ({
              id: `step-${i}`,
              title: s.title || s,
              instructions: s.description || 'Follow standard operating procedures for this layer.',
              timeEstimate: '15-30 mins',
              relatedTools: requiredTools.slice(0, 2)
            }))
          : [
            { id: 'step-1', title: 'Core Setup', instructions: 'Create accounts and initialize environment.', timeEstimate: '10 mins', relatedTools: requiredTools },
            { id: 'step-2', title: 'Integration', instructions: 'Connect APIs and webhooks between services.', timeEstimate: '20 mins', relatedTools: requiredTools },
            { id: 'step-3', title: 'Deployment', instructions: 'Test thoroughly and push to production.', timeEstimate: '15 mins', relatedTools: requiredTools }
          ];

        setSteps(formattedSteps);

        if (currentUser) {
          try {
            const existingRecord = await pb.collection('saved_systems').getFirstListItem(
              `userId="${currentUser.id}" && blueprintId="${bp.id}"`,
              { $autoCancel: false }
            );
            if (existingRecord) {
              setSavedRecordId(existingRecord.id);
              if (existingRecord.stepCompletionData) {
                const parsed = typeof existingRecord.stepCompletionData === 'string' 
                  ? JSON.parse(existingRecord.stepCompletionData) 
                  : existingRecord.stepCompletionData;
                setCompletedSteps(Array.isArray(parsed) ? parsed : []);
              }
            }
          } catch (err) {
            // expected if not saved
          }
        }

      } catch (error) {
        console.error("Error loading console:", error);
        toast.error("Failed to load system blueprint.");
        navigate('/dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    if (blueprintId) {
      fetchConsoleData();
    }
  }, [blueprintId, currentUser, navigate]);

  const toggleStep = (stepId) => {
    setCompletedSteps(prev => 
      prev.includes(stepId) ? prev.filter(id => id !== stepId) : [...prev, stepId]
    );
  };

  const getProgress = () => steps.length === 0 ? 0 : Math.round((completedSteps.length / steps.length) * 100);

  const handleSaveSystem = async () => {
    if (!currentUser) {
      toast.error("Log in to save progress.");
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        userId: currentUser.id,
        blueprintId: blueprint.id,
        completedSteps: completedSteps.length,
        totalSteps: steps.length,
        progress: getProgress(),
        status: completedSteps.length === steps.length ? 'Completed' : (completedSteps.length > 0 ? 'In Progress' : 'Not Started'),
        stepCompletionData: JSON.stringify(completedSteps)
      };

      if (savedRecordId) {
        await pb.collection('saved_systems').update(savedRecordId, payload, { $autoCancel: false });
      } else {
        const newRecord = await pb.collection('saved_systems').create(payload, { $autoCancel: false });
        setSavedRecordId(newRecord.id);
      }
      toast.success("System progress saved!");
      navigate('/dashboard');
    } catch (error) {
      toast.error("Failed to save system.");
    } finally {
      setIsSaving(false);
    }
  };

  const copyGuide = () => {
    const text = steps.map((s, i) => `STEP ${i+1}: ${s.title}\n${s.instructions}`).join('\n\n');
    navigator.clipboard.writeText(`--- ${blueprint.name} Setup Guide ---\n\n${text}`);
    toast.success("Full guide copied to clipboard!");
  };

  const openAllTools = () => {
    const links = tools.filter(t => t.affiliate_link).map(t => t.affiliate_link);
    if (links.length === 0) {
      toast.error("No affiliate links available for these tools.");
      return;
    }
    links.forEach(link => window.open(link, '_blank'));
    toast.success(`Opening ${links.length} tools in new tabs...`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!blueprint) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col bg-grid-pattern">
      <Helmet><title>{blueprint.name} Setup | System Console</title></Helmet>

      <Header />

      {/* HEADER BAR */}
      <div className="bg-card/80 backdrop-blur border-b border-border sticky top-20 z-40 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-muted rounded-md transition-colors"><ArrowLeft className="w-5 h-5" /></button>
            <div>
              <h1 className="text-xl font-bold text-foreground">{blueprint.name}</h1>
              <p className="text-xs text-primary font-mono uppercase tracking-wider">Deployment Console</p>
            </div>
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="w-full sm:w-48 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-500" style={{ width: `${getProgress()}%` }} />
            </div>
            <span className="text-sm font-bold font-mono">{getProgress()}%</span>
          </div>
        </div>
      </div>

      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-10 max-w-5xl space-y-12">

        {/* SECTION 1: YOUR SYSTEM STACK */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
            <LayoutTemplate className="w-6 h-6 text-primary" /> Section 1: Your System Stack
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.length > 0 ? tools.map(tool => (
              <div key={tool.id} className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors shadow-sm">
                <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded uppercase mb-3 inline-block">
                  {tool.category || 'Core Tool'}
                </span>
                <h3 className="font-bold text-lg mb-2 text-foreground">{tool.name}</h3>
                <p className="text-sm text-muted-foreground mb-6 line-clamp-2">{tool.description || tool.core_problem}</p>
                {tool.affiliate_link ? (
                  <a href={tool.affiliate_link} target="_blank" rel="noopener noreferrer" className="w-full block text-center py-2.5 bg-primary/10 hover:bg-primary/20 text-primary font-bold rounded-lg transition-colors border border-primary/20">
                    Access Tool
                  </a>
                ) : (
                  <button disabled className="w-full py-2.5 bg-muted text-muted-foreground font-bold rounded-lg cursor-not-allowed">
                    Link Unavailable
                  </button>
                )}
              </div>
            )) : (
              <div className="col-span-full p-8 text-center border border-dashed rounded-xl bg-card">
                <p className="text-muted-foreground">No specific tools bound to this architecture yet.</p>
              </div>
            )}
          </div>
        </section>

        {/* SECTION 2: BUILD STEPS */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
            <Target className="w-6 h-6 text-primary" /> Section 2: Actionable Build Steps
          </h2>
          <div className="space-y-6">
            {steps.map((step, index) => {
              const isDone = completedSteps.includes(step.id);
              return (
                <div key={step.id} className={`p-6 md:p-8 rounded-2xl border transition-all ${isDone ? 'bg-primary/5 border-primary/30' : 'bg-card border-border hover:border-primary/50'}`}>
                  <div className="flex flex-col md:flex-row md:items-start gap-6">
                    <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center font-bold text-lg ${isDone ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className={`text-xl font-bold ${isDone ? 'text-foreground' : 'text-foreground'}`}>{step.title}</h3>
                        <span className="text-xs font-mono text-muted-foreground bg-background px-2 py-1 rounded border border-border">~ {step.timeEstimate}</span>
                      </div>
                      <p className="text-muted-foreground mb-6 leading-relaxed">{step.instructions}</p>
                      
                      <div className="flex flex-wrap items-center gap-3">
                        <button 
                          onClick={() => toggleStep(step.id)}
                          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 ${isDone ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'}`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {isDone ? 'Completed' : 'Mark Complete'}
                        </button>
                        
                        {step.relatedTools && step.relatedTools.map(t => t.affiliate_link && (
                          <a key={t.id} href={t.affiliate_link} target="_blank" rel="noopener noreferrer" className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted text-foreground flex items-center gap-2">
                            Open {t.name} <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* SECTION 3: LAUNCH CONTROLS */}
        <section className="bg-primary/10 border border-primary/30 rounded-3xl p-8 md:p-12 shadow-neon-blue">
          <h2 className="text-2xl font-bold text-foreground mb-8 text-center">Section 3: Launch Controls</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button onClick={openAllTools} className="py-4 bg-card hover:bg-muted border border-border rounded-xl font-bold text-foreground transition-all flex flex-col items-center gap-2">
              <ExternalLink className="w-6 h-6 text-primary" /> Open All Tools
            </button>
            <button onClick={copyGuide} className="py-4 bg-card hover:bg-muted border border-border rounded-xl font-bold text-foreground transition-all flex flex-col items-center gap-2">
              <Copy className="w-6 h-6 text-primary" /> Copy Setup Guide
            </button>
            <button onClick={handleSaveSystem} disabled={isSaving} className="py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold transition-all flex flex-col items-center gap-2 shadow-[0_0_15px_hsl(var(--primary)/0.4)] disabled:opacity-50">
              <BookmarkPlus className="w-6 h-6" /> {isSaving ? 'Saving...' : 'Save & Exit'}
            </button>
          </div>
        </section>

      </main>
      
      <Footer />
    </div>
  );
};

export default SystemSetupConsole;