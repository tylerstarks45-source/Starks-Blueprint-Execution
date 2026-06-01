import React from 'react';
import { Rocket, Layers, BookmarkPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SystemCTASection = ({ onPrimaryClick, onSaveClick }) => {
  const navigate = useNavigate();

  return (
    <section className="py-12 border-t border-border mt-16 bg-gradient-dark">
      <div className="container mx-auto px-4 text-center max-w-4xl">
        <h2 className="text-3xl font-extrabold mb-8 text-foreground">Ready to Deploy?</h2>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            onClick={onPrimaryClick}
            className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 bg-[hsl(var(--cta-primary))] text-primary-foreground font-bold rounded-xl hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_20px_hsl(var(--cta-primary)/0.3)] text-lg"
          >
            <Rocket className="w-5 h-5 mr-2" /> Start Building This System
          </button>
          
          <button 
            onClick={() => navigate('/marketplace')}
            className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 bg-[hsl(var(--cta-secondary))] border border-white/10 text-foreground font-bold rounded-xl hover:bg-white/10 transition-all text-lg"
          >
            <Layers className="w-5 h-5 mr-2 text-primary" /> Access All Tools
          </button>
          
          <button 
            onClick={onSaveClick}
            className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 bg-transparent border-2 border-border text-foreground font-bold rounded-xl hover:border-primary/50 transition-all text-lg"
          >
            <BookmarkPlus className="w-5 h-5 mr-2 text-muted-foreground" /> Save This System
          </button>
        </div>
      </div>
    </section>
  );
};

export default SystemCTASection;