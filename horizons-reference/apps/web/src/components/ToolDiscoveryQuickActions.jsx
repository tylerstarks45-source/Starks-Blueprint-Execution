import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Settings, Share2, Briefcase, ArrowRight } from 'lucide-react';

const ToolDiscoveryQuickActions = () => {
  const navigate = useNavigate();

  const actions = [
    {
      id: 'make-money',
      title: 'Make Money with AI',
      icon: DollarSign,
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10',
      border: 'border-emerald-400/20',
      query: '?usecase=make-money'
    },
    {
      id: 'automation',
      title: 'Build Automation Systems',
      icon: Settings,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
      border: 'border-blue-400/20',
      query: '?usecase=automation'
    },
    {
      id: 'social',
      title: 'Grow Social Media',
      icon: Share2,
      color: 'text-purple-400',
      bg: 'bg-purple-400/10',
      border: 'border-purple-400/20',
      query: '?usecase=social'
    },
    {
      id: 'business',
      title: 'Start a Business',
      icon: Briefcase,
      color: 'text-amber-400',
      bg: 'bg-amber-400/10',
      border: 'border-amber-400/20',
      query: '?usecase=business'
    }
  ];

  return (
    <section className="py-16 bg-background relative z-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex flex-col items-center text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Start Here: What is your goal?</h2>
          <p className="text-muted-foreground">Select a path to discover the exact tools and systems you need.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {actions.map((action, idx) => (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              onClick={() => navigate(`/marketplace${action.query}`)}
              className="group relative flex flex-col items-center justify-center p-8 rounded-2xl bg-card border border-border hover-lift elevation-sm overflow-hidden text-center"
            >
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-b from-transparent to-${action.color.split('-')[1]}-500/5`} />
              
              <div className={`w-16 h-16 rounded-2xl ${action.bg} ${action.border} border flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                <action.icon className={`w-8 h-8 ${action.color}`} />
              </div>
              
              <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">{action.title}</h3>
              
              <div className="flex items-center text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors mt-2">
                Explore Path <ArrowRight className="w-4 h-4 ml-1.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ToolDiscoveryQuickActions;