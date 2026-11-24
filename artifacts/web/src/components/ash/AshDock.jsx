import React, { useEffect } from 'react';
import { Bot, MicOff, Power, Square, Trash2, Volume2, VolumeX, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAshConversation } from '@/contexts/AshConversationContext.jsx';
import { AshComposer, AshPushToTalk, AshTranscript } from './AshConversationParts.jsx';
import { btn, btnPrimary } from '@/components/empire/ui.jsx';

export default function AshDock() {
  const { available, dockOpen, openDock, closeDock, status, avatar, speak, setSpeak, error,
    enabled, enable, clear, disable, retry, recording, handsFree, setHandsFree, pauseMic, interrupt, tasks } = useAshConversation();
  useEffect(() => {
    if (!available) return undefined;
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        (dockOpen ? closeDock : openDock)();
      }
      if (dockOpen && e.key === 'Escape' && !e.defaultPrevented) closeDock();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [available, closeDock, dockOpen, openDock]);

  if (!available) return null;

  if (!dockOpen) return (
    <div className="fixed bottom-5 right-5 z-[60] flex items-center gap-2">
      {(handsFree || recording) && (
        <button type="button" className={`${btn} bg-slate-950 text-emerald-200`} onClick={pauseMic}><MicOff className="w-4 h-4" /> Turn mic off</button>
      )}
      <button type="button" onClick={openDock} aria-label="Talk to ASH" title="Talk to ASH (Ctrl/Cmd+J)"
        className="relative grid h-14 w-14 place-items-center rounded-full border border-cyan-300/30 bg-gradient-to-br from-cyan-500 to-violet-600 text-white shadow-lg transition-transform hover:scale-105">
        <Bot className="h-6 w-6" />
        {avatar.state === 'thinking' && <span className="absolute inset-0 rounded-full border-2 border-cyan-200/60 motion-safe:animate-ping" />}
      </button>
    </div>
  );

  const iconButton = 'rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white';
  return (
    <section role="dialog" aria-label="ASH assistant" className="fixed bottom-5 right-5 z-[60] flex h-[min(560px,calc(100dvh-2.5rem))] w-[calc(100vw-2.5rem)] flex-col rounded-2xl border border-cyan-400/20 bg-[rgba(4,10,28,0.97)] shadow-2xl sm:w-[380px]">
      <header className="flex items-center gap-1 border-b border-white/10 px-3 py-2.5">
        <Bot className="mr-1 h-5 w-5 text-cyan-200" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">ASH</p>
          <p className="text-xs capitalize text-white/60">{status === 'connected' ? avatar.state : status}</p>
        </div>
        <button type="button" onClick={() => setSpeak(!speak)} aria-label={speak ? 'Mute ASH voice' : 'Let ASH speak replies'} aria-pressed={speak} className={iconButton}>{speak ? <Volume2 size={16} /> : <VolumeX size={16} />}</button>
        <button type="button" onClick={clear} aria-label="Clear conversation" title="Clear conversation" className={iconButton}><Trash2 size={16} /></button>
        {enabled && <button type="button" onClick={disable} aria-label="Turn off ASH" title="Turn off ASH" className={iconButton}><Power size={16} /></button>}
        <button type="button" onClick={closeDock} aria-label="Close ASH" className={iconButton}><X size={16} /></button>
      </header>
      <AshTranscript className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3" testId="ash-dock-transcript" />
      <footer className="px-3 pb-3">
        {tasks.length > 0 && <Link to="/missions" className="mb-2 block text-xs text-cyan-200 underline">View mission progress</Link>}
        {error && <p role="alert" className="mb-2 text-xs text-rose-200">{error}</p>}
        {status === 'disconnected' && <button type="button" className={btn} onClick={retry}>Retry connection</button>}
        {status === 'signed out' && <Link to="/login" className="text-sm text-cyan-300 underline">Sign in again</Link>}
        {!enabled ? <button type="button" className={btnPrimary} onClick={enable}>Turn on ASH</button> : (
          <>
            <div className="flex flex-wrap items-center gap-1.5">
              <AshPushToTalk />
              <button type="button" className={btn} disabled={status !== 'connected' || (recording && !handsFree) || !globalThis.AudioWorkletNode || !globalThis.AudioContext} onClick={() => setHandsFree(!handsFree)} aria-pressed={handsFree}>
                {handsFree ? 'Hands-free on' : 'Hands-free'}
              </button>
              <button type="button" className={btn} disabled={status !== 'connected'} onClick={() => { pauseMic(); interrupt('user.interrupt'); }} aria-label="Stop ASH"><Square className="h-3.5 w-3.5" /> Stop</button>
            </div>
            <AshComposer />
          </>
        )}
      </footer>
    </section>
  );
}
