import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, ArrowRight } from 'lucide-react';

const SystemStatusCard = ({ system }) => {
  const navigate = useNavigate();
  const progress = system.progress || 0;
  const status = system.status || 'Building';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mission-card p-6 border-primary/40 shadow-[0_0_20px_hsl(var(--primary)/0.1)] bg-gradient-to-br from-card to-background"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-primary animate-pulse" />
            <h3 className="text-xl font-bold text-foreground">{system.blueprint?.name || 'Active System'}</h3>
          </div>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
            status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
            'bg-primary/10 text-primary border-primary/30'
          }`}>
            {status}
          </span>
        </div>
        
        <button 
          onClick={() => navigate(`/system-setup/${system.blueprintId}`)}
          className="saas-button shadow-[0_0_15px_hsl(var(--primary)/0.3)]"
        >
          Continue Setup <ArrowRight className="w-4 h-4 ml-2" />
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm font-medium">
          <span className="text-muted-foreground">Deployment Progress</span>
          <span className="text-primary">{progress}%</span>
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </motion.div>
  );
};

export default SystemStatusCard;