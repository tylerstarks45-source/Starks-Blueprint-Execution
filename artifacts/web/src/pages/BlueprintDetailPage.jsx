import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, Rocket, Clock, Target, Layers, ArrowRight, Box, Code, Copy, CheckCircle2 } from 'lucide-react';
import pb from '@/lib/pocketbaseClient.js';
import { toast } from 'sonner';

import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import ToolStackCard from '@/components/ToolStackCard.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';

const BlueprintDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [blueprint, setBlueprint] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  useEffect(() => {
    const fetchBlueprint = async () => {
      setIsLoading(true);
      setError(false);
      try {
        const record = await pb.collection('blueprints').getFirstListItem(`slug="${slug}"`, {
          expand: 'required_tools',
          $autoCancel: false
        });
        setBlueprint(record);
      } catch (err) {
        console.error("Blueprint fetch error:", err);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    if (slug) fetchBlueprint();
  }, [slug]);

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleUseBlueprint = async () => {
    if (!currentUser) {
      toast.error("Please login to deploy this system");
      navigate('/login');
      return;
    }
    try {
      const instance = await pb.collection('saved_systems').create({
        userId: currentUser.id,
        blueprintId: blueprint.id,
        name: blueprint.name,
        status: 'Not Started',
        progress: 0
      }, { $autoCancel: false });
      toast.success("Blueprint saved — launching AI Build Agent");
      navigate(`/build/${instance.id}`);
    } catch (err) {
      toast.error("Failed to save system.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
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

  const steps = blueprint.setup_steps || [];
  const tools = blueprint.expand?.required_tools || [];
  const prompts = blueprint.system_details?.prompts || [
    { title: "System Persona Prompt", content: "Act as an expert direct response copywriter. Your goal is to rewrite the provided input into a high-converting email sequence." },
    { title: "Data Extraction Logic", content: "Extract [Name], [Email], and [Intent] from the webhook payload using JSON parsing." }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col bg-grid-pattern selection:bg-primary/20">
      <Helmet>
        <title>{`${blueprint.name || blueprint.system_name} | System Blueprint`}</title>
      </Helmet>
      
      <Header />
      
      <main className="flex-grow pt-24 pb-24">
        <div className="container mx-auto px-4 max-w-5xl">
          
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="cinematic-card p-8 md:p-12 mb-12 border-primary/30 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 mix-blend-screen pointer-events-none">
              <Layers className="w-64 h-64 text-primary" />
            </div>

            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
                <Rocket className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-mono uppercase tracking-wider border border-primary/20 rounded">
                System Blueprint
              </span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground mb-4 tracking-tight font-mono relative z-10">
              {blueprint.name || blueprint.system_name}
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-3xl leading-relaxed font-medium relative z-10">
              {blueprint.description}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-border/50 relative z-10">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> Setup Time</p>
                <p className="font-bold text-foreground text-lg">{blueprint.setup_time || '2-4 Hours'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><Target className="w-3.5 h-3.5"/> Difficulty</p>
                <p className="font-bold text-foreground text-lg capitalize">{blueprint.difficulty_level || 'Intermediate'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><Layers className="w-3.5 h-3.5"/> Expected Outcome</p>
                <p className="font-bold text-emerald-400 text-lg">{blueprint.expected_outcome || 'Automated Pipeline'}</p>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Col: Main Blueprint Content */}
            <div className="lg:col-span-2 space-y-10">
              
              {/* Architecture Steps */}
              <section>
                <h2 className="text-2xl font-bold flex items-center gap-3 mb-6 font-mono">
                  <span className="w-8 h-8 rounded-lg bg-secondary/20 text-secondary flex items-center justify-center text-sm font-bold border border-secondary/30">1</span>
                  System Architecture
                </h2>
                
                <div className="space-y-4">
                  {steps.length > 0 ? steps.map((step, idx) => (
                    <div key={idx} className="p-6 bg-card border border-border/50 rounded-xl relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1 h-full bg-primary/50 group-hover:bg-primary transition-colors"></div>
                      <h4 className="font-bold text-foreground mb-2 text-lg">{typeof step === 'string' ? step : step.title}</h4>
                      {step.description && <p className="text-muted-foreground leading-relaxed">{step.description}</p>}
                    </div>
                  )) : (
                    <div className="p-8 border border-dashed border-border rounded-xl text-center text-muted-foreground">
                      Detailed step-by-step logic generated during setup.
                    </div>
                  )}
                </div>
              </section>

              {/* Blueprint Logic & Prompts */}
              <section>
                <h2 className="text-2xl font-bold flex items-center gap-3 mb-6 font-mono">
                  <span className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-sm font-bold border border-primary/30">2</span>
                  Core Logic & Templates
                </h2>
                <div className="space-y-6">
                  {prompts.map((prompt, idx) => (
                    <div key={idx} className="cinematic-card overflow-hidden">
                      <div className="bg-muted/50 px-4 py-3 border-b border-border/50 flex justify-between items-center">
                        <span className="text-sm font-bold font-mono text-foreground flex items-center gap-2"><Code className="w-4 h-4 text-primary"/> {prompt.title}</span>
                        <button 
                          onClick={() => handleCopy(prompt.content, idx)}
                          className="text-xs flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors bg-background px-2 py-1 rounded border border-border"
                        >
                          {copiedIndex === idx ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400"/> : <Copy className="w-3.5 h-3.5"/>}
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

            </div>

            {/* Right Col: Integrations, Tools, Actions */}
            <div className="space-y-8">
              
              <div className="cinematic-card p-6 border-primary/30 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none"></div>
                <h3 className="text-lg font-bold mb-4 font-mono relative z-10">Deploy Architecture</h3>
                <p className="text-sm text-muted-foreground mb-6 relative z-10">Create a new instance of this system in your operations center.</p>
                <button 
                  onClick={handleUseBlueprint}
                  className="saas-button w-full py-4 text-base shadow-cinematic relative z-10"
                >
                  Use This Blueprint <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>

              {/* Required Integrations Block */}
              <div className="cinematic-card p-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 border-b border-border/50 pb-2">Required Integrations</h3>
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
                  <Link to="/my-stack" className="block text-center text-xs font-bold text-primary hover:underline mt-4">Manage My Stack &rarr;</Link>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 border-b border-border/50 pb-2">Recommended Tools</h3>
                <div className="space-y-4">
                  {tools.length > 0 ? tools.map(tool => (
                    <ToolStackCard key={tool.id} tool={tool} />
                  )) : (
                    <div className="p-6 text-center border border-dashed border-border rounded-xl">
                      <p className="text-sm text-muted-foreground">Standard integration tools required.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default BlueprintDetailPage;