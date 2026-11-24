import React from 'react';
import { Link } from 'react-router-dom';
import { useAshConversation } from '@/contexts/AshConversationContext.jsx';
import AshAvatarStage from '@/components/ash/AshAvatarStage.jsx';
import { AshComposer, AshPushToTalk } from '@/components/ash/AshConversationParts.jsx';
import { btn, btnPrimary } from '@/components/empire/ui.jsx';
import ashFaceUrl from '@/assets/ash-face.jpg';

function Portrait({ state, emotion, gesture }) {
  return (
    <div className="relative mx-auto h-36 w-36 shrink-0 rounded-full border border-cyan-400/40 p-2"
      data-testid="ash-dashboard-avatar" data-state={state} data-emotion={emotion} data-gesture={gesture}>
      <img src={ashFaceUrl} alt="ASH character preview" className="h-full w-full rounded-full object-cover object-top" />
      {state === 'speaking' && <span className="pointer-events-none absolute inset-1 rounded-full border-2 border-cyan-300/50 motion-safe:animate-pulse" />}
    </div>
  );
}

export default function ASHAssistantPanel() {
  const { enabled, enable, openDock, status, log, speak, setSpeak, avatar } = useAshConversation();
  const lastReply = log.findLast((entry) => entry.role === 'ash');
  return (
    <section aria-label="Dashboard ASH" className="flex h-full min-w-0 flex-col gap-3 overflow-y-auto">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-white">ASH</h2>
        <span className="text-xs capitalize text-cyan-200">{status === 'connected' ? avatar.state : status}</span>
      </div>
      <AshAvatarStage renderer={Portrait} />
      <p className="text-center text-xs text-white/50">Character preview · Unreal integration pending</p>
      {lastReply && <p className="line-clamp-4 rounded-lg bg-cyan-400/5 p-2 text-xs text-white/80" aria-live="polite">{lastReply.text}</p>}
      {enabled ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <AshPushToTalk />
            <label className="flex items-center gap-1 text-xs text-white/80"><input type="checkbox" checked={speak} onChange={(e) => setSpeak(e.target.checked)} /> Voice replies</label>
          </div>
          <AshComposer />
        </>
      ) : <button type="button" className={btnPrimary} onClick={enable}>Turn on ASH</button>}
      <button type="button" className={btn} onClick={openDock}>Open conversation</button>
      <div className="flex flex-wrap gap-2 text-xs text-cyan-200">
        <Link to="/ash-live" className="underline">ASH Live</Link>
        <Link to="/ash-control" className="underline">ASH permissions</Link>
        <Link to="/ash-intelligence" className="underline">System details</Link>
        <Link to="/download" className="underline">Install app</Link>
      </div>
    </section>
  );
}
