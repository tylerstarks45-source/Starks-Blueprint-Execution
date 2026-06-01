import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { 
  Rocket, Clock, Target, Layers, ArrowRight, CheckCircle2, 
  AlertTriangle, DollarSign, Zap, Wrench, BarChart3, ShieldAlert
} from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';

const BlueprintDetailTemplate = ({ data }) => {
  if (!data) return null;

  const {
    name, headline, subheadline, incomeRange, launchTime, skillLevel,
    howItWorks = [], toolStack = [], stepByStep = [], outputs = [],
    monetization = [], mistakes = [], ctaText, ctaDescription
  } = data;

  // Group tools by category if categories are provided
  const toolsByCategory = toolStack.reduce((acc, tool) => {
    const cat = tool.category || 'Other Tools';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(tool);
    return acc;
  }, {});
  
  const hasCategories = Object.keys(toolsByCategory).length > 1 || Object.keys(toolsByCategory)[0] !== 'Other Tools';

  return (
    <div className="min-h-screen bg-background flex flex-col starfield">
      <Helmet>
        <title>{`${name} | System Blueprint`}</title>
        <meta name="description" content={subheadline} />
      </Helmet>
      
      <Header />
      
      <main className="flex-grow pt-24 pb-24 relative z-10">
        <div className="container mx-auto px-4 max-w-6xl space-y-24">
          
          {/* HERO SECTION */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="sci-fi-card text-center py-16 px-8 relative overflow-hidden"
          >
            <div className="absolute inset-0 grid-lines opacity-20 pointer-events-none"></div>
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-bold mb-8">
                <Rocket className="w-4 h-4" /> System Blueprint
              </div>
              
              <h1 className="text-4xl md:text-6xl font-extrabold mb-6 glow-text-cyan text-balance">
                {headline}
              </h1>
              
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed">
                {subheadline}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
                <div className="bg-background/50 border border-border rounded-xl p-6 flex flex-col items-center">
                  <DollarSign className="w-8 h-8 text-emerald-400 mb-3" />
                  <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Income Potential</p>
                  <p className="text-xl font-bold text-foreground">{incomeRange}</p>
                </div>
                <div className="bg-background/50 border border-border rounded-xl p-6 flex flex-col items-center">
                  <Clock className="w-8 h-8 text-primary mb-3" />
                  <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Launch Time</p>
                  <p className="text-xl font-bold text-foreground">{launchTime}</p>
                </div>
                <div className="bg-background/50 border border-border rounded-xl p-6 flex flex-col items-center">
                  <Target className="w-8 h-8 text-secondary mb-3" />
                  <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Skill Level</p>
                  <p className="text-xl font-bold text-foreground">{skillLevel}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="saas-button text-lg px-8 py-4 shadow-[0_0_20px_hsl(var(--primary)/0.4)]">
                  {ctaText || 'Get This System Now'} <ArrowRight className="w-5 h-5 ml-2" />
                </button>
                <button className="inline-flex items-center justify-center px-8 py-4 bg-transparent border-2 border-primary text-primary font-bold rounded-[var(--radius)] hover:bg-primary/10 transition-all duration-300">
                  See How It Works
                </button>
              </div>
            </div>
          </motion.section>

          {/* HOW IT WORKS */}
          <motion.section 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="space-y-12"
          >
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">How The Full System Works</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">The core mechanics of this automated pipeline.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {howItWorks.map((step, idx) => (
                <div key={idx} className="sci-fi-card relative">
                  <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xl mb-6 border border-primary/30">
                    {idx + 1}
                  </div>
                  <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </motion.section>

          {/* REQUIRED TOOL STACK */}
          <motion.section 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="space-y-12"
          >
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Required Tool Stack</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">The exact software needed to run this system.</p>
            </div>
            
            {hasCategories ? (
              <div className="space-y-12">
                {Object.entries(toolsByCategory).map(([category, tools]) => (
                  <div key={category} className="space-y-6">
                    <h3 className="text-2xl font-bold text-primary border-b border-primary/20 pb-2 inline-block">{category}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {tools.map((tool, idx) => (
                        <div key={idx} className="sci-fi-card flex flex-col h-full">
                          <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center text-secondary">
                              <Wrench className="w-6 h-6" />
                            </div>
                            <h4 className="text-xl font-bold">{tool.name}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground mb-4 flex-grow">{tool.description}</p>
                          <div className="bg-background/50 p-3 rounded-lg mb-6 border border-border">
                            <p className="text-xs font-bold text-primary mb-1">Why it's needed:</p>
                            <p className="text-xs text-muted-foreground">{tool.whyNeeded}</p>
                          </div>
                          <a href={tool.link || '#'} target="_blank" rel="noopener noreferrer" className="w-full py-2 text-center text-sm font-bold text-primary border border-primary/30 rounded-lg hover:bg-primary/10 transition-colors mt-auto">
                            Access Tool
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {toolStack.map((tool, idx) => (
                  <div key={idx} className="sci-fi-card flex flex-col h-full">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center text-secondary">
                        <Wrench className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-bold">{tool.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4 flex-grow">{tool.description}</p>
                    <div className="bg-background/50 p-3 rounded-lg mb-6 border border-border">
                      <p className="text-xs font-bold text-primary mb-1">Why it's needed:</p>
                      <p className="text-xs text-muted-foreground">{tool.whyNeeded}</p>
                    </div>
                    <a href={tool.link || '#'} target="_blank" rel="noopener noreferrer" className="w-full py-2 text-center text-sm font-bold text-primary border border-primary/30 rounded-lg hover:bg-primary/10 transition-colors mt-auto">
                      Access Tool
                    </a>
                  </div>
                ))}
              </div>
            )}
          </motion.section>

          {/* STEP-BY-STEP EXECUTION */}
          <motion.section 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="space-y-12"
          >
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Step-by-Step Execution</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">Follow this exact roadmap to build the system.</p>
            </div>
            
            <div className="space-y-4 max-w-4xl mx-auto">
              {stepByStep.map((step, idx) => (
                <details key={idx} className="group bg-card border border-border rounded-xl overflow-hidden">
                  <summary className="flex items-center justify-between p-6 cursor-pointer list-none hover:bg-muted/10 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                        {idx + 1}
                      </div>
                      <h3 className="text-lg font-bold">{step.title}</h3>
                    </div>
                    <div className="text-muted-foreground group-open:rotate-180 transition-transform">
                      ▼
                    </div>
                  </summary>
                  <div className="p-6 pt-0 border-t border-border/50 bg-background/30">
                    <p className="text-muted-foreground mb-4 mt-4">{step.instructions}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-card p-4 rounded-lg border border-border">
                        <p className="text-xs font-bold text-emerald-400 mb-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Expected Outcome</p>
                        <p className="text-sm text-muted-foreground">{step.outcome}</p>
                      </div>
                      <div className="bg-card p-4 rounded-lg border border-border">
                        <p className="text-xs font-bold text-primary mb-1 flex items-center gap-1"><Clock className="w-3 h-3"/> Time Estimate</p>
                        <p className="text-sm text-muted-foreground">{step.time}</p>
                      </div>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </motion.section>

          {/* EXPECTED OUTPUTS */}
          <motion.section 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="space-y-12"
          >
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Expected Results</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">What you will have once the system is fully deployed.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {outputs.map((output, idx) => (
                <div key={idx} className="bg-card border border-border rounded-xl p-6 flex items-start gap-4 hover:border-primary/30 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold mb-1">{output.name}</h4>
                    <p className="text-sm text-muted-foreground">{output.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          {/* MONETIZATION MODELS */}
          <motion.section 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="space-y-12"
          >
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Monetization Models</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">How this system generates revenue.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {monetization.map((model, idx) => (
                <div key={idx} className="sci-fi-card">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{model.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{model.description}</p>
                  <div className="bg-background/50 p-3 rounded-lg border border-border">
                    <p className="text-xs font-bold text-emerald-400 mb-1">Revenue Potential:</p>
                    <p className="text-sm font-bold">{model.potential}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          {/* COMMON MISTAKES */}
          <motion.section 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="space-y-12"
          >
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Common Mistakes to Avoid</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">Don't let these errors derail your system.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {mistakes.map((mistake, idx) => (
                <div key={idx} className="bg-card border border-destructive/30 rounded-xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-destructive/10 rounded-bl-full -mr-8 -mt-8"></div>
                  <div className="flex items-center gap-3 mb-4">
                    <ShieldAlert className="w-6 h-6 text-destructive" />
                    <h3 className="text-lg font-bold text-destructive-foreground">{mistake.title}</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">The Problem</p>
                      <p className="text-sm text-foreground">{mistake.problem}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">The Fix</p>
                      <p className="text-sm text-foreground">{mistake.fix}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          {/* FINAL CTA */}
          <motion.section 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="sci-fi-card text-center py-16 px-8 max-w-4xl mx-auto glow-border-cyan"
          >
            <Zap className="w-12 h-12 text-primary mx-auto mb-6 pulse-glow" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{ctaText || 'Ready to Deploy?'}</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              {ctaDescription || 'Get instant access to the full system architecture, templates, and step-by-step video training.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="saas-button text-lg px-8 py-4 shadow-[0_0_20px_hsl(var(--primary)/0.4)]">
                Get Instant Access
              </button>
              <button className="inline-flex items-center justify-center px-8 py-4 bg-card border border-border text-foreground font-bold rounded-[var(--radius)] hover:bg-muted transition-all duration-300">
                Schedule a Call
              </button>
            </div>
          </motion.section>

        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default BlueprintDetailTemplate;