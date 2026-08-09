import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Volume2, VolumeX, Mic, Activity, Shield, Cpu, Clock, Wifi } from 'lucide-react';

const authHeaders = () => {
  const t = localStorage.getItem('sbep_auth_token');
  return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : {};
};

/* ── Digital face SVG ───────────────────────────────────────────────── */
function ASHFace({ isTalking, isListening }) {
  const [blinkFrame, setBlinkFrame] = useState(false);

  useEffect(() => {
    const blink = () => setBlinkFrame(true);
    const reset = () => setBlinkFrame(false);
    const schedule = () => {
      const wait = 2500 + Math.random() * 4000;
      const tid = setTimeout(() => {
        blink();
        setTimeout(reset, 160);
        schedule();
      }, wait);
      return tid;
    };
    const id = schedule();
    return () => clearTimeout(id);
  }, []);

  const eyeScaleY = blinkFrame ? 0.05 : 1;

  return (
    <div className="relative mx-auto" style={{ width: 130, height: 130 }}>
      {/* Outer rotating ring */}
      <div className="absolute inset-0 rounded-full pointer-events-none"
        style={{ animation: 'cc-ring-cw 8s linear infinite', border: '1.5px solid rgba(0,200,255,0.5)',
          boxShadow: '0 0 20px rgba(0,200,255,0.3)' }} />
      <div className="absolute inset-2 rounded-full pointer-events-none"
        style={{ animation: 'cc-ring-ccw 12s linear infinite', border: '1px dashed rgba(139,92,246,0.35)' }} />

      {/* Face circle */}
      <div className="absolute inset-4 rounded-full overflow-hidden"
        style={{
          background: 'radial-gradient(ellipse at 40% 30%, #1a2a4a 0%, #0a0f1e 60%, #050810 100%)',
          boxShadow: 'inset 0 0 30px rgba(0,200,255,0.12)',
        }}>

        {/* Skin/face structure */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 102 102" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="skin" cx="45%" cy="38%" r="52%">
              <stop offset="0%"   stopColor="#e8c4a0" />
              <stop offset="40%"  stopColor="#d4a476" />
              <stop offset="80%"  stopColor="#b8895a" />
              <stop offset="100%" stopColor="#8b6545" />
            </radialGradient>
            <radialGradient id="hair" cx="50%" cy="0%" r="75%">
              <stop offset="0%"   stopColor="#2a1f0f" />
              <stop offset="60%"  stopColor="#1a1208" />
              <stop offset="100%" stopColor="#0d0904" />
            </radialGradient>
            <radialGradient id="iris" cx="35%" cy="30%" r="55%">
              <stop offset="0%"  stopColor="#4fc3f7" />
              <stop offset="40%" stopColor="#0288d1" />
              <stop offset="100%" stopColor="#01579b" />
            </radialGradient>
            <radialGradient id="lip" cx="50%" cy="30%" r="60%">
              <stop offset="0%"  stopColor="#e07c8a" />
              <stop offset="100%" stopColor="#c04060" />
            </radialGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="1" result="blur"/>
              <feComposite in="SourceGraphic" in2="blur" operator="over"/>
            </filter>
          </defs>

          {/* Hair */}
          <ellipse cx="51" cy="32" rx="30" ry="28" fill="url(#hair)" />
          <ellipse cx="51" cy="12" rx="26" ry="15" fill="url(#hair)" />
          {/* Side hair */}
          <ellipse cx="22" cy="52" rx="8" ry="22" fill="url(#hair)" />
          <ellipse cx="80" cy="52" rx="8" ry="22" fill="url(#hair)" />

          {/* Neck */}
          <rect x="42" y="88" width="18" height="14" rx="4" fill="url(#skin)" />

          {/* Face */}
          <ellipse cx="51" cy="58" rx="24" ry="30" fill="url(#skin)" />

          {/* Forehead */}
          <ellipse cx="51" cy="38" rx="20" ry="14" fill="url(#skin)" />

          {/* Cheek highlights */}
          <ellipse cx="34" cy="62" rx="6" ry="4" fill="rgba(255,160,140,0.18)" />
          <ellipse cx="68" cy="62" rx="6" ry="4" fill="rgba(255,160,140,0.18)" />

          {/* Eyebrows */}
          <path d="M33 46 Q40 42 47 44" stroke="#3a2510" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M55 44 Q62 42 69 46" stroke="#3a2510" strokeWidth="1.8" fill="none" strokeLinecap="round" />

          {/* Eyes (with blink) */}
          <g style={{ transform: `scaleY(${eyeScaleY})`, transformOrigin: '40px 53px', transition: 'transform 0.08s' }}>
            <ellipse cx="40" cy="53" rx="8" ry="5.5" fill="white" />
            <ellipse cx="40" cy="53" rx="5.5" ry="5" fill="url(#iris)" />
            <circle  cx="40" cy="53" r="3.2" fill="#0a0f1e" />
            <circle  cx="37.5" cy="50.5" r="1.4" fill="white" opacity="0.9" />
            <ellipse cx="40" cy="53" rx="8" ry="5.5" fill="none" stroke="#1a0d08" strokeWidth="0.5" />
          </g>
          <g style={{ transform: `scaleY(${eyeScaleY})`, transformOrigin: '62px 53px', transition: 'transform 0.08s' }}>
            <ellipse cx="62" cy="53" rx="8" ry="5.5" fill="white" />
            <ellipse cx="62" cy="53" rx="5.5" ry="5" fill="url(#iris)" />
            <circle  cx="62" cy="53" r="3.2" fill="#0a0f1e" />
            <circle  cx="59.5" cy="50.5" r="1.4" fill="white" opacity="0.9" />
            <ellipse cx="62" cy="53" rx="8" ry="5.5" fill="none" stroke="#1a0d08" strokeWidth="0.5" />
          </g>
          {/* Upper lashes */}
          <path d="M32 48 L30 45 M36 47 L34 44 M40 47 L40 44 M44 47 L46 44 M48 48 L50 45"
            stroke="#1a0d08" strokeWidth="0.8" strokeLinecap="round" opacity="0.8" />
          <path d="M54 48 L52 45 M58 47 L56 44 M62 47 L62 44 M66 47 L68 44 M70 48 L72 45"
            stroke="#1a0d08" strokeWidth="0.8" strokeLinecap="round" opacity="0.8" />

          {/* Nose */}
          <path d="M48 60 Q51 68 54 60" stroke="#a07050" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <ellipse cx="46" cy="65" rx="2.5" ry="1.5" fill="rgba(100,60,30,0.3)" />
          <ellipse cx="56" cy="65" rx="2.5" ry="1.5" fill="rgba(100,60,30,0.3)" />

          {/* Lips */}
          <path d="M39 73 Q44 71 51 72 Q58 71 63 73" stroke="#d06070" strokeWidth="1" fill="none" />
          <path d="M39 73 Q44 76 51 77 Q58 76 63 73"
            fill="url(#lip)" stroke="none"
            style={{ scaleY: isTalking ? 1.8 : 1, transformOrigin: '51px 73px', transition: 'transform 0.15s ease' }} />
          {isTalking && (
            <ellipse cx="51" cy="77" rx="8" ry="4"
              fill="rgba(20,10,5,0.85)"
              style={{ animation: 'cc-wave 0.3s ease-in-out infinite alternate' }} />
          )}

          {/* AI circuit marks — cyber aesthetic */}
          <path d="M20 51 L28 51" stroke="#00c8ff" strokeWidth="0.6" opacity="0.4" strokeLinecap="round" />
          <path d="M74 51 L82 51" stroke="#00c8ff" strokeWidth="0.6" opacity="0.4" strokeLinecap="round" />
          <circle cx="20" cy="51" r="1.2" fill="#00c8ff" opacity="0.5" />
          <circle cx="82" cy="51" r="1.2" fill="#00c8ff" opacity="0.5" />
        </svg>

        {/* Holographic blue tint overlay */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(180deg, rgba(0,80,200,0.06) 0%, transparent 50%, rgba(0,80,200,0.04) 100%)' }} />

        {/* Scan line */}
        <div className="absolute left-0 right-0 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(0,200,255,0.6), transparent)',
            animation: 'cc-scan 3.5s linear infinite' }} />

        {/* Listening pulse */}
        {isListening && (
          <div className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-ping opacity-40" />
        )}
      </div>

      {/* Talking glow */}
      {isTalking && (
        <div className="absolute inset-0 rounded-full pointer-events-none"
          style={{ animation: 'cc-glow 0.4s ease-in-out infinite',
            boxShadow: '0 0 40px rgba(0,200,255,0.5), 0 0 80px rgba(0,200,255,0.2)' }} />
      )}

      {/* AI badge */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest"
        style={{ background: 'rgba(0,200,255,0.15)', border: '1px solid rgba(0,200,255,0.4)', color: '#00c8ff' }}>
        AI · ACTIVE
      </div>
    </div>
  );
}

/* ── Wave bars ──────────────────────────────────────────────────────── */
function WaveBars({ active }) {
  const heights = [4, 8, 14, 10, 16, 9, 13, 7, 5, 11, 15, 8, 4];
  return (
    <div className="flex items-center justify-center gap-0.5 h-5">
      {heights.map((h, i) => (
        <div key={i} className="rounded-full"
          style={{
            width: 2, height: active ? h : 2,
            background: active ? '#00c8ff' : 'rgba(0,200,255,0.3)',
            transition: 'height 0.2s ease',
            animation: active ? `cc-wave ${0.3 + i * 0.04}s ease-in-out ${i * 0.05}s infinite alternate` : 'none',
            boxShadow: active ? '0 0 4px rgba(0,200,255,0.8)' : 'none',
          }} />
      ))}
    </div>
  );
}

/* ── System status tile ─────────────────────────────────────────────── */
function StatusTile({ label, value, Icon, color, pulse }) {
  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <Icon size={12} style={{ color, flexShrink: 0 }} />
      <span className="text-[9px] text-white/40 uppercase tracking-wider flex-1">{label}</span>
      <div className="flex items-center gap-1">
        {pulse && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />}
        <span className="text-[10px] font-bold font-mono" style={{ color }}>{value}</span>
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────── */
export default function ASHAssistantPanel({ userName = 'Tyler', systemStats }) {
  const [message, setMessage]   = useState('');
  const [reply, setReply]       = useState('All systems operational. How can I assist you today?');
  const [isTalking, setIsTalking] = useState(false);
  const [isListening, setListening] = useState(false);
  const [muted, setMuted]       = useState(false);
  const [sending, setSending]   = useState(false);
  const inputRef                = useRef(null);
  const synthRef                = useRef(null);

  /* Auto-greet on mount */
  useEffect(() => {
    const greeting = `Hello ${userName}. All systems operational. How can I assist you today?`;
    if (!muted) speak(greeting);
    setReply(greeting);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speak = useCallback((text) => {
    if (muted || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate  = 0.95;
    utt.pitch = 1.05;
    utt.volume = 0.9;

    /* Pick a high-quality feminine voice if available */
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      /samantha|victoria|karen|moira|zira|female|woman/i.test(v.name)
    ) ?? voices.find(v => v.lang.startsWith('en')) ?? voices[0];
    if (preferred) utt.voice = preferred;

    utt.onstart = () => setIsTalking(true);
    utt.onend   = () => setIsTalking(false);
    utt.onerror = () => setIsTalking(false);
    window.speechSynthesis.speak(utt);
    synthRef.current = utt;
  }, [muted]);

  const sendMessage = async () => {
    if (!message.trim() || sending) return;
    const text = message.trim();
    setMessage('');
    setSending(true);
    setReply('Processing…');
    try {
      const res = await fetch('/api/ash/chat', {
        method:  'POST',
        headers: authHeaders(),
        body: JSON.stringify({ message: text, context: 'dashboard' }),
      });
      const data = await res.json();
      const resp = data.response ?? data.message ?? data.content ?? 'Understood. Processing your request.';
      setReply(resp);
      speak(resp);
    } catch {
      const fallback = 'I encountered an issue connecting to my core systems. Please try again.';
      setReply(fallback);
      speak(fallback);
    } finally {
      setSending(false);
    }
  };

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
    setIsTalking(false);
  };

  const toggleMute = () => {
    if (!muted) stopSpeaking();
    setMuted(m => !m);
  };

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto" style={{ minWidth: 0 }}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(0,200,255,0.6)' }}>ASH</p>
          <p className="text-xs font-bold text-white/80" style={{ fontFamily: 'monospace', letterSpacing: '0.1em' }}>
            SYSTEM AI ASSISTANT
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[9px] text-green-400/80 uppercase tracking-widest">Online</span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(0,200,255,0.4), transparent)' }} />

      {/* Face */}
      <div className="flex justify-center py-1">
        <ASHFace isTalking={isTalking} isListening={isListening} />
      </div>

      {/* Greeting text */}
      <div className="rounded-xl px-3 py-2.5 text-xs text-white/75 leading-relaxed"
        style={{
          background: 'rgba(0,200,255,0.05)',
          border: '1px solid rgba(0,200,255,0.12)',
          minHeight: 48,
        }}>
        {sending ? (
          <span className="text-cyan-400/60 animate-pulse">Processing your request…</span>
        ) : (
          reply
        )}
      </div>

      {/* Waveform */}
      <div className="flex items-center gap-2">
        <WaveBars active={isTalking} />
        <button onClick={toggleMute} className="ml-auto p-1 rounded transition-all hover:scale-110"
          style={{ color: muted ? 'rgba(255,255,255,0.3)' : 'rgba(0,200,255,0.7)' }}>
          {muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
        </button>
        {isTalking && (
          <button onClick={stopSpeaking} className="text-[9px] text-red-400/70 hover:text-red-400 transition-colors">
            Stop
          </button>
        )}
      </div>
      <p className="text-[8px] text-center uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>
        {isTalking ? 'ASH is speaking…' : 'Click to speak with ASH'}
      </p>

      {/* Chat input */}
      <div className="flex gap-1.5">
        <input
          ref={inputRef}
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Ask ASH anything…"
          className="flex-1 text-xs rounded-lg px-3 py-2 outline-none transition-all"
          style={{
            background: 'rgba(0,200,255,0.06)',
            border: '1px solid rgba(0,200,255,0.2)',
            color: 'rgba(255,255,255,0.85)',
            '::placeholder': { color: 'rgba(255,255,255,0.2)' },
          }} />
        <button onClick={sendMessage} disabled={sending || !message.trim()}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 disabled:opacity-40"
          style={{ background: 'rgba(0,200,255,0.15)', border: '1px solid rgba(0,200,255,0.35)', color: '#00c8ff' }}>
          <Send size={12} />
        </button>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(0,200,255,0.2), transparent)' }} />

      {/* System overview */}
      <div>
        <p className="text-[9px] uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
          System Overview
        </p>
        <div className="space-y-1.5">
          <StatusTile label="System Performance" value="Optimal"  Icon={Activity} color="#22c55e" pulse />
          <StatusTile label="Network Status"     value="Secure"   Icon={Shield}   color="#00c8ff" />
          <StatusTile label="AI Engine"          value="Active"   Icon={Cpu}      color="#8b5cf6" pulse />
          <StatusTile label="Server Uptime"      value="99.99%"   Icon={Clock}    color="#f59e0b" />
          <StatusTile label="Connections"        value={`${systemStats?.totalSystems ?? 0} Active`} Icon={Wifi} color="#22c55e" />
        </div>
      </div>

      {/* View details button */}
      <button
        onClick={() => window.location.href = '/ash-intelligence'}
        className="w-full py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all hover:brightness-125"
        style={{
          background: 'linear-gradient(135deg, rgba(0,200,255,0.12), rgba(139,92,246,0.12))',
          border: '1px solid rgba(0,200,255,0.25)',
          color: 'rgba(0,200,255,0.8)',
        }}>
        View System Details
      </button>
    </div>
  );
}
