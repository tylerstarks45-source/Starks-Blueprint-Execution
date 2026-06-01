import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Layers, Zap, DollarSign, Video, Mail, Cpu } from 'lucide-react';

const SYSTEMS = [
  {
    id: 'ai-affiliate-content-engine',
    name: 'AI Affiliate Content Engine',
    description: 'High-velocity content publishing architecture to capture organic traffic and route to affiliate offers.',
    icon: Video,
    tags: ['Affiliate', '90% Automated', 'Beginner'],
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    shadow: 'hover:shadow-[0_0_25px_rgba(249,115,22,0.2)]'
  },
  {
    id: 'ai-agency-system',
    name: 'AI Automation Agency System',
    description: 'Scalable agency infrastructure leveraging AI for service delivery and client acquisition.',
    icon: Layers,
    tags: ['Client Services', '75% Automated', 'Intermediate'],
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    shadow: 'hover:shadow-[0_0_25px_rgba(59,130,246,0.2)]'
  },
  {
    id: 'funnel-email-automator',
    name: 'Funnel & Email Automation System',
    description: 'Systematically capture attention, nurture prospects via automated email, and convert leads.',
    icon: Mail,
    tags: ['Digital Products', '80% Automated', 'Beginner'],
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    shadow: 'hover:shadow-[0_0_25px_rgba(168,85,247,0.2)]'
  },
  {
    id: 'ai-chatbot-sales-funnel',
    name: 'AI Chatbot Sales Funnel',
    description: 'Intercept traffic, qualify leads autonomously via AI chat, and route them to conversions.',
    icon: Cpu,
    tags: ['High-Ticket', '85% Automated', 'Advanced'],
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    shadow: 'hover:shadow-[0_0_25px_rgba(6,182,212,0.2)]'
  }
];

const ProvenSystemsSection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-24 bg-background relative border-b border-border/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-extrabold text-foreground mb-6">Proven AI Systems You Can Build</h2>
          <p className="text-lg text-muted-foreground font-medium">
            Each system shows you exactly what tools to use and how they work together. Stop guessing and start deploying architectures that actually generate revenue.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {SYSTEMS.map((system, index) => {
            const Icon = system.icon;
            return (
              <motion.div
                key={system.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className={`bg-card border ${system.border} rounded-2xl p-8 flex flex-col h-full transition-all duration-300 ${system.shadow} group`}
              >
                <div className="flex items-start justify-between mb-6">
                  <div className={`w-14 h-14 rounded-xl ${system.bg} flex items-center justify-center border ${system.border}`}>
                    <Icon className={`w-7 h-7 ${system.color}`} />
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end max-w-[60%]">
                    {system.tags.map(tag => (
                      <span key={tag} className="text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground px-2 py-1 rounded-md">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                  {system.name}
                </h3>
                <p className="text-muted-foreground mb-8 flex-grow">
                  {system.description}
                </p>
                
                <button 
                  onClick={() => navigate(`/blueprints/${system.id}`)}
                  className="w-full py-3.5 bg-primary/10 hover:bg-primary/20 text-primary font-bold rounded-xl transition-colors border border-primary/20 flex items-center justify-center group-hover:border-primary/50"
                >
                  View System <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ProvenSystemsSection;