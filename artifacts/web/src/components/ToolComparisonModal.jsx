import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Minus } from 'lucide-react';
import { Link } from 'react-router-dom';

const ToolComparisonModal = ({ tools, onClose, onRemoveTool }) => {
  if (!tools || tools.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
      >
        <motion.div 
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border bg-secondary/20">
            <h2 className="text-2xl font-extrabold text-foreground">Compare Tools</h2>
            <button 
              onClick={onClose}
              className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Comparison Grid */}
          <div className="flex-1 overflow-auto p-6">
            <div className={`grid grid-cols-1 md:grid-cols-${tools.length} gap-6 md:gap-8`}>
              {tools.map((tool) => (
                <div key={tool.id} className="flex flex-col border border-border rounded-xl p-5 bg-background relative">
                  <button 
                    onClick={() => onRemoveTool(tool.id)}
                    className="absolute top-4 right-4 p-1.5 bg-secondary/80 rounded-md text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-4 mb-6">
                    <img src={tool.image} alt={tool.name} className="w-16 h-16 rounded-lg object-cover border border-border" />
                    <div>
                      <h3 className="text-lg font-bold text-foreground">{tool.name}</h3>
                      <span className="text-xs text-primary font-medium">{tool.category}</span>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h4 className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">Outcome</h4>
                      <p className="text-sm font-medium text-foreground">{tool.outcome_description}</p>
                    </div>

                    <div>
                      <h4 className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">Best For</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {tool.best_for?.map((bf, i) => (
                          <span key={i} className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded-md">{bf}</span>
                        )) || <span className="text-xs text-muted-foreground">General</span>}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">Why It Matters</h4>
                      <p className="text-sm text-muted-foreground">{tool.why_it_matters}</p>
                    </div>

                    <div>
                      <h4 className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">System Compatibility</h4>
                      <ul className="space-y-1.5">
                        {tool.system_compatibility?.map((sys, i) => (
                          <li key={i} className="text-sm flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                            <Link to={sys.link} className="text-foreground hover:text-primary transition-colors line-clamp-1">{sys.name}</Link>
                          </li>
                        )) || (
                          <li className="text-sm flex items-center gap-2 text-muted-foreground">
                            <Minus className="w-4 h-4 shrink-0" /> Standalone Tool
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-auto pt-6">
                    <a 
                      href={tool.affiliate_link || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center py-2.5 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Visit {tool.name}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ToolComparisonModal;