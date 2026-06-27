import React from 'react';
import { Cpu } from 'lucide-react';

const MODEL_LABELS = {
  'openai/gpt-4o-mini':               'GPT-4o Mini',
  'openai/gpt-4o':                    'GPT-4o',
  'anthropic/claude-3-5-sonnet':      'Claude 3.5 Sonnet',
  'anthropic/claude-opus-4':          'Claude Opus 4',
  'anthropic/claude-3-haiku':         'Claude Haiku',
  'google/gemini-pro':                'Gemini Pro',
  'meta-llama/llama-3-70b-instruct':  'Llama 3 70B',
};

function formatModel(model) {
  if (!model) return null;
  if (MODEL_LABELS[model]) return MODEL_LABELS[model];
  const slash = model.lastIndexOf('/');
  return slash >= 0 ? model.slice(slash + 1) : model;
}

const AIModelBadge = ({ model, isActive = false, size = 'sm' }) => {
  const label = formatModel(model);
  if (!label) return null;

  const isSmall = size === 'xs';

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono border rounded-full transition-colors
        ${isSmall ? 'text-[9px] px-1.5 py-0' : 'text-[10px] px-2 py-0.5'}
        ${isActive
          ? 'border-violet-500/40 bg-violet-500/10 text-violet-300'
          : 'border-white/12 bg-white/4 text-white/35'
        }
      `}
    >
      {isActive ? (
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse shrink-0" />
      ) : (
        <Cpu className={`shrink-0 ${isSmall ? 'w-2 h-2' : 'w-2.5 h-2.5'}`} />
      )}
      {label}
    </span>
  );
};

export default AIModelBadge;
