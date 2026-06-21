import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '@/components/AuthLayout.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { toast } from 'sonner';
import {
  Image, Video, Music, Mic, ChevronDown, Download, Copy,
  Check, Loader2, ExternalLink, Play, Pause, RefreshCw,
  Wand2, Film, ArrowLeft, X, Volume2, Clock, Share2
} from 'lucide-react';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
};

const TABS = [
  { id: 'image', label: 'Image', icon: Image, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/25' },
  { id: 'video', label: 'Video', icon: Video, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/25' },
  { id: 'audio', label: 'Music', icon: Music, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25' },
  { id: 'tts', label: 'Voice', icon: Mic, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/25' },
];

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString();
}

function CredentialCard({ provider, onConnect }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/4 border border-white/8">
      <div>
        <p className="text-sm font-semibold text-white/75">{provider.name}</p>
        <p className="text-xs text-white/35 mt-0.5">{provider.desc}</p>
      </div>
      <a
        href={provider.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/12 hover:bg-primary/22 border border-primary/22 text-primary text-xs font-bold transition-all"
      >
        <ExternalLink className="w-3 h-3" />
        Get Key
      </a>
    </div>
  );
}

function AudioPlayer({ src, label }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/4 border border-white/8">
      <button
        onClick={toggle}
        className="w-8 h-8 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/25 flex items-center justify-center shrink-0 transition-all"
      >
        {playing ? <Pause className="w-3.5 h-3.5 text-emerald-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400 ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/50 font-mono truncate">{label}</p>
        <div className="mt-1 h-1 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500/50 rounded-full transition-all" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
      <audio
        ref={audioRef}
        src={src}
        onEnded={() => { setPlaying(false); setProgress(0); }}
        onTimeUpdate={() => {
          if (audioRef.current) {
            const { currentTime, duration } = audioRef.current;
            if (duration) setProgress(currentTime / duration);
          }
        }}
      />
    </div>
  );
}

function VideoJobTracker({ jobId, prompt, onComplete }) {
  const [status, setStatus] = useState('active');
  const [progress, setProgress] = useState('Initialising…');
  const [mediaUrl, setMediaUrl] = useState(null);
  const [provider, setProvider] = useState('');
  const intervalRef = useRef(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/media-gen/jobs/${jobId}`, { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setProvider(data.provider ?? '');
      if (data.status === 'completed') {
        setStatus('completed');
        setMediaUrl(data.mediaUrl);
        clearInterval(intervalRef.current);
        if (onComplete) onComplete(data);
        toast.success('Video ready!');
      } else if (data.status === 'failed') {
        setStatus('failed');
        clearInterval(intervalRef.current);
        toast.error('Video generation failed');
      } else {
        setProgress(data.progress ?? 'Generating…');
      }
    } catch { /* ignore */ }
  }, [jobId, onComplete]);

  useEffect(() => {
    poll();
    intervalRef.current = setInterval(poll, 5000);
    return () => clearInterval(intervalRef.current);
  }, [poll]);

  if (status === 'completed' && mediaUrl) {
    return (
      <div className="rounded-xl overflow-hidden border border-cyan-500/20 bg-black/60">
        <video src={mediaUrl} controls className="w-full max-h-64 bg-black" />
        <div className="px-3 py-2 flex items-center justify-between">
          <p className="text-xs text-white/40 font-mono truncate">{prompt.slice(0, 50)}</p>
          <a href={mediaUrl} download className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300">
            <Download className="w-3 h-3" /> Download
          </a>
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3">
        <p className="text-sm text-rose-400">Video generation failed.</p>
        <p className="text-xs text-white/35 mt-1">Prompt: {prompt.slice(0, 80)}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-4 flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center shrink-0">
        <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/65">{progress}</p>
        {provider && <p className="text-xs text-white/30 mt-0.5 font-mono">via {provider}</p>}
        <p className="text-xs text-white/25 mt-0.5 truncate">{prompt.slice(0, 60)}</p>
      </div>
    </div>
  );
}

// ─── Gallery tile ─────────────────────────────────────────────────────────────

function MediaTile({ item, onDelete }) {
  const [copied, setCopied] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  const copyUrl = () => {
    navigator.clipboard.writeText(item.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const isDataUri = item.content?.startsWith('data:');
  const isAudio = item.fileType === 'audio';
  const isVideo = item.fileType === 'video';
  const isImage = item.fileType === 'image';

  return (
    <div className="group rounded-xl overflow-hidden border border-white/8 bg-black/40 hover:border-white/15 transition-all">
      {/* Preview area */}
      {isImage && (
        <div className="aspect-video bg-black/60 relative overflow-hidden">
          <img
            src={item.content}
            alt={item.description ?? item.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      {isVideo && (
        <div className="aspect-video bg-black relative overflow-hidden">
          <video src={item.content} className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-black/60 border border-white/20 flex items-center justify-center">
              <Film className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
        </div>
      )}
      {isAudio && (
        <div className="px-3 pt-3">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/4 border border-white/8">
            <button
              onClick={() => {
                if (!audioRef.current) return;
                if (playing) { audioRef.current.pause(); setPlaying(false); }
                else { audioRef.current.play(); setPlaying(true); }
              }}
              className="w-7 h-7 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0"
            >
              {playing ? <Pause className="w-3 h-3 text-emerald-400" /> : <Play className="w-3 h-3 text-emerald-400 ml-0.5" />}
            </button>
            <Volume2 className="w-3.5 h-3.5 text-emerald-400/50 shrink-0" />
            <p className="text-xs text-white/40 font-mono truncate">{item.name}</p>
            <audio ref={audioRef} src={item.content} onEnded={() => setPlaying(false)} />
          </div>
        </div>
      )}

      {/* Meta */}
      <div className="px-3 py-2.5">
        <p className="text-xs text-white/50 truncate font-mono">{item.name}</p>
        {item.description && (
          <p className="text-[10px] text-white/28 mt-0.5 line-clamp-2 leading-relaxed">{item.description}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <p className="text-[9px] text-white/20 font-mono flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {formatTime(item.createdAt)}
          </p>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={copyUrl} title="Copy link" className="p-1 rounded text-white/30 hover:text-white/60 transition-colors">
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
            {!isDataUri && (
              <a href={item.content} download={item.name} title="Download" className="p-1 rounded text-white/30 hover:text-white/60 transition-colors">
                <Download className="w-3 h-3" />
              </a>
            )}
            <button
              disabled
              title="Push to Social — coming soon"
              className="p-1 rounded text-white/15 cursor-not-allowed"
            >
              <Share2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MediaGenPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('image');
  const [gallery, setGallery] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeJobs, setActiveJobs] = useState([]);

  // Per-tab form state
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageStyle, setImageStyle] = useState('photorealistic');
  const [imageResult, setImageResult] = useState(null);

  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoAspect, setVideoAspect] = useState('9:16');
  const [videoDuration, setVideoDuration] = useState(6);
  const [videoNeedsCredentials, setVideoNeedsCredentials] = useState(null);

  const [musicPrompt, setMusicPrompt] = useState('');
  const [musicDuration, setMusicDuration] = useState(30);
  const [musicStyle, setMusicStyle] = useState('');
  const [musicResult, setMusicResult] = useState(null);

  const [ttsText, setTtsText] = useState('');
  const [ttsVoice, setTtsVoice] = useState('warm narrator');
  const [ttsResult, setTtsResult] = useState(null);

  const loadGallery = useCallback(async () => {
    if (!currentUser?.id) return;
    setGalleryLoading(true);
    try {
      const res = await fetch('/api/media-gen/gallery', { headers: authHeaders() });
      if (res.ok) setGallery(await res.json());
    } catch { /* ignore */ } finally {
      setGalleryLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => { loadGallery(); }, [loadGallery]);

  const galleryForTab = gallery.filter(item => {
    if (activeTab === 'image') return item.fileType === 'image';
    if (activeTab === 'video') return item.fileType === 'video';
    if (activeTab === 'audio' || activeTab === 'tts') return item.fileType === 'audio';
    return false;
  });

  // ── Image generation ────────────────────────────────────────────────────────
  const generateImage = async () => {
    if (!imagePrompt.trim()) return;
    setGenerating(true);
    setImageResult(null);
    try {
      const res = await fetch('/api/media-gen/image', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ prompt: imagePrompt, style: imageStyle }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Image generation failed'); return; }
      setImageResult(data);
      loadGallery();
      toast.success('Image generated!');
    } catch { toast.error('Image generation failed'); } finally { setGenerating(false); }
  };

  // ── Video generation ────────────────────────────────────────────────────────
  const generateVideo = async () => {
    if (!videoPrompt.trim()) return;
    setGenerating(true);
    setVideoNeedsCredentials(null);
    try {
      const res = await fetch('/api/media-gen/video', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ prompt: videoPrompt, aspectRatio: videoAspect, durationSeconds: videoDuration }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Video request failed'); return; }
      if (data.status === 'needs_credentials') {
        setVideoNeedsCredentials(data);
        return;
      }
      if (data.status === 'generating' && data.jobId) {
        setActiveJobs(prev => [...prev, { jobId: data.jobId, prompt: videoPrompt, provider: data.provider }]);
        toast.success(`Video queued via ${data.provider}. Generating…`);
      }
    } catch { toast.error('Video request failed'); } finally { setGenerating(false); }
  };

  // ── Music generation ────────────────────────────────────────────────────────
  const generateMusic = async () => {
    if (!musicPrompt.trim()) return;
    setGenerating(true);
    setMusicResult(null);
    try {
      const res = await fetch('/api/media-gen/music', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ prompt: musicPrompt, durationSeconds: musicDuration, style: musicStyle }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Music generation failed'); return; }
      if (data.status === 'needs_credentials') {
        toast.error('Connect ElevenLabs in Connections Hub to generate music');
        navigate('/connections?category=voice-ai');
        return;
      }
      if (data.status === 'success') {
        setMusicResult(data);
        loadGallery();
        toast.success('Music generated!');
      }
    } catch { toast.error('Music generation failed'); } finally { setGenerating(false); }
  };

  // ── TTS generation ──────────────────────────────────────────────────────────
  const generateTts = async () => {
    if (!ttsText.trim()) return;
    setGenerating(true);
    setTtsResult(null);
    try {
      const res = await fetch('/api/media-gen/tts', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ text: ttsText, voice: ttsVoice }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'TTS failed'); return; }
      if (data.status === 'needs_credentials') {
        toast.error('Connect ElevenLabs in Connections Hub for TTS');
        navigate('/connections?category=voice-ai');
        return;
      }
      if (data.status === 'success') {
        setTtsResult(data);
        loadGallery();
        toast.success(`Voiceover ready — ${data.voice}`);
      }
    } catch { toast.error('TTS failed'); } finally { setGenerating(false); }
  };

  const activeTab_ = TABS.find(t => t.id === activeTab);

  return (
    <AuthLayout>
      <div className="min-h-screen bg-[#050507]">

        {/* Top bar */}
        <div className="h-11 flex items-center justify-between px-4 border-b border-white/8 bg-black/80 backdrop-blur-lg sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/builder')}
              className="flex items-center gap-1.5 text-white/40 hover:text-white transition-colors text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Builder
            </button>
            <span className="text-white/20">/</span>
            <div className="flex items-center gap-1.5">
              <Wand2 className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm font-semibold text-white/80">Media Studio</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/workspace')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/8 border border-white/10 text-white/45 text-xs font-mono transition-all"
          >
            Workspace
          </button>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-6">

          {/* Tab bar */}
          <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm whitespace-nowrap transition-all border ${
                    active
                      ? `${tab.bg} ${tab.border} ${tab.color}`
                      : 'bg-transparent border-white/8 text-white/35 hover:text-white/55 hover:border-white/15'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="grid lg:grid-cols-[1fr_320px] gap-6">

            {/* Left: Generator panel */}
            <div>

              {/* ── Image tab ── */}
              {activeTab === 'image' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-mono text-white/35 uppercase tracking-widest mb-2 block">Prompt</label>
                    <textarea
                      value={imagePrompt}
                      onChange={e => setImagePrompt(e.target.value)}
                      placeholder="A futuristic city skyline at sunset, neon reflections on wet streets, cinematic…"
                      rows={4}
                      className="w-full bg-white/4 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/70 placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 resize-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-mono text-white/35 uppercase tracking-widest mb-2 block">Style</label>
                    <select
                      value={imageStyle}
                      onChange={e => setImageStyle(e.target.value)}
                      className="w-full bg-white/4 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white/60 focus:outline-none focus:border-violet-500/40"
                    >
                      {['photorealistic', 'cinematic', 'digital art', 'anime', 'watercolor', 'oil painting', 'minimalist', '3D render'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={generateImage}
                    disabled={generating || !imagePrompt.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
                    Generate Image
                  </button>

                  {imageResult && (
                    <div className="rounded-xl overflow-hidden border border-white/8">
                      <img src={imageResult.url} alt={imageResult.prompt} className="w-full" />
                      <div className="px-3 py-2.5 flex items-center justify-between bg-black/40">
                        <p className="text-xs text-white/35 font-mono truncate">{imageResult.originalPrompt?.slice(0, 50)}</p>
                        <a href={imageResult.url} download className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300">
                          <Download className="w-3 h-3" /> Save
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Video tab ── */}
              {activeTab === 'video' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-mono text-white/35 uppercase tracking-widest mb-2 block">Scene Description</label>
                    <textarea
                      value={videoPrompt}
                      onChange={e => setVideoPrompt(e.target.value)}
                      placeholder="A confident entrepreneur presenting at a conference, professional lighting, business attire…"
                      rows={4}
                      className="w-full bg-white/4 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/70 placeholder:text-white/20 focus:outline-none focus:border-cyan-500/40 resize-none font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-mono text-white/35 uppercase tracking-widest mb-2 block">Aspect Ratio</label>
                      <select
                        value={videoAspect}
                        onChange={e => setVideoAspect(e.target.value)}
                        className="w-full bg-white/4 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/60 focus:outline-none focus:border-cyan-500/40"
                      >
                        <option value="9:16">9:16 (TikTok / Reels)</option>
                        <option value="16:9">16:9 (YouTube / Landscape)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-mono text-white/35 uppercase tracking-widest mb-2 block">Duration</label>
                      <select
                        value={videoDuration}
                        onChange={e => setVideoDuration(Number(e.target.value))}
                        className="w-full bg-white/4 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/60 focus:outline-none focus:border-cyan-500/40"
                      >
                        {[4, 5, 6, 8, 10].map(d => <option key={d} value={d}>{d}s</option>)}
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={generateVideo}
                    disabled={generating || !videoPrompt.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                    Generate Video
                  </button>

                  {videoNeedsCredentials && (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-4 space-y-3">
                      <p className="text-sm text-amber-300 font-semibold">Connect a Video Provider</p>
                      <p className="text-xs text-white/40">{videoNeedsCredentials.message}</p>
                      <div className="space-y-2">
                        {videoNeedsCredentials.providers?.map(p => (
                          <CredentialCard key={p.key} provider={p} />
                        ))}
                      </div>
                      <button
                        onClick={() => navigate('/connections?category=video-ai')}
                        className="w-full py-2 rounded-xl bg-primary/15 hover:bg-primary/25 border border-primary/25 text-primary text-sm font-bold transition-all"
                      >
                        Open Connections Hub →
                      </button>
                    </div>
                  )}

                  {/* Active video jobs */}
                  {activeJobs.length > 0 && (
                    <div className="space-y-2">
                      {activeJobs.map(job => (
                        <VideoJobTracker
                          key={job.jobId}
                          jobId={job.jobId}
                          prompt={job.prompt}
                          onComplete={() => loadGallery()}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Music tab ── */}
              {activeTab === 'audio' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-mono text-white/35 uppercase tracking-widest mb-2 block">Music Description</label>
                    <textarea
                      value={musicPrompt}
                      onChange={e => setMusicPrompt(e.target.value)}
                      placeholder="Upbeat hip-hop instrumental, motivational, fast tempo with heavy bass…"
                      rows={4}
                      className="w-full bg-white/4 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/70 placeholder:text-white/20 focus:outline-none focus:border-emerald-500/40 resize-none font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-mono text-white/35 uppercase tracking-widest mb-2 block">Style</label>
                      <input
                        value={musicStyle}
                        onChange={e => setMusicStyle(e.target.value)}
                        placeholder="hip-hop, ambient, cinematic…"
                        className="w-full bg-white/4 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/60 focus:outline-none focus:border-emerald-500/40 placeholder:text-white/20"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-mono text-white/35 uppercase tracking-widest mb-2 block">Duration</label>
                      <select
                        value={musicDuration}
                        onChange={e => setMusicDuration(Number(e.target.value))}
                        className="w-full bg-white/4 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/60 focus:outline-none focus:border-emerald-500/40"
                      >
                        {[10, 15, 20, 30, 45, 60, 90, 120].map(d => <option key={d} value={d}>{d}s</option>)}
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={generateMusic}
                    disabled={generating || !musicPrompt.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Music className="w-4 h-4" />}
                    Generate Music
                  </button>
                  <p className="text-xs text-white/25 text-center">Powered by ElevenLabs Sound Generation</p>

                  {musicResult && (
                    <div className="space-y-2">
                      <AudioPlayer
                        src={`data:${musicResult.mimeType};base64,${musicResult.audioBase64}`}
                        label={musicResult.prompt?.slice(0, 50)}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ── TTS tab ── */}
              {activeTab === 'tts' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-mono text-white/35 uppercase tracking-widest mb-2 block">Script</label>
                    <textarea
                      value={ttsText}
                      onChange={e => setTtsText(e.target.value)}
                      placeholder="Welcome to our platform. Today we're going to show you how to build an automated income stream that runs 24/7…"
                      rows={6}
                      className="w-full bg-white/4 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/70 placeholder:text-white/20 focus:outline-none focus:border-amber-500/40 resize-none font-mono"
                    />
                    <p className="text-[10px] text-white/20 font-mono mt-1">{ttsText.length}/5000 characters</p>
                  </div>
                  <div>
                    <label className="text-xs font-mono text-white/35 uppercase tracking-widest mb-2 block">Voice Style</label>
                    <select
                      value={ttsVoice}
                      onChange={e => setTtsVoice(e.target.value)}
                      className="w-full bg-white/4 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white/60 focus:outline-none focus:border-amber-500/40"
                    >
                      {['warm narrator', 'professional', 'energetic', 'calm', 'friendly', 'authoritative'].map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={generateTts}
                    disabled={generating || !ttsText.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-300 font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                    Generate Voiceover
                  </button>
                  <p className="text-xs text-white/25 text-center">Ultra-realistic voices via ElevenLabs</p>

                  {ttsResult && (
                    <AudioPlayer
                      src={`data:${ttsResult.mimeType};base64,${ttsResult.audioBase64}`}
                      label={`${ttsResult.voice} — ${ttsResult.characterCount} chars`}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Right: Gallery */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-mono text-white/30 uppercase tracking-widest">
                  Recent {activeTab_?.label}s
                </p>
                <button onClick={loadGallery} className="p-1 rounded text-white/20 hover:text-white/45 transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {galleryLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-4 h-4 animate-spin text-white/25" />
                </div>
              ) : galleryForTab.length === 0 ? (
                <div className="rounded-xl border border-white/6 bg-white/2 px-4 py-8 text-center">
                  {activeTab_ && <activeTab_.icon className={`w-8 h-8 mx-auto mb-3 ${activeTab_.color} opacity-30`} />}
                  <p className="text-sm text-white/30">No {activeTab_?.label?.toLowerCase()}s yet</p>
                  <p className="text-xs text-white/18 mt-1">Generate your first one →</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {galleryForTab.slice(0, 10).map(item => (
                    <MediaTile key={item.id} item={item} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
