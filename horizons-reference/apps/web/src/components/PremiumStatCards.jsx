import React from 'react';
import { motion } from 'framer-motion';
import { Settings, BookOpen, Wrench, Layers } from 'lucide-react';

const stats = [
  {
    icon: Settings,
    title: 'Automated Income Systems',
    description: 'Build AI-powered systems designed to run continuously using automation workflows and real software tools.'
  },
  {
    icon: BookOpen,
    title: 'Beginner-Friendly Blueprints',
    description: 'Step-by-step instructions designed for people starting from zero experience.'
  },
  {
    icon: Wrench,
    title: 'Real AI Tool Stacks',
    description: 'Every blueprint includes the exact tools, automations, and workflows used inside the system.'
  },
  {
    icon: Layers,
    title: 'Scalable Digital Infrastructure',
    description: 'Stack multiple systems together to create long-term online income infrastructure.'
  }
];

const PremiumStatCards = () => {
  return (
    <section className="py-12 md:py-20 bg-background relative z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="premium-card p-8 rounded-2xl flex flex-col h-full"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
                <stat.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">{stat.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed flex-grow">
                {stat.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PremiumStatCards;