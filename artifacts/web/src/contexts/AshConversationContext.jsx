import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import { appendEntry, clearLog, historyForTurn, restoreLog, saveLog } from '@/lib/ashConversationHistory.js';

const AshConversationContext = createContext(null);

export function useAshConversation() {
  return useContext(AshConversationContext);
}

const SILENCE_MS = 900;
const MIN_SPEECH_MS = 300;
const PREROLL_FRAMES = 20;
const FRAME_MS = 20;
const VOICE_WINDOW_FRAMES = 600 / FRAME_MS;
const MIN_WINDOW_VOICE_MS = 260;
export const ASH_VOICES = ['nova', 'shimmer', 'coral', 'sage', 'alloy', 'ash', 'echo', 'fable', 'onyx'];
const voiceKey = (ownerId) => `ash_voice_${ownerId}`;

function restoreVoice(ownerId) {
  try {
    const saved = ownerId && JSON.parse(localStorage.getItem(voiceKey(ownerId)));
    return { speak: saved?.speak === true, voice: ASH_VOICES.includes(saved?.voice) ? saved.voice : 'nova' };
  } catch {
    return { speak: false, voice: 'nova' };
  }
}

function canAttemptConnection(token) {
  if (!token) return false;
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(payload));
    return typeof exp !== 'number' || Date.now() < exp * 1000;
  } catch {
    return false;
  }
}

function wavAudio(frames, sampleRate) {
  const samples = frames.reduce((total, frame) => total + frame.length, 0);
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const tag = (offset, text) => Array.from(text).forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  tag(0, 'RIFF');
  view.setUint32(4, 36 + samples * 2, true);
  tag(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  tag(36, 'data');
  view.setUint32(40, samples * 2, true);
  return new Blob([header, ...frames], { type: 'audio/wav' });
}

function AshSession({ ownerId, available, path, children }) {
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState(false);
  const [dockOpen, setDockOpen] = useState(false);
  const active = enabled && available;
  const [status, setStatus] = useState('off');
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const [avatar, setAvatar] = useState({ state: 'idle', emotion: 'neutral', gesture: 'none' });
  const [log, setLog] = useState(() => restoreLog(ownerId));
  const [tasks, setTasks] = useState([]);
  const [text, setText] = useState('');
  const [pendingText, setPendingText] = useState(null);
  const pendingTextRef = useRef(null);
  const queuedPrompt = useRef(null);
  const [{ speak, voice }, setVoiceSettings] = useState(() => restoreVoice(ownerId));
  const setSpeak = (value) => setVoiceSettings((settings) => ({ ...settings, speak: value }));
  const setVoice = (value) => setVoiceSettings((settings) => ({ ...settings, voice: value }));
  const [handsFree, setHandsFree] = useState(false);
  const [recording, setRecording] = useState(false);
  const [sensitivity, setSensitivity] = useState(50);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState(null);
  const [speech, setSpeech] = useState(null);
  const logRef = useRef(log);
  logRef.current = log;
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const wsRef = useRef(null);
  const readyRef = useRef(false);
  const settingsRef = useRef({ speak, voice });
  const queueRef = useRef([]);
  const audioRef = useRef(null);
  const turnRef = useRef(null);
  const micRequest = useRef(0);
  const mic = useRef({ stream: null, ctx: null, rec: null, worklet: null });
  const sensRef = useRef(sensitivity);
  sensRef.current = sensitivity;
  settingsRef.current = { speak, voice, page: path, surface: path === '/ash-live' ? 'live' : 'web' };

  useEffect(() => saveLog(ownerId, log), [ownerId, log]);
  useEffect(() => {
    if (!ownerId) return;
    try { localStorage.setItem(voiceKey(ownerId), JSON.stringify({ speak, voice })); } catch { /* Storage unavailable. */ }
  }, [ownerId, speak, voice]);
  const add = useCallback((entry) => {
    const item = { id: crypto.randomUUID(), ...entry };
    setLog((log) => appendEntry(log, item));
  }, []);
  const send = useCallback((msg) => {
    const ws = wsRef.current;
    if (!readyRef.current || ws?.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify(msg));
    return true;
  }, []);
  const clearPendingText = useCallback(() => {
    pendingTextRef.current = null;
    setPendingText(null);
  }, []);

  const stopPlayback = useCallback(() => {
    queueRef.current = [];
    setSpeech(null);
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
    setSpeech({ turnId: chunk.turnId, audio });
    const done = () => {
      if (audioRef.current !== audio) return;
      audioRef.current = null;
      setSpeech(null);
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
    if (!active) { setStatus('off'); setHandsFree(false); return undefined; }
    let closed = false;
    let retry = 0;
    let timer;
    const connect = () => {
      const token = localStorage.getItem('sbep_auth_token');
      if (!canAttemptConnection(token)) { setStatus('signed out'); return; }
      setStatus(retry ? 'reconnecting' : 'connecting');
      const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/ash-live`, ["ash-live.v1", `auth.${token}`]);
      wsRef.current = ws;
      ws.onmessage = (ev) => {
        if (closed || wsRef.current !== ws) return;
        let m;
        try { m = JSON.parse(ev.data); } catch { return; }
        switch (m.type) {
          case 'session.ready':
            readyRef.current = true;
            retry = 0; setStatus('connected'); setError(null);
            ws.send(JSON.stringify({ type: 'session.start', ...settingsRef.current, history: historyForTurn(logRef.current) }));
            break;
          case 'session.cleared':
            stopPlayback(); clearLog(ownerId); setLog([]); setText(''); clearPendingText(); turnRef.current = null; setError(null);
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
          case 'ash.text': {
            const actions = (m.actions ?? []).filter((c) => c.type === 'navigate' && typeof c.path === 'string' && /^\/[\w-]/.test(c.path));
            add({ role: 'ash', text: m.text, actions, steps: m.steps ?? [] });
            if (actions.length) navigateRef.current(actions[0].path);
            window.dispatchEvent(new Event('empire:changed'));
            break;
          }
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
        if (wsRef.current === ws) { wsRef.current = null; readyRef.current = false; }
        if (closed) return;
        turnRef.current = null;
        clearPendingText();
        stopPlayback();
        setHandsFree(false);
        setTasks([]);
        setAvatar({ state: 'idle', emotion: 'neutral', gesture: 'none' });
        if (ev.code === 4401 || !canAttemptConnection(localStorage.getItem('sbep_auth_token'))) { setStatus('signed out'); return; }
        retry += 1;
        if (retry > 6) {
          setStatus('disconnected');
          setError('ASH Live could not connect. Retry the connection or sign in again.');
          return;
        }
        setStatus('reconnecting');
        timer = setTimeout(connect, Math.min(15000, 1000 * 2 ** Math.min(retry, 4)));
      };
    };
    connect();
    return () => {
      closed = true;
      clearTimeout(timer);
      const ws = wsRef.current;
      wsRef.current = null;
      readyRef.current = false;
      ws?.close(1000);
      turnRef.current = null;
      clearPendingText();
      stopPlayback();
    };
  }, [active, add, playNext, stopPlayback, clearPendingText, connectionAttempt, ownerId]);

  useEffect(() => { if (status === 'connected') send({ type: 'session.start', ...settingsRef.current }); }, [path, speak, voice, send, status]);
  useEffect(() => { if (!speak) stopPlayback(); }, [speak, stopPlayback]);

  const sendText = useCallback((value) => {
    const t = value.trim().slice(0, 8000);
    if (!t || pendingTextRef.current) return false;
    const turnId = crypto.randomUUID();
    if (!send({ type: 'user.text', text: t, turnId })) return false;
    pendingTextRef.current = { turnId, text: t };
    setPendingText(turnId);
    setError(null);
    return true;
  }, [send]);
  const submitText = (e) => { e.preventDefault(); sendText(text); };

  const sendRecording = useCallback((blob) => {
    if (!blob.size) return;
    if (blob.size > 9_000_000) { setError('That recording is too long. Try a shorter message.'); return; }
    const ws = wsRef.current;
    const request = micRequest.current;
    const reader = new FileReader();
    reader.onload = () => {
      if (request !== micRequest.current || !ws || wsRef.current !== ws || ws.readyState !== WebSocket.OPEN) return;
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
    m.worklet?.port.close();
    m.worklet?.disconnect();
    if (m.rec) m.rec.onstop = null;
    stopRecorder();
    m.ctx?.close().catch(() => {});
    m.stream?.getTracks().forEach((t) => t.stop());
    Object.assign(m, { stream: null, ctx: null, rec: null, worklet: null });
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
      try {
        const ctx = new AudioContext();
        m.ctx = ctx;
        await ctx.resume();
        const { sampleRate } = ctx;
        const maxUtteranceMs = Math.min(45_000, Math.floor(4_000_000 / (sampleRate * 2) * 1000));
        await ctx.audioWorklet.addModule(new URL('../lib/ashLiveMic.worklet.js', import.meta.url));
        if (cancelled) return;
        const worklet = new AudioWorkletNode(ctx, 'ash-live-mic', { channelCount: 1, channelCountMode: 'explicit' });
        m.worklet = worklet;
        ctx.createMediaStreamSource(m.stream).connect(worklet);
        worklet.connect(ctx.destination); // The processor emits silence; keep the graph live.
        const preRoll = [];
        let frames = null;
        let elapsedMs = 0;
        let quietMs = 0;
        let sustainedVoiceMs = 0;
        const voiceWindow = new Uint8Array(VOICE_WINDOW_FRAMES);
        let windowVoiceMs = 0;
        let windowIndex = 0;
        let confirmed = false;
        let meterFrames = 0;
        worklet.port.onmessage = ({ data: { pcm, rms } }) => {
          if (cancelled) return;
          if (++meterFrames % 5 === 0) setLevel(Math.min(1, rms * 8));
          const audible = rms > 0.06 - (sensRef.current / 100) * 0.05;
          if (!frames && audible) {
            frames = [...preRoll];
            elapsedMs = quietMs = sustainedVoiceMs = 0;
            voiceWindow.fill(0);
            windowVoiceMs = windowIndex = 0;
            confirmed = false;
            setRecording(true);
          }
          preRoll.push(pcm);
          if (preRoll.length > PREROLL_FRAMES) preRoll.shift();
          if (!frames) return;
          frames.push(pcm);
          elapsedMs += FRAME_MS;
          quietMs = audible ? 0 : quietMs + FRAME_MS;
          sustainedVoiceMs = audible ? sustainedVoiceMs + FRAME_MS : 0;
          if (!confirmed) {
            const voiced = audible ? FRAME_MS : 0;
            windowVoiceMs += voiced - voiceWindow[windowIndex];
            voiceWindow[windowIndex] = voiced;
            windowIndex = (windowIndex + 1) % voiceWindow.length;
            // Allow short gaps in speech, but not isolated sounds spread over the recording.
            if (sustainedVoiceMs >= 120 || windowVoiceMs >= MIN_WINDOW_VOICE_MS) {
              confirmed = true;
              interrupt();
            }
          }
          if (quietMs >= SILENCE_MS || elapsedMs >= maxUtteranceMs) {
            if (confirmed && elapsedMs - quietMs >= MIN_SPEECH_MS) sendRecording(wavAudio(frames, sampleRate));
            frames = null;
            preRoll.length = 0;
            setRecording(false);
          }
        };
      } catch {
        if (!cancelled) {
          setError('Hands-free audio is unavailable. You can still use push to talk or type.');
          setHandsFree(false);
        }
      }
    })();
    return () => { cancelled = true; closeMic(); };
  }, [handsFree, status, openMic, closeMic, interrupt, sendRecording]);

  const pushToTalk = async () => {
    if (recording) { stopRecorder(); return; }
    if (!(await openMic())) return;
    interrupt();
    startRecorder();
  };

  const pauseMic = useCallback(() => { setHandsFree(false); closeMic(); }, [closeMic]);
  const enable = useCallback(() => { if (available) setEnabled(true); }, [available]);
  const openDock = useCallback(() => {
    if (!available) return;
    setDockOpen(true);
  }, [available]);
  const closeDock = useCallback(() => {
    queuedPrompt.current = null;
    setDockOpen(false);
    pauseMic();
  }, [pauseMic]);
  const disable = useCallback(() => {
    queuedPrompt.current = null;
    pauseMic();
    interrupt('user.interrupt');
    setDockOpen(false);
    setEnabled(false);
    setError(null);
    setTasks([]);
    setAvatar({ state: 'idle', emotion: 'neutral', gesture: 'none' });
  }, [pauseMic, interrupt]);
  const clear = () => {
    queuedPrompt.current = null;
    pauseMic();
    if (!send({ type: 'session.clear' })) {
      stopPlayback();
      clearLog(ownerId);
      setLog([]);
      setText('');
      setError(null);
    }
  };
  useEffect(() => {
    if (status !== 'connected' || !queuedPrompt.current) return;
    const prompt = queuedPrompt.current;
    queuedPrompt.current = null;
    sendText(prompt);
  }, [status, sendText]);
  useEffect(() => {
    if (!available) return undefined;
    const ask = (event) => {
      const prompt = typeof event.detail?.text === 'string' ? event.detail.text.slice(0, 8000) : '';
      if (!prompt) return;
      openDock();
      setText(prompt);
      queuedPrompt.current = event.detail.send && !sendText(prompt) && !readyRef.current ? prompt : null;
    };
    window.addEventListener('ash:ask', ask);
    return () => window.removeEventListener('ash:ask', ask);
  }, [available, openDock, sendText]);
  return (
    <AshConversationContext.Provider value={{
      available, enabled: active, enable, disable, dockOpen, openDock, closeDock, pauseMic,
      status, retry: () => setConnectionAttempt((n) => n + 1), avatar, speech, log, tasks,
      text, setText, submitText, pendingText, clear, speak, setSpeak, voice, setVoice,
      handsFree, setHandsFree, recording, sensitivity, setSensitivity, level, error, pushToTalk, interrupt,
    }}>
      {children}
    </AshConversationContext.Provider>
  );
}

export function AshConversationProvider({ children }) {
  const { isAuthenticated, currentUser } = useAuth();
  const { pathname } = useLocation();
  const ownerId = isAuthenticated && currentUser?.id ? String(currentUser.id) : null;
  const available = !!ownerId && !/^\/(login|signup|password-reset|reset-password|verify-email)(\/|$)/.test(pathname);
  const path = pathname.replace(/[^\w\-/]/g, '').slice(0, 200) || '/';
  return <AshSession key={ownerId ?? 'guest'} ownerId={ownerId} available={available} path={path}>{children}</AshSession>;
}
