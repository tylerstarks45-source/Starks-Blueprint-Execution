import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { 
  Rocket, Clock, Target, Layers, ArrowRight, CheckCircle2, 
  AlertTriangle, DollarSign, Zap, Wrench, ShieldAlert,
  Database, MessageSquare, Calendar, Users, ArrowDown,
  TrendingUp, Briefcase, Activity
} from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { toolAffiliateLinks } from '@/config/toolAffiliateLinks.js';

const AIAppointmentSetterEmpireSystemPage = () => {
  const systemData = {
    name: "AI Appointment Setter Empire System",
    headline: "AI APPOINTMENT SETTER EMPIRE SYSTEM",
    subheadline: "Fully automated AI sales system that finds leads, starts conversations, follows up automatically, qualifies prospects, and books appointments 24/7 without human staff.",
    incomeRange: "$5,000–$50,000+/month",
    launchTime: "4–8 Hours",
    skillLevel: "Intermediate",
    ctaText: "Get Instant Access",
    ctaDescription: "Get instant access to the full system architecture, templates, and step-by-step video training."
  };

  const toolsByCategory = {
    "CORE AUTOMATION TOOLS": [
      { name: "Make.com", description: "The central nervous system connecting all apps.", whyNeeded: "Routes data between scraper, AI, and CRM.", link: toolAffiliateLinks.make },
      { name: "Relay.app", description: "Human-in-the-loop automation.", whyNeeded: "Allows manual approval for high-ticket outreach.", link: "#" },
      { name: "Albato AI", description: "Alternative integration platform.", whyNeeded: "Backup routing for complex API connections.", link: "#" }
    ],
    "CRM & SALES TOOLS": [
      { name: "GoHighLevel", description: "All-in-one sales and marketing platform.", whyNeeded: "Houses the pipeline, SMS, and email sending.", link: toolAffiliateLinks.gohighlevel },
      { name: "GetResponse", description: "Email marketing automation.", whyNeeded: "Handles long-term email nurture sequences.", link: toolAffiliateLinks.getresponse }
    ],
    "AI ASSISTANT TOOLS": [
      { name: "Magai", description: "Multi-model AI interface.", whyNeeded: "Drafts initial outreach scripts and replies.", link: toolAffiliateLinks.magai },
      { name: "CustomGPT", description: "Custom trained AI models.", whyNeeded: "Acts as the brain trained on your specific offer.", link: toolAffiliateLinks.customgpt }
    ],
    "LEAD GENERATION TOOLS": [
      { name: "Google Sheets", description: "Cloud database.", whyNeeded: "Stores raw scraped leads before processing.", link: "#" },
      { name: "Apify", description: "Web scraping automation.", whyNeeded: "Extracts targeted leads from LinkedIn/Directories.", link: "#" },
      { name: "Calendly", description: "Scheduling software.", whyNeeded: "Handles the actual appointment booking.", link: "#" },
      { name: "Twilio", description: "SMS API.", whyNeeded: "Powers the automated text message outreach.", link: "#" }
    ]
  };

  const recommendedTools = [
    { name: "ChatGPT Plus", description: "For testing prompts before deployment." },
    { name: "LinkedIn Sales Navigator", description: "For finding high-quality B2B leads." },
    { name: "Zapier", description: "For simple 1-to-1 integrations if Make.com is too complex." }
  ];

  const phases = [
    {
      title: "PHASE 1: Lead Mining Engine",
      steps: [
        { title: "Define Target Avatar", desc: "Identify exact job titles, industries, and company sizes." },
        { title: "Configure Apify Scraper", desc: "Set up actors to pull data from LinkedIn or Google Maps." },
        { title: "Data Enrichment", desc: "Use AI to find missing emails and phone numbers." },
        { title: "Google Sheets Database", desc: "Format the raw data into a clean, structured sheet." }
      ]
    },
    {
      title: "PHASE 2: AI Outreach Brain",
      steps: [
        { title: "Train CustomGPT", desc: "Upload your FAQs, pricing, and objection handling docs." },
        { title: "Draft Initial Hooks", desc: "Use Magai to create 5 variations of cold outreach messages." },
        { title: "Set Up Webhooks", desc: "Connect the AI brain to Make.com to receive incoming replies." },
        { title: "Configure Tone", desc: "Ensure the AI sounds human, casual, and professional." }
      ]
    },
    {
      title: "PHASE 3: CRM & Pipeline Setup",
      steps: [
        { title: "GoHighLevel Workspace", desc: "Create a new sub-account for the appointment setting system." },
        { title: "Build Pipeline Stages", desc: "Lead In -> Contacted -> Replied -> Qualified -> Booked." },
        { title: "Connect Twilio/Mailgun", desc: "Link your sending domains and SMS numbers." },
        { title: "Import Leads", desc: "Push the enriched Google Sheet data into the CRM." }
      ]
    },
    {
      title: "PHASE 4: Appointment Booking System",
      steps: [
        { title: "Configure Calendly", desc: "Set up event types, availability, and routing questions." },
        { title: "Sync with CRM", desc: "Ensure booked calls automatically move the lead in GoHighLevel." },
        { title: "AI Handoff", desc: "Program the AI to drop the Calendly link when the lead is qualified." },
        { title: "Pre-Call Reminders", desc: "Set up 24hr and 1hr SMS/Email reminders to reduce no-shows." }
      ]
    },
    {
      title: "PHASE 5: Follow-Up Money Printer",
      steps: [
        { title: "No-Reply Sequence", desc: "Automate a 5-day follow-up if the lead doesn't respond." },
        { title: "Objection Handling", desc: "Route complex objections to a human via Relay.app." },
        { title: "Dead Lead Revival", desc: "Set up a 30-day re-engagement campaign for cold leads." },
        { title: "No-Show Sequence", desc: "Automate re-booking messages for missed appointments." }
      ]
    },
    {
      title: "PHASE 6: Scaling the System",
      steps: [
        { title: "A/B Test Hooks", desc: "Analyze which initial messages get the highest reply rate." },
        { title: "Increase Volume", desc: "Scale scraping and sending limits safely to avoid spam filters." },
        { title: "Add Channels", desc: "Expand from just Email/SMS to include LinkedIn DMs." },
        { title: "Client Onboarding", desc: "Package this entire system to sell to other businesses." }
      ]
    }
  ];

  const monetizationModels = [
    { name: "Setup Services", desc: "Charge $2k-$5k to build this system for local businesses." },
    { name: "Monthly Management Retainer", desc: "Charge $1k-$3k/mo to maintain and optimize the AI." },
    { name: "Agency Services", desc: "Use the system to book clients for your own marketing agency." },
    { name: "Lead Generation Service", desc: "Sell qualified, booked appointments on a pay-per-show basis." },
    { name: "Appointment Booking Service", desc: "White-label the AI setter for high-ticket coaches." },
    { name: "CRM Management", desc: "Charge a premium to manage their GoHighLevel workspace." },
    { name: "AI Automation Consulting", desc: "Consult enterprises on how to replace their SDR teams." },
    { name: "Recurring Revenue Model", desc: "Resell GoHighLevel SaaS mode with the snapshot pre-loaded." }
  ];

  const mistakes = [
    { problem: "Sending too many messages on day one.", fix: "Warm up domains and numbers slowly over 14 days." },
    { problem: "AI sounding like a robot.", fix: "Train the AI to use lowercase, slang, and short sentences." },
    { problem: "No human fallback.", fix: "Always have a trigger that alerts a human if the AI gets confused." },
    { problem: "Scraping bad data.", fix: "Use strict filters in Apify to ensure high-quality leads." },
    { problem: "Ignoring compliance.", fix: "Always include opt-out language (Reply STOP) in cold SMS." },
    { problem: "Overcomplicating the prompt.", fix: "Keep the AI's goal simple: Get them to click the calendar link." },
    { problem: "Not tracking pipeline stages.", fix: "Ensure Make.com updates the CRM stage on every reply." },
    { problem: "Using personal phone numbers.", fix: "Always use Twilio or dedicated business lines." },
    { problem: "Giving up after one message.", fix: "Rely on the automated 5-step follow-up sequence." }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col starfield">
      <Helmet>
        <title>{`${systemData.name} | System Blueprint`}</title>
        <meta name="description" content={systemData.subheadline} />
      </Helmet>
      
      <Header />
      
      <main className="flex-grow pt-24 pb-24 relative z-10">
        <div className="container mx-auto px-4 max-w-6xl space-y-24">
          
          {/* HERO SECTION */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="sci-fi-card text-center py-16 px-8 relative overflow-hidden border-primary/50 shadow-[0_0_40px_rgba(0,212,255,0.15)]"
          >
            <div className="absolute inset-0 grid-lines opacity-20 pointer-events-none"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-background/80 to-background/95 z-0"></div>
            
            <div className="relative z-10">
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">Intermediate</span>
                <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-bold uppercase tracking-wider">AI Sales Automation</span>
                <span className="px-3 py-1 rounded-full bg-secondary/10 border border-secondary/30 text-secondary text-xs font-bold uppercase tracking-wider">Appointment Booking Engine</span>
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">CRM Workflow System</span>
                <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wider">Lead Generation Infrastructure</span>
                <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1"><Clock className="w-3 h-3"/> 4–8 Hours</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold mb-6 glow-text-cyan text-balance uppercase tracking-tight">
                {systemData.headline}
              </h1>
              
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed">
                {systemData.subheadline}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
                <div className="bg-card/60 backdrop-blur-md border border-emerald-500/30 rounded-xl p-6 flex flex-col items-center shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                  <DollarSign className="w-8 h-8 text-emerald-400 mb-3" />
                  <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Income Potential</p>
                  <p className="text-xl font-bold text-emerald-400">{systemData.incomeRange}</p>
                </div>
                <div className="bg-card/60 backdrop-blur-md border border-primary/30 rounded-xl p-6 flex flex-col items-center shadow-[0_0_15px_rgba(0,212,255,0.1)]">
                  <Clock className="w-8 h-8 text-primary mb-3" />
                  <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Launch Time</p>
                  <p className="text-xl font-bold text-primary">{systemData.launchTime}</p>
                </div>
                <div className="bg-card/60 backdrop-blur-md border border-amber-500/30 rounded-xl p-6 flex flex-col items-center shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                  <Target className="w-8 h-8 text-amber-400 mb-3" />
                  <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Skill Level</p>
                  <p className="text-xl font-bold text-amber-400">{systemData.skillLevel}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="saas-button text-lg px-8 py-4 shadow-[0_0_20px_hsl(var(--primary)/0.4)]">
                  {systemData.ctaText} <ArrowRight className="w-5 h-5 ml-2" />
                </button>
              </div>
            </div>
          </motion.section>

          {/* SYSTEM OVERVIEW */}
          <motion.section 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="glass-panel p-8 md:p-12 border-primary/20"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                <Activity className="w-6 h-6" />
              </div>
              <h2 className="text-3xl font-bold">System Overview</h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              This architecture replaces an entire team of human SDRs (Sales Development Representatives). It autonomously handles the entire top-of-funnel process: finding leads, scraping contact info, initiating cold outreach, holding intelligent AI conversations, qualifying prospects, handling objections, booking appointments, sending reminders, reviving dead leads, executing long-term follow-ups, and tracking everything in a centralized CRM.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['Lead Scraping', 'AI Conversations', 'Objection Handling', 'Auto-Booking', 'CRM Tracking', 'SMS/Email', 'Follow-ups', 'Dead Lead Revival'].map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-sm font-medium text-foreground bg-background/50 p-3 rounded-lg border border-border">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> {feature}
                </div>
              ))}
            </div>
          </motion.section>

          {/* LIVE AUTOMATION MAP */}
          <motion.section 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 glow-text-cyan">Live Automation Map</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">The exact data flow of the enterprise-grade appointment setting engine.</p>
            </div>
            
            <div className="system-diagram-container p-8 md:p-12 bg-card/80">
              <div className="flex flex-col items-center gap-4 relative">
                {/* Flow Nodes */}
                <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 w-full">
                  <div className="glass-panel p-4 text-center w-48 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                    <Database className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                    <div className="font-bold text-sm">Lead Source</div>
                    <div className="text-xs text-muted-foreground">LinkedIn / Maps</div>
                  </div>
                  <ArrowRight className="hidden md:block w-6 h-6 text-muted-foreground" />
                  <ArrowDown className="md:hidden w-6 h-6 text-muted-foreground" />
                  
                  <div className="glass-panel p-4 text-center w-48 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                    <Wrench className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                    <div className="font-bold text-sm">Lead Scraper</div>
                    <div className="text-xs text-muted-foreground">Apify Extraction</div>
                  </div>
                  <ArrowRight className="hidden md:block w-6 h-6 text-muted-foreground" />
                  <ArrowDown className="md:hidden w-6 h-6 text-muted-foreground" />

                  <div className="glass-panel p-4 text-center w-48 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                    <Database className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <div className="font-bold text-sm">Google Sheets</div>
                    <div className="text-xs text-muted-foreground">Data Enrichment</div>
                  </div>
                </div>

                <ArrowDown className="w-6 h-6 text-muted-foreground my-2" />

                <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 w-full">
                  <div className="glass-panel p-4 text-center w-48 border-primary/50 shadow-[0_0_20px_rgba(0,212,255,0.3)] relative overflow-hidden">
                    <div className="absolute inset-0 bg-primary/10 animate-pulse"></div>
                    <Zap className="w-8 h-8 text-primary mx-auto mb-2 relative z-10" />
                    <div className="font-bold text-sm relative z-10">AI Outreach Brain</div>
                    <div className="text-xs text-primary relative z-10">CustomGPT / Magai</div>
                  </div>
                  <ArrowRight className="hidden md:block w-6 h-6 text-muted-foreground" />
                  <ArrowDown className="md:hidden w-6 h-6 text-muted-foreground" />

                  <div className="glass-panel p-4 text-center w-48 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                    <MessageSquare className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                    <div className="font-bold text-sm">SMS/Email/DM</div>
                    <div className="text-xs text-muted-foreground">Twilio / Mailgun</div>
                  </div>
                  <ArrowRight className="hidden md:block w-6 h-6 text-muted-foreground" />
                  <ArrowDown className="md:hidden w-6 h-6 text-muted-foreground" />

                  <div className="glass-panel p-4 text-center w-48 border-rose-500/30 shadow-[0_0_15px_rgba(243,64,111,0.2)]">
                    <Users className="w-8 h-8 text-rose-400 mx-auto mb-2" />
                    <div className="font-bold text-sm">CRM Pipeline</div>
                    <div className="text-xs text-muted-foreground">GoHighLevel</div>
                  </div>
                </div>

                <ArrowDown className="w-6 h-6 text-muted-foreground my-2" />

                <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 w-full">
                  <div className="glass-panel p-4 text-center w-48 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                    <Calendar className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                    <div className="font-bold text-sm">Appointment</div>
                    <div className="text-xs text-muted-foreground">Calendly Booking</div>
                  </div>
                  <ArrowRight className="hidden md:block w-6 h-6 text-muted-foreground" />
                  <ArrowDown className="md:hidden w-6 h-6 text-muted-foreground" />

                  <div className="glass-panel p-4 text-center w-48 border-teal-500/30 shadow-[0_0_15px_rgba(20,184,166,0.2)]">
                    <Activity className="w-8 h-8 text-teal-400 mx-auto mb-2" />
                    <div className="font-bold text-sm">Follow-Up</div>
                    <div className="text-xs text-muted-foreground">Automated Nurture</div>
                  </div>
                  <ArrowRight className="hidden md:block w-6 h-6 text-muted-foreground" />
                  <ArrowDown className="md:hidden w-6 h-6 text-muted-foreground" />

                  <div className="glass-panel p-4 text-center w-48 border-emerald-500/50 shadow-[0_0_25px_rgba(16,185,129,0.4)] bg-emerald-500/10">
                    <DollarSign className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <div className="font-bold text-sm text-emerald-400">Closed Deal</div>
                    <div className="text-xs text-emerald-400/70">Revenue Generated</div>
                  </div>
                </div>
              </div>
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
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Required AI Tool Stack</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">The exact software needed to run this enterprise system.</p>
            </div>
            
            <div className="space-y-12">
              {Object.entries(toolsByCategory).map(([category, tools]) => (
                <div key={category} className="space-y-6">
                  <h3 className="text-xl font-bold text-primary border-b border-primary/20 pb-2 inline-block">{category}</h3>
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
                        <a href={tool.link} target="_blank" rel="noopener noreferrer" className="w-full py-2 text-center text-sm font-bold text-primary border border-primary/30 rounded-lg hover:bg-primary/10 transition-colors mt-auto">
                          Access Tool
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 p-6 bg-card border border-border rounded-xl">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Layers className="w-5 h-5 text-muted-foreground"/> Recommended Outside Tools</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recommendedTools.map((tool, i) => (
                  <div key={i} className="p-4 bg-background rounded-lg border border-border/50">
                    <div className="font-bold text-sm mb-1">{tool.name}</div>
                    <div className="text-xs text-muted-foreground">{tool.description}</div>
                  </div>
                ))}
              </div>
            </div>
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
              <p className="text-muted-foreground max-w-2xl mx-auto">Follow this exact 6-phase roadmap to build the system.</p>
            </div>
            
            <div className="space-y-6 max-w-4xl mx-auto">
              {phases.map((phase, idx) => (
                <div key={idx} className="glass-panel overflow-hidden border-primary/20">
                  <div className="bg-primary/5 p-4 border-b border-primary/10 flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0">
                      {idx + 1}
                    </div>
                    <h3 className="text-xl font-bold text-foreground">{phase.title}</h3>
                  </div>
                  <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {phase.steps.map((step, stepIdx) => (
                      <div key={stepIdx} className="bg-background/50 p-4 rounded-lg border border-border">
                        <div className="text-xs font-bold text-primary mb-1">Step {stepIdx + 1}</div>
                        <div className="font-bold text-sm mb-1">{step.title}</div>
                        <div className="text-xs text-muted-foreground">{step.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          {/* ROI CALCULATOR */}
          <motion.section 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="sci-fi-card p-8 md:p-12 max-w-4xl mx-auto border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)]"
          >
            <div className="flex items-center justify-center gap-3 mb-8">
              <TrendingUp className="w-8 h-8 text-emerald-400" />
              <h2 className="text-3xl font-bold text-foreground">ROI Projection Example</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center text-center">
              <div className="bg-background p-4 rounded-xl border border-border">
                <div className="text-3xl font-bold text-primary mb-1">20</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Appts / Month</div>
              </div>
              <div className="text-2xl font-bold text-muted-foreground hidden md:block">×</div>
              <div className="bg-background p-4 rounded-xl border border-border">
                <div className="text-3xl font-bold text-amber-400 mb-1">25%</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Close Rate</div>
              </div>
              <div className="text-2xl font-bold text-muted-foreground hidden md:block">=</div>
              <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/30">
                <div className="text-3xl font-bold text-emerald-400 mb-1">5</div>
                <div className="text-xs text-emerald-400/70 uppercase tracking-wider">New Clients</div>
              </div>
            </div>
            
            <div className="mt-8 text-center p-6 bg-background rounded-xl border border-border">
              <div className="text-sm text-muted-foreground mb-2">At $2,000 per client, this system generates:</div>
              <div className="text-4xl md:text-5xl font-extrabold text-emerald-400 glow-text-emerald">$10,000+ / month</div>
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
              <p className="text-muted-foreground max-w-2xl mx-auto">8 ways to generate revenue with this exact architecture.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {monetizationModels.map((model, idx) => (
                <div key={idx} className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-colors">
                  <Briefcase className="w-6 h-6 text-primary mb-3" />
                  <h3 className="font-bold text-sm mb-2">{model.name}</h3>
                  <p className="text-xs text-muted-foreground">{model.desc}</p>
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
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {mistakes.map((mistake, idx) => (
                <div key={idx} className="bg-card border border-destructive/30 rounded-xl p-5 relative overflow-hidden">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldAlert className="w-5 h-5 text-destructive shrink-0" />
                    <h3 className="text-sm font-bold text-destructive-foreground">Mistake {idx + 1}</h3>
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
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Build Your AI Appointment Setter Empire?</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              {systemData.ctaDescription}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
              <button className="saas-button text-lg px-8 py-4 shadow-[0_0_20px_hsl(var(--primary)/0.4)]">
                {systemData.ctaText}
              </button>
              <button className="inline-flex items-center justify-center px-8 py-4 bg-card border border-border text-foreground font-bold rounded-[var(--radius)] hover:bg-muted transition-all duration-300">
                Schedule a Call
              </button>
            </div>
            <p className="text-sm text-primary font-medium">Join 1,200+ builders already using our systems.</p>
          </motion.section>

        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default AIAppointmentSetterEmpireSystemPage;