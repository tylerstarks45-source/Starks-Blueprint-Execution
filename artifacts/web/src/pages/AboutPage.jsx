
import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import CanonicalUrl from '@/components/CanonicalUrl.jsx';
import { motion } from 'framer-motion';
import { ShieldCheck, CheckCircle2, User, Target, Zap, Youtube } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import FounderSection from '@/components/FounderSection.jsx';
import VideoBackground from '@/components/VideoBackground.jsx';

const AboutPage = () => {
  return (
    <VideoBackground>
      <CanonicalUrl />
      <Helmet>
        <title>About Us | Starks Global Group</title>
        <meta name="description" content="Learn about Tyler Starks and our commitment to building real automated systems using AI tools." />
      </Helmet>
      
      <Header />
      
      <main className="flex-grow pt-32 pb-24 overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          
          <section className="text-center mb-24 relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="max-w-4xl mx-auto bg-background/50 backdrop-blur-md p-10 rounded-3xl border border-white/10 shadow-2xl"
            >
              <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-primary/20 border border-primary/30 text-primary text-sm font-bold tracking-wide mb-8 shadow-[0_0_15px_hsl(var(--primary)/0.2)] backdrop-blur-sm">
                <ShieldCheck className="w-4 h-4 mr-2" /> Verified Infrastructure
              </div>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-foreground mb-6 text-shadow-lg">
                Engineering Real <br className="hidden md:block" /> Business Outcomes
              </h1>
              <p className="text-xl md:text-2xl text-zinc-200 leading-relaxed font-medium text-shadow-sm">
                We bridge the gap between raw AI technology and actual, measurable operational success.
              </p>
            </motion.div>
          </section>

          <FounderSection />

          <section className="mb-32">
            <div className="max-w-4xl mx-auto space-y-16 relative before:absolute before:inset-0 before:ml-8 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/20 before:to-transparent py-12">
              
              {[
                {
                  icon: User,
                  title: "Who We Are",
                  text: "I build real automated systems using AI tools and document what actually works. My background is in systems engineering and digital marketing, giving me the unique ability to bridge the gap between raw technology and actual business growth potential."
                },
                {
                  icon: Target,
                  title: "Why We Built This",
                  text: "Most people waste time and money trying random, scattered tools that don't talk to each other. I built this to show complete system blueprints that actually work together. The market is flooded with hype, and we deliver structured performance."
                },
                {
                  icon: Zap,
                  title: "What Makes Us Different",
                  text: "We independently test all tools and systems before recommending them. We do not accept paid placement or sponsored recommendations. Our evaluations are based on performance and user value only. Every recommendation on this site is backed by actual deployment."
                }
              ].map((item, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group"
                >
                  <div className="flex items-center justify-center w-16 h-16 rounded-2xl border border-white/20 bg-card/90 backdrop-blur-md text-primary shadow-lg shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-transform group-hover:scale-110">
                    <item.icon className="w-6 h-6" />
                  </div>
                  <div className="w-[calc(100%-5rem)] md:w-[calc(50%-3rem)] bg-card/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 md:p-10 shadow-xl">
                    <h3 className="text-2xl font-bold text-foreground mb-4">{item.title}</h3>
                    <p className="text-zinc-300 leading-relaxed font-medium">
                      {item.text}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          <motion.section 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="pt-24 subtle-divider relative mb-24"
          >
            <div className="bg-card/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-16 shadow-2xl relative overflow-hidden">
              <div className="relative z-10 max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary backdrop-blur-sm">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h2 className="text-3xl md:text-5xl font-bold text-foreground tracking-tight text-shadow-sm">
                    Our Commitment to Transparency & Trust
                  </h2>
                </div>
                
                <p className="text-xl md:text-2xl text-zinc-200 leading-relaxed mb-12 font-medium text-shadow-sm">
                  Starks Global Group operates with a strict commitment to transparency, prioritizing real-world performance over industry hype. We rigorously evaluate, select, and structure the AI tools we feature based on their ability to drive scalable business outcomes.
                </p>

                <div className="bg-background/60 border border-white/10 rounded-2xl p-8 md:p-12 mb-12 backdrop-blur-md shadow-inner">
                  <h3 className="text-2xl font-bold text-foreground mb-8 border-b border-white/10 pb-4 inline-block">
                    What This Means for Users
                  </h3>
                  <ul className="space-y-6">
                    {[
                      "Every system is tested and verified in live business environments.",
                      "Affiliate partnerships never dictate our architectural recommendations.",
                      "No pay-to-play placements for sub-par software.",
                      "Continuous optimization of tool stacks as technology evolves."
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-5">
                        <div className="bg-primary/20 p-2 rounded-lg mt-0.5 shrink-0 border border-primary/30 backdrop-blur-sm">
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                        </div>
                        <span className="text-zinc-100 text-lg leading-relaxed font-medium text-shadow-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <div className="bg-card/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl text-center max-w-4xl mx-auto">
              <div className="w-16 h-16 bg-red-500/20 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
                <Youtube className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 text-shadow-sm">Our YouTube Channel</h2>
              <p className="text-lg text-zinc-300 mb-8 max-w-2xl mx-auto leading-relaxed font-medium">
                Follow our YouTube channel where we document real automation systems, AI software reviews, and live blueprint walkthroughs. See exactly how these systems are built before you implement them.
              </p>
              <a 
                href="https://www.youtube.com/channel/UCvORp1xlqaqwFsLOXvV_5Tw" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="saas-button inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white border-none shadow-[0_0_20px_rgba(220,38,38,0.4)]"
              >
                <Youtube className="w-5 h-5" /> Watch on YouTube
              </a>
            </div>
          </motion.section>

        </div>
      </main>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl py-10 border-t border-white/10">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-mono mb-4">Related Pages</p>
        <div className="flex flex-wrap gap-3">
          <Link to="/why-trust-us" className="text-sm text-muted-foreground hover:text-primary transition-colors underline underline-offset-4">Why Trust Us</Link>
          <Link to="/business-model" className="text-sm text-muted-foreground hover:text-primary transition-colors underline underline-offset-4">Business Model</Link>
          <Link to="/updates" className="text-sm text-muted-foreground hover:text-primary transition-colors underline underline-offset-4">Platform Updates</Link>
          <Link to="/blueprints" className="text-sm text-muted-foreground hover:text-primary transition-colors underline underline-offset-4">System Blueprints</Link>
        </div>
      </div>

      <Footer />
    </VideoBackground>
  );
};

export default AboutPage;
