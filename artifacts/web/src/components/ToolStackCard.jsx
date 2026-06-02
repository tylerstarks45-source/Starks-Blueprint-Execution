import React from 'react';
import { ExternalLink, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

const ToolStackCard = ({ tool }) => {
  return (
    <div className="tool-card-container">
      <div className="flex items-center gap-4 mb-4">
        {tool.image ? (
          <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-muted">
            <img src={tool.image} alt={tool.name} className="w-full h-full object-cover" loading="lazy" />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-xl shrink-0 border border-white/10 bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
            {tool.name.charAt(0)}
          </div>
        )}
        <div>
          <h3 className="text-xl font-bold text-foreground">{tool.name}</h3>
          <p className="text-sm font-medium text-primary">{tool.purpose}</p>
        </div>
      </div>
      
      <div className="mb-6 flex-grow">
        <p className="text-sm text-muted-foreground leading-relaxed">
          <span className="font-semibold text-zinc-300 block mb-1 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Why you need this:
          </span>
          {tool.explanation}
        </p>
      </div>

      <div className="mt-auto pt-4 border-t border-white/5">
        {tool.affiliate_link ? (
          <a
            href={tool.affiliate_link}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 py-3 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground font-bold rounded-lg text-sm transition-colors duration-200"
          >
            Access {tool.name} <ExternalLink className="w-4 h-4" />
          </a>
        ) : (
          <button disabled className="w-full py-3 bg-white/5 text-zinc-500 font-bold rounded-lg text-sm cursor-not-allowed opacity-50">
            Link Unavailable
          </button>
        )}
      </div>
    </div>
  );
};

export default ToolStackCard;