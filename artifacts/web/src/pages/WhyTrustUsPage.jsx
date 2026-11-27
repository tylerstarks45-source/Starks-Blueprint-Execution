
import React from 'react';
import PageMeta from '@/components/PageMeta.jsx';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, TestTube2, RefreshCw, XCircle, ArrowRight,
  BadgeDollarSign, AlertTriangle, Target, CheckCircle2, Star, Lock, Eye,
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
    title: 'Evaluate Tools Before Connecting',
    desc: 'Check what a tool supports and test it with your workflow before relying on it for business operations.',
    points: ['Review the provider requirements', 'Use a test account when available', 'Confirm the result before going live'],
  },
  {
    icon: BadgeDollarSign,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/12',
    border: 'border-emerald-500/25',
    title: 'Affiliate Commissions',
    desc: 'Starks Global Group may earn a commission when you purchase a tool through an affiliate link.',
    points: ['Review the listing and provider terms', 'Check the total cost before buying'],
  },
  {
    icon: RefreshCw,
    color: 'text-blue-400',
    bg: 'bg-blue-500/12',
    border: 'border-blue-500/25',
    title: 'Review Connected Tools',
    desc: 'Review your connections if a tool changes its pricing, permissions, or available actions.',
    points: ['Check connection status', 'Review provider updates', 'Disconnect tools you no longer use'],
  },
  {
    icon: Eye,
    color: 'text-amber-400',
    bg: 'bg-amber-500/12',
    border: 'border-amber-500/25',
    title: 'Marketplace Disclosures',
    desc: 'Read each listing alongside the provider’s terms and pricing before making a purchase.',
    points: ['Review marketplace terms', 'Check for affiliate disclosures'],
  },
  {
    icon: Lock,
    color: 'text-rose-400',
    bg: 'bg-rose-500/12',
    border: 'border-rose-500/25',
    title: 'Connection Credentials',
    desc: 'Credentials saved in Connections use encrypted storage. The tools you connect determine which actions are available.',
    points: ['Encrypted credential storage', 'Manage connections from your account'],
  },
  {
    icon: XCircle,
    color: 'text-zinc-400',
    bg: 'bg-zinc-500/12',
    border: 'border-zinc-500/25',
    title: 'Confirm Provider Results',
    desc: 'Check published pages, payment activity, and other external results in the connected provider account.',
    points: ['Keep provider receipts', 'Review errors before retrying'],
  },
];

const PROCESS_STEPS = [
  { num: '01', label: 'Evaluate', desc: 'Research the tool against its claims. Check pricing, reliability, API quality, and support track record.' },
  { num: '02', label: 'Test in a Sandbox', desc: 'Connect a test account and check whether the expected result appears at the provider.' },
  { num: '03', label: 'Benchmark', desc: 'Compare reliability, cost, and the time it takes to complete the workflow.' },
  { num: '04', label: 'Decide Whether to Connect', desc: 'Choose a tool that meets your workflow and permission requirements.' },
];

const WhyTrustUsPage = () => {
  return (
    <VideoBackground>
      <PageMeta
        title="Why Trust Us | Starks Global Group"
        description="Learn what to check before connecting business tools and how Starks Global Group handles connections and affiliate links."
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
                Tools, Connections
                <span className="block text-gradient-blue mt-2">and Disclosures</span>
              </motion.h1>
              <motion.p variants={fadeUp} className="text-xl md:text-2xl text-zinc-100 leading-relaxed mb-8 max-w-3xl mx-auto font-medium text-shadow-md">
                Review the tools, permissions, and provider terms that apply to your business workflow.
              </motion.p>
            </motion.div>
          </div>
        </section>

        {/* TRUST PILLARS */}
        <section className="section-padding border-b border-white/5 bg-background/40 backdrop-blur-sm">
          <div className="section-container">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
              <h2 className="section-title">What to Check Before Connecting a Tool</h2>
              <p className="section-subtitle max-w-2xl mx-auto">
                Review provider terms and test important actions before using them in your business.
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
                  <Target className="w-4 h-4" /> TOOL EVALUATION
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-4 text-shadow-lg">
                  How to Evaluate
                  <span className="block text-gradient-blue mt-1">a Business Tool</span>
                </h2>
                <p className="text-lg text-zinc-300 mb-8 leading-relaxed">
                  Check whether the provider supports the actions, permissions, and test accounts your workflow requires.
                </p>
                <div className="cinematic-card p-6 border border-rose-500/20 bg-rose-500/5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-white text-sm mb-1">What to Look For</div>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Check the provider’s API limits, pricing, and support before relying on it for recurring work.
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
              <p className="text-lg text-zinc-200 leading-relaxed font-medium mb-6">
                Tyler Starks founded Starks Global Group to bring AI tools, business blueprints, and ASH into one platform.
              </p>
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
                Explore Business Tools
              </h2>
              <p className="text-zinc-300 mb-8 leading-relaxed">
                Browse the marketplace and review the requirements for your workflow.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button asChild variant="outline" className="w-full sm:w-auto h-12 px-8 bg-card/50 backdrop-blur-md border-white/20 hover:bg-card">
                  <Link to="/marketplace">Browse the Marketplace</Link>
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
