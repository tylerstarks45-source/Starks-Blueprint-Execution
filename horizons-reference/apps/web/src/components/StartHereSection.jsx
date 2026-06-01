import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DollarSign, Users, TrendingUp, Monitor, ArrowRight } from 'lucide-react';
const GOALS = [{
  id: 'make-money',
  title: 'Make Money with AI',
  description: 'Deploy systems designed specifically to generate new revenue streams.',
  icon: <DollarSign className="w-8 h-8 text-primary" />,
  path: '/systems-for-goal/make-money-with-ai'
}, {
  id: 'generate-leads',
  title: 'Generate Leads',
  description: 'Automate outreach and capture high-quality prospects 24/7.',
  icon: <Users className="w-8 h-8 text-primary" />,
  path: '/systems-for-goal/generate-leads'
}, {
  id: 'grow-social',
  title: 'Grow Social Media',
  description: 'Scale your audience with AI-driven content and engagement engines.',
  icon: <TrendingUp className="w-8 h-8 text-primary" />,
  path: '/systems-for-goal/grow-social-media'
}, {
  id: 'start-business',
  title: 'Start Online Business',
  description: 'Launch a complete, automated digital business from scratch.',
  icon: <Monitor className="w-8 h-8 text-primary" />,
  path: '/systems-for-goal/start-online-business'
}];
const StartHereSection = () => {
  return <section className="py-20 md:py-24 bg-gradient-dark relative border-b border-white/5">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-extrabold mb-4 text-white">Choose Your Path</h2>
          <p className="text-lg text-zinc-400 font-medium max-w-2xl mx-auto">
            Select your primary objective below. We'll show you the exact automated systems built to achieve it.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {GOALS.map((goal, index) => <motion.div key={goal.id} initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} transition={{
          duration: 0.5,
          delay: index * 0.1
        }}>
              <Link to={goal.path} className="group flex flex-col h-full p-8 rounded-[16px] bg-card-gradient border border-white/10 hover-glow">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 border border-primary/20 group-hover:scale-110 transition-transform duration-300">
                  {goal.icon}
                </div>
                
                <h3 className="text-xl font-bold text-white mb-3">{goal.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed mb-8 flex-grow">
                  {goal.description}
                </p>
                
                <div className="flex items-center text-primary font-semibold text-sm group-hover:text-blue-400 transition-colors mt-auto">
                  View System <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </motion.div>)}
        </div>
      </div>
    </section>;
};
export default StartHereSection;