import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Search, FileText, Video, RefreshCw, PenTool, 
  Share2, Mail, DollarSign, Activity, BarChart, Settings, 
  Users, Server, Globe, ArrowRight, ArrowDown, CheckCircle, 
  ShieldAlert, Target, Clock, Zap, Plus, Minus, TrendingUp, Layers
} from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { toolAffiliateLinks } from '@/config/toolAffiliateLinks.js';

const AIAffiliateContentEnginePage = () => {
  const [openAccordion, setOpenAccordion] = useState(0);

  // Data Objects
  const architectureNodes = [
    { icon: Search, label: 'Trend Discovery' },
    { icon: FileText, label: 'AI Script Gen' },
    { icon: Video, label: 'Video Gen' },
    { icon: RefreshCw, label: 'Repackaging' },
    { icon: PenTool, label: 'Blog Creation' },
    { icon: Search, label: 'SEO Config' },
    { icon: Share2, label: 'Social Distro' },
    { icon: Mail, label: 'Email Capture' },
    { icon: DollarSign, label: 'Affiliate Conv' },
    { icon: Activity, label: 'Rev Tracking' }
  ];

  const phases = [
    { title: "Trend Mining Engine", desc: "Automate the discovery of viral topics before they peak.", tools: "Google Trends, Surfer SEO, Exploding Topics", output: "100+ Validated Content Ideas", result: "Eliminates guessing what to post", time: "1-2 Hours" },
    { title: "AI Content Generation", desc: "Transform raw ideas into high-converting scripts.", tools: "Magai, OpenRouter", output: "Ready-to-record viral scripts", result: "10x writing speed", time: "2 Hours" },
    { title: "Video Production Pipeline", desc: "Generate professional faceless videos at scale.", tools: "Viddeos AI, Pollo AI", output: "15-30 Short form videos", result: "Zero editing required", time: "3 Hours" },
    { title: "SEO & Blog Expansion", desc: "Convert video scripts into long-form SEO articles.", tools: "Jasper, Make.com", output: "Optimized WordPress Articles", result: "Passive organic traffic", time: "2 Hours" },
    { title: "Multi-Platform Distribution", desc: "Schedule and auto-post everywhere simultaneously.", tools: "Buffer, Zapier", output: "Omnipresent publishing", result: "Maximum reach, minimum effort", time: "1 Hour" },
    { title: "Lead Capture System", desc: "Trap social traffic into a high-converting funnel.", tools: "GoHighLevel, GetResponse", output: "Growing email subscriber list", result: "Owned audience asset", time: "4 Hours" },
    { title: "Affiliate Monetization Engine", desc: "Inject strategic affiliate links into funnels and emails.", tools: "ClickBank, PartnerStack", output: "Automated commission tracking", result: "Passive revenue generation", time: "2 Hours" },
    { title: "Revenue Scaling Loop", desc: "Analyze winning content and double down with paid/organic.", tools: "Google Analytics, Refersion", output: "Compounding monthly income", result: "Predictable business growth", time: "Ongoing" }
  ];

  const infrastructureModules = [
    {
      category: "CONTENT GENERATION CORE",
      tools: [
        { name: "Magai", why: "Central AI interface for prompt management.", skipped: "Inconsistent AI outputs and wasted time managing models.", beginner: "Drafting basic TikTok scripts.", advanced: "Running complex sequential prompt chains.", roi: "High", role: "Brain of the operation." },
        { name: "CustomGPT", why: "Deploy custom trained AI agents.", skipped: "Lack of strategic depth and personalization.", beginner: "Idea brainstorming.", advanced: "Custom GPTs acting as niche experts.", roi: "High", role: "Strategy formulation." },
        { name: "Predis.ai", why: "Automate full social media content calendar.", skipped: "Cannot automate content scaling securely.", beginner: "Auto-generating single posts.", advanced: "Brand-aligned pipeline generation.", roi: "Very High", role: "Scalable compute." },
        { name: "OpusClip", why: "Rapid clipping from long-form.", skipped: "Manually cutting videos costs hours.", beginner: "Clipping podcasts.", advanced: "Volume content engine feed.", roi: "Medium", role: "Repurposing engine." }
      ]
    },
    {
      category: "AUTOMATION ENGINE",
      tools: [
        { name: "Make.com", why: "Connects everything together visually.", skipped: "You have to do everything manually.", beginner: "Connecting Google Sheets to AI.", advanced: "50+ step routing scenarios with error handling.", roi: "Extreme", role: "The Nervous System." },
        { name: "Relay.app", why: "Human-in-the-loop automation.", skipped: "AI might publish bad content.", beginner: "Manual approvals.", advanced: "Complex QA routing before publish.", roi: "High", role: "Quality assurance." },
        { name: "Albato AI", why: "Alternative robust integration platform.", skipped: "Vendor lock-in to Make.com.", beginner: "Simple app connections.", advanced: "Cost-effective API scaling.", roi: "Low", role: "Alternative routing." }
      ]
    },
    {
      category: "SEO & TRAFFIC SYSTEMS",
      tools: [
        { name: "SEO Engine", why: "Data-driven content optimization.", skipped: "Articles will not rank on Google.", beginner: "Basic keyword insertion.", advanced: "NLP entity optimization at scale.", roi: "High", role: "Search dominance." },
        { name: "FastSEOHub", why: "Dominate search rankings efficiently.", skipped: "Writing about topics nobody searches for.", beginner: "Finding low-competition keywords.", advanced: "Backlink profile gap analysis.", roi: "High", role: "Market intelligence." },
        { name: "TubeMagic", why: "YouTube specific optimization.", skipped: "YouTube shorts flop.", beginner: "Generating tags and titles.", advanced: "Analyzing competitor retention metrics.", roi: "Medium", role: "Video SEO." }
      ]
    },
    {
      category: "VIDEO GENERATION SYSTEMS",
      tools: [
        { name: "Viddeos AI", why: "Rapid faceless video creation.", skipped: "Must manually edit videos.", beginner: "Simple text-to-video.", advanced: "Bulk generation via API.", roi: "High", role: "Short-form factory." },
        { name: "Zebracat AI", why: "High-quality ad and promo generation.", skipped: "Lower conversion rates on ads.", beginner: "Making promo clips.", advanced: "A/B testing visual hooks.", roi: "Medium", role: "Conversion assets." },
        { name: "Pollo AI", why: "Viral style editing automatically.", skipped: "Boring videos.", beginner: "Applying trending styles.", advanced: "Consistent brand aesthetic.", roi: "Medium", role: "Engagement booster." }
      ]
    },
    {
      category: "FUNNEL & MONETIZATION STACK",
      tools: [
        { name: "GetResponse", why: "Email marketing and autoresponders.", skipped: "Losing 80% of backend sales.", beginner: "Sending weekly newsletters.", advanced: "Behavior-based dynamic sequencing.", roi: "Extreme", role: "Retention and backend sales." },
        { name: "GoHighLevel", why: "Ultimate all-in-one CRM and funnel builder.", skipped: "Using 10 separate expensive tools.", beginner: "Simple opt-in pages.", advanced: "Complex multi-step affiliate funnels.", roi: "Very High", role: "Conversion infrastructure." },
        { name: "Systeme.io", why: "All in one business system.", skipped: "Fragmented tech stack tracking.", beginner: "Basic funnel launch.", advanced: "Affiliate tracking integrated.", roi: "High", role: "Central sales platform." }
      ]
    },
    {
      category: "AI RESEARCH & STRATEGY LAYER",
      tools: [
        { name: "Twin AI", why: "Automate daily operations.", skipped: "Manual strategic bottleneck.", beginner: "Task delegation.", advanced: "Autonomous operational agent.", roi: "High", role: "Operations." }
      ]
    }
  ];

  const executionSteps = [
    {
      title: "Set Up Your Trend Mining System",
      goal: "Establish an automated feed of high-demand, low-competition topics that are proven to convert.",
      why: "Content is worthless if there's no audience demand. By mining trends, you guarantee views before you even create the video. This directly impacts your top-of-funnel traffic volume.",
      tools: "Google Sheets, TubeMagic",
      setup: [
        "1. Create a master 'Content Engine' Google Sheet with columns for Date, Topic, Keyword, Search Volume, and Status.",
        "2. Identify your core niche (e.g., 'B2B SaaS tools').",
        "3. Set up Google Trends alerts for your niche keywords.",
        "4. Run your seed keywords through SEO tools and filter for Keyword Difficulty < 20.",
        "5. Export the top 100 keywords and paste them into your Google Sheet.",
        "6. Set up a Make.com scenario to auto-populate the sheet weekly."
      ],
      output: "A centralized, constantly updating database of proven content ideas ready to be fed to AI.",
      mistakes: "Going too broad (e.g., 'Make money online'). Fix: Niche down to 'Make money online with Notion templates'.",
      optimization: "Use Python scripts to scrape explodingtopics.com and feed it directly via API to your sheet.",
      next: "Now that you have topics, feed them to the AI Script Generator."
    },
    {
      title: "Generate AI Scripts at Scale",
      goal: "Use LLMs to turn raw topics into structured, high-retention video scripts.",
      why: "Manual writing is the biggest bottleneck. Automating this step allows you to produce 30 days of content in a single afternoon.",
      tools: "Make.com, CustomGPT, Magai",
      setup: [
        "1. Create a Make.com scenario triggered by 'New Row' in your Google Sheet.",
        "2. Add an HTTP module or AI module to call an AI model.",
        "3. Design your master prompt: 'Act as a viral scriptwriter. Topic: {{Topic}}. Write a 60-second script with a strong hook, 3 value points, and a CTA.'",
        "4. Add an 'Update Row' module in Make.com to paste the generated script back into the Google Sheet.",
        "5. Test the scenario with one row.",
        "6. Run the scenario in bulk to generate 30 scripts instantly."
      ],
      output: "Your Google Sheet now contains 30 ready-to-produce video scripts.",
      mistakes: "Using generic prompts. Fix: Always force the AI to use pattern-interrupt hooks and specific frameworks (Hook, Body, CTA).",
      optimization: "Chain multiple AI prompts: Prompt 1 writes the outline, Prompt 2 writes the hook, Prompt 3 writes the body.",
      next: "Scripts are written. Time to turn them into videos automatically."
    },
    {
      title: "Create Videos Automatically",
      goal: "Transform text scripts into engaging faceless videos with voiceovers and captions.",
      why: "Video is the highest converting medium. Automating the editing process saves 10+ hours per week and standardizes quality.",
      tools: "Viddeos AI, Pollo AI, Make.com",
      setup: [
        "1. Connect Viddeos AI or Pollo AI to your Make.com scenario.",
        "2. Map the 'Script' column from your Google Sheet to the video generator's text input.",
        "3. Select a hyper-realistic AI voice.",
        "4. Select your background visual style.",
        "5. Enable dynamic captions to retain attention.",
        "6. Run the generation. The tool will render the videos and provide download links."
      ],
      output: "A folder containing 30 rendered, captioned, and voiced MP4 files ready for upload.",
      mistakes: "Using robotic, low-quality voices. Fix: Pay the premium for realistic voices—audio quality is 50% of video retention.",
      optimization: "Use Make.com to automatically save the rendered MP4 links back to your Google Sheet for final review.",
      next: "Repurpose these video concepts into long-form SEO articles."
    },
    {
      title: "Optimize for SEO",
      goal: "Turn short-form video concepts into long-form, Google-ranking blog posts.",
      why: "Social media provides quick traffic spikes, but SEO provides evergreen, compounding traffic that generates passive income for years.",
      tools: "SEO Engine, FastSEOHub",
      setup: [
        "1. Take the core topic and script from your video.",
        "2. Paste it into your AI writing engine to expand it to 1,500 words.",
        "3. Open SEO Engine, create a content editor for your target keyword.",
        "4. Paste the output into the SEO editor.",
        "5. Adjust the headings and keywords until the score is optimized.",
        "6. Format in WordPress, embed the short-form video, and publish."
      ],
      output: "An optimized, long-form asset that ranks on Google and captures search intent traffic.",
      mistakes: "Ignoring user intent. Fix: Ensure the blog post actually solves the problem the user searched for.",
      optimization: "Automate the WordPress publishing entirely using the Make.com WordPress module.",
      next: "Distribute your videos and blogs across the internet."
    },
    {
      title: "Distribute Across Platforms",
      goal: "Achieve omnipresence by posting content to YouTube Shorts, TikTok, Instagram Reels, and Pinterest automatically.",
      why: "You never know which platform will trigger the viral algorithm. Posting everywhere multiplies your chances of a breakout hit by 4x.",
      tools: "Make.com, Buffer",
      setup: [
        "1. Create accounts on TikTok, Instagram, YouTube, and Pinterest.",
        "2. Connect all accounts to a social media scheduler.",
        "3. Use Make.com to watch the Google Sheet for 'Rendered' videos and push them directly to posting queues.",
        "4. Ensure your captions include your main keywords.",
        "5. Include a clear CTA to check the link in your bio.",
        "6. Set and forget the posting schedule."
      ],
      output: "A fully loaded content calendar executing 4-8 posts per day across multiple platforms.",
      mistakes: "Using watermarked TikTok videos on Instagram. Fix: Always upload the raw MP4 from your video generator to each platform natively or via a clean API.",
      optimization: "Vary the posting times based on platform analytics to catch peak active users.",
      next: "Capture the incoming traffic into an email list."
    },
    {
      title: "Build Email List",
      goal: "Convert rented social media followers into owned email subscribers.",
      why: "Social platforms can ban you at any time. An email list is the only asset you truly own, and it converts at 3-5x higher than social media.",
      tools: "GoHighLevel, Systeme.io",
      setup: [
        "1. Create a high-value 'Lead Magnet' (e.g., a free PDF guide).",
        "2. Build a simple Opt-in page in GoHighLevel or Systeme.io.",
        "3. The page should have a bold headline, a mockup of the lead magnet, and an email input form.",
        "4. Place the link to this opt-in page in all your social media bios.",
        "5. In your video CTAs, explicitly tell viewers to 'Click the link in my bio'.",
        "6. Test the form to ensure it captures data correctly."
      ],
      output: "A functional funnel that automatically collects emails 24/7.",
      mistakes: "Offering a generic newsletter. Fix: People only give their email for a specific, painful problem solution.",
      optimization: "A/B test two different landing page headlines to increase conversion rates from 20% to 40%.",
      next: "Monetize those captured emails with affiliate links."
    },
    {
      title: "Set Up Affiliate Links",
      goal: "Inject revenue-generating links into your automated communication sequences.",
      why: "This is where the money is made. You've built the audience and captured the leads; now you present the solution they can buy.",
      tools: "GetResponse, GoHighLevel",
      setup: [
        "1. Apply for high-ticket or recurring affiliate programs in your niche.",
        "2. Generate your unique affiliate tracking links.",
        "3. Set up a 'Thank You' page in your funnel that redirects leads to your affiliate offer immediately.",
        "4. Build a 5-7 day automated email sequence.",
        "5. Email 1: Deliver the free lead magnet. Email 2-3: Provide pure value. Email 4-5: Pitch the affiliate product.",
        "6. Embed your affiliate links in the emails."
      ],
      output: "An automated sales machine that pitches products on your behalf.",
      mistakes: "Pitching too hard, too fast. Fix: Use the Jab, Jab, Jab, Right Hook method. Value first, pitch later.",
      optimization: "Use custom tracking parameters (Sub-IDs) for different emails so you know exactly which email generated the sale.",
      next: "Track your data and scale the operation."
    },
    {
      title: "Track Revenue & Scale",
      goal: "Analyze performance data to double down on what works and kill what doesn't.",
      why: "What gets measured gets managed. Scaling requires knowing your exact conversion rates and traffic sources.",
      tools: "Google Sheets, Custom Analytics",
      setup: [
        "1. Ensure analytics are installed on your landing pages.",
        "2. Monitor which social platform drives the most email opt-ins.",
        "3. Check your affiliate dashboard daily to match sales with content spikes.",
        "4. Identify your top 3 performing videos/topics.",
        "5. Feed those winning topics back into step 1 to generate variations.",
        "6. Consider reinvesting profits into Paid Ads."
      ],
      output: "A predictable, data-driven scaling loop.",
      mistakes: "Flying blind without tracking links. Fix: Always use UTM parameters on your bio links.",
      optimization: "Build a custom dashboard that pulls data from your CRM and Affiliate networks into one single view.",
      next: "System complete. Maintain and grow."
    }
  ];

  const automationMaps = [
    { title: "Content Generation Flow", nodes: ["Google Sheets (Trigger)", "Make.com (Router)", "Magai (LLM)", "CustomGPT", "Google Sheets (Update)"] },
    { title: "Video Production Flow", nodes: ["Scripts Ready", "Viddeos AI API", "Render Engine", "Quality Check (Relay.app)", "Drive Save"] },
    { title: "SEO Blog Flow", nodes: ["Video Transcript", "AI Generator", "SEO Engine", "WordPress API", "Published URL"] },
    { title: "Lead Capture Flow", nodes: ["Social Traffic", "Systeme.io Opt-in", "Email Captured", "GetResponse Sequence", "Affiliate Link"] },
    { title: "Revenue Tracking Flow", nodes: ["Click Tracked", "Purchase Made", "Webhook", "Google Sheets", "KPI Dashboard"] }
  ];

  const kpiMetrics = [
    { label: "MONTHLY TRAFFIC POTENTIAL", value: "10K - 100K+", trend: "+24%", indicator: "up", type: "Visitors" },
    { label: "CONTENT OUTPUT", value: "50 - 200+", trend: "+12%", indicator: "up", type: "Pieces/Mo" },
    { label: "AFFILIATE CONVERSION", value: "2.5 - 5%", trend: "Stable", indicator: "neutral", type: "Rate" },
    { label: "LEAD GENERATION", value: "500 - 5K+", trend: "+45%", indicator: "up", type: "Leads/Mo" },
    { label: "SEO INDEXING", value: "100 - 1K+", trend: "+18%", indicator: "up", type: "Pages" },
    { label: "AUDIENCE GROWTH", value: "1K - 10K+", trend: "+30%", indicator: "up", type: "Followers/Mo" }
  ];

  const deploymentExamples = [
    { name: "Affiliate Blog Empire", stats: "$5K+/month | 60 days", tools: "SEO Engine, FastSEOHub", desc: "Pure SEO play. 100s of AI articles ranking for long-tail product reviews." },
    { name: "Faceless YouTube Channel", stats: "$2K-$10K/month | 30 days", tools: "TubeMagic, Viddeos AI", desc: "High-volume shorts and mid-form videos driving traffic to tech software." },
    { name: "TikTok Automation", stats: "$1K-$5K/month | 14 days", tools: "Pollo AI, Make.com", desc: "Rapid trend-jacking. 3-5 posts daily pushing users to a link-in-bio funnel." },
    { name: "Local Business Funnels", stats: "$3K-$15K/month | 7 days", tools: "GoHighLevel, Make.com", desc: "Capturing leads for local services and selling them per-appointment." },
    { name: "Niche Authority Brand", stats: "$5K-$25K/month | 90 days", tools: "Magai, CustomGPT", desc: "Using AI to build deep trust in the financial or health space." },
    { name: "AI Media Agency", stats: "$10K-$50K/month | 30 days", tools: "Make.com, Relay.app", desc: "Building this exact system for other businesses and charging a retainer." }
  ];

  const monetizationModules = [
    { name: "Affiliate Commissions", difficulty: "Easy", scale: "High", income: "$2K-$20K/month", desc: "Promote software or products for a % cut." },
    { name: "Digital Products", difficulty: "Medium", scale: "High", income: "$3K-$30K/month", desc: "Sell templates, guides, or mini-courses." },
    { name: "Lead Generation", difficulty: "Medium", scale: "High", income: "$2K-$15K/month", desc: "Sell raw leads to high-ticket closers." },
    { name: "Email Monetization", difficulty: "Easy", scale: "Medium", income: "$1K-$10K/month", desc: "Sell solo ads or newsletter sponsorships." },
    { name: "Sponsorships", difficulty: "Hard", scale: "High", income: "$5K-$50K/month", desc: "Direct brand deals on your automated channels." },
    { name: "AI Consulting", difficulty: "Medium", scale: "High", income: "$3K-$20K/month", desc: "Teach others how to build this exact system." },
    { name: "Paid Communities", difficulty: "Hard", scale: "Medium", income: "$2K-$15K/month", desc: "Charge monthly for access to premium content." },
    { name: "Authority Funnels", difficulty: "Hard", scale: "High", income: "$10K-$100K+/month", desc: "Complex high-ticket webinar funnels." }
  ];

  const mistakes = [
    { title: "Weak Content Quality", desc: "Spamming generic AI text.", fix: "Engineer complex prompts with strict rules." },
    { title: "Poor Niche Selection", desc: "Choosing broad, saturated markets.", fix: "Niche down 3 levels (e.g., Fitness -> Fasting -> Intermittent Fasting for Men over 40)." },
    { title: "Broken Automation Logic", desc: "Scenarios failing quietly.", fix: "Add error-handling and fallback routes in Make.com." },
    { title: "No CTA Strategy", desc: "Hoping people click organically.", fix: "Explicitly direct viewers exactly where to go." },
    { title: "Ignoring Analytics", desc: "Posting blindly.", fix: "Review retention graphs and drop-off points weekly." },
    { title: "Overcomplicated Stack", desc: "Paying for 20 tools.", fix: "Start with the minimum viable stack (Make + GoHighLevel)." },
    { title: "Poor SEO Optimization", desc: "Ignoring search intent.", fix: "Always use SEO tools to map out entities and headings." },
    { title: "Weak Email Strategy", desc: "Sending sales pitches daily.", fix: "Use 80% value, 20% pitch sequence." },
    { title: "No Affiliate Tracking", desc: "Links getting banned or untracked.", fix: "Always use a custom tracking domain and a bridge page." }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Helmet>
        <title>AI Affiliate Content Engine | Enterprise Operations Manual</title>
      </Helmet>
      
      <Header />
      
      <main className="flex-grow relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 starfield pointer-events-none z-0"></div>
        <div className="absolute inset-0 particle-bg pointer-events-none z-0"></div>
        <div className="absolute top-0 left-0 w-full h-[80vh] bg-gradient-to-b from-primary/10 via-transparent to-transparent pointer-events-none z-0"></div>

        {/* 1. HERO SECTION */}
        <section className="relative z-10 pt-32 pb-20 px-4 max-w-7xl mx-auto text-center animate-slide-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border glow-border bg-background/50 mb-8 backdrop-blur-md">
            <ShieldAlert className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono text-primary uppercase tracking-widest">Enterprise Architecture Blueprint v4.2</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight text-balance">
            AI AFFILIATE <span className="glow-text text-primary">CONTENT ENGINE</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed mb-12">
            Deploy an industrial-scale content factory. Automate script generation, video production, SEO expansion, and multi-channel distribution to drive passive affiliate revenue.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <Link to="/blueprints/ai-affiliate-content-engine/tools" className="saas-button px-8 py-4 text-lg shadow-[0_0_20px_rgba(0,212,255,0.4)] hover:shadow-[0_0_35px_rgba(0,212,255,0.6)] group">
              View Tool Requirements <ArrowRight className="inline ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button className="glassmorphism-card px-8 py-4 rounded-lg font-bold hover:bg-white/5 transition-colors border-border/50 text-lg">
              Explore Blueprints
            </button>
          </div>
        </section>

        {/* 2. LIVE SYSTEM ARCHITECTURE */}
        <section className="relative z-10 py-16 px-4 max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center glow-text">Live System Architecture</h2>
          <div className="w-full overflow-x-auto pb-8">
            <div className="flex items-center min-w-max px-4">
              {architectureNodes.map((node, index) => (
                <React.Fragment key={index}>
                  <div className="flex flex-col items-center group">
                    <div className="w-16 h-16 rounded-xl glassmorphism-card flex items-center justify-center glow-border group-hover:-translate-y-2 transition-transform bg-background/80 relative z-10">
                      <node.icon className="w-8 h-8 text-primary" />
                    </div>
                    <span className="mt-4 text-xs font-mono font-medium text-muted-foreground whitespace-nowrap">{node.label}</span>
                  </div>
                  {index < architectureNodes.length - 1 && (
                    <div className="w-16 md:w-24 h-[2px] mx-2 animated-line relative top-[-15px]"></div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>

        {/* 8. ENTERPRISE KPI DASHBOARD */}
        <section className="relative z-10 py-16 px-4 max-w-7xl mx-auto border-t border-border/30">
          <h2 className="text-3xl font-bold mb-4 flex items-center gap-3"><BarChart className="text-primary"/> Operational Capacity Matrix</h2>
          <p className="text-muted-foreground mb-10 max-w-2xl">Projected enterprise metrics when operating at 100% automated capacity across all nodes.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {kpiMetrics.map((kpi, idx) => (
              <div key={idx} className="kpi-card dashboard-panel group">
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">{kpi.label}</p>
                <div className="flex items-end gap-3 mb-4">
                  <h3 className="text-4xl font-extrabold text-foreground group-hover:glow-text transition-colors">{kpi.value}</h3>
                  <span className="text-sm font-medium text-muted-foreground mb-1">{kpi.type}</span>
                </div>
                <div className="flex items-center gap-2 mt-auto">
                  <div className={`px-2 py-1 rounded text-xs font-bold ${kpi.indicator === 'up' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-primary/20 text-primary'}`}>
                    {kpi.trend}
                  </div>
                  <span className="text-xs text-muted-foreground">vs manual baseline</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. PHASE-BASED EXECUTION SYSTEM */}
        <section className="relative z-10 py-24 px-4 bg-black/40 border-y border-border/30">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl font-bold mb-4 glow-text">Phase-Based Execution Architecture</h2>
            <p className="text-xl text-muted-foreground mb-16 max-w-3xl">An 8-stage industrial pipeline designed to move data from raw trend discovery into deposited affiliate commissions with zero manual intervention.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {phases.map((phase, idx) => (
                <div key={idx} className="phase-card group hover:glow-border transition-all duration-300">
                  <div className="absolute top-4 right-4 text-6xl font-extrabold text-primary/5 font-mono pointer-events-none group-hover:text-primary/10 transition-colors">
                    0{idx + 1}
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{phase.title}</h3>
                  <p className="text-muted-foreground mb-6 h-16">{phase.desc}</p>
                  
                  <div className="space-y-4 text-sm mt-auto">
                    <div className="flex items-start gap-3 bg-background/50 p-3 rounded-lg border border-border/50">
                      <Settings className="w-5 h-5 text-primary shrink-0" />
                      <div>
                        <span className="block font-bold text-foreground">Stack Required</span>
                        <span className="text-muted-foreground">{phase.tools}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="block text-xs font-mono text-muted-foreground mb-1 uppercase">Expected Output</span>
                        <span className="font-medium text-foreground">{phase.output}</span>
                      </div>
                      <div>
                        <span className="block text-xs font-mono text-muted-foreground mb-1 uppercase">Time Delta</span>
                        <span className="font-medium text-primary flex items-center gap-1"><Clock className="w-3 h-3"/> {phase.time}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. AI INFRASTRUCTURE MODULES */}
        <section className="relative z-10 py-24 px-4 max-w-7xl mx-auto">
          <div className="mb-16">
            <h2 className="text-4xl font-bold mb-4"><Server className="inline-block mr-3 w-10 h-10 text-primary animate-glow-pulse" />Infrastructure Modules</h2>
            <p className="text-xl text-muted-foreground max-w-3xl">Do not treat these as mere "tools". You are assembling a modular tech stack. If one node fails, the pipeline breaks. Select your modules accordingly.</p>
          </div>

          <div className="space-y-24">
            {infrastructureModules.map((module, mIdx) => (
              <div key={mIdx} className="relative">
                <div className="flex items-center gap-4 mb-8">
                  <div className="h-[2px] w-12 bg-primary"></div>
                  <h3 className="text-2xl font-bold font-mono tracking-widest text-primary uppercase">{module.category}</h3>
                  <div className="h-[2px] flex-grow bg-border/50"></div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {module.tools.map((tool, tIdx) => (
                    <div key={tIdx} className="glassmorphism-card p-6 rounded-xl border-border/50 hover:border-primary/40 transition-colors">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="text-xl font-bold text-foreground">{tool.name}</h4>
                        <span className={`px-2 py-1 text-xs font-bold rounded uppercase tracking-wider ${tool.roi === 'Extreme' || tool.roi === 'Very High' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          ROI: {tool.roi}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground mb-6">Role: <span className="text-primary">{tool.role}</span></p>
                      
                      <div className="space-y-4 text-sm">
                        <div>
                          <span className="font-bold text-foreground">Why It Matters: </span>
                          <span className="text-muted-foreground">{tool.why}</span>
                        </div>
                        <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg text-destructive-foreground">
                          <span className="font-bold">If Skipped: </span> {tool.skipped}
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4 bg-background/50 p-3 rounded-lg border border-border/50">
                          <div>
                            <span className="block text-xs font-mono text-emerald-400 mb-1">Beginner Protocol</span>
                            <span className="text-muted-foreground">{tool.beginner}</span>
                          </div>
                          <div>
                            <span className="block text-xs font-mono text-primary mb-1">Advanced Protocol</span>
                            <span className="text-muted-foreground">{tool.advanced}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. STEP-BY-STEP EXECUTION (Accordions) */}
        <section className="relative z-10 py-24 px-4 bg-black/40 border-y border-border/30">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-4 text-center glow-text">Step-by-Step Execution Protocol</h2>
            <p className="text-lg text-muted-foreground text-center mb-16">Expand each node for comprehensive deployment instructions.</p>

            <div className="space-y-4">
              {executionSteps.map((step, idx) => (
                <div key={idx} className="glassmorphism-card rounded-xl border border-border/50 overflow-hidden">
                  <button 
                    onClick={() => setOpenAccordion(openAccordion === idx ? null : idx)}
                    className="w-full px-6 py-5 flex items-center justify-between hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-xl font-mono font-bold text-primary">0{idx + 1}</span>
                      <span className="text-lg font-bold text-left">{step.title}</span>
                    </div>
                    {openAccordion === idx ? <Minus className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-muted-foreground" />}
                  </button>
                  
                  <AnimatePresence>
                    {openAccordion === idx && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-6 pb-6 overflow-hidden"
                      >
                        <div className="pt-4 border-t border-border/50 space-y-6">
                          <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg">
                            <h4 className="font-bold text-primary mb-1 flex items-center gap-2"><Target className="w-4 h-4"/> Goal</h4>
                            <p className="text-sm text-foreground">{step.goal}</p>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <h4 className="font-bold text-foreground mb-2 text-sm uppercase tracking-wider">Why It Matters</h4>
                              <p className="text-sm text-muted-foreground">{step.why}</p>
                            </div>
                            <div>
                              <h4 className="font-bold text-foreground mb-2 text-sm uppercase tracking-wider">Stack Required</h4>
                              <p className="text-sm font-mono text-primary bg-background p-2 rounded border border-border">{step.tools}</p>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-bold text-foreground mb-3 text-sm uppercase tracking-wider">Execution Steps</h4>
                            <ul className="space-y-2">
                              {step.setup.map((s, i) => (
                                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                  <span className="text-primary mt-0.5">•</span> {s}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-background/50 rounded-lg border border-border/50">
                            <div>
                              <h4 className="font-bold text-emerald-400 mb-2 text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4"/> Expected Output</h4>
                              <p className="text-sm text-muted-foreground">{step.output}</p>
                            </div>
                            <div>
                              <h4 className="font-bold text-destructive mb-2 text-sm flex items-center gap-2"><ShieldAlert className="w-4 h-4"/> Common Mistake</h4>
                              <p className="text-sm text-muted-foreground">{step.mistakes}</p>
                            </div>
                          </div>

                          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-muted/20 p-4 rounded-lg">
                            <div className="text-sm">
                              <span className="font-bold text-foreground">Optimization Tip: </span>
                              <span className="text-muted-foreground">{step.optimization}</span>
                            </div>
                            <div className="text-sm font-bold text-primary flex items-center gap-2 whitespace-nowrap">
                              Next Phase <ArrowRight className="w-4 h-4"/>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. AUTOMATION LOGIC PANELS */}
        <section className="relative z-10 py-24 px-4 max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">Automation Logic Architecture</h2>
          <div className="space-y-8">
            {automationMaps.map((map, idx) => (
              <div key={idx} className="glassmorphism-card p-6 md:p-8 rounded-2xl border-border/50">
                <h3 className="text-xl font-bold mb-6 font-mono text-foreground">MAP 0{idx + 1}: {map.title}</h3>
                <div className="flex flex-wrap items-center gap-4">
                  {map.nodes.map((node, nIdx) => (
                    <React.Fragment key={nIdx}>
                      <div className="bg-background border border-primary/30 px-4 py-3 rounded-lg text-sm font-medium shadow-[0_0_10px_rgba(0,212,255,0.1)] relative z-10">
                        {node}
                      </div>
                      {nIdx < map.nodes.length - 1 && (
                        <ArrowRight className="w-5 h-5 text-primary animate-pulse" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. START HERE IF YOU'RE A BEGINNER */}
        <section className="relative z-10 py-16 px-4 max-w-5xl mx-auto bg-primary/5 border border-primary/20 rounded-3xl my-12">
          <div className="flex flex-col md:flex-row gap-12 items-center">
            <div className="md:w-1/3 text-center md:text-left">
              <Zap className="w-16 h-16 text-primary mb-6 mx-auto md:mx-0 animate-float" />
              <h2 className="text-3xl font-bold mb-4">Start Here If You're a Beginner</h2>
              <p className="text-muted-foreground mb-6">Don't attempt the full enterprise architecture on day one. Deploy the Minimum Viable Stack (MVS) first to validate the system, then scale.</p>
              <Link to="/blueprints/ai-affiliate-content-engine/tools" className="saas-button w-full shadow-[0_0_15px_rgba(0,212,255,0.3)]">
                Deploy MVS Path
              </Link>
            </div>
            <div className="md:w-2/3 space-y-6 w-full">
              <div className="grid grid-cols-2 gap-4">
                <div className="glassmorphism-card p-4 rounded-xl border-border/50">
                  <h4 className="font-bold text-sm mb-1 uppercase tracking-wider">MVS Stack ($0-$50)</h4>
                  <p className="text-sm text-muted-foreground">Make.com, TubeMagic, Systeme.io, Predis.ai</p>
                </div>
                <div className="glassmorphism-card p-4 rounded-xl border-border/50">
                  <h4 className="font-bold text-sm mb-1 uppercase tracking-wider">Fastest Route</h4>
                  <p className="text-sm text-muted-foreground">Launch in 48 hours focusing ONLY on YouTube Shorts.</p>
                </div>
              </div>
              <div className="glassmorphism-card p-6 rounded-xl border-border/50">
                <h4 className="font-bold mb-3 text-destructive flex items-center gap-2"><ShieldAlert className="w-4 h-4"/> Beginner Trap to Avoid</h4>
                <p className="text-sm text-muted-foreground">Trying to master complex logic before you've manually posted a video. Build the system manually for 3 days to understand the logic, then automate the repetitive tasks.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. HOW TO SCALE THIS SYSTEM */}
        <section className="relative z-10 py-24 px-4 max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">Scaling to $10K+/Month</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { t: "Clone Niche Workflows", d: "Once Niche A is profitable, duplicate the exact Make.com scenario for Niche B." },
              { t: "Hire QA Virtual Assistants", d: "Remove yourself completely by hiring a $5/hr VA to approve AI scripts via Relay.app." },
              { t: "Expand to SEO", d: "Redirect video profits into SEO Engine to build an evergreen blog empire." },
              { t: "Launch Multi-Accounts", d: "Run 5 distinct faceless TikTok accounts funneling traffic to the same core affiliate offer." }
            ].map((item, idx) => (
              <div key={idx} className="glassmorphism-card p-6 rounded-xl border-border/50 hover:border-primary transition-colors">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold mb-4">{idx + 1}</div>
                <h4 className="font-bold mb-2">{item.t}</h4>
                <p className="text-sm text-muted-foreground">{item.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 7. REAL-WORLD DEPLOYMENT EXAMPLES */}
        <section className="relative z-10 py-24 px-4 bg-black/40 border-y border-border/30">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl font-bold mb-4 text-center">Real-World Deployments</h2>
            <p className="text-lg text-muted-foreground text-center mb-16">Architectures deployed by operators using this exact blueprint.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {deploymentExamples.map((ex, idx) => (
                <div key={idx} className="glassmorphism-card p-6 rounded-xl border-border/50 hover:glow-border transition-all">
                  <h3 className="text-xl font-bold mb-2 text-foreground">{ex.name}</h3>
                  <div className="text-emerald-400 font-mono text-sm mb-4 font-bold">{ex.stats}</div>
                  <p className="text-sm text-muted-foreground mb-4">{ex.desc}</p>
                  <div className="text-xs font-mono text-primary uppercase tracking-wider bg-background/50 p-2 rounded">Stack: {ex.tools}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 9. REVENUE ENGINE MODULES */}
        <section className="relative z-10 py-24 px-4 max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center glow-text">Revenue Engine Modules</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {monetizationModules.map((mod, idx) => (
              <div key={idx} className="dashboard-panel p-5 rounded-xl hover:bg-card/60 transition-colors">
                <h4 className="font-bold text-foreground mb-2">{mod.name}</h4>
                <div className="flex gap-2 mb-3">
                  <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${mod.difficulty === 'Easy' ? 'bg-emerald-500/20 text-emerald-400' : mod.difficulty === 'Medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'}`}>{mod.difficulty}</span>
                  <span className="text-[10px] px-2 py-1 rounded font-bold uppercase bg-primary/10 text-primary">{mod.scale} Scale</span>
                </div>
                <div className="text-lg font-extrabold text-foreground mb-2">{mod.income}</div>
                <p className="text-xs text-muted-foreground">{mod.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 10. BATTLE-TESTED OPERATOR MISTAKES */}
        <section className="relative z-10 py-24 px-4 bg-black/40 border-t border-border/30">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold mb-4 text-center"><ShieldAlert className="inline-block w-8 h-8 text-destructive mr-2"/> Battle-Tested Operator Mistakes</h2>
            <p className="text-lg text-muted-foreground text-center mb-16">Critical failure points identified across hundreds of deployments. Avoid these.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {mistakes.map((mistake, idx) => (
                <div key={idx} className="glassmorphism-card p-6 rounded-xl border-destructive/30 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-destructive"></div>
                  <h4 className="font-bold text-foreground mb-2 text-lg">{mistake.title}</h4>
                  <p className="text-sm text-muted-foreground mb-4">Problem: {mistake.desc}</p>
                  <div className="text-sm font-medium text-emerald-400 bg-emerald-500/10 p-3 rounded-lg">Fix: {mistake.fix}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="relative z-10 py-32 px-4 text-center">
          <div className="max-w-4xl mx-auto glassmorphism-card p-12 rounded-3xl glow-border">
            <Globe className="w-16 h-16 text-primary mx-auto mb-6 animate-glow-pulse" />
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 glow-text">DEPLOY YOUR AI AFFILIATE CONTENT ENGINE</h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Launch a fully automated AI-powered content and affiliate infrastructure capable of generating traffic, leads, authority, and recurring revenue across multiple platforms.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/blueprints/ai-affiliate-content-engine/tools" className="saas-button text-lg px-8 py-4 shadow-[0_0_25px_rgba(0,212,255,0.4)] hover:shadow-[0_0_40px_rgba(0,212,255,0.6)]">
                View Recommended Tool Stack
              </Link>
              <Link to="/blueprints" className="bg-background text-foreground border border-border/50 hover:bg-white/5 font-bold text-lg px-8 py-4 rounded-lg transition-colors inline-flex items-center justify-center">
                Explore More Blueprints
              </Link>
            </div>
          </div>
        </section>

      </main>
      
      <Footer />
    </div>
  );
};

export default AIAffiliateContentEnginePage;