import React from 'react';
import { TrendingUp, Users, DollarSign, Clock, Play, Mail } from 'lucide-react';

const results = [
  {
    icon: DollarSign,
    title: 'Affiliate Revenue',
    metric: '$4,200',
    timeframe: 'in 30 days',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/30'
  },
  {
    icon: Play,
    title: 'YouTube Analytics',
    metric: '50K Views',
    timeframe: 'first video',
    color: 'text-rose-400',
    bg: 'bg-rose-400/10',
    border: 'border-rose-400/30'
  },
  {
    icon: Mail,
    title: 'Email List Growth',
    metric: '5,000 Subs',
    timeframe: 'in 60 days',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/30'
  },
  {
    icon: Clock,
    title: 'Automation Workflow',
    metric: '12 Hrs Saved',
    timeframe: 'every week',
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
    border: 'border-purple-400/30'
  },
  {
    icon: Users,
    title: 'Social Media Growth',
    metric: '10K Followers',
    timeframe: 'in 90 days',
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10',
    border: 'border-cyan-400/30'
  },
  {
    icon: TrendingUp,
    title: 'Lead Generation',
    metric: '200 Leads',
    timeframe: 'per month',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/30'
  }
];

const ResultsScrollingStrip = () => {
  // Duplicate array for seamless scrolling
  const scrollItems = [...results, ...results];

  return (
    <section className="py-16 bg-background overflow-hidden border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
          See Real Results From Real Builders
        </h2>
        <p className="text-sm text-muted-foreground">
          *These are example results from users following our exact blueprints.
        </p>
      </div>

      <div className="relative flex overflow-hidden group">
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10"></div>
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10"></div>
        
        <div className="flex gap-6 animate-scroll w-max px-6">
          {scrollItems.map((item, index) => (
            <div 
              key={index} 
              className={`glass-panel w-72 shrink-0 p-6 flex flex-col items-center text-center border ${item.border} hover:scale-105 transition-transform duration-300`}
            >
              <div className={`w-12 h-12 rounded-full ${item.bg} flex items-center justify-center mb-4`}>
                <item.icon className={`w-6 h-6 ${item.color}`} />
              </div>
              <div className="text-sm text-muted-foreground font-medium mb-1">{item.title}</div>
              <div className={`text-3xl font-bold ${item.color} mb-1`}>{item.metric}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">{item.timeframe}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ResultsScrollingStrip;