import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Activity, Wrench } from 'lucide-react';
import { motion } from 'framer-motion';

const SystemCard = ({ system, index = 0 }) => {
  const navigate = useNavigate();
  
  const handleBlueprintClick = (slug) => {
    navigate(`/blueprints/${slug}`);
  };

  const difficultyColors = {
    'Beginner': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'Intermediate': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'Advanced': 'bg-purple-500/10 text-purple-400 border-purple-500/20'
  };

  const diffLevel = system.difficulty_level || 'Intermediate';
  const setupTime = system.setup_time || '2-4 hours';
  const diffColor = difficultyColors[diffLevel] || 'bg-secondary/20 text-secondary-foreground border-secondary/20';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => handleBlueprintClick(system.slug)}
      className="flex flex-col h-full bg-card border border-border rounded-2xl p-6 sm:p-8 hover:border-primary/40 transition-all cursor-pointer group relative hover:-translate-y-1 hover:shadow-[0_10px_30px_hsl(var(--primary)/0.1)]"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="w-12 h-12 bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 rounded-xl group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          <Activity className="w-6 h-6" />
        </div>
        <div className={`px-3 py-1 text-xs font-bold rounded-full border ${diffColor}`}>
          {diffLevel} • {setupTime} Setup
        </div>
      </div>
      
      <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors tracking-tight">
        {system.name || system.system_name}
      </h3>
      
      <div className="space-y-2 mb-6 flex-grow">
        <p className="text-sm font-medium text-foreground bg-background/50 border border-border/50 px-3 py-2 rounded-lg">
          <span className="text-primary mr-1">👉 Outcome:</span> {system.outcome || system.expected_outcome || 'Automates critical business processes'}
        </p>
        <p className="text-sm font-medium text-foreground bg-background/50 border border-border/50 px-3 py-2 rounded-lg">
          <span className="text-primary mr-1">👉 Best for:</span> {system.best_for || 'Entrepreneurs and creators'}
        </p>
      </div>
      
      <div className="pt-5 border-t border-border mt-auto mb-6">
        <div className="flex items-start gap-2 mb-2">
          <Wrench className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Tools Used:</span>
        </div>
        <p className="text-sm text-muted-foreground font-medium pl-6">
          {(system.tools_preview && system.tools_preview.length > 0) 
            ? system.tools_preview.join(', ') 
            : 'Premium Automation Tools'}
        </p>
      </div>

      <button 
        className="w-full saas-button-secondary bg-primary/5 text-primary hover:bg-primary/10 border-primary/20 hover:border-primary/50 text-sm py-3.5 flex items-center justify-center gap-2 group-hover:shadow-[0_4px_15px_hsl(var(--primary)/0.2)] transition-all"
      >
        View Blueprint <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
      </button>
    </motion.div>
  );
};

export default SystemCard;