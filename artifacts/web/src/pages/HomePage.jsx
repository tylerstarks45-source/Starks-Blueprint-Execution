import React, { useEffect } from 'react';
import PageMeta from '@/components/PageMeta.jsx';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bot, Zap, CheckCircle2, ArrowRight, Play, Layers,
  Globe, TrendingUp, Users, DollarSign, Activity,
  Cpu, Rocket, ShoppingCart, Mail, BarChart3, Wand2,
  Building2, Target, Settings2, Star, Shield, ChevronRight,
  Workflow, Store, Film, MessageCircle, ImageIcon, Mic,
  Sparkles, FileText, Search, BadgeCheck, PlusCircle,
  BrainCircuit, Crown,
} from 'lucide-react';
import tylerImg from '@assets/IMG_8950_(2)_1781022690002.png';
import { useAuth } from '@/contexts/AuthContext.jsx';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import VideoBackground from '@/components/VideoBackground.jsx';

const fadeUp = { hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.1 } } };

// ─── Data ──────────────────────────────────────────────────────────────────────

const STATS = [
  { value: '2,400+', label: 'Systems Built' },
  { value: '1.2M+',  label: 'AI Requests Processed' },
  { value: '45',     label: 'Income System Types' },
  { value: '17+',    label: 'Marketplace Tools' },
  { value: '800+',   label: 'Entrepreneurs Served' },
];

const ASH_CAPABILITIES = [
  { icon: Cpu,           text: 'Build complete business systems end-to-end' },
  { icon: ImageIcon,     text: 'Generate AI images on demand' },
  { icon: Film,          text: 'Produce AI-generated videos' },
  { icon: MessageCircle, text: 'Build & deploy custom AI chatbots' },
  { icon: Globe,         text: 'Browse the web autonomously' },
  { icon: Activity,      text: 'Run 25–45 income systems simultaneously' },
  { icon: Workflow,      text: 'Create automations end-to-end' },
  { icon: Settings2,     text: 'Connect tools & platforms' },
  { icon: BarChart3,     text: 'Monitor live system performance' },
  { icon: TrendingUp,    text: 'Scale revenue automatically' },
  { icon: Layers,        text: 'Manage everything in one place' },
  { icon: Search,        text: 'Research markets & competitors' },
];

const ASH_POWERS = [
  {
    category: 'Content Generation',
    color: 'text-violet-400',
    bg: 'bg-violet-500/8',
    border: 'border-violet-500/20',
    items: [
      { icon: ImageIcon, title: 'AI Image Generation',   desc: 'Generate pro-quality images for ads, products, and branding' },
      { icon: Film,      title: 'AI Video Production',   desc: 'Create marketing, explainer, and promo videos with AI' },
      { icon: FileText,  title: 'Copywriting & Content', desc: 'Blog posts, ad copy, emails, scripts, and video sales letters' },
      { icon: Mic,       title: 'Voice & Audio Content', desc: 'Text-to-speech, podcast scripts, and audio ad creation' },
    ],
  },
  {
    category: 'Business Systems',
    color: 'text-blue-400',
    bg: 'bg-blue-500/8',
    border: 'border-blue-500/20',
    items: [
      { icon: Users,        title: 'Lead Generation Machines', desc: 'Ads → landing pages → CRM pipelines running on autopilot' },
      { icon: DollarSign,   title: 'Affiliate Income Empires', desc: 'Fully automated affiliate marketing at any scale' },
      { icon: ShoppingCart, title: 'Ecommerce Automation',     desc: 'Storefronts, product feeds, order fulfillment — automated' },
      { icon: Building2,    title: 'AI Agency Infrastructure', desc: 'Full agency setup, client delivery, and management systems' },
    ],
  },
  {
    category: 'AI Agents & Automation',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/8',
    border: 'border-emerald-500/20',
    items: [
      { icon: MessageCircle, title: 'AI Chatbot Builder',       desc: 'Build & deploy chatbots for any website or niche business' },
      { icon: Globe,         title: 'Autonomous Web Browsing',  desc: 'ASH browses the web, scrapes data, and researches for you' },
      { icon: Workflow,      title: 'No-Code Workflow Builder', desc: 'Connect Make, Zapier, n8n without writing a line of code' },
      { icon: Zap,           title: 'Trigger-Based Automation', desc: 'Set it and forget it — your systems run 24 / 7 on autopilot' },
    ],
  },
  {
    category: 'Scale & Empire Growth',
    color: 'text-amber-400',
    bg: 'bg-amber-500/8',
    border: 'border-amber-500/20',
    items: [
      { icon: Rocket,     title: '45 Income System Types',     desc: 'From a single stream to a full empire — all managed by ASH' },
      { icon: Target,     title: 'Revenue Goal Tracking',      desc: 'Set your monthly targets and ASH optimizes toward them daily' },
      { icon: BarChart3,  title: 'Live Performance Dashboard', desc: 'Real-time data across every active system you operate' },
      { icon: TrendingUp, title: 'Multi-Market Expansion',     desc: 'Scale into new verticals without starting from scratch' },
    ],
  },
];

const ASH_BUILDS = [
  { icon: Users,         title: 'Lead Generation Systems' },
  { icon: Building2,     title: 'AI Agencies' },
  { icon: Cpu,           title: 'SaaS Businesses' },
  { icon: DollarSign,    title: 'Affiliate Income Systems' },
  { icon: Activity,      title: 'Content Engines' },
  { icon: ShoppingCart,  title: 'Ecommerce Automation Systems' },
  { icon: Store,         title: 'Local Business Systems' },
  { icon: Workflow,      title: 'Automation Workflows' },
  { icon: Rocket,        title: 'Marketing Funnels & Campaigns' },
  { icon: MessageCircle, title: 'AI Chatbot Systems' },
  { icon: Film,          title: 'Video Content Businesses' },
  { icon: ImageIcon,     title: 'AI Image Generation Businesses' },
  { icon: Globe,         title: 'Digital Consulting Systems' },
  { icon: Mail,          title: 'Email Marketing Machines' },
  { icon: BarChart3,     title: 'Analytics & Reporting Systems' },
];

const EMPIRE_STEPS = [
  { step: '01', title: 'Choose Your Goal',       desc: 'Tell ASH what kind of income system or business you want to build.' },
  { step: '02', title: 'ASH Creates A Plan',     desc: 'Your AI agent maps out the full system architecture and blueprint.' },
  { step: '03', title: 'Connect Required Tools', desc: 'Link the platforms and software your system needs to operate.' },
  { step: '04', title: 'Deploy Your System',     desc: 'ASH builds and launches your automated system from the blueprint.' },
  { step: '05', title: 'Monitor Growth',         desc: 'Track real-time performance from your command center dashboard.' },
  { step: '06', title: 'Scale Revenue',          desc: 'Expand to new systems and markets — all managed in one place.' },
];

const INTEGRATIONS = [
  'OpenRouter', 'OpenAI', 'Claude', 'Google AI',
  'Stripe', 'Shopify', 'TikTok', 'Meta',
  'YouTube', 'Gmail', 'Make', 'Zapier',
  'Supabase', 'n8n', 'HubSpot', 'Mailchimp',
];

const PRICING = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    highlight: false,
    cta: 'Start Free',
    ctaTo: '/signup',
    features: ['1 active system', '100 AI credits/mo', 'Marketplace access', 'Basic blueprints', 'Community support'],
  },
  {
    name: 'Builder',
    price: '$29',
    period: '/month',
    highlight: false,
    cta: 'Start Building',
    ctaTo: '/signup?plan=builder',
    features: ['5 active systems', '1,000 AI credits/mo', 'Full marketplace', 'All blueprints', 'Priority support', 'ASH AI Agent'],
  },
  {
    name: 'Operator',
    price: '$99',
    period: '/month',
    highlight: true,
    badge: 'Most Popular',
    cta: 'Go Operator',
    ctaTo: '/signup?plan=operator',
    features: ['10 active systems', '5,000 AI credits/mo', 'Full marketplace', 'All blueprints', 'Priority support', 'ASH AI Agent', 'Advanced analytics'],
  },
  {
    name: 'Empire',
    price: '$499',
    period: '/month',
    highlight: false,
    badge: 'Max Power',
    cta: 'Go Empire',
    ctaTo: '/signup?plan=empire',
    features: ['Unlimited active systems', '25,000 AI credits/mo', 'Full marketplace', 'All blueprints', 'Dedicated support', 'ASH AI Agent', 'Custom workflows'],
  },
];

// ─── Component ─────────────────────────────────────────────────────────────────

const HomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading || isAuthenticated) return <div className="min-h-screen" />;

  return (
    <VideoBackground videoId="e1mZ2LO1vzQ">
      <PageMeta
        title="Starks Global Group — Build. Launch. Run. Scale. With ASH AI."
        description="The AI Business Operating System that helps entrepreneurs build automated income systems, generate images & videos, deploy chatbots, run 45 income system types, and manage everything from one dashboard."
      />

      <Header />

      <main className="flex-grow">

        {/* ═══════════════════════════════════════════════════════════════
            HERO
        ═══════════════════════════════════════════════════════════════ */}
        <section className="relative min-h-[92dvh] flex flex-col items-center justify-center pt-28 pb-20">
          <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center max-w-6xl">
            <motion.div
              initial="hidden" animate="show" variants={stagger}
              className="flex flex-col items-center"
            >
              {/* Status badge */}
              <motion.div variants={fadeUp} className="mb-8">
                <div className="activity-signal shadow-[0_4px_20px_rgba(0,0,0,0.5)] border border-primary/30 bg-background/60 backdrop-blur-md">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
                  </span>
                  <span className="text-foreground font-medium">ASH AI Agent — Now Live &amp; Fully Autonomous</span>
                </div>
              </motion.div>

              {/* Headline */}
              <motion.h1 variants={fadeUp} className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold text-white leading-[1.05] mb-6 tracking-tight text-balance text-shadow-lg">
                Build. Launch. Run. Scale.
                <br />
                <span className="text-gradient-blue drop-shadow-[0_2px_20px_rgba(0,180,255,0.45)]">
                  With ASH AI.
                </span>
              </motion.h1>

              {/* Subheadline */}
              <motion.p variants={fadeUp} className="text-xl md:text-2xl text-zinc-100 max-w-4xl mx-auto mb-10 leading-relaxed font-medium text-balance text-shadow-lg">
                ASH is your all-in-one AI agent — from building chatbots and generating images &amp; videos, to running 25–45 automated money-making systems simultaneously. Pair that with a marketplace of tested AI tools used in real income systems, and you have zero guesswork from day one.
              </motion.p>

              {/* CTAs */}
              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <Link to="/signup" className="saas-button text-lg px-10 py-4 gap-2">
                  <Rocket className="w-5 h-5" />
                  Start Free — Join Now
                </Link>
                <Link to="/marketplace" className="saas-button-secondary text-lg px-10 py-4 gap-2 bg-card/80 backdrop-blur-md">
                  <Store className="w-5 h-5" />
                  Explore AI Tools
                </Link>
              </motion.div>

              {/* Trust strip */}
              <motion.div variants={fadeUp} className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-sm md:text-base text-zinc-200 font-medium text-shadow-sm">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-accent" /> Free account — no credit card</span>
                <span className="hidden md:inline text-zinc-400">·</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-accent" /> ASH builds &amp; runs your systems</span>
                <span className="hidden md:inline text-zinc-400">·</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-accent" /> Images, videos &amp; chatbots included</span>
                <span className="hidden md:inline text-zinc-400">·</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-accent" /> 17+ tested AI tools in the marketplace</span>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            STATS STRIP
        ═══════════════════════════════════════════════════════════════ */}
        <section className="border-y border-white/6 bg-background/60 backdrop-blur-md py-10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              {STATS.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                  className="text-center"
                >
                  <div className="text-3xl md:text-4xl font-extrabold text-white text-glow mb-1">{s.value}</div>
                  <div className="text-sm text-zinc-400 font-medium">{s.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            MEET ASH AI
        ═══════════════════════════════════════════════════════════════ */}
        <section className="section-padding border-b border-white/5 bg-background/40 backdrop-blur-sm">
          <div className="section-container">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Left: text */}
              <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-sm font-bold font-mono mb-6">
                  <Bot className="w-4 h-4" /> AI AGENT · FULLY AUTONOMOUS
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-4 text-shadow-lg">
                  Meet ASH AI
                  <span className="block text-gradient-blue mt-1">The Only AI Agent You'll Ever Need</span>
                </h2>
                <p className="text-lg text-zinc-300 mb-8 leading-relaxed">
                  ASH is not a chatbot. ASH is a fully autonomous AI agent built from the ground up by Tyler Starks — capable of running your entire digital business. From generating images and videos, to building chatbots, browsing the web, and operating 25–45 automated income systems at once.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                  {ASH_CAPABILITIES.map((cap, i) => (
                    <motion.div
                      key={cap.text}
                      initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                      className="flex items-center gap-2.5"
                    >
                      <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
                        <cap.icon className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="text-sm text-zinc-200 font-medium">{cap.text}</span>
                    </motion.div>
                  ))}
                </div>
                <Link to="/builder" className="saas-button gap-2">
                  <Wand2 className="w-4 h-4" /> Open ASH Builder
                </Link>
              </motion.div>

              {/* Right: fake builder UI */}
              <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}>
                <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-card/60 backdrop-blur-md shadow-[0_0_60px_rgba(0,120,255,0.12)]">
                  <div className="bg-black/80 border-b border-white/8 px-4 py-2.5 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-rose-500/70" />
                      <div className="w-3 h-3 rounded-full bg-amber-500/70" />
                      <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      <span className="text-xs text-zinc-400 font-mono">ASH — AI Business Operating System</span>
                    </div>
                  </div>
                  <div className="p-5 space-y-3 font-mono text-sm min-h-[340px]">
                    {[
                      { role: 'user', text: 'Build me a full affiliate income system, generate a promotional image, and create a chatbot for my landing page' },
                      { role: 'ash',  text: 'On it. Building 3 systems in parallel:\n\n① Affiliate system: ClickBank → email funnel → CRM pipeline\n② Generating promotional image with AI now...\n③ Deploying chatbot to your landing page', running: false },
                      { role: 'ash',  text: '✓ Affiliate pipeline activated — tracking live\n✓ Promo image generated and delivered\n⚡ Chatbot deploying to your domain...', running: true },
                    ].map((msg, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.2 }}
                        className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.role === 'ash' && (
                          <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0 mt-0.5">
                            <Bot className="w-3.5 h-3.5 text-primary" />
                          </div>
                        )}
                        <div className={`max-w-[82%] px-3 py-2 rounded-lg text-xs leading-relaxed whitespace-pre-line ${
                          msg.role === 'user'
                            ? 'bg-primary/20 border border-primary/30 text-zinc-100'
                            : 'bg-white/5 border border-white/8 text-zinc-300'
                        }`}>
                          {msg.text}
                          {msg.running && <span className="inline-block ml-1 animate-pulse text-primary">▋</span>}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            ASH DOES EVERYTHING — FULL CAPABILITY SHOWCASE
        ═══════════════════════════════════════════════════════════════ */}
        <section className="section-padding border-b border-white/5 bg-background/50 backdrop-blur-sm">
          <div className="section-container">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-sm font-bold font-mono mb-5">
                <Sparkles className="w-4 h-4" /> FULL CAPABILITY SUITE
              </div>
              <h2 className="section-title">ASH Can Do Anything</h2>
              <p className="section-subtitle max-w-3xl mx-auto">
                One AI agent. Four power domains. From generating creative content to running a full online empire — ASH handles it all so you don't have to.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-6">
              {ASH_POWERS.map((group, gi) => (
                <motion.div
                  key={group.category}
                  initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: gi * 0.1 }}
                  className={`cinematic-card p-7 ${group.bg} border ${group.border}`}
                >
                  <div className={`text-xs font-bold font-mono ${group.color} tracking-widest uppercase mb-5 flex items-center gap-2`}>
                    <div className={`w-1.5 h-1.5 rounded-full bg-current`} />
                    {group.category}
                  </div>
                  <div className="space-y-4">
                    {group.items.map((item) => (
                      <div key={item.title} className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-xl border ${group.border} flex items-center justify-center shrink-0 mt-0.5 bg-black/20`}>
                          <item.icon className={`w-4 h-4 ${group.color}`} />
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm mb-0.5">{item.title}</div>
                          <div className="text-xs text-zinc-400 leading-relaxed">{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 }} className="text-center mt-10">
              <Link to="/signup" className="saas-button gap-2">
                <BrainCircuit className="w-4 h-4" /> Unlock Every Capability — Start Free
              </Link>
            </motion.div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            TWO PATHS
        ═══════════════════════════════════════════════════════════════ */}
        <section className="section-padding border-b border-white/5 bg-background/50 backdrop-blur-sm">
          <div className="section-container">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
              <h2 className="section-title">Choose Your Path</h2>
              <p className="section-subtitle">Two ways to use the platform. Both start free.</p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* Path 1 */}
              <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.05 }}
                className="cinematic-card p-8 flex flex-col"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center mb-5">
                  <Store className="w-6 h-6 text-blue-400" />
                </div>
                <div className="inline-block text-xs font-bold font-mono text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1 mb-4">PATH 1</div>
                <h3 className="text-2xl font-extrabold text-white mb-3">I Want Tested AI Tools</h3>
                <p className="text-zinc-400 mb-6 text-sm leading-relaxed">For users who want access to the best AI software — every tool is tested inside a real automated money-making system before it ever hits the marketplace. Zero guesswork.</p>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {[
                    'Browse the AI Marketplace',
                    'Every tool tested in real systems',
                    'Access exclusive deals',
                    'Affiliate offers & discounts',
                    'No guesswork — proven results',
                  ].map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-zinc-300">
                      <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Link to="/marketplace" className="saas-button-secondary gap-2 justify-center">
                  <Store className="w-4 h-4" /> Browse Tools
                </Link>
              </motion.div>

              {/* Path 2 */}
              <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.12 }}
                className="cinematic-card p-8 flex flex-col border-primary/30 bg-primary/5"
                style={{ boxShadow: '0 0 40px rgba(0,120,255,0.1)' }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center mb-5">
                  <Bot className="w-6 h-6 text-primary" />
                </div>
                <div className="inline-block text-xs font-bold font-mono text-primary bg-primary/10 border border-primary/25 rounded-full px-3 py-1 mb-4">PATH 2</div>
                <h3 className="text-2xl font-extrabold text-white mb-3">I Want ASH To Build My Empire</h3>
                <p className="text-zinc-400 mb-6 text-sm leading-relaxed">For entrepreneurs who want complete automated income systems built, managed, and scaled by their own AI agent — 24/7, without hiring a team.</p>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {[
                    'ASH AI Agent builds everything',
                    'Run 25–45 income systems at once',
                    'Images, videos & chatbots included',
                    'Host & monitor live systems',
                    'Command center dashboard',
                  ].map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-zinc-300">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Link to="/signup" className="saas-button gap-2 justify-center">
                  <Rocket className="w-4 h-4" /> Start Free
                </Link>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            WHAT CAN ASH BUILD?
        ═══════════════════════════════════════════════════════════════ */}
        <section className="section-padding border-b border-white/5 bg-background/40 backdrop-blur-sm">
          <div className="section-container">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
              <h2 className="section-title">45 Income System Types</h2>
              <p className="section-subtitle">Tell ASH your goal. ASH architects the system. You own the business.</p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ASH_BUILDS.map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.04 }}
                  className="professional-card flex items-center gap-4 py-5 cursor-default"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/12 border border-primary/25 flex items-center justify-center shrink-0">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-semibold text-zinc-100">{item.title}</span>
                  <ArrowRight className="w-4 h-4 text-zinc-600 ml-auto shrink-0" />
                </motion.div>
              ))}
            </div>

            <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 }} className="text-center mt-10">
              <Link to="/blueprints" className="saas-button-secondary gap-2">
                <Layers className="w-4 h-4" /> View All Blueprints
              </Link>
            </motion.div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            WHY ENTREPRENEURS USE STARKS
        ═══════════════════════════════════════════════════════════════ */}
        <section className="section-padding border-b border-white/5 bg-background/55 backdrop-blur-md">
          <div className="section-container">
            <div className="max-w-4xl mx-auto text-center">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                <h2 className="section-title">Why Entrepreneurs Choose Starks</h2>
                <p className="text-4xl md:text-5xl font-extrabold text-white mb-10 leading-tight text-shadow-lg">
                  Not thousands of random AI tools.
                  <span className="block text-gradient-blue mt-3 text-glow">One platform. One dashboard. One AI agent.</span>
                </p>
              </motion.div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-10">
                {[
                  { icon: Bot,        title: 'One AI Agent',     desc: 'ASH builds, runs, and scales everything — chatbots to empires.' },
                  { icon: Layers,     title: 'One Dashboard',    desc: 'Every system, tool, metric, and AI capability in a single view.' },
                  { icon: Globe,      title: 'One Marketplace',  desc: 'Curated tools tested inside real automated income systems.' },
                  { icon: TrendingUp, title: 'One Growth Path',  desc: 'From zero to scaled revenue — a clear roadmap the entire way.' },
                ].map((item, i) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                    className="cinematic-card p-6 text-center"
                  >
                    <div className="w-11 h-11 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center mx-auto mb-4">
                      <item.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="font-bold text-white mb-2">{item.title}</div>
                    <div className="text-xs text-zinc-400 leading-relaxed">{item.desc}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            BUILD YOUR ONLINE EMPIRE — 6-STEP PROGRESSION
        ═══════════════════════════════════════════════════════════════ */}
        <section className="section-padding border-b border-white/5 bg-background/40 backdrop-blur-sm">
          <div className="section-container">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
              <h2 className="section-title">Build Your Online Empire</h2>
              <p className="section-subtitle">Six steps from idea to scaled, automated revenue — driven entirely by ASH.</p>
            </motion.div>

            <div className="relative max-w-5xl mx-auto">
              <div className="hidden lg:block absolute top-9 left-[calc(8.33%+1.5rem)] right-[calc(8.33%+1.5rem)] h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-5">
                {EMPIRE_STEPS.map((step, i) => (
                  <motion.div
                    key={step.step}
                    initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                    className="flex flex-col items-center text-center"
                  >
                    <div className="w-[4.5rem] h-[4.5rem] rounded-2xl bg-primary/15 border border-primary/35 flex flex-col items-center justify-center mb-4 shadow-[0_0_20px_rgba(0,120,255,0.1)] relative z-10">
                      <span className="text-[10px] font-mono font-bold text-primary/60 tracking-widest">STEP</span>
                      <span className="text-xl font-extrabold text-white">{step.step}</span>
                    </div>
                    <div className="font-bold text-white text-sm mb-1.5">{step.title}</div>
                    <div className="text-[11px] text-zinc-500 leading-relaxed">{step.desc}</div>
                  </motion.div>
                ))}
              </div>
            </div>

            <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.5 }} className="text-center mt-12">
              <Link to="/signup" className="saas-button gap-2">
                <Rocket className="w-4 h-4" /> Start Building Now
              </Link>
            </motion.div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            ZERO GUESSWORK — MARKETPLACE + BLUEPRINT MARKETPLACE
        ═══════════════════════════════════════════════════════════════ */}
        <section className="section-padding border-b border-white/5 bg-background/50 backdrop-blur-sm">
          <div className="section-container">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-sm font-bold font-mono mb-5">
                <BadgeCheck className="w-4 h-4" /> ZERO GUESSWORK GUARANTEE
              </div>
              <h2 className="section-title">Two Marketplaces. Total Coverage.</h2>
              <p className="section-subtitle">Every tool and every blueprint on this platform has been tested inside a real automated income system — before it ever reaches you.</p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {/* AI Tool Marketplace */}
              <motion.div
                initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }} transition={{ delay: 0.05 }}
                className="cinematic-card p-8 flex flex-col border-blue-500/25 bg-blue-500/5"
                style={{ boxShadow: '0 0 40px rgba(59,130,246,0.08)' }}
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center mb-5">
                  <Store className="w-7 h-7 text-blue-400" />
                </div>
                <div className="inline-block text-xs font-bold font-mono text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1 mb-4">AI TOOL MARKETPLACE</div>
                <h3 className="text-2xl font-extrabold text-white mb-3">17+ Tested AI Tools</h3>
                <p className="text-zinc-400 mb-6 text-sm leading-relaxed">
                  Every tool in our marketplace has been deployed inside a real automated money-making system and verified for results. No paid placements, no sponsored rankings — only tools that perform.
                </p>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {[
                    'All tools tested in live income systems',
                    'No pay-to-play placements — ever',
                    '8 categories covering every use case',
                    'Exclusive deals and affiliate discounts',
                    'Updated continuously as tech evolves',
                  ].map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-zinc-300">
                      <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Link to="/marketplace" className="saas-button-secondary gap-2 justify-center border-blue-500/30 hover:border-blue-400/50">
                  <Store className="w-4 h-4" /> Browse AI Marketplace
                </Link>
              </motion.div>

              {/* Blueprint Marketplace */}
              <motion.div
                initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }} transition={{ delay: 0.12 }}
                className="cinematic-card p-8 flex flex-col border-violet-500/25 bg-violet-500/5"
                style={{ boxShadow: '0 0 40px rgba(139,92,246,0.08)' }}
              >
                <div className="w-14 h-14 rounded-2xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center mb-5">
                  <Layers className="w-7 h-7 text-violet-400" />
                </div>
                <div className="inline-block text-xs font-bold font-mono text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-full px-3 py-1 mb-4">BLUEPRINT MARKETPLACE</div>
                <h3 className="text-2xl font-extrabold text-white mb-3">Community Blueprints</h3>
                <p className="text-zinc-400 mb-6 text-sm leading-relaxed">
                  Browse community-built system blueprints, purchase proven setups from other operators, or submit your own. Every blueprint is reviewed before going live. Real systems, real results, real people.
                </p>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {[
                    'Browse community-submitted blueprints',
                    'Every blueprint reviewed & verified',
                    'Purchase and deploy in minutes with ASH',
                    'Submit your own — earn credits',
                    'Star ratings and verified reviews',
                  ].map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-zinc-300">
                      <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <div className="flex gap-3">
                  <Link to="/blueprints" className="flex-1 saas-button-secondary gap-2 justify-center border-violet-500/30 hover:border-violet-400/50">
                    <Layers className="w-4 h-4" /> Browse Blueprints
                  </Link>
                  <Link to="/blueprints/submit" className="saas-button-secondary px-4 justify-center border-violet-500/30 hover:border-violet-400/50" title="Submit a Blueprint">
                    <PlusCircle className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            CONNECTIONS HUB
        ═══════════════════════════════════════════════════════════════ */}
        <section className="section-padding border-b border-white/5 bg-background/50 backdrop-blur-sm">
          <div className="section-container">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
              <h2 className="section-title">Connect Everything</h2>
              <p className="section-subtitle">ASH integrates with the tools your business already uses — and the ones it will.</p>
            </motion.div>

            <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
              {INTEGRATIONS.map((name, i) => (
                <motion.div
                  key={name}
                  initial={{ opacity: 0, scale: 0.88 }} whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.04 }}
                  className="px-4 py-2 rounded-full bg-card/70 border border-white/10 backdrop-blur-sm text-sm font-semibold text-zinc-300 hover:border-primary/40 hover:text-white hover:bg-primary/8 transition-all cursor-default"
                >
                  {name}
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, scale: 0.88 }} whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }} transition={{ delay: INTEGRATIONS.length * 0.04 }}
                className="px-4 py-2 rounded-full bg-primary/10 border border-primary/25 text-sm font-semibold text-primary"
              >
                + Many More
              </motion.div>
            </div>

            <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.5 }} className="text-center mt-10">
              <Link to="/connections" className="saas-button-secondary gap-2">
                <Settings2 className="w-4 h-4" /> View Connections Hub
              </Link>
            </motion.div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            PRICING PREVIEW
        ═══════════════════════════════════════════════════════════════ */}
        <section className="section-padding border-b border-white/5 bg-background/40 backdrop-blur-sm">
          <div className="section-container">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
              <h2 className="section-title">Simple, Transparent Pricing</h2>
              <p className="section-subtitle">Free account available. No credit card required to start. Upgrade only when ready.</p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
              {PRICING.map((plan, i) => (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  className={`cinematic-card p-7 flex flex-col relative ${plan.highlight ? 'border-primary/40 bg-primary/5' : ''}`}
                  style={plan.highlight ? { boxShadow: '0 0 40px rgba(0,120,255,0.12)' } : {}}
                >
                  {plan.badge && (
                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold font-mono rounded-full px-3 py-1 border ${plan.highlight ? 'bg-primary text-primary-foreground border-primary/50' : 'bg-zinc-700 text-zinc-300 border-white/10'}`}>
                      {plan.badge}
                    </div>
                  )}
                  <div className="mb-5">
                    <div className="text-sm font-bold font-mono text-zinc-400 mb-2">{plan.name.toUpperCase()}</div>
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                      <span className="text-zinc-400 mb-1 text-sm">{plan.period}</span>
                    </div>
                  </div>
                  <ul className="space-y-2 mb-8 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm text-zinc-300">
                        <CheckCircle2 className={`w-4 h-4 shrink-0 ${plan.highlight ? 'text-primary' : 'text-zinc-500'}`} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link to={plan.ctaTo} className={plan.highlight ? 'saas-button justify-center' : 'saas-button-secondary justify-center'}>
                    {plan.cta}
                  </Link>
                </motion.div>
              ))}
            </div>

            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.4 }} className="text-center mt-8">
              <Link to="/pricing" className="text-sm text-zinc-400 hover:text-primary transition-colors flex items-center justify-center gap-1">
                View full pricing details <ChevronRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            DEVELOPER / FOUNDER SECTION
        ═══════════════════════════════════════════════════════════════ */}
        <section className="section-padding border-b border-white/5 bg-background/40 backdrop-blur-sm">
          <div className="section-container">
            <div className="max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="cinematic-card p-10 md:p-14"
              >
                <div className="grid md:grid-cols-2 gap-12 items-center">
                  {/* Tyler Starks photo */}
                  <div className="w-full rounded-2xl overflow-hidden border border-white/15 shadow-[0_0_60px_rgba(0,120,255,0.18)]" style={{ aspectRatio: '3/4' }}>
                    <img src={tylerImg} alt="Tyler Starks" className="w-full h-full object-cover object-top" />
                  </div>
                  <div>
                    <div className="text-xs font-bold font-mono text-primary/70 tracking-widest mb-3">DEVELOPER &amp; FOUNDER · STARKSGLOBALGROUP.NET</div>
                    <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-1">
                      Tyler Starks
                    </h2>
                    <div className="text-sm font-semibold text-zinc-400 mb-5">Developer &amp; Founder — Starks Global Group</div>
                    <div className="space-y-4 text-zinc-300 leading-relaxed">
                      <p>
                        Tyler Starks designed and built ASH from scratch — a fully autonomous AI agent engineered to do everything from running chatbots and generating images and videos, to operating 25–45 automated income systems simultaneously.
                      </p>
                      <p>
                        "I saw entrepreneurs wasting thousands of hours testing random AI tools with no structure, no proven systems, and no AI to execute for them. I built Starks Global Group to change that — and then I built ASH to make sure you never had to figure it out alone.
                      </p>
                      <p>
                        We are not just another AI tool. We are a tech infrastructure company in the making. When you join Starks Global Group, you are joining a platform built to grow with you — from your first income system to a full multi-market empire.
                      </p>
                      <p className="font-semibold text-white">
                        The tools. The blueprints. The agent. The marketplace. Everything under one roof — and it's only getting bigger."
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            FINAL CTA
        ═══════════════════════════════════════════════════════════════ */}
        <section className="section-padding bg-background/60 backdrop-blur-md">
          <div className="section-container text-center">
            <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-sm font-bold font-mono mb-8">
                <Crown className="w-4 h-4" /> JOIN THE PLATFORM
              </div>
              <h2 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 leading-tight text-shadow-lg">
                Buy The Tools.<br />
                <span className="text-gradient-blue">Use The Blueprints.</span><br />
                Build With ASH.
              </h2>
              <p className="text-xl text-zinc-300 max-w-3xl mx-auto mb-10 leading-relaxed">
                Run everything from one dashboard. Images, videos, chatbots, automations, and 45 income system types — all powered by ASH and backed by the most tested AI tool marketplace online. This is your all-in-one tech infrastructure for building online wealth.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <Link to="/signup" className="saas-button text-lg px-10 py-4 gap-2">
                  <Rocket className="w-5 h-5" /> Start Free — No Credit Card
                </Link>
                <Link to="/how-it-works" className="saas-button-secondary text-lg px-10 py-4 gap-2 bg-card/80 backdrop-blur-md">
                  <Play className="w-5 h-5" /> See How It Works
                </Link>
              </div>
              <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-sm text-zinc-400 font-medium">
                <span className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-zinc-500" /> Free account forever</span>
                <span className="hidden md:inline text-zinc-600">·</span>
                <span className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-zinc-500" /> Cancel anytime</span>
                <span className="hidden md:inline text-zinc-600">·</span>
                <span className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-zinc-500" /> No contracts</span>
                <span className="hidden md:inline text-zinc-600">·</span>
                <span className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-zinc-500" /> ASH included on all plans</span>
              </div>
            </motion.div>
          </div>
        </section>

      </main>

      <Footer />
    </VideoBackground>
  );
};

export default HomePage;
