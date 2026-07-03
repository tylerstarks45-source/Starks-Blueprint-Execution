
import React from 'react';
import PageMeta from '@/components/PageMeta.jsx';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, TestTube2, Link as LinkIcon, Activity, RefreshCw,
  XCircle, ArrowRight, BadgeDollarSign, AlertTriangle, Target,
  CheckCircle2, Zap, BarChart3, BadgeCheck, Star, Lock, Eye,
  Cpu, Globe, Users, TrendingUp, DollarSign, Layers,
} from 'lucide-react';

import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { Button } from '@/components/ui/button';
import VideoBackground from '@/components/VideoBackground.jsx';

const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };

const TRUST_PILLARS = [
  {
    icon: TestTube2,
    color: 'text-violet-400',
    bg: 'bg-violet-500/12',
    border: 'border-violet-500/25',
    title: 'Every Tool is Battle-Tested First',
    desc: 'Before any tool appears in our marketplace, it must be deployed inside a live, revenue-generating automated system. If it doesn\'t perform in the real world, it doesn\'t get listed. No exceptions.',
    points: ['Real system deployment required', 'Performance benchmarks must be met', 'Removed instantly if standards drop'],
  },
  {
    icon: BadgeDollarSign,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/12',
    border: 'border-emerald-500/25',
    title: 'Flat Commission — No Bias',
    desc: 'Every affiliate partner on this platform earns us the same commission rate. We earn no more or less for recommending Tool A over Tool B — which means our only incentive is to surface the best tool for you.',
    points: ['Equal commission across all partners', 'No premium placement for pay-to-play', 'Capability is the only ranking factor'],
  },
  {
    icon: RefreshCw,
    color: 'text-blue-400',
    bg: 'bg-blue-500/12',
    border: 'border-blue-500/25',
    title: 'Continuous Re-Testing',
    desc: 'Tools aren\'t tested once and forgotten. Our systems run 24/7 — if a tool starts degrading in performance, price, or reliability, it gets flagged in our monitoring and reviewed for removal.',
    points: ['Ongoing live monitoring', 'Version & pricing change alerts', 'Delist first, ask questions later'],
  },
  {
    icon: Eye,
    color: 'text-amber-400',
    bg: 'bg-amber-500/12',
    border: 'border-amber-500/25',
    title: 'Full Transparency on What We Earn',
    desc: 'We are an affiliate platform — we make money when you buy the tools we recommend. We are upfront about this. Every listing page discloses affiliate relationships. There are no hidden paid reviews.',
    points: ['Affiliate disclosure on every listing', 'No undisclosed sponsorships', 'Revenue model explained publicly'],
  },
  {
    icon: Lock,
    color: 'text-rose-400',
    bg: 'bg-rose-500/12',
    border: 'border-rose-500/25',
    title: 'Your Data Stays Yours',
    desc: 'We do not sell your data, share it with tool vendors, or use it for ad targeting. Your credentials, business goals, and system configurations are stored encrypted and accessed only by ASH on your behalf.',
    points: ['Encrypted credential storage', 'Zero data resale policy', 'ASH-only access to your integrations'],
  },
  {
    icon: XCircle,
    color: 'text-zinc-400',
    bg: 'bg-zinc-500/12',
    border: 'border-zinc-500/25',
    title: 'We Remove Tools That Fail',
    desc: 'Several tools that have been popular in the AI space have been removed from our marketplace after failing our internal performance tests. We will always choose the honest delist over keeping a bad tool for commission.',
    points: ['No zombie listings', 'Hard standards, not soft ones', 'User-reported failures reviewed within 48h'],
  },
];

const PROCESS_STEPS = [
  { num: '01', label: 'Evaluate', desc: 'Research the tool against its claims. Check pricing, reliability, API quality, and support track record.' },
  { num: '02', label: 'Deploy Live', desc: 'Integrate the tool into a real automated income system. Observe actual performance under production conditions.' },
  { num: '03', label: 'Benchmark', desc: 'Measure against our performance standards. Does it perform better or worse than alternatives in the same category?' },
  { num: '04', label: 'List or Reject', desc: 'Pass = listed in the marketplace with honest notes. Fail = rejected, with feedback to the vendor. No middle ground.' },
];

const WhyTrustUsPage = () => {
  return (
    <VideoBackground>
      <PageMeta
        title="Why Trust Us | Starks Global Group"
        description="Learn how Starks Global Group tests, validates, and deploys AI tools and automation systems before recommending them."
      />

      <Header />

      <main className="flex-grow">

        {/* HERO */}
        <section className="relative pt-32 pb-24 lg:pt-40 lg:pb-32 overflow-hidden border-b border-white/10 bg-background/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 max-w-4xl text-center">
            <motion.div initial="hidden" animate="show" variants={stagger}>
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 border border-primary/30 bg-primary/15 backdrop-blur-md text-primary text-xs font-mono uppercase tracking-widest rounded-full">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Platform Integrity</span>
              </motion.div>
              <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-extrabold text-white leading-[1.05] tracking-tight mb-6 text-shadow-lg">
                We Prove It
                <span className="block text-gradient-blue mt-2">Before You See It.</span>
              </motion.h1>
              <motion.p variants={fadeUp} className="text-xl md:text-2xl text-zinc-100 leading-relaxed mb-8 max-w-3xl mx-auto font-medium text-shadow-md">
                Every tool in this marketplace has been deployed inside a live, revenue-generating automated system. We don't list tools we haven't run ourselves.
              </motion.p>
              <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-6 text-sm font-medium">
                {[
                  { icon: CheckCircle2, label: 'Live-system tested', color: 'text-emerald-400' },
                  { icon: BadgeCheck,   label: 'Flat affiliate rates',  color: 'text-blue-400' },
                  { icon: RefreshCw,    label: 'Continuously monitored', color: 'text-violet-400' },
                  { icon: Lock,         label: 'Zero data resale',       color: 'text-amber-400' },
                ].map(({ icon: Icon, label, color }) => (
                  <span key={label} className="flex items-center gap-1.5 text-zinc-200">
                    <Icon className={`w-4 h-4 ${color}`} /> {label}
                  </span>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* TRUST PILLARS */}
        <section className="section-padding border-b border-white/5 bg-background/40 backdrop-blur-sm">
          <div className="section-container">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
              <h2 className="section-title">Six Standards We Never Compromise On</h2>
              <p className="section-subtitle max-w-2xl mx-auto">
                These aren't marketing promises. They are operational constraints built into how this platform works.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {TRUST_PILLARS.map((pillar, i) => (
                <motion.div
                  key={pillar.title}
                  initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                  className={`cinematic-card p-7 border ${pillar.border} ${pillar.bg}`}
                >
                  <div className={`w-11 h-11 rounded-xl border ${pillar.border} flex items-center justify-center mb-5 bg-black/20`}>
                    <pillar.icon className={`w-5 h-5 ${pillar.color}`} />
                  </div>
                  <h3 className="text-lg font-extrabold text-white mb-3">{pillar.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed mb-4">{pillar.desc}</p>
                  <ul className="space-y-1.5">
                    {pillar.points.map(pt => (
                      <li key={pt} className="flex items-start gap-2 text-xs text-zinc-300">
                        <CheckCircle2 className={`w-3.5 h-3.5 ${pillar.color} shrink-0 mt-0.5`} /> {pt}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* OUR TESTING PROCESS */}
        <section className="section-padding border-b border-white/5 bg-background/50 backdrop-blur-sm">
          <div className="section-container">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-sm font-bold font-mono mb-6">
                  <Target className="w-4 h-4" /> OUR VETTING PROCESS
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-4 text-shadow-lg">
                  How A Tool
                  <span className="block text-gradient-blue mt-1">Earns a Listing</span>
                </h2>
                <p className="text-lg text-zinc-300 mb-8 leading-relaxed">
                  Most AI tool directories list anything that pays them. We do the opposite — we build live systems, observe real results, and only list tools that survive the process.
                </p>
                <div className="cinematic-card p-6 border border-rose-500/20 bg-rose-500/5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-white text-sm mb-1">What We Reject</div>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Tools with unstable APIs, deceptive pricing, poor support, or that underperform their marketing claims are rejected — regardless of commission size. Several well-known AI tools have been turned down.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}>
                <div className="space-y-4">
                  {PROCESS_STEPS.map((step, i) => (
                    <motion.div
                      key={step.num}
                      initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                      className="cinematic-card p-5 flex gap-5 items-start"
                    >
                      <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/30 flex flex-col items-center justify-center shrink-0">
                        <span className="text-[9px] font-mono text-primary/60 tracking-widest">STEP</span>
                        <span className="text-lg font-extrabold text-white leading-none">{step.num}</span>
                      </div>
                      <div>
                        <div className="font-extrabold text-white mb-1">{step.label}</div>
                        <p className="text-sm text-zinc-400 leading-relaxed">{step.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* PLATFORM PROOF STATS */}
        <section className="section-padding border-b border-white/5 bg-background/40 backdrop-blur-sm">
          <div className="section-container">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
              <h2 className="section-title">Built on Real Numbers</h2>
              <p className="section-subtitle">Every stat below reflects actual platform capabilities — not projections, not aspirational claims.</p>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 max-w-4xl mx-auto">
              {[
                { icon: Layers,     value: '8',     label: 'AI System Blueprints',   color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
                { icon: Globe,      value: '17+',   label: 'Marketplace Tools',       color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20' },
                { icon: Activity,   value: '40+',   label: 'Platform Integrations',   color: 'text-emerald-400',bg: 'bg-emerald-500/10',border: 'border-emerald-500/20' },
                { icon: Cpu,        value: '1.2M+', label: 'AI Requests Processed',   color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  className={`cinematic-card p-6 text-center border ${stat.border} ${stat.bg}`}
                >
                  <div className={`w-10 h-10 rounded-xl border ${stat.border} flex items-center justify-center mx-auto mb-4 bg-black/20`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div className={`text-3xl font-black ${stat.color} mb-1`}>{stat.value}</div>
                  <div className="text-xs text-zinc-400 font-medium leading-tight">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FOUNDER NOTE */}
        <section className="section-padding border-b border-white/5 bg-background/55 backdrop-blur-md">
          <div className="section-container">
            <motion.div
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-3xl mx-auto cinematic-card p-8 md:p-12 border border-primary/25 bg-primary/5"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
                  <Star className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-bold text-white text-sm">Tyler Starks</div>
                  <div className="text-xs text-zinc-500 font-mono">Founder, Starks Global Group</div>
                </div>
              </div>
              <blockquote className="text-lg text-zinc-200 leading-relaxed font-medium mb-6">
                "I built this platform because I was tired of AI tool directories recommending garbage. Every tool in our marketplace has been used inside a real automated income system that I or my team ran. If it didn't perform, it didn't get listed. That's not a policy — that's just how I built the thing."
              </blockquote>
              <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span>Affiliate disclosure: we earn commissions when you purchase tools via our links, at no extra cost to you.</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <section className="section-padding bg-background/60 backdrop-blur-sm">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-4 text-shadow-md">
                Start With Verified Systems
              </h2>
              <p className="text-zinc-300 mb-8 leading-relaxed">
                Every blueprint, every tool, every integration — tested before it reaches you.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button asChild variant="outline" className="w-full sm:w-auto h-12 px-8 bg-card/50 backdrop-blur-md border-white/20 hover:bg-card">
                  <Link to="/marketplace">Browse Verified Tools</Link>
                </Button>
                <Button asChild className="w-full sm:w-auto h-12 px-8 group bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl">
                  <Link to="/signup">
                    Create Free Account
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

      </main>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl py-10 border-t border-white/10">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-mono mb-4">Related Pages</p>
        <div className="flex flex-wrap gap-3">
          <Link to="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors underline underline-offset-4">About Us</Link>
          <Link to="/business-model" className="text-sm text-muted-foreground hover:text-primary transition-colors underline underline-offset-4">Business Model</Link>
          <Link to="/updates" className="text-sm text-muted-foreground hover:text-primary transition-colors underline underline-offset-4">Platform Updates</Link>
          <Link to="/blueprints" className="text-sm text-muted-foreground hover:text-primary transition-colors underline underline-offset-4">System Blueprints</Link>
        </div>
      </div>

      <Footer />
    </VideoBackground>
  );
};

export default WhyTrustUsPage;
