
import React from 'react';
import { Helmet } from 'react-helmet';
import CanonicalUrl from '@/components/CanonicalUrl.jsx';
import { motion } from 'framer-motion';
import { Building2, Scale, CheckSquare, ShieldAlert, AlertTriangle, Unlock, LockKeyhole, Settings, Crosshair, Mail, Info } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import VideoBackground from '@/components/VideoBackground.jsx';

const BusinessModelPage = () => {
  return (
    <VideoBackground>
      <CanonicalUrl />
      <Helmet>
        <title>Our Business Model | Starks Global Group</title>
        <meta name="description" content="A transparent approach to building, testing, and recommending AI-powered automation systems." />
      </Helmet>
      
      <Header />
      
      <main className="flex-grow">
        
        <section className="relative pt-32 pb-24 lg:pt-40 lg:pb-32 overflow-hidden border-b border-white/10 bg-background/40 backdrop-blur-sm">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center max-w-4xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 border border-primary/30 bg-primary/20 text-primary text-xs font-mono uppercase tracking-widest rounded-md backdrop-blur-md">
                <Building2 className="w-3.5 h-3.5" />
                <span>Platform Operations</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight tracking-tight mb-6 text-shadow-lg">
                Our Business Model
              </h1>
              <p className="text-lg md:text-xl text-zinc-100 font-medium leading-relaxed mb-6 max-w-3xl mx-auto text-shadow-md">
                A transparent approach to building, testing, and recommending AI-powered automation systems.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="py-24 bg-background/60 backdrop-blur-md relative border-b border-white/10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
            <div className="mb-16 md:flex md:items-end md:justify-between gap-8">
              <div className="max-w-2xl">
                <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4 text-shadow-md">How the Platform Works</h2>
                <p className="text-zinc-200 text-lg border-l-4 border-primary pl-4 py-1 font-medium text-shadow-sm">
                  Isolated tools do not create outcomes. Structured systems do.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8">
              {[
                { title: 'Evaluate', text: 'We evaluate third-party AI tools based on strict functional criteria, not marketing claims.' },
                { title: 'Test', text: 'We test them in real automation environments to ensure they deliver on operational promises.' },
                { title: 'Organize', text: 'We organize them into system blueprints that form cohesive, deployable architectures.' },
                { title: 'Guide', text: 'We provide structured guidance for implementation so users can deploy the systems themselves.' }
              ].map((item, index) => (
                <div key={index} className="p-8 border border-white/20 bg-card/80 backdrop-blur-xl rounded-2xl hover:border-primary/50 transition-colors shadow-xl">
                  <div className="text-primary font-bold text-sm mb-3 uppercase tracking-wider text-shadow-sm">0{index + 1} // {item.title}</div>
                  <p className="text-zinc-200 leading-relaxed font-medium">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 bg-background/40 backdrop-blur-sm relative border-b border-white/10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
            <div className="text-center mb-12">
              <Scale className="w-10 h-10 text-primary mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-6 text-shadow-md">How We Generate Revenue</h2>
              <p className="text-zinc-200 text-lg leading-relaxed mb-10 font-medium text-shadow-sm">
                Our platform generates revenue through established affiliate partnerships with the software platforms we recommend. When you build a system using our blueprints and sign up for a recommended tool via our links, we may earn a commission at no additional cost to you.
              </p>
            </div>

            <div className="p-8 md:p-10 border border-primary/40 bg-card/90 backdrop-blur-2xl rounded-2xl relative overflow-hidden mb-6 shadow-2xl">
              <div className="absolute top-0 left-0 w-2 h-full bg-primary" />
              <div className="flex gap-4 items-start">
                <ShieldAlert className="w-8 h-8 text-primary shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-bold text-white mb-3 text-shadow-sm">CRITICAL TRANSPARENCY STATEMENT:</h3>
                  <p className="text-zinc-200 leading-relaxed font-bold text-shadow-sm">
                    We do not accept payment in exchange for listing tools. Tools are included based on performance, integration capability, and system-level value—not promotional agreements.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-32 bg-background/60 backdrop-blur-lg relative overflow-hidden">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center max-w-3xl">
            <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-8 text-shadow-lg">
              Built on Transparency.<br/>Designed for Performance.
            </h2>
            <p className="text-zinc-200 text-lg leading-relaxed font-medium text-shadow-sm">
              Integrated systems are the future of digital operations. Starks Global Group maps that infrastructure, rigorously validates the tools required, and delivers clear architectures to build your business. No hidden motives, just structured execution.
            </p>
          </div>
        </section>

      </main>
      
      <Footer />
    </VideoBackground>
  );
};

export default BusinessModelPage;
