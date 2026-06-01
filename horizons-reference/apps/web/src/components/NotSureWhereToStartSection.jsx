import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, BookOpen, Sparkles, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const NotSureWhereToStartSection = ({ onStartBeginner, onExploreTop }) => {
  return (
    <section className="py-24 mt-12 relative overflow-hidden border-t border-border">
      {/* Background styling */}
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,hsl(var(--primary)/0.08)_0%,transparent_50%)]" />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] mix-blend-overlay" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-secondary/80 border border-white/10 mb-6 shadow-xl backdrop-blur-sm">
            <Compass className="w-8 h-8 text-primary" />
          </div>
          
          <h2 className="text-3xl md:text-5xl font-extrabold mb-4 text-white">Not Sure Where to Start?</h2>
          <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto font-medium leading-relaxed">
            Building systems can be overwhelming. Choose a path below to get curated recommendations tailored to your experience level.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <button 
              onClick={onStartBeginner}
              className="flex flex-col items-center justify-center p-8 bg-card/60 backdrop-blur-md border border-white/10 rounded-2xl hover:border-primary/50 hover:bg-card hover:shadow-[0_8px_30px_hsl(var(--primary)/0.15)] transition-all duration-300 group"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <span className="font-bold text-lg text-foreground mb-1">Beginner Tools</span>
              <span className="text-sm text-muted-foreground">Easy setup, fast results</span>
            </button>

            <Link 
              to="/blueprints" 
              className="flex flex-col items-center justify-center p-8 bg-primary/10 backdrop-blur-md border border-primary/30 rounded-2xl hover:bg-primary/20 hover:border-primary hover:shadow-[0_8px_30px_hsl(var(--primary)/0.25)] transition-all duration-300 group relative overflow-hidden"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <span className="font-bold text-lg text-primary-foreground mb-1">View Proven Systems</span>
              <span className="text-sm text-primary/80">Complete step-by-step guides</span>
            </Link>

            <button 
              onClick={onExploreTop}
              className="flex flex-col items-center justify-center p-8 bg-card/60 backdrop-blur-md border border-white/10 rounded-2xl hover:border-white/20 hover:bg-card hover:shadow-xl transition-all duration-300 group"
            >
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-4 group-hover:translate-x-1 transition-transform">
                <ArrowRight className="w-6 h-6 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <span className="font-bold text-lg text-foreground mb-1">Explore Top AI Tools</span>
              <span className="text-sm text-muted-foreground">Browse the full marketplace</span>
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default NotSureWhereToStartSection;