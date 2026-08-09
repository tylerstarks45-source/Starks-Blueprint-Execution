import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Volume2, VolumeX, ChevronRight } from 'lucide-react';
import ashFaceUrl from '@/assets/ash-face.jpg';

const authHeaders = () => {
  const t = localStorage.getItem('sbep_auth_token');
  return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : {};
};

/* ── Waveform bars ───────────────────────────────────────────────────── */
function WaveBars({ active }) {
  const h = [3,6,11,8,14,7,12,5,4,10,14,7,3];
  return (
    <div className="flex items-center gap-px h-4">
      {h.map((v, i) => (
        <div key={i} className="rounded-full transition-all"
          style={{
            width: 2.5,
            height: active ? v : 2,
            background: active ? '#00c8ff' : 'rgba(0,200,255,0.3)',
            boxShadow: active ? '0 0 4px #00c8ff' : 'none',
            animation: active ? `cc-wave ${0.28 + i * 0.04}s ease-in-out ${i * 0.04}s infinite alternate` : 'none',
          }} />
      ))}
    </div>
  );
}

/* ── Stat tile ───────────────────────────────────────────────────────── */
function StatusRow({ label, value, color = '#22c55e', pulse = false }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: color, boxShadow: `0 0 5px ${color}`, animation: pulse ? 'cc-glow 1.5s ease-in-out infinite' : 'none' }} />
        <span className="text-[10px] text-white/50 uppercase tracking-wide">{label}</span>
      </div>
      <span className="text-[10px] font-bold font-mono" style={{ color }}>{value}</span>
    </div>
  );
}

/* ── Main panel ──────────────────────────────────────────────────────── */
export default function ASHAssistantPanel({ userName = 'Tyler', systemStats }) {
  const [message,   setMessage]   = useState('');
  const [reply,     setReply]     = useState('');
  const [talking,   setTalking]   = useState(false);
  const [muted,     setMuted]     = useState(false);
  const [sending,   setSending]   = useState(false);
  const [scanPos,   setScanPos]   = useState(0);
  const scanRef                   = useRef(null);
  const greeted                   = useRef(false);

  /* Scan line animation */
  useEffect(() => {
    let pos = 0;
    const id = setInterval(() => {
      pos = (pos + 0.8) % 110;
      setScanPos(pos);
    }, 20);
    return () => clearInterval(id);
  }, []);

  /* Voice */
  const speak = useCallback((text) => {
    if (muted || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.94; utt.pitch = 1.08; utt.volume = 0.9;
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find(v => /samantha|victoria|karen|moira|zira/i.test(v.name))
           ?? voices.find(v => v.lang.startsWith('en')) ?? voices[0];
    if (v) utt.voice = v;
    utt.onstart = () => setTalking(true);
    utt.onend   = () => setTalking(false);
    utt.onerror = () => setTalking(false);
    window.speechSynthesis.speak(utt);
  }, [muted]);

  /* Greeting */
  useEffect(() => {
    if (greeted.current) return;
    greeted.current = true;
    const greeting = `Hello ${userName}. All systems operational. How can I assist you today?`;
    setReply(greeting);
    setTimeout(() => speak(greeting), 800);
  }, [userName, speak]);

  const send = async () => {
    if (!message.trim() || sending) return;
    const txt = message.trim();
    setMessage('');
    setSending(true);
    setReply('Processing…');
    try {
      const res  = await fetch('/api/ash/chat', {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ message: txt, context: 'dashboard' }),
      });
      const data = await res.json();
      const r    = data.response ?? data.message ?? data.content ?? 'Understood. Processing your request.';
      setReply(r);
      speak(r);
    } catch {
      const fb = 'Connection to core systems interrupted. Please try again.';
      setReply(fb); speak(fb);
    } finally { setSending(false); }
  };

  return (
    <div className="flex flex-col h-full gap-3 overflow-y-auto" style={{ minWidth: 0 }}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] uppercase tracking-[0.25em]" style={{ color: 'rgba(0,200,255,0.55)' }}>ASH</p>
          <p className="text-[11px] font-bold tracking-[0.12em] text-white/80" style={{ fontFamily: 'monospace' }}>SYSTEM AI ASSISTANT</p>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full"
          style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[8px] text-green-400 font-bold uppercase tracking-wider">Active</span>
        </div>
      </div>

      <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(0,200,255,0.5), transparent)' }} />

      {/* Face display */}
      <div className="relative mx-auto shrink-0" style={{ width: 148, height: 148 }}>
        {/* Rotating outer rings */}
        <div className="absolute inset-0 rounded-full pointer-events-none"
          style={{ animation: 'cc-ring-cw 7s linear infinite',
            border: '1.5px solid rgba(0,200,255,0.55)',
            boxShadow: '0 0 18px rgba(0,200,255,0.35), inset 0 0 18px rgba(0,200,255,0.08)' }} />
        <div className="absolute inset-3 rounded-full pointer-events-none"
          style={{ animation: 'cc-ring-ccw 11s linear infinite',
            border: '1px dashed rgba(139,92,246,0.4)' }} />

        {/* Face image */}
        <div className="absolute inset-5 rounded-full overflow-hidden"
          style={{ boxShadow: 'inset 0 0 20px rgba(0,0,0,0.6)' }}>
          <img
            src={ashFaceUrl}
            alt="ASH AI"
            className="w-full h-full object-cover object-top"
            style={{ filter: talking ? 'brightness(1.12) saturate(1.1)' : 'brightness(0.95)' }}
          />
          {/* Holographic tint overlay */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(180deg, rgba(0,60,200,0.08) 0%, transparent 50%, rgba(0,100,255,0.06) 100%)',
              mixBlendMode: 'screen' }} />
          {/* Scan line */}
          <div className="absolute left-0 right-0 h-px pointer-events-none"
            style={{ top: `${scanPos}%`,
              background: 'linear-gradient(90deg, transparent, rgba(0,200,255,0.5), transparent)',
              opacity: 0.6 }} />
          {/* Talking glow on face */}
          {talking && (
            <div className="absolute inset-0 pointer-events-none rounded-full"
              style={{ background: 'rgba(0,200,255,0.06)', animation: 'cc-glow 0.35s ease-in-out infinite' }} />
          )}
        </div>

        {/* AI badge */}
        <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[7px] font-bold uppercase tracking-widest whitespace-nowrap"
          style={{ background:'rgba(0,200,255,0.12)', border:'1px solid rgba(0,200,255,0.4)', color:'#00c8ff' }}>
          AI · ONLINE
        </div>
      </div>

      {/* Greeting / reply */}
      <div className="rounded-xl px-3 py-2.5 text-[11px] text-white/75 leading-relaxed relative"
        style={{ background:'rgba(0,200,255,0.05)', border:'1px solid rgba(0,200,255,0.1)', minHeight: 54 }}>
        {sending ? (
          <span className="text-cyan-400/60 animate-pulse">Processing…</span>
        ) : (
          <>
            <span className="font-semibold text-white/85">Hello, {userName}.</span><br />
            <span>{reply || 'All systems operational. How can I assist you today?'}</span>
          </>
        )}
      </div>

      {/* Waveform + mute */}
      <div className="flex items-center gap-2">
        <WaveBars active={talking} />
        <span className="text-[8px] text-white/25 flex-1 uppercase tracking-widest">
          {talking ? 'Speaking…' : 'Click to speak with ASH'}
        </span>
        <button onClick={() => { if (!muted) window.speechSynthesis?.cancel(); setMuted(m => !m); }}
          className="p-1 rounded transition-all hover:scale-110"
          style={{ color: muted ? 'rgba(255,255,255,0.2)' : 'rgba(0,200,255,0.7)' }}>
          {muted ? <VolumeX size={11} /> : <Volume2 size={11} />}
        </button>
      </div>

      {/* Chat input */}
      <div className="flex gap-1.5">
        <input
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask ASH anything…"
          className="flex-1 text-[11px] rounded-lg px-3 py-2 outline-none"
          style={{ background:'rgba(0,200,255,0.06)', border:'1px solid rgba(0,200,255,0.18)',
            color:'rgba(255,255,255,0.85)', caretColor:'#00c8ff' }}
        />
        <button onClick={send} disabled={sending || !message.trim()}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 disabled:opacity-30"
          style={{ background:'rgba(0,200,255,0.14)', border:'1px solid rgba(0,200,255,0.35)', color:'#00c8ff' }}>
          <Send size={12} />
        </button>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(0,200,255,0.18), transparent)' }} />

      {/* System Overview */}
      <div>
        <p className="text-[8px] uppercase tracking-[0.22em] mb-1.5" style={{ color:'rgba(255,255,255,0.28)' }}>
          System Overview
        </p>
        <div className="divide-y" style={{ borderColor:'rgba(255,255,255,0.04)' }}>
          <StatusRow label="System Performance" value="Optimal"  color="#22c55e" pulse />
          <StatusRow label="Network Status"     value="Secure"   color="#00c8ff" />
          <StatusRow label="AI Engine"          value="Active"   color="#8b5cf6" pulse />
          <StatusRow label="Server Uptime"      value="99.99%"   color="#f59e0b" />
        </div>
      </div>

      {/* View details */}
      <button onClick={() => window.location.href = '/ash-intelligence'}
        className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all hover:brightness-125 mt-auto"
        style={{ background:'linear-gradient(135deg,rgba(0,200,255,0.1),rgba(139,92,246,0.1))',
          border:'1px solid rgba(0,200,255,0.22)', color:'rgba(0,200,255,0.75)' }}>
        View System Details <ChevronRight size={10} />
      </button>
    </div>
  );
}
