import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { 
  Rocket, ShieldAlert, Zap, Layers, Link as LinkIcon, DollarSign, 
  Activity, Video, Users, CheckCircle, Database, LayoutTemplate, Network
} from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { toolAffiliateLinks } from '@/config/toolAffiliateLinks.js';

const toolsConfig = {
  "CONTENT GENERATION TOOLS": [
    { key: "predisAi", icon: LayoutTemplate, diff: "Beginner" },
    { key: "tubeMagic", icon: Video, diff: "Intermediate" },
    { key: "zebracatAi", icon: Video, diff: "Advanced" },
    { key: "viddeosAi", icon: Video, diff: "Beginner" },
    { key: "polloAi", icon: Video, diff: "Beginner" },
    { key: "opusClip", icon: Video, diff: "Beginner" }
  ],
  "AUTOMATION & AI WORKFLOW TOOLS": [
    { key: "make", icon: Network, diff: "Advanced" },
    { key: "relayApp", icon: Network, diff: "Intermediate" },
    { key: "magai", icon: Layers, diff: "Beginner" },
    { key: "albato", icon: Network, diff: "Intermediate" }
  ],
  "SEO & TRAFFIC TOOLS": [
    { key: "seoEngine", icon: Activity, diff: "Intermediate" },
    { key: "fastSeoHub", icon: Activity, diff: "Beginner" }
  ],
  "FUNNEL & MONETIZATION TOOLS": [
    { key: "goHighLevel", icon: Database, diff: "Advanced" },
    { key: "systemeIo", icon: LayoutTemplate, diff: "Beginner" },
    { key: "getResponse", icon: LinkIcon, diff: "Intermediate" }
  ],
  "AI RESEARCH & BUSINESS TOOLS": [
    { key: "customGpt", icon: Layers, diff: "Advanced" },
    { key: "twinAi", icon: Users, diff: "Intermediate" }
  ]
};

const AIAffiliateContentEngineToolsPage = () => {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Helmet>
        <title>AI Affiliate Content Engine — Tool Requirements</title>
        <meta name="description" content="Access every required AI tool, automation platform, content engine, and traffic system needed to deploy the complete AI Affiliate Content Engine blueprint." />
      </Helmet>
      
      <Header />
      
      <main className="flex-grow relative overflow-hidden pt-32 pb-24">
        {/* Background Effects */}
        <div className="absolute inset-0 starfield pointer-events-none z-0"></div>
        <div className="absolute inset-0 particle-bg pointer-events-none z-0"></div>

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          
          {/* HEADER SECTION */}
          <div className="text-center mb-16 animate-slide-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border glow-border bg-background/50 mb-6 backdrop-blur-md">
              <Zap className="w-4 h-4 text-primary animate-glow-pulse" />
              <span className="text-xs font-mono text-primary uppercase tracking-widest">Premium Deployment Hub</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight">
              AI Affiliate Content Engine<br/>
              <span className="glow-text text-primary">Tool Requirements</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Access every required AI tool, automation platform, content engine, and traffic system needed to deploy the complete AI Affiliate Content Engine blueprint.
            </p>
          </div>

          {/* TOP STATUS KPI SECTION */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-24">
            <div className="dashboard-panel p-6 flex flex-col items-center text-center glow-border transition-all hover:-translate-y-1">
              <Layers className="w-8 h-8 text-primary mb-3" />
              <span className="text-xs font-mono text-muted-foreground uppercase mb-1">Total Required Tools</span>
              <span className="text-3xl font-extrabold text-foreground">15+</span>
            </div>
            <div className="dashboard-panel p-6 flex flex-col items-center text-center glow-border transition-all hover:-translate-y-1">
              <Activity className="w-8 h-8 text-primary mb-3" />
              <span className="text-xs font-mono text-muted-foreground uppercase mb-1">Estimated Setup Time</span>
              <span className="text-3xl font-extrabold text-foreground">4-8 Hours</span>
            </div>
            <div className="dashboard-panel p-6 flex flex-col items-center text-center glow-border transition-all hover:-translate-y-1">
              <Network className="w-8 h-8 text-primary mb-3" />
              <span className="text-xs font-mono text-muted-foreground uppercase mb-1">Automation Level</span>
              <span className="text-3xl font-extrabold text-foreground">Advanced</span>
            </div>
            <div className="dashboard-panel p-6 flex flex-col items-center text-center glow-border transition-all hover:-translate-y-1">
              <CheckCircle className="w-8 h-8 text-emerald-400 mb-3" />
              <span className="text-xs font-mono text-emerald-400 uppercase mb-1">Beginner Friendly</span>
              <span className="text-3xl font-extrabold text-emerald-400">8/10 Score</span>
            </div>
            <div className="dashboard-panel p-6 flex flex-col items-center text-center glow-border transition-all hover:-translate-y-1">
              <DollarSign className="w-8 h-8 text-secondary mb-3" />
              <span className="text-xs font-mono text-secondary uppercase mb-1">Monthly Revenue Potential</span>
              <span className="text-3xl font-extrabold text-secondary">$2K - $50K+</span>
            </div>
            <div className="dashboard-panel p-6 flex flex-col items-center text-center glow-border transition-all hover:-translate-y-1">
              <ShieldAlert className="w-8 h-8 text-amber-400 mb-3" />
              <span className="text-xs font-mono text-amber-400 uppercase mb-1">Recommended Budget</span>
              <span className="text-3xl font-extrabold text-amber-400">$200-$1K/mo</span>
            </div>
          </div>

          <div className="animated-separator my-16"></div>

          {/* REQUIRED TOOL STACK SECTION */}
          <div className="mb-24">
            <h2 className="text-3xl font-bold mb-12 text-center glow-text">Core Infrastructure Modules</h2>
            
            <div className="space-y-20">
              {Object.entries(toolsConfig).map(([category, tools], cIdx) => (
                <div key={cIdx} className="relative">
                  <div className="flex items-center gap-4 mb-8">
                    <h3 className="text-2xl font-bold font-mono tracking-widest text-primary uppercase">{category}</h3>
                    <div className="h-[2px] flex-grow bg-border/50"></div>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {tools.map((t, tIdx) => {
                      const tool = toolAffiliateLinks[t.key];
                      if(!tool) return null;
                      
                      return (
                        <div key={tIdx} className="glassmorphism-card p-8 rounded-2xl flex flex-col h-full hover:glow-border transition-all duration-300">
                          <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
                                <t.icon className="w-6 h-6 text-primary" />
                              </div>
                              <div>
                                <h4 className="text-xl font-bold text-foreground">{tool.name}</h4>
                                <span className="text-xs font-mono text-muted-foreground uppercase">{tool.category}</span>
                              </div>
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border ${
                              t.diff === 'Beginner' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              t.diff === 'Intermediate' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                              'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}>
                              {t.diff}
                            </span>
                          </div>

                          <p className="text-sm text-foreground/90 leading-relaxed mb-6 flex-grow">{tool.description}</p>
                          
                          <div className="space-y-4 mb-8">
                            <div className="bg-background/50 p-4 rounded-lg border border-border/50">
                              <span className="block text-xs font-bold text-primary mb-1 uppercase tracking-wider">Why it matters</span>
                              <span className="text-sm text-muted-foreground">{tool.valueProposition || "Critical system component for scaling operations without manual intervention."}</span>
                            </div>
                            <div className="bg-background/50 p-4 rounded-lg border border-border/50">
                              <span className="block text-xs font-bold text-foreground mb-1 uppercase tracking-wider">System Role</span>
                              <span className="text-sm text-muted-foreground">{tool.use_cases ? tool.use_cases[0] : "Primary operational module"}</span>
                            </div>
                          </div>

                          <div className="mt-auto pt-4 flex flex-col sm:flex-row gap-4 justify-between items-center border-t border-border/30">
                            <div className="text-sm font-medium text-muted-foreground">
                              {tool.badges && tool.badges.map(b => (
                                <span key={b} className="mr-2">{b}</span>
                              ))}
                            </div>
                            <a 
                              href={tool.cta_link || tool.affiliate_link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="saas-button w-full sm:w-auto glow-border text-sm px-6 py-2"
                            >
                              {tool.customCTA || 'Access Tool'}
                            </a>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="futuristic-divider"></div>

          {/* DEPLOYMENT ORDER & BUDGET SECTIONS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 my-24">
            
            {/* DEPLOYMENT ORDER */}
            <div>
              <h2 className="text-3xl font-bold mb-8 glow-text">System Deployment Order</h2>
              <div className="space-y-6">
                {[
                  "Setup Make.com (core automation engine)",
                  "Setup AI content generators (create content at scale)",
                  "Connect automation workflows (automate distribution)",
                  "Setup funnels & CRM (capture leads and monetize)",
                  "Configure traffic systems (drive traffic to content)",
                  "Deploy monetization stack (generate revenue)"
                ].map((step, idx) => (
                  <div key={idx} className="flex items-start gap-4 glassmorphism-card p-4 rounded-xl border border-primary/20">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">{idx + 1}</div>
                    <div className="pt-1 font-medium text-foreground">{step}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* BUDGET STACKS */}
            <div className="space-y-8">
              <div className="glassmorphism-card p-8 rounded-2xl border-emerald-500/30">
                <h3 className="text-2xl font-bold mb-2 flex items-center gap-3"><CheckCircle className="text-emerald-400"/> Beginner Budget Setup</h3>
                <p className="text-sm text-muted-foreground mb-6">Minimum viable stack to deploy the system and generate initial traffic.</p>
                <ul className="space-y-3 mb-6">
                  <li className="flex justify-between text-sm"><span className="text-foreground">Make.com</span> <span className="text-emerald-400 font-mono">Free Tier</span></li>
                  <li className="flex justify-between text-sm"><span className="text-foreground">Predis.ai</span> <span className="text-muted-foreground font-mono">$29/mo</span></li>
                  <li className="flex justify-between text-sm"><span className="text-foreground">Systeme.io</span> <span className="text-muted-foreground font-mono">$27/mo</span></li>
                  <li className="flex justify-between text-sm"><span className="text-foreground">TubeMagic</span> <span className="text-muted-foreground font-mono">$29/mo</span></li>
                </ul>
                <div className="pt-4 border-t border-border/50 flex justify-between font-bold">
                  <span className="text-foreground">Total Estimated</span>
                  <span className="text-emerald-400">~$85/month</span>
                </div>
              </div>

              <div className="glassmorphism-card p-8 rounded-2xl border-primary/30">
                <h3 className="text-2xl font-bold mb-2 flex items-center gap-3"><Rocket className="text-primary"/> Advanced Revenue Stack</h3>
                <p className="text-sm text-muted-foreground mb-6">Enterprise configuration for maximum volume and conversion efficiency.</p>
                <ul className="space-y-3 mb-6">
                  <li className="flex justify-between text-sm"><span className="text-foreground">CustomGPT</span> <span className="text-muted-foreground font-mono">$99/mo</span></li>
                  <li className="flex justify-between text-sm"><span className="text-foreground">Twin AI</span> <span className="text-muted-foreground font-mono">$99/mo</span></li>
                  <li className="flex justify-between text-sm"><span className="text-foreground">Relay.app</span> <span className="text-muted-foreground font-mono">$99/mo</span></li>
                  <li className="flex justify-between text-sm"><span className="text-foreground">SEO Engine</span> <span className="text-muted-foreground font-mono">$99/mo</span></li>
                  <li className="flex justify-between text-sm"><span className="text-foreground">Opus Pro</span> <span className="text-muted-foreground font-mono">$99/mo</span></li>
                </ul>
                <div className="pt-4 border-t border-border/50 flex justify-between font-bold">
                  <span className="text-foreground">Total Estimated</span>
                  <span className="text-primary">~$500/month</span>
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

export default AIAffiliateContentEngineToolsPage;