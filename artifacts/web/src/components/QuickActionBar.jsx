import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DollarSign, Layers, Share2, Briefcase, ArrowRight } from 'lucide-react';

const QuickActionBar = () => {
  const actions = [
    {
      title: 'Make Money with AI',
      icon: DollarSign,
      link: '/marketplace?usecase=make-money',
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10',
      border: 'border-emerald-400/20'
    },
    {
      title: 'Build Automation Systems',
      icon: Layers,
      link: '/marketplace?usecase=automation',
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
      border: 'border-blue-400/20'
    },
    {
      title: 'Grow Social Media',
      icon: Share2,
      link: '/marketplace?usecase=social-media',
      color: 'text-purple-400',
      bg: 'bg-purple-400/10',
      border: 'border-purple-400/20'
    },
    {
      title: 'Start a Business',
      icon: Briefcase,
      link: '/marketplace?usecase=business',
      color: 'text-amber-400',
      bg: 'bg-amber-400/10',
      border: 'border-amber-400/20'
    }
  ];

  return (
    <section className="py-12 bg-background relative z-20 -mt-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {actions.map((action, idx) => (
            <motion.div
              key={action.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
            >
              <Link 
                to={action.link}
                className="flex items-center justify-between p-5 bg-card border border-border rounded-2xl hover-lift elevation-sm group"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${action.bg} ${action.border} border`}>
                    <action.icon className={`w-6 h-6 ${action.color}`} />
                  </div>
                  <span className="font-bold text-foreground group-hover:text-primary transition-colors">
                    {action.title}
                  </span>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default QuickActionBar;