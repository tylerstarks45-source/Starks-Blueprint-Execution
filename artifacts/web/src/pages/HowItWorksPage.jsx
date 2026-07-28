
import React from 'react';
import PageMeta from '@/components/PageMeta.jsx';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bot, Zap, Layers, Rocket, CheckCircle2, ArrowRight,
  Store, Workflow, MessageCircle, ImageIcon, Film,
  Cpu, Globe, Target, BarChart3, Mail, BrainCircuit,
  Wand2, ShieldCheck, Users, DollarSign, Settings2,
  Sparkles, Play, ChevronRight, BadgeCheck, FileText,
} from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';

const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };

const STEPS = [
  {
    num: '01',
    icon: Zap,
    color: 'text-primary',
    bg: 'bg-primary/15',
    border: 'border-primary/30',
    title: 'Create Your Free Account',
    desc: 'Sign up in under 60 seconds — no credit card required. Your account is your command center: it gives you access to ASH, your blueprints, your systems dashboard, and the AI tool marketplace.',
    bullets: ['Free forever tier available', 'Instant access to ASH AI', 'No credit card at signup'],
  },
  {
    num: '02',
    icon: Bot,
    color: 'text-violet-400',
    bg: 'bg-violet-500/15',
    border: 'border-violet-500/30',
    title: 'Tell ASH What You Want',
    desc: 'ASH is your AI for everything. Chat with it like you would ChatGPT — but ASH doesn\'t just answer questions. Tell it your goal and it figures out exactly what to build, which blueprint fits best, and what tools you need.',
    bullets: ['Conversational — just talk to it', 'ASH recommends the right blueprint', 'Works for any online income goal'],
  },
  {
    num: '03',
    icon: Layers,
    color: 'text-blue-400',
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/30',
    title: 'Pick a Free Blueprint',
    desc: 'Blueprints are free, pre-built system architectures — not templates, not PDFs. They are step-by-step automated income system maps that ASH executes for you. Every blueprint has been tested in a real live system.',
    bullets: ['8 blueprints across 6 income categories', '100% free — no purchase required', 'ASH reads and executes them for you'],
  },
  {
    num: '04',
    icon: Store,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
    title: 'Connect Your Tools',
    desc: 'Browse the AI Tool Marketplace for the specific tools your blueprint needs. Every tool is tested in a live income system before it\'s listed — no paid placements, no guesswork. Connect them in the Connections Hub and ASH takes over.',
    bullets: ['17+ tools across 8 categories', 'All tested — no filler tools', 'Connections Hub links everything to ASH'],
  },
  {
    num: '05',
    icon: Rocket,
    color: 'text-orange-400',
    bg: 'bg-orange-500/15',
    border: 'border-orange-500/30',
    title: 'ASH Builds & Runs Everything',
    desc: 'Once your tools are connected and your blueprint is set, ASH executes. It builds your system, generates content, monitors performance, and keeps everything running autonomously — 24/7, without you having to manage it.',
    bullets: ['Fully autonomous operation', 'Systems run 24/7 without you', 'ASH monitors and self-corrects'],
  },
];

const ASH_CAN = [
  { icon: MessageCircle, label: 'Be Your Chatbot', desc: 'Deploy ASH as a chatbot on any page — it answers questions, qualifies leads, and converts visitors.' },
  { icon: FileText, label: 'Write Your Content', desc: 'Blog posts, email sequences, ad copy, social content — ASH writes and publishes it all.' },
  { icon: ImageIcon, label: 'Generate Images', desc: 'AI-generated promotional images, social graphics, product visuals — on demand.' },
  { icon: Film, label: 'Create Videos', desc: 'AI video scripts, voiceovers, and short-form video content without a camera.' },
  { icon: Workflow, label: 'Build Automations', desc: 'Connect apps, trigger workflows, route leads, and automate any repeatable task.' },
  { icon: Globe, label: 'Browse the Web', desc: 'ASH can research competitors, scrape data, monitor trends, and act on what it finds.' },
  { icon: BarChart3, label: 'Analyze & Report', desc: 'Performance dashboards, revenue breakdowns, and smart suggestions based on real data.' },
  { icon: Cpu, label: 'Run Your Systems', desc: 'Operate multiple automated income systems in parallel — affiliate, email, content, ecommerce, and more — 24/7 on autopilot.' },
];

const BLUEPRINTS = [
  { name: 'Affiliate Marketing System', category: 'Affiliate', icon: DollarSign },
  { name: 'Email List Building System', category: 'Email', icon: Mail },
  { name: 'AI Content Empire', category: 'Content', icon: FileText },
  { name: 'Lead Generation Machine', category: 'Leads', icon: Target },
  { name: 'Social Media Automation', category: 'Social', icon: Users },
  { name: 'Ecommerce AI System', category: 'Ecommerce', icon: Store },
  { name: 'Digital Product Funnel', category: 'Products', icon: Layers },
  { name: 'Analytics & Optimization', category: 'Analytics', icon: BarChart3 },
];

const HOW_IT_WORKS_VIDEO_ID = 'nGnX6GkrOgk';

const HowItWorksPage = () => {
  return (
    <div className="relative min-h-screen w-full flex flex-col">
      {/* Video background — How It Works page only */}
      <div className="fixed inset-0 w-full h-screen z-[-2] overflow-hidden pointer-events-none">
        <iframe
          src={`https://www.youtube.com/embed/${HOW_IT_WORKS_VIDEO_ID}?autoplay=1&mute=1&loop=1&playlist=${HOW_IT_WORKS_VIDEO_ID}&controls=0&modestbranding=1&playsinline=1&rel=0&vq=hd1080&hd=1&quality=hd1080`}
          allow="autoplay; encrypted-media; fullscreen"
          frameBorder="0"
          title="How It Works Background Video"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '110vw',
            height: 'calc(110vw * 9 / 16)',
            minHeight: '110vh',
            minWidth: 'calc(110vh * 16 / 9)',
            transform: 'translate3d(-50%, -50%, 0)',
            transformOrigin: 'center center',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            border: 'none',
            outline: 'none',
          }}
        />
      </div>
      {/* No tint overlay — video is intentionally fully visible */}
      <div className="relative z-10 flex-grow flex flex-col w-full h-full">
      <PageMeta
        title="How It Works | Starks Global Group"
        description="Learn how ASH AI builds and runs your automated income systems from start to finish."
      />

      <Header />

      <main className="flex-grow">

        {/* HERO */}
        <section className="relative pt-32 pb-24 lg:pt-40 lg:pb-32 overflow-hidden border-b border-white/10 bg-background/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center max-w-4xl">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 border border-primary/30 bg-primary/15 backdrop-blur-md text-primary text-xs font-mono uppercase tracking-widest rounded-full">
                <BrainCircuit className="w-3.5 h-3.5" />
                <span>Platform Overview</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-[1.05] tracking-tight mb-6 text-shadow-lg">
                How It Works
              </h1>
              <p className="text-xl md:text-2xl text-zinc-100 leading-relaxed mb-8 max-w-3xl mx-auto font-medium text-shadow-md">
                One AI. Free blueprints. A tested tool marketplace. Here's exactly how you go from zero to a fully automated income system.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/signup" className="saas-button gap-2 text-lg px-8 py-4">
                  <Rocket className="w-5 h-5" /> Start Free — No Card Needed
                </Link>
                <Link to="/builder" className="saas-button-secondary gap-2 text-lg px-8 py-4 bg-card/80 backdrop-blur-md">
                  <Bot className="w-5 h-5" /> Talk to ASH Now
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* 5-STEP FLOW */}
        <section className="section-padding border-b border-white/5 bg-background/40 backdrop-blur-sm">
          <div className="section-container">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
              <h2 className="section-title">Five Steps to a Running System</h2>
              <p className="section-subtitle max-w-2xl mx-auto">From account creation to a live automated income machine — here's the exact path.</p>
            </motion.div>

            <div className="space-y-6 max-w-4xl mx-auto">
              {STEPS.map((step, i) => (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, x: i % 2 === 0 ? -24 : 24 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                  className="cinematic-card p-7 flex gap-6 items-start"
                >
                  <div className="shrink-0 flex flex-col items-center gap-3">
                    <div className={`w-14 h-14 rounded-2xl ${step.bg} border ${step.border} flex items-center justify-center`}>
                      <step.icon className={`w-7 h-7 ${step.color}`} />
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="w-px flex-1 min-h-[20px] bg-white/8" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <div className={`text-xs font-bold font-mono ${step.color} tracking-widest uppercase mb-2`}>STEP {step.num}</div>
                    <h3 className="text-xl font-extrabold text-white mb-2">{step.title}</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed mb-4">{step.desc}</p>
                    <div className="flex flex-wrap gap-3">
                      {step.bullets.map(b => (
                        <span key={b} className="flex items-center gap-1.5 text-xs text-zinc-300 font-medium">
                          <CheckCircle2 className={`w-3.5 h-3.5 ${step.color} shrink-0`} /> {b}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="shrink-0 hidden md:block self-center">
                    <span className="text-7xl font-black text-white/5 select-none">{step.num}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* WHAT ASH CAN DO */}
        <section className="section-padding border-b border-white/5 bg-background/50 backdrop-blur-sm">
          <div className="section-container">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-sm font-bold font-mono mb-5">
                <Bot className="w-4 h-4" /> ASH AI AGENT
              </div>
              <h2 className="section-title">ASH Can Do Anything</h2>
              <p className="section-subtitle max-w-3xl mx-auto">
                Stop paying for ChatGPT, a separate image tool, a video platform, and an automation service. ASH replaces all of them — and then runs your entire business on top of it.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {ASH_CAN.map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                  className="cinematic-card p-5"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center mb-4">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="font-bold text-white text-sm mb-1.5">{item.label}</div>
                  <div className="text-xs text-zinc-400 leading-relaxed">{item.desc}</div>
                </motion.div>
              ))}
            </div>

            <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 }} className="text-center mt-10">
              <Link to="/builder" className="saas-button gap-2">
                <Wand2 className="w-4 h-4" /> Open ASH — Try It Free
              </Link>
            </motion.div>
          </div>
        </section>

        {/* BLUEPRINTS ARE FREE */}
        <section className="section-padding border-b border-white/5 bg-background/40 backdrop-blur-sm">
          <div className="section-container">
            <div className="grid lg:grid-cols-2 gap-14 items-center max-w-6xl mx-auto">
              <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-sm font-bold font-mono mb-6">
                  <Layers className="w-4 h-4" /> SYSTEM BLUEPRINTS — FREE
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-4 text-shadow-lg">
                  Blueprints Are<br />
                  <span className="text-gradient-blue">Always Free.</span>
                </h2>
                <p className="text-lg text-zinc-300 mb-6 leading-relaxed">
                  Blueprints are not templates and they are not PDFs. They are complete, step-by-step automated income system maps — built and tested by Tyler Starks — that ASH reads and executes for you. Every single one is free. No purchase, no subscription required to access them.
                </p>
                <ul className="space-y-3 mb-8">
                  {[
                    'Free to every account — no tier required',
                    'ASH executes the blueprint end-to-end',
                    'Each tested in a real live income system',
                    '8 blueprints across 6 income categories',
                    'Community members can submit blueprints too',
                  ].map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-zinc-300">
                      <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Link to="/blueprints" className="saas-button gap-2">
                  <Layers className="w-4 h-4" /> Browse All Blueprints — Free
                </Link>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}>
                <div className="space-y-3">
                  {BLUEPRINTS.map((bp, i) => (
                    <motion.div
                      key={bp.name}
                      initial={{ opacity: 0, x: 16 }} whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                      className="cinematic-card px-5 py-4 flex items-center gap-4"
                    >
                      <div className="w-9 h-9 rounded-lg bg-blue-500/15 border border-blue-500/25 flex items-center justify-center shrink-0">
                        <bp.icon className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white truncate">{bp.name}</div>
                        <div className="text-xs text-zinc-500 font-mono">{bp.category}</div>
                      </div>
                      <span className="text-xs font-bold font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1 shrink-0">FREE</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* FREE VS PAID */}
        <section className="section-padding border-b border-white/5 bg-background/50 backdrop-blur-sm">
          <div className="section-container">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
              <h2 className="section-title">Start Free. Scale When Ready.</h2>
              <p className="section-subtitle max-w-2xl mx-auto">Everything you need to get your first system running is free. Upgrade only when you want to run more systems and unlock advanced ASH capabilities.</p>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-0 border border-white/10 rounded-3xl overflow-hidden shadow-2xl max-w-4xl mx-auto">
              {/* Free */}
              <div className="bg-card/80 backdrop-blur-xl p-8 md:p-10 border-b lg:border-b-0 lg:border-r border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-zinc-300" />
                  </div>
                  <h3 className="text-xl font-extrabold text-white">Free Account</h3>
                </div>
                <div className="text-3xl font-extrabold text-white mb-6 mt-1">$0 <span className="text-base font-medium text-zinc-400">/ forever</span></div>
                <ul className="space-y-3">
                  {[
                    'Full access to ASH AI agent',
                    'All 8 blueprints — free',
                    'Browse AI Tool Marketplace',
                    'Connect tools via Connections Hub',
                    'Build 1 active system',
                    'Standard ASH response speed',
                  ].map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-300">
                      <CheckCircle2 className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
                <Link to="/signup" className="saas-button-secondary gap-2 justify-center mt-8 w-full">
                  <Rocket className="w-4 h-4" /> Create Free Account
                </Link>
              </div>

              {/* Paid */}
              <div className="bg-primary/10 backdrop-blur-xl p-8 md:p-10 relative overflow-hidden">
                <div className="absolute top-4 right-4">
                  <span className="text-xs font-bold font-mono text-primary bg-primary/15 border border-primary/30 rounded-full px-3 py-1">MOST POPULAR</span>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                    <BrainCircuit className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-extrabold text-white">Builder & Empire</h3>
                </div>
                <div className="text-3xl font-extrabold text-white mb-6 mt-1">From $29 <span className="text-base font-medium text-zinc-400">/ month</span></div>
                <ul className="space-y-3">
                  {[
                    'Run multiple income systems simultaneously',
                    'Priority ASH processing speed',
                    'Unlimited blueprint deployments',
                    'Advanced AI: image, video & browser',
                    'Full Connections Hub — all integrations',
                    'Dedicated support & white-glove setup',
                  ].map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-100 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
                <Link to="/pricing" className="saas-button gap-2 justify-center mt-8 w-full">
                  <Sparkles className="w-4 h-4" /> View All Plans
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="section-padding bg-background/50 backdrop-blur-md">
          <div className="section-container">
            <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-sm font-bold font-mono mb-6">
                <BadgeCheck className="w-4 h-4" /> READY WHEN YOU ARE
              </div>
              <h2 className="text-4xl md:text-6xl font-extrabold text-white leading-tight tracking-tight mb-6 text-shadow-lg">
                Your First System Is<br />
                <span className="text-gradient-blue">One Conversation Away</span>
              </h2>
              <p className="text-lg text-zinc-300 mb-10 leading-relaxed">
                Sign up free, open ASH, tell it what you want to build — and watch it go. No tech skills needed, no guesswork, no wasted time figuring it out alone.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/signup" className="saas-button text-lg px-10 py-4 gap-2">
                  <Rocket className="w-5 h-5" /> Start Free — Join Now
                </Link>
                <Link to="/marketplace" className="saas-button-secondary text-lg px-10 py-4 gap-2 bg-card/80 backdrop-blur-md">
                  <Store className="w-5 h-5" /> Explore AI Tools
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

      </main>
      <Footer />
      </div>
    </div>
  );
};

export default HowItWorksPage;
