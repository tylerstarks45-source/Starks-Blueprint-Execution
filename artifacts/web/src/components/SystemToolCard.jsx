import React, { useState, useEffect } from 'react';
import { ArrowRight, Box, CheckCircle2, Loader2 } from 'lucide-react';

const SystemToolCard = ({ tool, context, stepNumber }) => {
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Affiliate link validation
  const isValidLink = tool?.affiliate_link && typeof tool.affiliate_link === 'string' && /^https?:\/\//i.test(tool.affiliate_link.trim());

  useEffect(() => {
    if (tool && !isValidLink) {
      console.error(`[Data Error] Missing or invalid affiliate_link for tool: ${tool.name || tool.id || 'Unknown'}`);
    }
  }, [tool, isValidLink]);

  const hasImage = tool.image && tool.image.trim() !== '';

  const handleAffiliateClick = (e) => {
    if (!isValidLink) {
      e.preventDefault();
      return;
    }
    // Optional click tracking log
    console.log(`[Click Track] Tool: ${tool.name} | Time: ${new Date().toISOString()} | Source: system_detail`);
    
    // Trigger micro UX loading state (navigation will happen natively via the <a> tag)
    setIsRedirecting(true);
    setTimeout(() => setIsRedirecting(false), 500);
  };

  return (
    <div className="premium-card rounded-xl overflow-hidden flex flex-col h-full hover-lift border border-white/5">
      <div className="p-5 flex flex-col flex-grow">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center shrink-0 overflow-hidden border border-white/10">
            {hasImage ? (
              <img src={tool.image} alt={tool.name} className="w-full h-full object-cover" />
            ) : (
              <Box className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          <div>
            <h4 className="font-bold text-lg text-foreground">{tool.name}</h4>
            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-md">
              {tool.category}
            </span>
          </div>
        </div>

        <div className="mb-4 flex-grow">
          <p className="text-sm text-muted-foreground mb-2">
            <strong className="text-foreground">Role in system:</strong> {context || tool.description}
          </p>
          {stepNumber && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Used in Step {stepNumber}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 mt-auto pt-4 border-t border-border/50">
          {isValidLink && (
            <a 
              href={tool.affiliate_link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleAffiliateClick}
              className={`w-full flex items-center justify-center px-4 py-3 bg-primary hover:bg-blue-500 text-primary-foreground font-bold rounded-xl transition-all duration-300 shadow-md hover:shadow-[0_4px_20px_hsl(var(--primary)/0.4)] hover:-translate-y-0.5 active:scale-[0.98] ${isRedirecting ? 'opacity-50 grayscale pointer-events-none' : ''}`}
            >
              {isRedirecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redirecting...
                </>
              ) : (
                <>
                  Access Tool <ArrowRight className="w-4 h-4 ml-1.5" />
                </>
              )}
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemToolCard;