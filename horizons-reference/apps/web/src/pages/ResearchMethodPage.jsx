import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Shield, Target, Zap, Activity, Layers, Cpu, Search, Settings, BarChart, Clock, CheckSquare } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { Button } from '@/components/ui/button';

const ResearchMethodPage = () => {
  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-100px" },
    transition: { duration: 0.5 }
  };

  return (
    <div 
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{
        backgroundImage: 'url(https://horizons-cdn.hostinger.com/c23c9050-cfff-41bf-82a4-af121e0b4678/dca8d16705bd0a51435d782baa20d778.jpg)',
        backgroundAttachment: 'fixed',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <Helmet>
        <title>Research & Validation Method | Starks Global Group</title>
        <meta name="description" content="How we identify, test, and deploy only the highest-performing AI systems." />
      </Helmet>

      {/* Subtle Dark Overlay for Text Readability */}
      <div className="fixed inset-0 z-[-2] bg-black/35 pointer-events-none" />

      <Header />

      <main className="flex-grow relative z-10">
        {/* SECTION 1 - HERO */}
        <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-5xl md:text-7xl font-extrabold text-foreground mb-6 tracking-tighter drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
          >
            Research & <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500 neon-text">Validation Method</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-xl md:text-2xl text-gray-100 font-medium mb-6 max-w-3xl mx-auto drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
          >
            How we identify, test, and deploy only the highest-performing AI systems.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/30 text-primary font-mono text-sm neon-border drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
          >
            <Shield className="w-4 h-4" />
            Every tool. Every system. Verified through real-world deployment.
          </motion.div>
        </section>

        {/* SECTION 2 - POSITIONING */}
        <section className="section-spacing px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <motion.div {...fadeIn} className="glass-panel rounded-3xl p-8 md:p-12 border-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
            <h2 className="text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
              <Target className="w-8 h-8 text-primary" /> The Lab Approach
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Starks Global Group does not operate as a traditional review platform. We function as an AI system research and deployment lab where tools are tested, combined, and validated inside real-world business environments. Every platform listed on this website has gone through structured testing, system integration, and performance validation before being approved. <span className="text-primary font-bold neon-text">We do not evaluate tools in isolation. We test them as part of complete, revenue-generating systems.</span>
            </p>
          </motion.div>
        </section>

        {/* SECTION 3 - CORE PHILOSOPHY */}
        <section className="section-spacing px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">Core Philosophy</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { title: 'Performance Over Hype', desc: 'We do not select tools based on popularity. We select tools based on measurable performance.', icon: Activity },
              { title: 'System First Approach', desc: 'Tools are tested within systems—not individually. If it doesn\'t integrate, it doesn\'t pass.', icon: Layers },
              { title: 'Real-World Deployment', desc: 'Every tool is used in live environments—not theoretical scenarios.', icon: Zap },
              { title: 'No Shortcuts', desc: 'We invest time, resources, and capital into testing before recommending anything.', icon: Shield }
            ].map((card, idx) => {
              const Icon = card.icon;
              return (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="glass-panel rounded-2xl p-8 border-white/5 hover:glow-border hover:neon-glow transition-all duration-300 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">{card.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{card.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* SECTION 4 - TESTING PROCESS */}
        <section className="section-spacing px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">The Testing Process</h2>
            <p className="text-muted-foreground mt-4">Our 7-step validation framework.</p>
          </div>
          
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-primary/30 before:to-transparent">
            {[
              { title: 'Initial Tool Analysis', desc: 'We identify tools based on functionality, integration potential, and use-case relevance.', icon: Search },
              { title: 'Hands-On Implementation', desc: 'We actively deploy each tool within controlled environments and real system builds.', icon: Settings },
              { title: 'System Integration Testing', desc: 'Tools are combined with other platforms to test compatibility, automation potential, and workflow efficiency.', icon: Layers },
              { title: 'Performance Validation', desc: 'We measure:\n• Output quality\n• Speed and reliability\n• Automation performance\n• ROI potential', icon: BarChart },
              { title: 'Stress Testing', desc: 'Tools are pushed under load conditions to identify limitations and scalability issues.', icon: Activity },
              { title: 'Long-Term Observation', desc: 'We monitor performance over time to ensure consistency and reliability.', icon: Clock },
              { title: 'Final Approval or Rejection', desc: 'Only tools that pass all layers are included on the platform.', icon: CheckSquare }
            ].map((step, idx) => {
              const Icon = step.icon;
              return (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5 }}
                  className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-full border-2 border-primary/30 bg-card text-primary font-mono font-bold neon-text shadow-[0_0_15px_rgba(0,217,255,0.2)] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    {idx + 1}
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] glass-panel p-6 rounded-2xl border-white/5 group-hover:border-primary/30 transition-colors ml-4 md:ml-0">
                    <div className="flex items-center gap-3 mb-3">
                      <Icon className="w-5 h-5 text-primary" />
                      <h3 className="text-lg font-bold text-foreground">{step.title}</h3>
                    </div>
                    <div className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
                      {step.desc}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* SECTION 5 - WHAT WE TEST */}
        <section className="section-spacing px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <motion.div {...fadeIn} className="glass-panel rounded-3xl p-8 md:p-12 border-primary/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(0,217,255,0.05)_0%,transparent_60%)] pointer-events-none" />
            <h2 className="text-3xl font-bold text-foreground mb-8">What We Test</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                'Real-world deployment performance',
                'Automation capability',
                'Integration with other systems',
                'Scalability under load',
                'Output consistency',
                'Reliability over time',
                'Ease of implementation',
                'Revenue potential within systems'
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground/90 font-medium">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* SECTION 6 - SYSTEM BUILDING PROCESS */}
        <section className="section-spacing px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <motion.div {...fadeIn} className="glass-panel rounded-3xl p-8 md:p-12 border-white/10">
            <h2 className="text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
              <Cpu className="w-8 h-8 text-primary" /> System Building Process
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-6">
              After tools pass testing, they are integrated into complete system architectures. These systems are designed to:
            </p>
            <ul className="space-y-3 mb-6 ml-2">
              {['Generate traffic', 'Automate workflows', 'Convert users', 'Produce revenue'].map((item, idx) => (
                <li key={idx} className="flex items-center gap-3 text-foreground/90">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Each blueprint published on this platform represents a system that has been structured, tested, and validated using real software stacks.
            </p>
          </motion.div>
        </section>

        {/* SECTION 7 - INVESTMENT IN TESTING */}
        <section className="section-spacing px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <motion.div {...fadeIn} className="glass-panel rounded-3xl p-8 md:p-12 border-white/10">
            <h2 className="text-3xl font-bold text-foreground mb-6">Investment in Testing</h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-6">
              We invest both time and capital into testing platforms before recommending them. This includes:
            </p>
            <ul className="space-y-3 mb-6 ml-2">
              {['Paid access to software tools', 'Time spent building and deploying systems', 'Continuous testing cycles and optimization'].map((item, idx) => (
                <li key={idx} className="flex items-center gap-3 text-foreground/90">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-lg text-muted-foreground leading-relaxed">
              We do not rely on demos or surface-level reviews. Every system and tool is tested through real implementation and usage.
            </p>
          </motion.div>
        </section>

        {/* SECTION 8 - NO PAID PLACEMENTS */}
        <section className="section-spacing px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <motion.div {...fadeIn} className="glass-panel rounded-3xl p-8 md:p-12 border-primary/20">
            <h2 className="text-3xl font-bold text-primary neon-text mb-6">Independent Verification</h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-6">
              We do not accept payment to feature or rank tools. Every platform included on this website is selected based on:
            </p>
            <ul className="space-y-3 mb-6 ml-2">
              {['Performance', 'Integration value', 'System compatibility'].map((item, idx) => (
                <li key={idx} className="flex items-center gap-3 text-foreground/90">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-xl font-bold text-foreground">Not sponsorship.</p>
          </motion.div>
        </section>

        {/* SECTION 9 - FINAL STATEMENT */}
        <section className="section-spacing px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
          <motion.div {...fadeIn} className="glass-panel rounded-3xl p-12 border-primary/30 glow-border bg-card/60 backdrop-blur-xl">
            <h2 className="text-3xl md:text-5xl font-extrabold text-foreground leading-tight">
              Our standard is simple. <br className="hidden md:block" />
              <span className="text-primary neon-text">If a tool does not perform in real-world conditions, it does not make it onto this platform.</span>
            </h2>
          </motion.div>
        </section>

        {/* SECTION 10 - CTA SECTION */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-black/40 border-t border-white/5 relative">
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-10 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
              Deploy Verified Systems
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Button size="lg" className="w-full sm:w-auto text-lg px-8 py-7 bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_0_30px_rgba(0,217,255,0.5)] transition-all duration-300 group" asChild>
                <Link to="/blueprints">
                  View AI Blueprints <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 py-7 border-primary/30 text-primary hover:bg-primary/10 hover:border-primary transition-all duration-300 group" asChild>
                <Link to="/products">
                  Browse Verified Tools <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ResearchMethodPage;