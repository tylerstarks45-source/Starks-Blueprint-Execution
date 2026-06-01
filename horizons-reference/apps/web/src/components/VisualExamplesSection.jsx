import React from 'react';
import { motion } from 'framer-motion';
import { Play, Image as ImageIcon, Sparkles } from 'lucide-react';

const EXAMPLES = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1619097647550-0fe7f031c18b?auto=format&fit=crop&q=80&w=800',
    title: 'AI Content Generation',
    desc: 'Automated blog posts and social media copy generated from a single prompt.',
    icon: Sparkles
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1696389500310-cd6d247cb609?auto=format&fit=crop&q=80&w=800',
    title: 'Video Automation',
    desc: 'Faceless YouTube shorts created entirely via API integrations.',
    icon: Play
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1625296276703-3fbc924f07b5?auto=format&fit=crop&q=80&w=800',
    title: 'Lead Generation System',
    desc: 'Scraping, enriching, and emailing 10k+ leads on autopilot.',
    icon: ImageIcon
  },
  {
    id: 4,
    image: 'https://images.unsplash.com/photo-1600132806370-bf17e65e942f?auto=format&fit=crop&q=80&w=800',
    title: 'Customer Support Bot',
    desc: 'AI agents handling 80% of tier 1 support tickets instantly.',
    icon: Sparkles
  }
];

const VisualExamplesSection = () => {
  return (
    <section className="py-24 bg-card/30 relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-extrabold mb-4">See What These Tools Can Do</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-medium">
            Real outputs from the systems and tools available in the marketplace. Stop imagining, start building.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {EXAMPLES.map((ex, idx) => (
            <motion.div
              key={ex.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="relative rounded-2xl overflow-hidden group aspect-video cursor-pointer"
            >
              <img 
                src={ex.image} 
                alt={ex.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="absolute bottom-0 left-0 p-6 sm:p-8 w-full transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                <div className="flex items-center gap-2 mb-2">
                  <ex.icon className="w-5 h-5 text-primary" />
                  <h3 className="text-xl sm:text-2xl font-bold text-white">{ex.title}</h3>
                </div>
                <p className="text-gray-300 font-medium text-sm sm:text-base line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                  {ex.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default VisualExamplesSection;