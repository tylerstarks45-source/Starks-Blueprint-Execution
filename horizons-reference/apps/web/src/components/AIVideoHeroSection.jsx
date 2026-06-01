
import React from 'react';
import { motion } from 'framer-motion';
import { Zap, ArrowDown, ArrowRight, ShieldCheck, TrendingUp, Users, ExternalLink } from 'lucide-react';
import { toolAffiliateLinks } from '@/config/toolAffiliateLinks.js';

const AIVideoHeroSection = () => {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden pt-20 pb-16">
      
      {/* 100% Clear Video Background - No Overlays, No Tints, No Gradients */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <iframe
          src="https://www.youtube.com/embed/tA8GnrsbEjk?autoplay=1&mute=1&loop=1&playlist=tA8GnrsbEjk&controls=0&modestbranding=1&playsinline=1&rel=0"
          className="absolute top-1/2 left-1/2 w-[100vw] h-[56.25vw] min-h-[100vh] min-w-[177.77vh] -translate-x-1/2 -translate-y-1/2 object-cover"
          allow="autoplay; encrypted-media"
          frameBorder="0"
          title="Background Video"
        />
      </div>
      
      <div className="container mx-auto px-4 relative z-10 text-center max-w-5xl mt-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col items-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 backdrop-blur-md border border-primary/50 text-primary mb-8 shadow-xl">
            <Zap className="w-4 h-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
            <span className="text-sm font-bold tracking-wider uppercase text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">System Blueprint v3.0</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 uppercase tracking-tight [text-shadow:_0_4px_24px_rgb(0_0_0_/_100%),_0_2px_8px_rgb(0_0_0_/_80%)]">
            AI Video Content System
          </h1>
          
          <p className="text-xl md:text-2xl text-zinc-100 font-semibold mb-6 max-w-3xl mx-auto leading-relaxed [text-shadow:_0_4px_16px_rgb(0_0_0_/_100%),_0_2px_4px_rgb(0_0_0_/_80%)]">
            The fully automated pipeline to generate, edit, and publish high-converting short-form videos across all platforms without showing your face.
          </p>

          <p className="text-md text-zinc-100 font-medium mb-10 max-w-2xl mx-auto [text-shadow:_0_2px_10px_rgb(0_0_0_/_100%)]">
            Powered by{' '}
            <a href={toolAffiliateLinks.openrouter} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 inline-flex items-center mx-1 transition-colors drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              OpenRouter <ExternalLink className="w-3 h-3 ml-0.5" />
            </a>, 
            <a href={toolAffiliateLinks.make} target="_blank" rel="noopener noreferrer" className="text-secondary hover:text-secondary/80 inline-flex items-center mx-1 transition-colors drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              Make.com <ExternalLink className="w-3 h-3 ml-0.5" />
            </a>, and 
            <a href={toolAffiliateLinks.vidfly} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent/80 inline-flex items-center mx-1 transition-colors drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              Vidfly <ExternalLink className="w-3 h-3 ml-0.5" />
            </a>.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black/40 backdrop-blur-md border border-secondary/50 text-white shadow-xl">
              <ShieldCheck className="w-5 h-5 text-secondary drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
              <span className="text-sm font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Automation Level: High</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black/40 backdrop-blur-md border border-accent/50 text-white shadow-xl">
              <TrendingUp className="w-5 h-5 text-accent drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
              <span className="text-sm font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Revenue: Content + Affiliate</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black/40 backdrop-blur-md border border-primary/50 text-white shadow-xl">
              <Users className="w-5 h-5 text-primary drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
              <span className="text-sm font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Best For: Creators / Beginners</span>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center w-full sm:w-auto">
            <a href="#build" className="saas-button text-lg px-8 py-4 shadow-2xl">
              Start Building <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </a>
            <a href="#toolstack" className="inline-flex items-center justify-center px-8 py-4 bg-black/40 backdrop-blur-xl text-white font-bold rounded-lg border border-white/30 hover:bg-black/60 hover:border-white/50 transition-all duration-300 group shadow-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              <ArrowDown className="w-5 h-5 mr-2 text-primary group-hover:translate-y-1 transition-transform" /> View Tool Stack
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default AIVideoHeroSection;
