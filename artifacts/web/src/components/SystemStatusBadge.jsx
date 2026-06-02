import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const statusConfig = {
  'Draft': { color: 'hsl(var(--status-draft))', desc: 'System is being configured.' },
  'Ready To Deploy': { color: 'hsl(var(--status-ready))', desc: 'Configuration complete, ready for deployment.' },
  'Deploying': { color: 'hsl(var(--status-deploying))', desc: 'Infrastructure is currently provisioning.' },
  'Running': { color: 'hsl(var(--status-running))', desc: 'System is active and processing.' },
  'Paused': { color: 'hsl(var(--status-paused))', desc: 'System execution is temporarily halted.' },
  'Error': { color: 'hsl(var(--status-error))', desc: 'System encountered a critical failure.' },
  'Scaling': { color: 'hsl(var(--status-scaling))', desc: 'System is adjusting resources.' },
  'Archived': { color: 'hsl(var(--status-archived))', desc: 'System has been retired.' },
};

const SystemStatusBadge = ({ status = 'Draft', size = 'md' }) => {
  const config = statusConfig[status] || statusConfig['Draft'];
  
  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5'
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`font-mono uppercase tracking-wider border-transparent ${sizeClasses[size]}`}
            style={{ 
              backgroundColor: `${config.color.replace(')', ' / 0.15)')}`, 
              color: config.color,
              borderColor: `${config.color.replace(')', ' / 0.3)')}`
            }}
          >
            <span 
              className="w-1.5 h-1.5 rounded-full mr-1.5 animate-pulse" 
              style={{ backgroundColor: config.color, boxShadow: `0 0 8px ${config.color}` }}
            />
            {status}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="bg-popover text-popover-foreground border-border">
          <p className="text-xs">{config.desc}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default SystemStatusBadge;