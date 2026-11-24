import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Mic, MicOff, Square, Volume2, VolumeX, Radio, Wifi, WifiOff } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout.jsx';
import AshAvatarStage from '@/components/ash/AshAvatarStage.jsx';
import { AshTranscript, AshComposer, AshPushToTalk } from '@/components/ash/AshConversationParts.jsx';
import { useAshConversation } from '@/contexts/AshConversationContext.jsx';
import { Card, Badge, btn, btnPrimary, input } from '@/components/empire/ui.jsx';

const VOICES = ['nova', 'shimmer', 'coral', 'sage', 'alloy', 'ash', 'echo', 'fable', 'onyx'];
const TASK_TONE = { running: 'cyan', planning: 'cyan', completed: 'green', failed: 'rose', cancelled: 'slate', paused: 'slate', waiting_approval: 'amber', waiting_owner: 'amber' };

export default function AshLivePage() {
  const { enabled, enable, disable, clear, status, retry, tasks, speak, setSpeak, voice, setVoice, handsFree, setHandsFree, pauseMic, recording, sensitivity, setSensitivity, level, error, interrupt } = useAshConversation();
  const connected = status === 'connected';
  return (
    <AuthLayout>
      <Helmet><title>ASH Live | STARKS</title></Helmet>
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-white flex items-center gap-2"><Radio className="w-6 h-6 text-cyan-300" /> ASH Live</h1>
            <p className="text-sm text-white/50">Talk to ASH in real time. Interrupt her any time by speaking or pressing Stop. This simulator previews the connection planned for the 3D character.</p>
          </div>
          <Badge tone={connected ? 'green' : status === 'signed out' ? 'rose' : 'amber'}>{connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}{status}</Badge>
        </div>
        {enabled ? <button type="button" className={btn} onClick={disable}>Turn off ASH</button> : <button type="button" className={btnPrimary} onClick={enable}>Turn on ASH</button>}
        {error && <div className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200" role="alert">{error}</div>}
        {status === 'disconnected' && <button type="button" className={btn} onClick={retry}>Retry connection</button>}
        {(status === 'signed out' || status === 'disconnected') && <Link to="/login" className="text-sm text-cyan-300 underline">Sign in again</Link>}
        <div className="grid lg:grid-cols-[300px_1fr] gap-4">
          <div className="space-y-4">
            <Card>
              <AshAvatarStage />
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                <AshPushToTalk />
                <button type="button" className={handsFree ? btnPrimary : btn} disabled={!enabled || !connected || recording && !handsFree || !globalThis.AudioWorkletNode || !globalThis.AudioContext} onClick={() => setHandsFree((v) => !v)} aria-pressed={handsFree}>{handsFree ? <><MicOff className="w-3.5 h-3.5" /> Hands-free on</> : <><Mic className="w-3.5 h-3.5" /> Hands-free</>}</button>
                <button type="button" className={btn} disabled={!connected} onClick={() => { pauseMic(); interrupt('user.interrupt'); }} aria-label="Stop ASH"><Square className="w-3.5 h-3.5" /> Stop</button>
              </div>
              {handsFree && <div className="mt-3 h-1.5 rounded bg-white/10 overflow-hidden"><div className="h-full bg-emerald-400 transition-[width]" style={{ width: `${Math.round(level * 100)}%` }} /></div>}
            </Card>
            <Card title="Voice">
              <div className="space-y-3 text-sm">
                <label className="flex items-center justify-between gap-2 text-white/70"><span className="flex items-center gap-2">{speak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />} ASH speaks</span><input type="checkbox" checked={speak} onChange={(e) => setSpeak(e.target.checked)} /></label>
                <label className="block text-white/70">Voice<select className={`${input} mt-1`} value={voice} onChange={(e) => setVoice(e.target.value)}>{VOICES.map((v) => <option key={v} value={v}>{v}</option>)}</select></label>
                <label className="block text-white/70">Mic sensitivity<input type="range" min="0" max="100" value={sensitivity} onChange={(e) => setSensitivity(Number(e.target.value))} className="w-full mt-1" /></label>
              </div>
            </Card>
            <Card title="Background work">
              {tasks.length === 0 ? <p className="text-sm text-white/50">No missions yet. Ask ASH to start one.</p> : (
                <ul className="space-y-2 text-sm" data-testid="ash-live-tasks">
                  {tasks.map((t) => (
                    <li key={t.missionId} className="space-y-1">
                      <div className="flex items-center justify-between gap-2"><Link to="/missions" className="text-white/80 hover:text-white truncate">{t.goal}</Link><Badge tone={TASK_TONE[t.status]}>{t.status.replace(/_/g, ' ')}</Badge></div>
                      <div className="h-1 rounded bg-white/10 overflow-hidden"><div className="h-full bg-cyan-400" style={{ width: `${t.stepsTotal ? (100 * t.stepsDone) / t.stepsTotal : 0}%` }} /></div>
                      <p className="text-[11px] text-white/40">{t.waitingFor ? `Needs you: ${t.waitingFor}` : t.currentStep ? `Now: ${t.currentStep}` : `${t.stepsDone}/${t.stepsTotal} steps`}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
          <Card title="Conversation" className="flex flex-col min-h-[520px]">
            <AshTranscript className="flex-1 max-h-[65vh] overflow-y-auto space-y-3 pr-1" testId="ash-live-transcript" />
            <AshComposer />
            <button type="button" className={`${btn} mt-2 self-start`} onClick={clear}>Clear conversation</button>
          </Card>
        </div>
      </div>
    </AuthLayout>
  );
}
