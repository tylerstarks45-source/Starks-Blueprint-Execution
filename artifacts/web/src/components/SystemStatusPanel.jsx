import React from 'react';
import { Save, AlertCircle, CheckCircle2 } from 'lucide-react';

const SystemStatusPanel = ({ 
  progress = 0, 
  completedSteps = 0, 
  totalSteps = 0, 
  onSave, 
  isSaving,
  status = 'Not Started'
}) => {
  const percentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  
  return (
    <div className="sticky top-24 saas-panel p-6 bg-card border-t-4 border-t-primary">
      <div className="mb-6">
        <h3 className="text-sm font-mono uppercase tracking-widest text-muted-foreground mb-4">Deployment Status</h3>
        
        <div className="flex items-end gap-2 mb-2">
          <span className="text-5xl font-extrabold text-foreground leading-none">{percentage}%</span>
          <span className="text-lg text-muted-foreground mb-1 font-medium">Complete</span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full h-3 bg-secondary rounded-full overflow-hidden mb-3">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        <div className="flex justify-between text-sm font-medium">
          <span className="text-muted-foreground">{completedSteps} of {totalSteps} steps</span>
          <span className={percentage === 100 ? 'text-[hsl(var(--success))]' : 'text-primary'}>
            {totalSteps - completedSteps} remaining
          </span>
        </div>
      </div>

      <div className="space-y-4 mb-8 pt-6 border-t border-border">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">System State</span>
          <span className={`status-badge ${
            status === 'Completed' ? 'status-badge-completed' : 
            status === 'In Progress' ? 'status-badge-in-progress' : 
            'status-badge-not-started'
          }`}>
            {status}
          </span>
        </div>
        {percentage === 100 && (
          <div className="flex items-start gap-2 p-3 bg-[hsl(var(--success)/0.1)] border border-[hsl(var(--success)/0.2)] rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-[hsl(var(--success))] shrink-0 mt-0.5" />
            <p className="text-xs text-[hsl(var(--success))] font-medium">
              System is fully deployed. Ensure you have tested all workflows before driving traffic.
            </p>
          </div>
        )}
      </div>

      <button 
        onClick={onSave}
        disabled={isSaving}
        className="saas-button w-full flex items-center justify-center gap-2 py-3.5"
      >
        <Save className="w-4 h-4" />
        {isSaving ? 'Saving Progress...' : 'Save Deployment State'}
      </button>
      
      <p className="text-xs text-center text-muted-foreground mt-4 font-medium flex items-center justify-center gap-1.5">
        <AlertCircle className="w-3.5 h-3.5" />
        Saves automatically to your dashboard
      </p>
    </div>
  );
};

export default SystemStatusPanel;