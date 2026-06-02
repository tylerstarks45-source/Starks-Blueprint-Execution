import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Compass, Layers } from 'lucide-react';

const DiscoveryFlowSection = ({ onFilterBeginner, onClearFilters }) => {
  return (
    <section className="py-20 mt-16 border-t border-border/50 relative overflow-hidden bg-card/30">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,hsl(var(--primary)/0.05)_0%,transparent_70%)] pointer-events-none" />
      
      <div className="container mx-auto px-4 max-w-4xl text-center relative z-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-secondary border border-border mb-6">
          <Compass className="w-8 h-8 text-muted-foreground" />
        </div>
        
        <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Not sure where to start?</h2>
        <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto font-medium">
          Whether you want a complete system layout or just a simple tool to get your feet wet, we've got you covered.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link 
            to="/blueprints" 
            className="flex flex-col items-center justify-center p-6 bg-primary/10 border border-primary/20 rounded-2xl hover:bg-primary hover:text-primary-foreground text-primary transition-all duration-300 group"
          >
            <Layers className="w-6 h-6 mb-3 opacity-80 group-hover:opacity-100" />
            <span className="font-bold">View Complete Systems</span>
          </Link>

          <button 
            onClick={onFilterBeginner}
            className="flex flex-col items-center justify-center p-6 bg-secondary border border-border rounded-2xl hover:border-primary/50 hover:bg-secondary/80 text-foreground transition-all duration-300"
          >
            <Compass className="w-6 h-6 mb-3 text-muted-foreground" />
            <span className="font-bold">Start with Beginner Tools</span>
          </button>

          <button 
            onClick={onClearFilters}
            className="flex flex-col items-center justify-center p-6 bg-background border border-border rounded-2xl hover:border-foreground/20 hover:bg-muted text-foreground transition-all duration-300 group"
          >
            <ArrowRight className="w-6 h-6 mb-3 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            <span className="font-bold">Explore All Tools</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default DiscoveryFlowSection;