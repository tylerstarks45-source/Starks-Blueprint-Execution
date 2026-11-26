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

const ASH_CAPABILITIES = [
  { icon: Cpu,           text: 'Plan and build business systems' },
  { icon: ImageIcon,     text: 'Generate AI images on demand' },
  { icon: Film,          text: 'Produce AI-generated videos' },
  { icon: MessageCircle, text: 'Build & deploy custom AI chatbots' },
  { icon: Globe,         text: 'Research the web for current information' },
  { icon: Activity,      text: 'Manage multiple business systems' },
  { icon: Workflow,      text: 'Create automation workflows' },
  { icon: Settings2,     text: 'Connect tools & platforms' },
  { icon: BarChart3,     text: 'Monitor live system performance' },
  { icon: TrendingUp,    text: 'Review growth opportunities' },
  { icon: Layers,        text: 'Organize business assets in one workspace' },
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
      { icon: Users,        title: 'Lead Generation', desc: 'Build landing pages and plan workflows for leads and CRM' },
      { icon: DollarSign,   title: 'Affiliate Marketing', desc: 'Research programs and create affiliate content' },
      { icon: ShoppingCart, title: 'Ecommerce',     desc: 'Plan a storefront and create product assets' },
      { icon: Building2,    title: 'AI Agency Infrastructure', desc: 'Plan a service offer and organize client workflows' },
    ],
  },
  {
    category: 'AI Agents & Automation',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/8',
    border: 'border-emerald-500/20',
    items: [
      { icon: MessageCircle, title: 'AI Chatbot Builder',       desc: 'Create chatbots for supported publishing workflows' },
      { icon: Globe,         title: 'Web Research',  desc: 'Research markets, technologies, and business opportunities' },
      { icon: Workflow,      title: 'No-Code Workflow Builder', desc: 'Connect Make, Zapier, n8n without writing a line of code' },
      { icon: Zap,           title: 'Trigger-Based Automation', desc: 'Configure recurring work with connected services' },
    ],
  },
  {
    category: 'Scale & Empire Growth',
    color: 'text-amber-400',
    bg: 'bg-amber-500/8',
    border: 'border-amber-500/20',
    items: [
      { icon: Rocket,     title: 'Business Portfolio',   desc: 'Organize businesses and income streams in one place' },
      { icon: Target,     title: 'Revenue Goal Tracking',      desc: 'Set monthly targets and review progress' },
      { icon: BarChart3,  title: 'Live Performance Dashboard', desc: 'Monitor data reported by connected systems' },
      { icon: TrendingUp, title: 'Multi-Market Expansion',     desc: 'Research new markets and compare ways to expand' },
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
  { step: '04', title: 'Deploy Your System',     desc: 'Build from a blueprint and launch through supported integrations.' },
  { step: '05', title: 'Monitor Growth',         desc: 'Track real-time performance from your command center dashboard.' },
  { step: '06', title: 'Plan Your Next Move',          desc: 'Expand to new systems and markets — all managed in one place.' },
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
    features: ['1 active system', '250 AI credits/mo', 'Marketplace access', 'Basic blueprints', 'Community support'],
  },
  {
    name: 'Builder',
    price: '$29',
    period: '/month',
    highlight: false,
    cta: 'Start Building',
    ctaTo: '/signup?plan=builder',
    features: ['5 active systems', '2,500 AI credits/mo', 'Full marketplace', 'All blueprints', 'Priority support', 'ASH AI Agent'],
  },
  {
    name: 'Operator',
    price: '$99',
    period: '/month',
    highlight: true,
    badge: 'Most Popular',
    cta: 'Go Operator',
    ctaTo: '/signup?plan=operator',
    features: ['20 active systems', '10,000 AI credits/mo', 'Full marketplace', 'All blueprints', 'Priority support', 'ASH AI Agent', 'Advanced analytics'],
  },
  {
    name: 'Empire',
    price: '$499',
    period: '/month',
    highlight: false,
    badge: 'Max Power',
    cta: 'Go Empire',
    ctaTo: '/signup?plan=empire',
    features: ['Unlimited active systems', '50,000 AI credits/mo', 'Full marketplace', 'All blueprints', 'Dedicated support', 'ASH AI Agent', 'Custom workflows'],
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
        description="Research online business opportunities, build systems with ASH AI, and manage connected tools and workflows from one dashboard."
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
                  <span className="text-foreground font-medium">ASH AI</span>
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
              <motion.p variants={fadeUp} className="text-xl md:text-2xl text-zinc-100 max-w-3xl mx-auto mb-10 leading-relaxed font-medium text-balance text-shadow-lg">
                Tell ASH your business goal. Research opportunities, build a plan, and run supported tasks with the tools and permissions you choose.
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
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-accent" /> You set ASH’s permissions</span>
                <span className="hidden md:inline text-zinc-400">·</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-accent" /> Images, videos &amp; chatbots included</span>
                <span className="hidden md:inline text-zinc-400">·</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-accent" /> Explore tools in the marketplace</span>
              </motion.div>
            </motion.div>
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
                  <Bot className="w-4 h-4" /> AI BUSINESS AGENT
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-4 text-shadow-lg">
                  Meet ASH AI
                  <span className="block text-gradient-blue mt-1">Plan and build in one workspace</span>
                </h2>
                <p className="text-lg text-zinc-300 mb-8 leading-relaxed">
                  Use ASH to research a market, create assets, or work on a business system. Connect the services your workflow needs and choose which actions ASH can take.
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
                      <span className="text-xs text-zinc-400 font-mono">Example conversation</span>
                    </div>
                  </div>
                  <div className="p-5 space-y-3 font-mono text-sm min-h-[340px]">
                    {[
                      { role: 'user', text: 'Help me plan an affiliate business and create an image for its landing page.' },
                      { role: 'ash',  text: 'I’ll compare affiliate programs and review their commission terms. Then I’ll outline a landing page and draft an image for it.' },
                      { role: 'ash',  text: 'Once you’ve chosen a program, we can connect the tools for publishing and tracking referrals.' },
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
                <Sparkles className="w-4 h-4" /> ASH CAPABILITIES
              </div>
              <h2 className="section-title">What You Can Do With ASH</h2>
              <p className="section-subtitle max-w-3xl mx-auto">
                Create content, research markets, and work on business systems with your connected tools.
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
                <h3 className="text-2xl font-extrabold text-white mb-3">I Want to Explore AI Tools</h3>
                <p className="text-zinc-400 mb-6 text-sm leading-relaxed">Browse tools for content creation, marketing, automation, and business operations.</p>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {[
                    'Browse the AI Marketplace',
                    'Compare tools by category',
                    'Access exclusive deals',
                    'Affiliate offers & discounts',
                    'Explore business blueprints',
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
                <p className="text-zinc-400 mb-6 text-sm leading-relaxed">Research income opportunities, build business assets, and manage approved workflows with ASH.</p>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {[
                    'Give ASH a business goal and review a plan',
                    'Manage multiple business systems',
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
              <h2 className="section-title">Business Ideas to Explore With ASH</h2>
              <p className="section-subtitle">Explore business ideas with ASH. Supported actions depend on your connected tools and permissions.</p>
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
                  { icon: Bot,        title: 'One AI Agent',     desc: 'Research, build, and run supported workflows with ASH.' },
                  { icon: Layers,     title: 'One Dashboard',    desc: 'Every system, tool, metric, and AI capability in a single view.' },
                  { icon: Globe,      title: 'One Marketplace',  desc: 'Browse tools and blueprints for online business workflows.' },
                  { icon: TrendingUp, title: 'One Growth Path',  desc: 'Set milestones and track progress from one workspace.' },
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
            ZERO GUESSWORK — AI TOOL MARKETPLACE
        ═══════════════════════════════════════════════════════════════ */}
        <section className="section-padding border-b border-white/5 bg-background/50 backdrop-blur-sm">
          <div className="section-container">
            <div className="grid lg:grid-cols-2 gap-14 items-center max-w-6xl mx-auto">
              {/* Left: text */}
              <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-sm font-bold font-mono mb-6">
                  <BadgeCheck className="w-4 h-4" /> AI TOOL MARKETPLACE
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-4 text-shadow-lg">
                  Find tools for<br />
                  <span className="text-gradient-blue">your workflow.</span>
                </h2>
                <p className="text-lg text-zinc-300 mb-8 leading-relaxed">
                  Browse software for content, marketing, automation, and business operations.
                </p>
                <ul className="space-y-3 mb-8">
                  {[
                    { label: 'Browse by category', sub: 'AI writing, video, automation, CRM, email, analytics & more' },
                    { label: 'Tool and blueprint details', sub: 'Review what each listing offers before choosing it' },
                  ].map(f => (
                    <li key={f.label} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-semibold text-white">{f.label}</div>
                        <div className="text-xs text-zinc-500 mt-0.5">{f.sub}</div>
                      </div>
                    </li>
                  ))}
                </ul>
                <Link to="/marketplace" className="saas-button gap-2">
                  <Store className="w-4 h-4" /> Browse the AI Marketplace
                </Link>
              </motion.div>

              {/* Right: category grid */}
              <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: FileText, label: 'AI Writing', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                    { icon: Film, label: 'AI Video', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
                    { icon: Mail, label: 'Email Marketing', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                    { icon: Workflow, label: 'Automation', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
                    { icon: BarChart3, label: 'Analytics', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
                    { icon: MessageCircle, label: 'Chatbots', color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20' },
                    { icon: ImageIcon, label: 'AI Images', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
                    { icon: Target, label: 'CRM & Leads', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
                  ].map((cat, i) => (
                    <motion.div
                      key={cat.label}
                      initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                      className={`cinematic-card p-4 flex items-center gap-3 ${cat.border}`}
                    >
                      <div className={`w-9 h-9 rounded-lg ${cat.bg} border ${cat.border} flex items-center justify-center shrink-0`}>
                        <cat.icon className={`w-4 h-4 ${cat.color}`} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{cat.label}</div>
                      </div>
                    </motion.div>
                  ))}
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
                        Tyler Starks built ASH to bring business research, content creation, automation, and operations into one platform.
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
                Start with an idea, explore tools and blueprints, and use ASH to build and manage supported business workflows.
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
