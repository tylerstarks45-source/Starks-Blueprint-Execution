import React from 'react';
import { useAshConversation } from '@/contexts/AshConversationContext.jsx';
import { Badge } from '@/components/empire/ui.jsx';

const STATE_TONE = { idle: 'slate', listening: 'green', thinking: 'violet', speaking: 'cyan' };
const MOUTH = { neutral: 'M38 66 Q50 68 62 66', warm: 'M36 64 Q50 72 64 64', happy: 'M34 62 Q50 78 66 62', focused: 'M40 67 L60 67', concerned: 'M38 70 Q50 63 62 70', curious: 'M42 66 Q50 70 58 64' };
const GESTURE_LABEL = { nod: 'nods', wave: 'waves', explain: 'explains', think: 'thinks', celebrate: 'celebrates', reassure: 'reassures' };
function Face({ state, emotion, gesture }) {
  const speaking = state === 'speaking';
  const ring = { idle: 'border-white/15', listening: 'border-emerald-400/60', thinking: 'border-violet-400/60', speaking: 'border-cyan-400/70' }[state];
  return (
    <div className="flex flex-col items-center gap-2" data-testid="ash-avatar" data-state={state} data-emotion={emotion} data-gesture={gesture}>
      <div className={`w-44 h-44 rounded-full border-4 ${ring} bg-gradient-to-b from-cyan-500/10 to-violet-500/10 flex items-center justify-center transition-colors`}>
        <svg viewBox="0 0 100 100" className={`w-36 h-36 ${gesture === 'nod' ? 'motion-safe:animate-bounce' : ''}`}>
          <circle cx="36" cy="42" r={state === 'thinking' ? 3 : 5} fill="#a5f3fc" />
          <circle cx="64" cy="42" r={state === 'thinking' ? 3 : 5} fill="#a5f3fc" />
          {emotion === 'concerned' && <path d="M28 32 L42 35 M72 32 L58 35" stroke="#a5f3fc" strokeWidth="2" />}
          <path d={MOUTH[emotion] ?? MOUTH.neutral} stroke="#a5f3fc" strokeWidth="3" fill="none" strokeLinecap="round" className={speaking ? 'motion-safe:animate-pulse' : ''} />
          {speaking && <ellipse cx="50" cy="69" rx="6" ry="3" fill="#a5f3fc" className="motion-safe:animate-ping" opacity="0.4" />}
        </svg>
      </div>
      <div className="flex gap-2 items-center"><Badge tone={STATE_TONE[state]}>{state}</Badge><Badge>{emotion}</Badge>{GESTURE_LABEL[gesture] && <span className="text-[11px] text-white/50">ASH {GESTURE_LABEL[gesture]}</span>}</div>
    </div>
  );
}

export default function AshAvatarStage({ renderer: Renderer = Face }) {
  const { avatar, speech, enabled } = useAshConversation();
  return <Renderer {...avatar} speech={speech} enabled={enabled} />;
}
