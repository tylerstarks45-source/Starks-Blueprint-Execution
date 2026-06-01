import React from 'react';
import { motion } from 'framer-motion';
import { Target, DollarSign, AlertOctagon, CheckCircle } from 'lucide-react';

const AIVideoExtrasSection = () => {
  return (
    <section className="py-20 relative z-10">
      <div className="container mx-auto px-4 max-w-6xl space-y-20">
        
        {/* Expected Outputs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-3 glow-text-emerald">
            <Target className="w-8 h-8 text-accent" /> Expected System Outputs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['3-10 Videos Per Day', 'Multi-Platform Distribution', 'Consistent Traffic Flow', 'Passive Income Generation', 'Scalable Content Pipeline'].map((item, i) => (
              <div key={i} className="sci-fi-card flex items-center gap-3 border-accent/30 hover:glow-border-emerald">
                <CheckCircle className="w-5 h-5 text-accent shrink-0" />
                <span className="text-white font-medium">{item}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Monetization */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-3 glow-text-cyan">
            <DollarSign className="w-8 h-8 text-primary" /> Monetization Models
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="sci-fi-card border-primary/30">
              <h3 className="text-xl font-bold text-white mb-2">Affiliate Marketing</h3>
              <p className="text-sm text-[var(--text-secondary)]">Place affiliate links in your bio. The videos drive traffic, the links drive revenue.</p>
            </div>
            <div className="sci-fi-card border-primary/30">
              <h3 className="text-xl font-bold text-white mb-2">Content Funnels</h3>
              <p className="text-sm text-[var(--text-secondary)]">Drive viewers to a lead magnet or email list to sell high-ticket products or services.</p>
            </div>
            <div className="sci-fi-card border-primary/30">
              <h3 className="text-xl font-bold text-white mb-2">Ad Revenue</h3>
              <p className="text-sm text-[var(--text-secondary)]">Monetize directly through YouTube Partner Program or TikTok Creator Rewards once eligible.</p>
            </div>
          </div>
        </motion.div>

        {/* Common Mistakes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-3 glow-text-purple">
            <AlertOctagon className="w-8 h-8 text-secondary" /> Common Mistakes to Avoid
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { m: 'Generic Prompts', s: 'Use highly specific OpenRouter prompts with examples of good hooks.' },
              { m: 'Ignoring Platform Limits', s: 'Ensure Make.com checks video length before sending to Shorts/Reels APIs.' },
              { m: 'Boring Visuals', s: 'Configure Vidfly to use dynamic captions and fast-paced B-roll.' },
              { m: 'Inconsistent Posting', s: 'Keep the Google Sheet filled with topics so the automation never starves.' }
            ].map((item, i) => (
              <div key={i} className="sci-fi-card border-secondary/30 bg-secondary/5">
                <h4 className="text-white font-bold mb-1 text-lg">{item.m}</h4>
                <p className="text-sm text-[var(--text-secondary)]"><strong className="text-secondary">Fix:</strong> {item.s}</p>
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </section>
  );
};

export default AIVideoExtrasSection;