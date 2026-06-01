import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, CheckCircle2, Layers, Zap, Network } from 'lucide-react';

const ProductDetailModal = ({ product, isOpen, onClose }) => {
  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] glass-panel border-primary/30 neon-border bg-card/95 backdrop-blur-2xl p-0 overflow-hidden">
        <div className="p-6 sm:p-8">
          <DialogHeader className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-primary/20 text-primary border border-primary/30 neon-text">
                {product.verificationStatus}
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                {product.category}
              </span>
            </div>
            <DialogTitle className="text-3xl font-bold text-foreground neon-text mb-2">
              {product.name}
            </DialogTitle>
            <DialogDescription className="text-base text-foreground/90 font-medium">
              {product.powerDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* System Fit */}
            <div>
              <h4 className="text-sm font-mono text-primary mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4" /> System Integration
              </h4>
              <div className="flex flex-wrap gap-2">
                {product.systemsUsedIn.map((sys, idx) => (
                  <span key={idx} className="text-xs px-3 py-1.5 rounded-full bg-secondary/50 border border-white/10 text-secondary-foreground">
                    {sys}
                  </span>
                ))}
              </div>
            </div>

            {/* Benefits / Why Recommended */}
            <div>
              <h4 className="text-sm font-mono text-primary mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4" /> Why We Deploy It
              </h4>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Engineered for high-performance automation and scale.</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Seamlessly connects with other verified infrastructure tools.</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Proven track record in live revenue-generating systems.</span>
                </li>
              </ul>
            </div>

            {/* Connections */}
            <div>
              <h4 className="text-sm font-mono text-primary mb-3 flex items-center gap-2">
                <Network className="w-4 h-4" /> Blueprint Tags
              </h4>
              <div className="flex flex-wrap gap-2">
                {product.systemTags.map((tag, idx) => (
                  <span key={idx} className="text-xs font-mono px-2 py-1 rounded bg-black/40 border border-white/5 text-muted-foreground">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              product.valueIndicator === 'Beginner Friendly' ? 'bg-green-500/20 text-green-400' :
              product.valueIndicator === 'High ROI Tool' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-purple-500/20 text-purple-400'
            }`}>
              {product.valueIndicator}
            </span>
            
            <Button 
              className="bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(0,217,255,0.4)] transition-all duration-300 group"
              onClick={() => window.open(product.url, '_blank', 'noopener,noreferrer')}
            >
              Access Tool <ExternalLink className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductDetailModal;