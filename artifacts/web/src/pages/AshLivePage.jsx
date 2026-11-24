import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { Mic, MicOff, Send, Square, Volume2, VolumeX, Radio, Wifi, WifiOff } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout.jsx';
import { Card, Badge, btn, btnPrimary, input } from '@/components/empire/ui.jsx';

// ASH Live simulator: the same realtime protocol the Unreal character uses
// (docs/engineering/ASH-LIVE-PROTOCOL.md), with a simple face standing in for the 3D body.

const VOICES = ['nova', 'shimmer', 'coral', 'sage', 'alloy', 'ash', 'echo', 'fable', 'onyx'];
const STATE_TONE = { idle: 'slate', listening: 'green', thinking: 'violet', speaking: 'cyan' };
const MOUTH = { neutral: 'M38 66 Q50 68 62 66', warm: 'M36 64 Q50 72 64 64', happy: 'M34 62 Q50 78 66 62', focused: 'M40 67 L60 67', concerned: 'M38 70 Q50 63 62 70', curious: 'M42 66 Q50 70 58 64' };
const GESTURE_LABEL = { nod: 'nods', wave: 'waves', explain: 'explains', think: 'thinks', celebrate: 'celebrates', reassure: 'reassures' };
const TASK_TONE = { running: 'cyan', planning: 'cyan', completed: 'green', failed: 'rose', cancelled: 'slate', paused: 'slate', waiting_approval: 'amber', waiting_owner: 'amber' };
const SILENCE_MS = 900;
const MIN_SPEECH_MS = 300;

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

export default function AshLivePage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('connecting');
  const [avatar, setAvatar] = useState({ state: 'idle', emotion: 'neutral', gesture: 'none' });
  const [log, setLog] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [text, setText] = useState('');
  const [pendingText, setPendingText] = useState(null);
  const pendingTextRef = useRef(null);
  const [speak, setSpeak] = useState(true);
  const [voice, setVoice] = useState('nova');
  const [handsFree, setHandsFree] = useState(false);
  const [recording, setRecording] = useState(false);
  const [sensitivity, setSensitivity] = useState(50);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState(null);

  const wsRef = useRef(null);
  const settingsRef = useRef({ speak, voice });
  const queueRef = useRef([]);
  const audioRef = useRef(null);
  const turnRef = useRef(null);
  const micRequest = useRef(0);
  const mic = useRef({ stream: null, ctx: null, rec: null, chunks: [], raf: 0, speechAt: 0, quietAt: 0 });
  const sensRef = useRef(sensitivity);
  sensRef.current = sensitivity;
  settingsRef.current = { speak, voice };

  const add = useCallback((entry) => setLog((l) => [...l.slice(-60), { id: `${Date.now()}-${Math.random()}`, ...entry }]), []);
  const send = useCallback((msg) => {
    const ws = wsRef.current;
    if (ws?.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify(msg));
    return true;
  }, []);
  const clearPendingText = useCallback(() => {
    pendingTextRef.current = null;
    setPendingText(null);
  }, []);

  const stopPlayback = useCallback(() => {
    queueRef.current = [];
    if (audioRef.current) {
      const audio = audioRef.current;
      audioRef.current = null;
      audio.onended = audio.onerror = null;
      audio.pause();
      audio.removeAttribute('src');
    }
  }, []);
  const playNext = useCallback(() => {
    if (audioRef.current || !queueRef.current.length) return;
    const chunk = queueRef.current.shift();
    const audio = new Audio(`data:${chunk.mimeType};base64,${chunk.audioBase64}`);
    audioRef.current = audio;
    const done = () => {
      if (audioRef.current !== audio) return;
      audioRef.current = null;
      if (!queueRef.current.length && chunk.last) setAvatar((a) => ({ ...a, state: 'idle', gesture: 'none' }));
      playNext();
    };
    audio.onended = done;
    audio.onerror = done;
    audio.play().catch(() => {
      if (audioRef.current === audio) setError('The browser blocked audio playback. You can still read the reply.');
      done();
    });
  }, []);

  // Barge-in: stop ASH immediately and tell the server to drop the rest of her turn.
  const interrupt = useCallback((type = 'user.speech_start') => {
    turnRef.current = null;
    stopPlayback();
    setAvatar((a) => ({ ...a, state: type === 'user.interrupt' ? 'idle' : 'listening', gesture: 'none' }));
    send({ type });
  }, [send, stopPlayback]);

  useEffect(() => {
    let closed = false;
    let retry = 0;
    let timer;
    const connect = () => {
      const token = localStorage.getItem('sbep_auth_token');
      if (!token) { setStatus('signed out'); return; }
      setStatus(retry ? 'reconnecting' : 'connecting');
      const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/ash-live`, ["ash-live.v1", `auth.${token}`]);
      wsRef.current = ws;
      ws.onmessage = (ev) => {
        if (closed || wsRef.current !== ws) return;
        let m;
        try { m = JSON.parse(ev.data); } catch { return; }
        switch (m.type) {
          case 'session.ready':
            retry = 0; setStatus('connected'); setError(null);
            ws.send(JSON.stringify({ type: 'session.start', surface: 'live', speak: settingsRef.current.speak, voice: settingsRef.current.voice }));
            break;
          case 'avatar.state': setAvatar((a) => ({ ...a, state: m.state === 'idle' && audioRef.current ? 'speaking' : m.state, ...(m.state === 'listening' ? { gesture: 'none' } : {}) })); break;
          case 'avatar.cue': setAvatar((a) => ({ ...a, emotion: m.emotion, gesture: m.gesture })); break;
          case 'transcript.user': {
            const pending = pendingTextRef.current;
            if (pending?.turnId === m.turnId) {
              setText((draft) => draft.trim() === pending.text ? '' : draft);
              clearPendingText();
              stopPlayback();
              turnRef.current = m.turnId;
            }
            add({ role: 'user', text: m.text, voice: m.source === 'voice' });
            break;
          }
          case 'ash.text': add({ role: 'ash', text: m.text, actions: (m.actions ?? []).filter((c) => c.type === 'navigate' && typeof c.path === 'string' && c.path.startsWith('/')), steps: m.steps ?? [] }); break;
          case 'ash.speech':
            if (m.turnId !== turnRef.current || !settingsRef.current.speak) break;
            setAvatar((a) => ({ ...a, state: 'speaking' }));
            queueRef.current.push(m); playNext(); break;
          case 'ash.speech.error': add({ role: 'system', text: `Voice unavailable: ${m.message}` }); break;
          case 'ash.turn.end':
            if (m.interrupted) {
              if (pendingTextRef.current?.turnId === m.turnId) clearPendingText();
              if (turnRef.current === m.turnId) { stopPlayback(); turnRef.current = null; }
              add({ role: 'system', text: 'Interrupted' });
            }
            else if (audioRef.current || queueRef.current.length) setAvatar((a) => ({ ...a, state: 'speaking' }));
            break;
          case 'tasks.snapshot': setTasks(m.tasks); break;
          case 'task.progress':
            setTasks((t) => [m, ...t.filter((x) => x.missionId !== m.missionId)]);
            add({ role: 'system', text: `Mission "${m.goal}": ${m.status.replace(/_/g, ' ')} (${m.stepsDone}/${m.stepsTotal} steps)${m.waitingFor ? ` · needs: ${m.waitingFor}` : ''}` });
            break;
          case 'error':
            if (pendingTextRef.current?.turnId === m.turnId) clearPendingText();
            setError(m.message);
            break;
          default: break;
        }
      };
      ws.onclose = (ev) => {
        if (wsRef.current === ws) wsRef.current = null;
        if (closed) return;
        turnRef.current = null;
        clearPendingText();
        stopPlayback();
        setHandsFree(false);
        setTasks([]);
        setAvatar({ state: 'idle', emotion: 'neutral', gesture: 'none' });
        if (ev.code === 4401) { setStatus('signed out'); return; }
        setStatus('reconnecting');
        retry += 1;
        timer = setTimeout(connect, Math.min(15000, 1000 * 2 ** Math.min(retry, 4)));
      };
    };
    connect();
    return () => { closed = true; clearTimeout(timer); wsRef.current?.close(1000); stopPlayback(); };
  }, [add, playNext, stopPlayback, clearPendingText]);

  useEffect(() => { send({ type: 'session.start', speak, voice }); if (!speak) stopPlayback(); }, [speak, voice, send, stopPlayback]);

  const submitText = (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || pendingTextRef.current) return;
    const turnId = crypto.randomUUID();
    if (!send({ type: 'user.text', text: t, turnId })) return;
    pendingTextRef.current = { turnId, text: t };
    setPendingText(turnId);
    setError(null);
  };

  const sendRecording = useCallback((blob) => {
    if (!blob.size) return;
    if (blob.size > 9_000_000) { setError('That recording is too long. Try a shorter message.'); return; }
    const ws = wsRef.current;
    const reader = new FileReader();
    reader.onload = () => {
      if (!ws || wsRef.current !== ws || ws.readyState !== WebSocket.OPEN) return;
      const turnId = crypto.randomUUID();
      turnRef.current = turnId;
      setError(null);
      send({ type: 'user.audio', audioBase64: String(reader.result).split(',')[1], mimeType: blob.type || 'audio/webm', turnId });
    };
    reader.readAsDataURL(blob);
  }, [send]);

  const startRecorder = useCallback(() => {
    const m = mic.current;
    if (!m.stream || m.rec?.state === 'recording') return;
    const chunks = [];
    const rec = new MediaRecorder(m.stream);
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      if (m.rec !== rec) return;
      if (!m.ctx) { m.stream?.getTracks().forEach((track) => track.stop()); m.stream = null; }
      sendRecording(new Blob(chunks, { type: rec.mimeType }));
    };
    rec.start();
    m.startedAt = performance.now();
    m.rec = rec;
    setRecording(true);
  }, [sendRecording]);
  const stopRecorder = useCallback(() => {
    const m = mic.current;
    if (m.rec?.state === 'recording') m.rec.stop();
    setRecording(false);
  }, []);

  const openMic = useCallback(async () => {
    if (mic.current.stream) return true;
    const request = ++micRequest.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (request !== micRequest.current) { stream.getTracks().forEach((track) => track.stop()); return false; }
      mic.current.stream = stream;
      return true;
    } catch {
      setError('Microphone permission was denied. You can still type to ASH.');
      return false;
    }
  }, []);
  const closeMic = useCallback(() => {
    ++micRequest.current;
    const m = mic.current;
    cancelAnimationFrame(m.raf);
    if (m.rec) m.rec.onstop = null;
    stopRecorder();
    m.ctx?.close().catch(() => {});
    m.stream?.getTracks().forEach((t) => t.stop());
    Object.assign(m, { stream: null, ctx: null, rec: null, speechAt: 0, quietAt: 0 });
    setLevel(0);
  }, [stopRecorder]);

  // Hands-free: simple energy-based voice detection. Speech start interrupts ASH; ~1s of quiet ends the turn.
  useEffect(() => {
    if (status !== 'connected') closeMic();
    return closeMic;
  }, [status, closeMic]);

  useEffect(() => {
    if (!handsFree || status !== 'connected') { closeMic(); return undefined; }
    let cancelled = false;
    (async () => {
      const ready = await openMic();
      if (cancelled) return;
      if (!ready) { setHandsFree(false); return; }
      const m = mic.current;
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      ctx.createMediaStreamSource(m.stream).connect(analyser);
      m.ctx = ctx;
      const data = new Uint8Array(analyser.fftSize);
      let lastMeterAt = 0;
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const v of data) sum += ((v - 128) / 128) ** 2;
        const rms = Math.sqrt(sum / data.length);
        const now = performance.now();
        if (now - lastMeterAt > 100) { setLevel(Math.min(1, rms * 8)); lastMeterAt = now; }
        const threshold = 0.06 - (sensRef.current / 100) * 0.05;
        if (m.rec?.state === 'recording' && now - m.startedAt > 45_000) {
          stopRecorder();
          m.speechAt = 0;
        } else if (rms > threshold) {
          if (!m.speechAt) {
            m.speechAt = now;
            m.confirmed = false;
            startRecorder();
          }
          if (!m.confirmed && now - m.speechAt > 120) {
            m.confirmed = true;
            interrupt();
          }
          m.quietAt = 0;
        } else if (m.rec?.state === 'recording') {
          if (!m.quietAt) m.quietAt = now;
          if (now - m.quietAt > SILENCE_MS) {
            if (m.confirmed && m.quietAt - m.speechAt >= MIN_SPEECH_MS) stopRecorder();
            else { m.rec.onstop = null; stopRecorder(); }
            m.speechAt = 0;
            m.quietAt = 0;
          }
        } else m.speechAt = 0;
        m.raf = requestAnimationFrame(tick);
      };
      tick();
    })();
    return () => { cancelled = true; closeMic(); };
  }, [handsFree, status, openMic, closeMic, interrupt, startRecorder, stopRecorder]);

  const pushToTalk = async () => {
    if (recording) { stopRecorder(); return; }
    if (!(await openMic())) return;
    interrupt();
    startRecorder();
  };

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
        {error && <div className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200" role="alert">{error}</div>}
        <div className="grid lg:grid-cols-[300px_1fr] gap-4">
          <div className="space-y-4">
            <Card>
              <Face {...avatar} />
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                <button type="button" className={recording && !handsFree ? btnPrimary : btn} disabled={!connected || handsFree || !globalThis.MediaRecorder} onClick={pushToTalk}>{recording && !handsFree ? <><Square className="w-3.5 h-3.5" /> Send</> : <><Mic className="w-3.5 h-3.5" /> Push to talk</>}</button>
                <button type="button" className={handsFree ? btnPrimary : btn} disabled={!connected || !globalThis.MediaRecorder || !globalThis.AudioContext} onClick={() => setHandsFree((v) => !v)}>{handsFree ? <><MicOff className="w-3.5 h-3.5" /> Hands-free on</> : <><Mic className="w-3.5 h-3.5" /> Hands-free</>}</button>
                <button type="button" className={btn} disabled={!connected} onClick={() => interrupt('user.interrupt')} aria-label="Stop ASH"><Square className="w-3.5 h-3.5" /> Stop</button>
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
            <div className="flex-1 max-h-[65vh] overflow-y-auto space-y-3 pr-1" data-testid="ash-live-transcript">
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
                      {e.actions?.map((a, i) => <button key={i} type="button" onClick={() => navigate(a.path)} className="mt-1 mr-1 text-[10px] px-2 py-0.5 rounded-full border border-cyan-400/30 text-cyan-200 hover:bg-cyan-400/10">Open {a.path}</button>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <form onSubmit={submitText} className="mt-3 flex gap-2">
              <input className={input} value={text} onChange={(e) => setText(e.target.value)} placeholder={connected ? 'Type to ASH…' : 'Connecting…'} disabled={!connected} maxLength={8000} aria-label="Message ASH" />
              <button type="submit" className={btnPrimary} aria-label="Send message" disabled={!connected || !!pendingText || !text.trim()}><Send className="w-3.5 h-3.5" /></button>
            </form>
          </Card>
        </div>
      </div>
    </AuthLayout>
  );
}
