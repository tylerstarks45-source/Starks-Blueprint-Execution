import React from 'react';
import { Wrench, ExternalLink, Settings2 } from 'lucide-react';

const ToolStackSection = ({ tools = [], title = "Required Infrastructure" }) => {
  if (!tools || tools.length === 0) return null;

  return (
    <div className="saas-panel p-6 sm:p-8 bg-card">
      <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
        <div className="p-2 bg-primary/10 text-primary rounded-lg">
          <Wrench className="w-5 h-5" />
        </div>
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
      </div>

      <div className="space-y-4">
        {tools.map((tool) => (
          <div key={tool.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors gap-4">
            <div className="flex-grow">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-foreground">{tool.name}</h3>
                <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 bg-background border border-border rounded text-muted-foreground">
                  {tool.category}
                </span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {tool.core_problem || tool.description || 'Core system component.'}
              </p>
            </div>
            
            <div className="shrink-0">
              {tool.affiliate_link ? (
                <a 
                  href={tool.affiliate_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="saas-button-secondary text-sm py-2 px-4 w-full sm:w-auto flex items-center justify-center gap-2"
                >
                  Access Tool <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <button className="saas-button-secondary text-sm py-2 px-4 w-full sm:w-auto opacity-50 cursor-not-allowed">
                  No Link Available
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-border">
        <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
          <Settings2 className="w-4 h-4" />
          View Optional Alternatives
        </button>
      </div>
    </div>
  );
};

export default ToolStackSection;