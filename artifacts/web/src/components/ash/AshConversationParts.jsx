import React from 'react';
import { Link } from 'react-router-dom';
import { Mic, Send, Square } from 'lucide-react';
import { useAshConversation } from '@/contexts/AshConversationContext.jsx';
import { btn, btnPrimary, input } from '@/components/empire/ui.jsx';

export function AshComposer() {
  const { enabled, status, text, setText, submitText, pendingText } = useAshConversation();
  const connected = status === 'connected';
  return (
                <form onSubmit={submitText} className="mt-3 flex gap-2">
              <input className={input} value={text} onChange={(e) => setText(e.target.value)} placeholder={enabled ? 'Type to ASH…' : 'Turn on ASH to start'} disabled={!enabled} maxLength={8000} aria-label="Message ASH" />
              <button type="submit" className={btnPrimary} aria-label="Send message" disabled={!connected || !!pendingText || !text.trim()}><Send className="w-3.5 h-3.5" /></button>
            </form>
  );
}

export function AshTranscript({ className, testId }) {
  const { log } = useAshConversation();
  return (
    <div className={className} data-testid={testId} role="log">
              {log.length === 0 && <p className="text-sm text-white/40">Say or type anything: "What are you working on?", "Remember that I prefer short answers", or "Start a mission to launch my store."</p>}
              {log.map((e) => (
                <div key={e.id} className={e.role === 'user' ? 'text-right' : ''}>
                  {e.role === 'system' ? <p className="text-[11px] text-white/40 italic">{e.text}</p> : (
                    <div className={`inline-block max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap text-left ${e.role === 'user' ? 'bg-cyan-400/10 text-cyan-50' : 'bg-white/5 text-white/85'}`}>
                      {e.voice && <Mic className="inline w-3 h-3 mr-1 opacity-60" />}{e.text}
                      {e.steps?.length > 0 && (
                        <ul className="mt-1 text-[11px] text-white/60">
                          {e.steps.map((s, i) => (
                            <li key={i}>
                              {s.tool.replaceAll('_', ' ')}: {s.approvalId != null
                                ? <Link to="/approvals" className="text-amber-200 underline">Waiting for approval</Link>
                                : s.ok ? 'Completed' : 'Not completed'}
                            </li>
                          ))}
                        </ul>
                      )}
                      {e.actions?.map((a, i) => <Link key={i} to={a.path} className="mt-1 mr-1 text-[10px] px-2 py-0.5 rounded-full border border-cyan-400/30 text-cyan-200 hover:bg-cyan-400/10">Open {a.path}</Link>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
  );
}

export function AshPushToTalk() {
  const { status, recording, handsFree, pushToTalk } = useAshConversation();
  const active = recording && !handsFree;
  return (
    <button type="button" className={active ? btnPrimary : btn} disabled={status !== 'connected' || handsFree || !globalThis.MediaRecorder} onClick={pushToTalk}>
      {active ? <><Square className="w-3.5 h-3.5" /> Send recording</> : <><Mic className="w-3.5 h-3.5" /> Push to talk</>}
    </button>
  );
}
