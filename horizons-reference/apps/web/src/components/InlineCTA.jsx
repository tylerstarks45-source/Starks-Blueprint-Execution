import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap, Box } from 'lucide-react';

const InlineCTA = ({ type = 'blueprint' }) => {
  const isBlueprint = type === 'blueprint';
  
  return (
    <div className="glass-panel rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group border border-border hover:border-primary/30 transition-colors">
      <div className={`absolute inset-0 bg-gradient-to-r ${isBlueprint ? 'from-[hsl(var(--primary)/0.08)]' : 'from-[hsl(var(--accent)/0.08)]'} to-transparent pointer-events-none`} />
      
      <div className="flex items-center gap-4 relative z-10">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${isBlueprint ? 'bg-primary/10 text-primary border-primary/20' : 'bg-accent/10 text-accent border-accent/20'}`}>
          {isBlueprint ? <Zap className="w-6 h-6" /> : <Box className="w-6 h-6" />}
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground mb-1">
            {isBlueprint ? 'Ready to build this system?' : 'Need the right tools?'}
          </h3>
          <p className="text-sm text-muted-foreground font-medium">
            {isBlueprint ? 'Explore our complete, step-by-step blueprints.' : 'Browse our curated marketplace of AI tools.'}
          </p>
        </div>
      </div>
      
      <Link 
        to={isBlueprint ? '/blueprints' : '/marketplace'} 
        className={`relative z-10 inline-flex items-center justify-center px-6 py-3 rounded-lg font-semibold transition-all duration-200 active:scale-[0.98] shadow-md ${
          isBlueprint 
            ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_4px_15px_hsl(var(--primary)/0.3)]' 
            : 'bg-accent text-accent-foreground hover:bg-accent/90 hover:shadow-[0_4px_15px_hsl(var(--accent)/0.3)]'
        }`}
      >
        {isBlueprint ? 'View Blueprints' : 'Browse Tools'}
        <ArrowRight className="w-4 h-4 ml-2" />
      </Link>
    </div>
  );
};

export default InlineCTA;