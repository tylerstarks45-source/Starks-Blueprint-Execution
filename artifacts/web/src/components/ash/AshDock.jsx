import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Bot, Loader2, Mic, MicOff, Send, Trash2, Volume2, VolumeX, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { authHeaders } from '@/lib/ashApi.js';

const HIDDEN_ON = ['/login', '/signup', '/password-reset', '/verify-email'];
const MAX_STORED = 40;

const store = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* storage blocked or full */ } },
};

const pageLabel = (path) => (path === '/' ? 'home' : path.replace(/^\//, '').split('/')[0].replace(/-/g, ' '));

const forSpeech = (text) => text
  .replace(/```[\s\S]*?```/g, '')
  .replace(/`[^`]+`/g, '')
  .replace(/#{1,6}\s/g, '')
  .replace(/[*_~]/g, '')
  .replace(/https?:\/\/\S+/g, 'link')
  .trim()
  .slice(0, 1200);

// ASH, available on every page. The conversation is kept per user in
// localStorage, so it follows the user across pages and reloads.
export default function AshDock() {
  const { isAuthenticated, currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const storageKey = currentUser?.id ? `ash_dock_${currentUser.id}` : null;

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [speak, setSpeak] = useState(() => store.get('ash_dock_voice') === '1');
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioRef = useRef(null);
  const endRef = useRef(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const speakRef = useRef(speak);
  speakRef.current = speak;
  const ownerRef = useRef(storageKey);
  ownerRef.current = storageKey;

  useEffect(() => {
    if (!storageKey) return;
    try { setMessages(JSON.parse(store.get(storageKey) || '[]')); } catch { setMessages([]); }
  }, [storageKey]);

  useEffect(() => {
    if (storageKey) store.set(storageKey, JSON.stringify(messages.slice(-MAX_STORED)));
  }, [messages, storageKey]);

  useEffect(() => {
    store.set('ash_dock_voice', speak ? '1' : '0');
    if (!speak) audioRef.current?.pause();
  }, [speak]);

  const stopCapture = useCallback(() => {
    const mr = recorderRef.current;
    recorderRef.current = null;
    if (mr) {
      mr.onstop = null;
      if (mr.state !== 'inactive') mr.stop();
      mr.stream?.getTracks().forEach((t) => t.stop());
    }
    audioRef.current?.pause();
    setRecording(false);
  }, []);

  // Never keep the mic or speech running for a different (or no) account.
  useEffect(() => stopCapture, [storageKey, isAuthenticated, stopCapture]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, open, busy]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') { e.preventDefault(); setOpen((o) => !o); }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const say = useCallback(async (text) => {
    const clean = forSpeech(text);
    if (!clean) return;
    try {
      const voice = store.get('sbep_voice_preset') ?? 'warm narrator';
      const res = await fetch('/api/media-gen/tts', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ text: clean, voice }) });
      const data = await res.json();
      if (!speakRef.current) return;
      if (!data.audioBase64) { toast.error(data.message || data.error || 'Voice replies are unavailable right now'); return; }
      audioRef.current?.pause();
      audioRef.current = new Audio(`data:${data.mimeType ?? 'audio/mpeg'};base64,${data.audioBase64}`);
      await audioRef.current.play();
    } catch { /* speech is optional */ }
  }, []);

  const send = useCallback(async (raw) => {
    const text = (raw ?? '').trim();
    if (!text || busy) return;
    const owner = storageKey;
    const page = location.pathname.replace(/[^\w\-/]/g, '') || '/';
    const history = messagesRef.current.slice(-12).map(({ role, content }) => ({ role, content: content.slice(0, 8000) }));
    setMessages((m) => [...m, { role: 'user', content: text, page }]);
    setInput('');
    setBusy(true);
    try {
      const res = await fetch('/api/ash/agent', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ message: text, history, page, surface: 'dock' }) });
      if (ownerRef.current !== owner) return;
      if (res.status === 402) { toast.error('Out of credits — top up to keep talking to ASH'); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ASH is unavailable');
      const calls = data.structuredData?.calls ?? [];
      const actions = [];
      for (const call of calls) {
        if (call.type === 'navigate' && typeof call.path === 'string' && call.path.startsWith('/')) {
          navigate(call.path);
          actions.push({ label: `Opened ${pageLabel(call.path)}`, path: call.path });
        }
      }
      const content = data.content || (actions.length ? 'Done.' : '…');
      setMessages((m) => [...m, { role: 'assistant', content, actions }]);
      // ASH's tools may have created businesses, streams or assets; let open pages refresh.
      window.dispatchEvent(new Event('empire:changed'));
      if (speak) say(content);
    } catch (err) {
      if (ownerRef.current !== owner) return;
      setMessages((m) => [...m, { role: 'assistant', content: `Sorry, I hit a problem: ${err.message}`, error: true }]);
    } finally {
      setBusy(false);
    }
  }, [busy, location.pathname, navigate, say, speak, storageKey]);

  const sendRef = useRef(send);
  sendRef.current = send;
  useEffect(() => {
    const onAsk = (e) => {
      const text = typeof e.detail?.text === 'string' ? e.detail.text : '';
      if (!text) return;
      setOpen(true);
      if (e.detail.send) sendRef.current(text);
      else setInput(text);
    };
    window.addEventListener('ash:ask', onAsk);
    return () => window.removeEventListener('ash:ask', onAsk);
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      const mr = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        const owner = ownerRef.current;
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType });
        setTranscribing(true);
        try {
          const form = new FormData();
          form.append('audio', blob, mime === 'audio/webm' ? 'voice.webm' : 'voice.ogg');
          const res = await fetch('/api/ai-orchestrator/transcribe', {
            method: 'POST',
            headers: { Authorization: `Bearer ${store.get('sbep_auth_token') ?? ''}` },
            body: form,
          });
          const data = await res.json();
          // The account may have changed while transcribing; never send into another user's chat.
          if (ownerRef.current !== owner) return;
          if (data.text) sendRef.current(data.text);
          else toast.error('I couldn\'t hear that — try again or type it');
        } catch {
          toast.error('Transcription failed — please type your message');
        } finally {
          setTranscribing(false);
        }
      };
      mr.start();
      recorderRef.current = mr;
      setRecording(true);
    } catch {
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  };

  if (!isAuthenticated || HIDDEN_ON.some((p) => location.pathname.startsWith(p))) return null;

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Talk to ASH"
          title="Talk to ASH (Ctrl/Cmd+J)"
          className="fixed bottom-5 right-5 z-[60] h-14 w-14 rounded-full flex items-center justify-center text-white shadow-lg border border-cyan-300/30 bg-gradient-to-br from-cyan-500 to-violet-600 hover:scale-105 transition-transform"
          style={{ boxShadow: '0 0 24px rgba(0,200,255,0.45)' }}
        >
          <Bot className="w-6 h-6" />
          {busy && <span className="absolute inset-0 rounded-full border-2 border-cyan-200/60 animate-ping" />}
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="ASH assistant"
          className="fixed bottom-5 right-5 z-[60] w-[calc(100vw-2.5rem)] sm:w-[380px] h-[min(560px,calc(100vh-2.5rem))] flex flex-col rounded-2xl border border-cyan-400/20 bg-[rgba(4,10,28,0.97)] backdrop-blur-xl shadow-2xl"
        >
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/10">
            <div className="h-8 w-8 rounded-full flex items-center justify-center bg-gradient-to-br from-cyan-500 to-violet-600">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white">ASH</div>
              <div className="text-[10px] text-white/40 truncate">
                {busy ? 'Thinking…' : recording ? 'Listening…' : transcribing ? 'Transcribing…' : `With you on ${pageLabel(location.pathname)}`}
              </div>
            </div>
            <button type="button" onClick={() => setSpeak((s) => !s)} aria-label={speak ? 'Mute ASH voice' : 'Let ASH speak replies'} title={speak ? 'Voice replies on' : 'Voice replies off'} className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10">
              {speak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button type="button" onClick={() => setMessages([])} aria-label="Clear conversation" title="Clear conversation" className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10">
              <Trash2 className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close ASH" className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-white/45 text-xs mt-10 px-6 leading-relaxed">
                Hi{currentUser?.name ? ` ${currentUser.name.split(' ')[0]}` : ''}, I'm ASH. Ask me anything or give me a command —
                “take me to my stats”, “how are my businesses doing?”, “research AI service ideas”. I'll follow you from page to page.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className={[
                  'max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words',
                  m.role === 'user' ? 'bg-cyan-500/20 text-white border border-cyan-400/20' : m.error ? 'bg-red-500/10 text-red-200 border border-red-400/20' : 'bg-white/5 text-white/90 border border-white/10',
                ].join(' ')}>
                  {m.content}
                  {m.actions?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.actions.map((a, j) => (
                        <button key={j} type="button" onClick={() => navigate(a.path)} className="text-[10px] px-2 py-0.5 rounded-full border border-cyan-400/30 text-cyan-200 hover:bg-cyan-400/10">
                          {a.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-2 text-white/40 text-xs"><Loader2 className="w-3.5 h-3.5 animate-spin" /> ASH is working…</div>
            )}
            <div ref={endRef} />
          </div>

          <form
            className="flex items-end gap-2 p-2.5 border-t border-white/10"
            onSubmit={(e) => { e.preventDefault(); send(input); }}
          >
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              disabled={busy || transcribing}
              aria-label={recording ? 'Stop recording' : 'Speak to ASH'}
              className={[
                'h-10 w-10 shrink-0 rounded-xl flex items-center justify-center border transition-colors disabled:opacity-40',
                recording ? 'bg-red-500/80 border-red-300/50 text-white animate-pulse' : 'border-white/10 text-white/70 hover:text-white hover:bg-white/10',
              ].join(' ')}
            >
              {transcribing ? <Loader2 className="w-4 h-4 animate-spin" /> : recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
              rows={1}
              maxLength={8000}
              placeholder="Type to ASH…"
              aria-label="Message ASH"
              className="flex-1 resize-none max-h-28 rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400/40"
            />
            <button type="submit" disabled={busy || !input.trim()} aria-label="Send" className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center bg-cyan-500/80 text-white hover:bg-cyan-500 disabled:opacity-40">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
