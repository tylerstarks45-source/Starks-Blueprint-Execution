
import React from 'react';
import PageMeta from '@/components/PageMeta.jsx';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Cpu, Layers, Rocket, Unlock, LockKeyhole, ShieldCheck, Activity, Wrench, CheckSquare, Crosshair, ArrowRight, TerminalSquare } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import VideoBackground from '@/components/VideoBackground.jsx';

const HowItWorksPage = () => {
  return (
    <VideoBackground>
      <PageMeta
        title="How It Works | Starks Global Group"
        description="Discover how to use our platform to build, understand, and deploy real AI-powered automation systems."
      />
      
      <Header />
      
      <main className="flex-grow">
        
        <section className="relative pt-32 pb-24 lg:pt-40 lg:pb-32 overflow-hidden border-b border-white/10 bg-background/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center max-w-4xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 border border-primary/30 bg-primary/20 backdrop-blur-md text-primary text-xs font-mono uppercase tracking-widest rounded-md shadow-sm">
                <TerminalSquare className="w-3.5 h-3.5" />
                <span>Platform Architecture</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight tracking-tight mb-6 text-shadow-lg">
                How the Starks Global Platform Works
              </h1>
              <p className="text-lg md:text-xl text-zinc-100 leading-relaxed mb-4 max-w-3xl mx-auto text-shadow-md font-medium">
                A structured AI infrastructure platform designed to connect tools into real, deployable automation systems.
              </p>
              <div className="p-6 border border-primary/50 bg-card/80 text-left mx-auto max-w-2xl rounded-2xl backdrop-blur-xl shadow-2xl">
                <p className="text-sm md:text-base text-zinc-100 font-medium">
                  <strong className="text-primary">Important:</strong> We are not a generic AI tool directory. We are an automation infrastructure platform that tests how software integrates into cohesive, revenue-generating systems.
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="py-24 bg-background/60 backdrop-blur-md relative border-b border-white/10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4 text-shadow-md">The Platform Workflow</h2>
              <p className="text-zinc-200 max-w-2xl mx-auto font-medium text-shadow-sm">Follow our methodology to transition from browsing isolated tools to deploying complete automation architectures.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              {[
                { num: "1", icon: Search, title: "Browse Verified AI Tools", desc: "Explore our public marketplace of categorized AI software. We filter out the noise, listing only tools that serve a specific functional purpose in a broader automation stack." },
                { num: "2", icon: Layers, title: "Understand System Architecture", desc: "Instead of treating tools as isolated solutions, we define how each category fits into a larger automation system—covering traffic, content, conversion, and revenue flow." },
                { num: "3", icon: Cpu, title: "Access System Blueprints", desc: "Each blueprint reflects a tested system architecture—not a theoretical setup. Get structural maps, required tools, and setup paths." },
                { num: "4", icon: Rocket, title: "Build & Deploy", desc: "Use our blueprints to construct your own automated infrastructure. Save your selected tools to your dashboard, track your tech stack, and scale your operations with confidence." }
              ].map((step, idx) => (
                <div key={idx} className="group relative p-8 border border-white/20 bg-card/80 backdrop-blur-xl hover:border-primary/50 transition-colors duration-300 rounded-2xl overflow-hidden flex flex-col h-full shadow-xl">
                  <div className="absolute top-0 right-0 text-9xl font-black text-white/5 pointer-events-none select-none -mt-4 -mr-4 group-hover:text-primary/10 transition-colors">{step.num}</div>
                  <div className="w-12 h-12 bg-primary/20 border border-primary/30 flex items-center justify-center mb-6 rounded-xl text-primary backdrop-blur-md shadow-sm">
                    <step.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3 relative z-10 text-shadow-sm">{step.title}</h3>
                  <p className="text-zinc-300 text-sm leading-relaxed relative z-10 mt-auto font-medium">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 bg-background/40 backdrop-blur-sm relative border-b border-white/10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4 text-shadow-md">Browse Freely. Build with an Account.</h2>
              <p className="text-zinc-200 text-lg font-medium max-w-2xl mx-auto text-shadow-sm">
                We maintain a strict boundary between public discovery and private infrastructure planning.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-white/20 rounded-3xl overflow-hidden shadow-2xl">
              <div className="bg-card/90 backdrop-blur-2xl p-8 md:p-12 border-b lg:border-b-0 lg:border-r border-white/10">
                <div className="flex items-center gap-3 mb-8">
                  <Unlock className="w-6 h-6 text-zinc-300" />
                  <h3 className="text-xl font-bold text-white text-shadow-sm">What You Can Do Without an Account</h3>
                </div>
                <ul className="space-y-4">
                  {["Browse all AI tools in the marketplace", "Search and filter tools by functional category", "View high-level tool descriptions and use cases", "Access verified recommendations and ratings"].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-zinc-300 text-sm font-medium">
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 mt-2 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-primary/10 backdrop-blur-2xl p-8 md:p-12 relative overflow-hidden">
                <div className="flex items-center gap-3 mb-8 relative z-10">
                  <LockKeyhole className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-bold text-white text-shadow-sm">What You Unlock with an Account</h3>
                </div>
                <ul className="space-y-4 relative z-10">
                  {["Full access to step-by-step system blueprints", "Save specific systems to your personal profile", "Track and manage your entire software stack", "Access exclusive platform infrastructure updates", "Submit custom system and tool requests directly"].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-zinc-100 text-sm font-bold text-shadow-sm">
                      <CheckSquare className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="py-32 relative overflow-hidden bg-background/50 backdrop-blur-md">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center max-w-3xl">
            <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight mb-6 text-shadow-lg">
              Start Exploring or Build Your System
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-12">
              <Link to="/marketplace" className="w-full sm:w-auto px-8 py-4 bg-card/80 backdrop-blur-md border border-white/20 text-white font-bold text-sm tracking-wide hover:bg-card transition-all rounded-lg text-center shadow-lg">
                Browse Marketplace
              </Link>
              <Link to="/signup" className="w-full sm:w-auto px-8 py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm tracking-wide shadow-xl transition-all rounded-lg text-center">
                Create Free Account
              </Link>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </VideoBackground>
  );
};

export default HowItWorksPage;
