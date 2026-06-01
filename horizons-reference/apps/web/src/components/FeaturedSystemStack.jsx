import React from 'react';
import { ArrowRight, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const FeaturedSystemStack = () => {
  const stack = [
    { name: 'CustomGPT', role: 'Knowledge Base' },
    { name: 'Agent X', role: 'Workflow Logic' },
    { name: 'GoHighLevel', role: 'CRM & Outreach' }
  ];

  return (
    <div className="mb-12 glass-panel rounded-[24px] p-8 border-primary/30 relative overflow-hidden group shadow-lg">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.15)_0%,transparent_50%)] pointer-events-none" />
      
      <div className="flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
        <div className="lg:w-1/3 text-center lg:text-left">
          <span className="text-xs font-mono font-bold text-primary tracking-widest uppercase mb-2 block">Featured Architecture</span>
          <h3 className="text-2xl font-bold text-foreground mb-3">Sales Automation Stack</h3>
          <p className="text-sm text-muted-foreground font-medium">
            A complete end-to-end system for capturing leads, answering inquiries autonomously, and closing deals.
          </p>
        </div>

        <div className="lg:w-1/2 flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
          {stack.map((tool, idx) => (
            <React.Fragment key={idx}>
              <div className="glass-panel bg-card border-white/10 p-4 rounded-xl text-center w-full sm:w-auto min-w-[140px] group-hover:-translate-y-1 transition-transform duration-300 shadow-sm hover:border-primary/40">
                <div className="font-bold text-foreground text-sm mb-1">{tool.name}</div>
                <div className="text-[10px] font-mono text-primary/80 uppercase tracking-wider">{tool.role}</div>
              </div>
              {idx < stack.length - 1 && (
                <div className="hidden sm:flex items-center justify-center text-primary/50">
                  <LinkIcon className="w-5 h-5" />
                </div>
              )}
              {idx < stack.length - 1 && (
                <div className="sm:hidden flex items-center justify-center text-primary/50 rotate-90">
                  <LinkIcon className="w-5 h-5" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="lg:w-1/6 flex justify-end w-full">
          <Button className="w-full lg:w-auto bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/30 hover:shadow-[0_4px_15px_hsl(var(--primary)/0.3)] transition-all duration-300" asChild>
            <Link to="/blueprint/sales-automation">
              View Full Stack <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FeaturedSystemStack;