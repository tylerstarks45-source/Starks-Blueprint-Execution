import React from 'react';
import { motion } from 'framer-motion';
import { Rocket, BookmarkPlus, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { toolAffiliateLinks } from '@/config/toolAffiliateLinks.js';

const AIVideoFinalCTASection = () => {
  const { toast } = useToast();

  const handleOpenAllTools = () => {
    // Collect unique tools to open them all
    const urls = Object.values(toolAffiliateLinks);
    urls.forEach((url, index) => {
      // Adding a small timeout to prevent browsers from blocking multiple popups
      setTimeout(() => {
        window.open(url, '_blank', 'noopener,noreferrer');
      }, index * 100);
    });

    toast({
      title: "Opening Workspaces",
      description: "All system tools are opening in new tabs.",
    });
  };

  return (
    <section id="build" className="py-24 relative z-10 overflow-hidden">
      <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full max-w-3xl mx-auto"></div>
      <div className="container mx-auto px-4 relative z-10 text-center max-w-3xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="sci-fi-card border-primary/50 glow-border-cyan p-10 md:p-16"
        >
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 glow-text-cyan uppercase">
            Ready to Build?
          </h2>
          <p className="text-lg text-[var(--text-secondary)] mb-10">
            Deploy this architecture today and start generating automated content and traffic by tomorrow. Open all necessary tools to begin.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={handleOpenAllTools}
              className="saas-button text-lg px-8 py-4 glow-border-cyan pulse-glow group w-full sm:w-auto flex items-center justify-center gap-2"
            >
              <Rocket className="w-5 h-5 group-hover:-translate-y-1 transition-transform" /> 
              Start Building This System
            </button>
            <button 
              onClick={handleOpenAllTools}
              className="inline-flex items-center justify-center px-8 py-4 bg-secondary/10 text-secondary hover:text-white font-bold rounded-lg border border-secondary/30 hover:bg-secondary/30 hover:border-secondary/60 transition-all duration-300 w-full sm:w-auto glow-border-purple group"
            >
              Access All Tools <ExternalLink className="w-4 h-4 ml-2 group-hover:scale-110 transition-transform" />
            </button>
          </div>
          
          <p className="mt-6 text-sm text-muted-foreground">
            Make sure your browser allows popups to open all tabs at once.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default AIVideoFinalCTASection;