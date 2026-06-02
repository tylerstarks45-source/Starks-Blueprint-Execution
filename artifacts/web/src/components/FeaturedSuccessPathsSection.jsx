import React from 'react';
import { motion } from 'framer-motion';
import { Video, DollarSign, Briefcase, Check, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const paths = [
  {
    icon: Video,
    title: 'AI Content Creator Path',
    description: 'Build a fully automated faceless YouTube or TikTok channel that generates views and revenue while you sleep.',
    who: 'Creators, content makers',
    outcomes: [
      '10K+ subscribers in 90 days',
      '$1,000-$5,000/month passive income',
      '4x faster content creation'
    ],
    tools: ['Zebracat AI', 'TubeMagic', 'Make.com', 'GetResponse'],
    beginnerFriendly: true,
    cta: 'Start Content Creator Path',
    link: '/blueprints/ai-youtube-cash-cow-system',
    color: 'cyan'
  },
  {
    icon: DollarSign,
    title: 'Affiliate Marketing Automation',
    description: 'Deploy an AI-powered content engine designed specifically to drive high-converting traffic to affiliate offers.',
    who: 'Entrepreneurs, side hustlers',
    outcomes: [
      'First sale in 5-7 days',
      '$2,000-$10,000/month commissions',
      'Fully automated system'
    ],
    tools: ['Magai', 'Predis.ai', 'Make.com', 'GoHighLevel'],
    beginnerFriendly: true,
    cta: 'Start Affiliate Path',
    link: '/blueprints/ai-affiliate-content-engine',
    color: 'emerald'
  },
  {
    icon: Briefcase,
    title: 'AI Business Systems Path',
    description: 'Build end-to-end automated lead generation and sales systems for your agency or service business.',
    who: 'Business owners, agencies',
    outcomes: [
      '200+ qualified leads/month',
      '30%+ conversion rates',
      'Fully automated customer journey'
    ],
    tools: ['GoHighLevel', 'Systeme.io', 'CustomGPT', 'Make.com'],
    beginnerFriendly: true,
    cta: 'Start Business Systems Path',
    link: '/blueprints/ai-automation-agency-system',
    color: 'purple'
  }
];

const FeaturedSuccessPathsSection = () => {
  return (
    <section className="py-24 bg-background relative border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="activity-signal mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Trending paths this week
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            Choose Your Success Path
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Don't start from scratch. Copy the exact setups that are working right now.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {paths.map((path, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`glass-panel p-8 flex flex-col h-full relative overflow-hidden group border-${path.color}-500/30 hover:border-${path.color}-500/60 transition-colors`}
            >
              <div className={`absolute top-0 right-0 w-32 h-32 bg-${path.color}-500/10 blur-3xl rounded-full -mr-10 -mt-10 transition-opacity group-hover:opacity-100 opacity-50`}></div>
              
              <div className={`w-14 h-14 rounded-xl bg-${path.color}-500/10 border border-${path.color}-500/30 flex items-center justify-center mb-6`}>
                <path.icon className={`w-7 h-7 text-${path.color}-400`} />
              </div>
              
              <h3 className="text-2xl font-bold text-foreground mb-3">{path.title}</h3>
              <p className="text-muted-foreground mb-6">{path.description}</p>
              
              <div className="mb-6">
                <div className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">Who It's For</div>
                <div className="text-sm text-muted-foreground">{path.who}</div>
              </div>

              <div className="mb-6">
                <div className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Expected Outcomes</div>
                <ul className="space-y-2">
                  {path.outcomes.map((outcome, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className={`w-4 h-4 text-${path.color}-400 shrink-0 mt-0.5`} />
                      {outcome}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-8">
                <div className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Recommended Tools</div>
                <div className="flex flex-wrap gap-2">
                  {path.tools.map((tool, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded bg-background border border-border text-muted-foreground">
                      {tool}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-auto pt-6 border-t border-white/10">
                {path.beginnerFriendly && (
                  <div className="text-sm font-medium text-emerald-400 mb-4 flex items-center gap-2">
                    <Check className="w-4 h-4" /> Beginner Friendly: Yes - no experience needed
                  </div>
                )}
                <Link 
                  to={path.link}
                  className={`w-full py-3 px-4 rounded-lg font-bold text-center transition-all flex items-center justify-center gap-2 bg-${path.color}-500/10 text-${path.color}-400 border border-${path.color}-500/30 hover:bg-${path.color}-500 hover:text-white`}
                >
                  {path.cta} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedSuccessPathsSection;