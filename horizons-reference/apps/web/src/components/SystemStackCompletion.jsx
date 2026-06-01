import React from 'react';
import { CheckCircle2, Circle, ArrowRight, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const SystemStackCompletion = ({ tools = [], systemId }) => {
  // Mock completion state for demonstration
  const completedCount = Math.floor(tools.length / 2);
  const progress = tools.length > 0 ? Math.round((completedCount / tools.length) * 100) : 0;

  return (
    <div className="premium-card rounded-2xl p-8 border border-primary/20 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
      
      <div className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h3 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-primary" /> Your System Stack
            </h3>
            <p className="text-muted-foreground">Track your progress assembling the required tools.</p>
          </div>
          
          <div className="flex items-center gap-4 bg-secondary/50 px-4 py-3 rounded-xl border border-white/5">
            <div className="text-right">
              <div className="text-sm font-medium text-muted-foreground">Stack Readiness</div>
              <div className="text-xl font-bold text-foreground">{progress}%</div>
            </div>
            <div className="w-16 h-16 rounded-full border-4 border-secondary relative flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-primary"
                  strokeDasharray={`${progress}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                />
              </svg>
              <span className="text-sm font-bold">{completedCount}/{tools.length}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {tools.map((tool, index) => {
            const isCompleted = index < completedCount;
            return (
              <div key={tool.id || index} className={`flex items-center gap-3 p-3 rounded-xl border ${isCompleted ? 'bg-primary/5 border-primary/20' : 'bg-secondary/30 border-white/5'}`}>
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
                )}
                <span className={`font-medium ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {tool.name}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border/50">
          <p className="text-sm text-muted-foreground font-medium">
            Ready to start building? Launch the setup console to track your progress step-by-step.
          </p>
          <Link 
            to={`/system-setup/${systemId}`}
            className="saas-button shrink-0"
          >
            Start Setup Console <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SystemStackCompletion;