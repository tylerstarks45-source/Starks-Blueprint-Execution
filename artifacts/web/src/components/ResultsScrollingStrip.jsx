import React from 'react';
import { TrendingUp, Users, DollarSign, Clock, Play, Mail, Zap, ShoppingCart } from 'lucide-react';

const results = [
  {
    icon: DollarSign,
    system: 'Affiliate Income System',
    metric: '$12,400/mo',
    timeframe: 'after 90 days',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/30',
  },
  {
    icon: Play,
    system: 'AI Content Engine',
    metric: '2.1M Views',
    timeframe: 'in 60 days',
    color: 'text-rose-400',
    bg: 'bg-rose-400/10',
    border: 'border-rose-400/30',
  },
  {
    icon: Mail,
    system: 'Email List System',
    metric: '8,400 Subs',
    timeframe: 'in 45 days',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/30',
  },
  {
    icon: DollarSign,
    system: 'Digital Product Funnel',
    metric: '$4,800/mo',
    timeframe: 'first 60 days',
    color: 'text-violet-400',
    bg: 'bg-violet-400/10',
    border: 'border-violet-400/30',
  },
  {
    icon: Users,
    system: 'Social Media Automation',
    metric: '22K Followers',
    timeframe: 'in 90 days',
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10',
    border: 'border-cyan-400/30',
  },
  {
    icon: TrendingUp,
    system: 'Lead Generation Machine',
    metric: '340 Leads/mo',
    timeframe: 'on autopilot',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/30',
  },
  {
    icon: Zap,
    system: 'AI Agency System',
    metric: '$6,200/mo',
    timeframe: 'within 3 months',
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
    border: 'border-orange-400/30',
  },
  {
    icon: Clock,
    system: 'Automation Workflow',
    metric: '18 Hrs Saved',
    timeframe: 'every single week',
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
    border: 'border-purple-400/30',
  },
];

const ResultsScrollingStrip = () => {
  const scrollItems = [...results, ...results];

  return (
    <section className="py-16 bg-background overflow-hidden border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-bold font-mono uppercase tracking-widest mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live Platform Results
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
          Real Systems. Real Income. Running Right Now.
        </h2>
        <p className="text-sm text-muted-foreground">
          *Example outcomes from members using our blueprints and ASH AI. Individual results vary based on niche, effort, and plan tier.
        </p>
      </div>

      <div className="relative flex overflow-hidden group">
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

        <div className="flex gap-6 animate-scroll w-max px-6">
          {scrollItems.map((item, index) => (
            <div
              key={index}
              className={`glass-panel w-72 shrink-0 p-6 flex flex-col items-center text-center border ${item.border} hover:scale-105 transition-transform duration-300`}
            >
              <div className={`w-12 h-12 rounded-full ${item.bg} flex items-center justify-center mb-3`}>
                <item.icon className={`w-6 h-6 ${item.color}`} />
              </div>
              <div className="text-xs text-zinc-500 font-mono font-medium mb-1 uppercase tracking-wider">{item.system}</div>
              <div className={`text-3xl font-black ${item.color} mb-1 leading-tight`}>{item.metric}</div>
              <div className="text-xs text-zinc-400 uppercase tracking-widest">{item.timeframe}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ResultsScrollingStrip;
