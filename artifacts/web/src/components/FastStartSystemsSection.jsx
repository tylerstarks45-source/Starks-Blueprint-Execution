import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, Zap } from 'lucide-react';

const SYSTEMS = [
  {
    id: 'ai-affiliate',
    title: 'AI Affiliate Content Engine',
    description: 'Automatically generate review articles, social posts, and comparison videos to drive affiliate commissions.',
    path: '/blueprint/affiliate-machine',
    time: '2 hours setup'
  },
  {
    id: 'ai-lead-gen',
    title: 'AI Lead Generation System',
    description: 'Capture, qualify, and nurture prospects on autopilot using AI chat and smart email sequences.',
    path: '/blueprint/ai-funnel-email',
    time: '3 hours setup'
  },
  {
    id: 'ai-content',
    title: 'AI Content System',
    description: 'Produce a month of high-quality social media and blog content in under 60 minutes.',
    path: '/blueprint/content-traffic-sales',
    time: '2 hours setup'
  }
];

const FastStartSystemsSection = () => {
  return (
    <section className="py-20 md:py-24 bg-gradient-dark relative border-y border-white/5">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl relative z-10">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4 text-white">Fast-Start Systems</h2>
            <p className="text-lg text-zinc-400 font-medium mb-3">
              Most users start with one of these systems.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-sm font-semibold tracking-wide">
              <Clock className="w-4 h-4" /> Beginner systems take 2–4 hours to set up
            </div>
          </div>
          <Link to="/blueprints" className="saas-button-secondary bg-white/5 hover:bg-white/10 shrink-0 hidden md:flex border-white/10 text-white">
            View All Systems <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {SYSTEMS.map((sys, index) => (
            <motion.div
              key={sys.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="flex flex-col h-full bg-card-gradient border border-white/10 rounded-2xl overflow-hidden hover-glow">
                <div className="p-8 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                      <Zap className="w-6 h-6 text-primary" />
                    </div>
                    <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">{sys.time}</span>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-white mb-4">{sys.title}</h3>
                  <p className="text-zinc-400 leading-relaxed mb-8 flex-grow">
                    {sys.description}
                  </p>
                  
                  <Link 
                    to={sys.path}
                    className="mt-auto w-full py-3.5 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground font-bold rounded-xl flex items-center justify-center transition-all duration-300"
                  >
                    View Setup <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 flex justify-center md:hidden">
          <Link to="/blueprints" className="saas-button w-full border-white/10 text-white">
            View All Systems <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>

      </div>
    </section>
  );
};

export default FastStartSystemsSection;