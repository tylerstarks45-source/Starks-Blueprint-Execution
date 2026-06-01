import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Cpu, Database, Workflow, Video, Share2 } from 'lucide-react';
import { toolAffiliateLinks } from '@/config/toolAffiliateLinks.js';

const tools = [
  {
    name: 'OpenRouter',
    icon: Cpu,
    purpose: 'AI brain for script generation',
    why: 'Accesses top LLMs (Claude, GPT-4) at lowest cost to write engaging hooks and scripts.',
    link: toolAffiliateLinks.openrouter,
    color: 'cyan'
  },
  {
    name: 'Google Sheets',
    icon: Database,
    purpose: 'Content database & trigger',
    why: 'Acts as the central nervous system to store topics, track status, and trigger automations.',
    link: toolAffiliateLinks.googleSheets,
    color: 'emerald'
  },
  {
    name: 'Make.com',
    icon: Workflow,
    purpose: 'Automation engine',
    why: 'Connects all tools together. Watches the sheet, calls the AI, sends to video generator, and posts.',
    link: toolAffiliateLinks.make,
    color: 'purple'
  },
  {
    name: 'Vidfly',
    icon: Video,
    purpose: 'AI video generation',
    why: 'Turns text scripts into high-quality faceless videos with AI voiceovers, B-roll, and captions.',
    link: toolAffiliateLinks.vidfly,
    color: 'cyan'
  },
  {
    name: 'Buffer / GoHighLevel',
    icon: Share2,
    purpose: 'Social media posting',
    why: 'Automatically distributes the finished videos to TikTok, Reels, and Shorts at scheduled times.',
    link: toolAffiliateLinks.buffer,
    color: 'emerald'
  }
];

const AIVideoToolStackSection = () => {
  return (
    <section id="toolstack" className="py-20 relative z-10">
      <div className="container mx-auto px-4 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 glow-text-cyan">Required Tool Stack</h2>
          <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">The exact software architecture needed to run this system autonomously.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool, index) => (
            <motion.div
              key={tool.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`sci-fi-card flex flex-col h-full ${tool.color === 'cyan' ? 'hover:glow-border-cyan' : tool.color === 'purple' ? 'hover:glow-border-purple' : 'hover:glow-border-emerald'}`}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className={`p-3 rounded-lg bg-background border border-${tool.color === 'cyan' ? 'primary' : tool.color === 'purple' ? 'secondary' : 'accent'}/30`}>
                  <tool.icon className={`w-6 h-6 text-${tool.color === 'cyan' ? 'primary' : tool.color === 'purple' ? 'secondary' : 'accent'}`} />
                </div>
                <div>
                  <a 
                    href={tool.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`text-xl font-bold text-white hover:text-${tool.color === 'cyan' ? 'primary' : tool.color === 'purple' ? 'secondary' : 'accent'} transition-colors inline-flex items-center gap-1`}
                  >
                    {tool.name} <ExternalLink className="w-4 h-4 opacity-50" />
                  </a>
                  <p className="text-sm text-[var(--text-secondary)]">{tool.purpose}</p>
                </div>
              </div>
              <div className="flex-grow mb-6">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <strong className="text-white">Why it's needed:</strong> {tool.why}
                </p>
              </div>
              <a 
                href={tool.link}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-auto flex items-center justify-center w-full py-3 rounded-lg bg-white/5 hover:bg-${tool.color === 'cyan' ? 'primary' : tool.color === 'purple' ? 'secondary' : 'accent'}/20 border border-white/10 hover:border-${tool.color === 'cyan' ? 'primary' : tool.color === 'purple' ? 'secondary' : 'accent'}/50 text-white text-sm font-bold transition-all group`}
              >
                Access Tool <ExternalLink className="w-4 h-4 ml-2 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AIVideoToolStackSection;