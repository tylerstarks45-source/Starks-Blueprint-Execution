import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap } from 'lucide-react';

const CATEGORY_COLORS = {
  'Sales & Marketing': 'text-orange-400 border-orange-400/20 bg-orange-400/8',
  'Research':          'text-sky-400 border-sky-400/20 bg-sky-400/8',
  'Business':          'text-violet-400 border-violet-400/20 bg-violet-400/8',
  'Creative':          'text-pink-400 border-pink-400/20 bg-pink-400/8',
  'Productivity':      'text-emerald-400 border-emerald-400/20 bg-emerald-400/8',
  'Documents':         'text-amber-400 border-amber-400/20 bg-amber-400/8',
  'Starks Exclusive':  'text-primary border-primary/20 bg-primary/8',
};

export default function SkillActivationPanel({ activatedSkills = [] }) {
  if (activatedSkills.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="rounded-xl border border-primary/20 bg-black/60 overflow-hidden mb-3"
      >
        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/8 bg-primary/5">
          <Sparkles className="w-3 h-3 text-primary" />
          <span className="text-[10px] font-mono font-bold text-primary uppercase tracking-widest">
            Skill Engine Active
          </span>
          <span className="ml-auto text-[10px] font-mono text-primary/60">
            {activatedSkills.length} skill{activatedSkills.length !== 1 ? 's' : ''} loaded
          </span>
        </div>
        <div className="p-3 flex flex-wrap gap-1.5">
          {activatedSkills.map((skill, i) => {
            const colorCls = CATEGORY_COLORS[skill.category] ?? 'text-gray-400 border-gray-400/20 bg-gray-400/8';
            return (
              <motion.div
                key={skill.slug}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-mono font-semibold ${colorCls}`}
              >
                <span>{skill.icon}</span>
                <span>{skill.name}</span>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
