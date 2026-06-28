import React, { useState, useEffect, useRef } from 'react';
import { Trophy, X, Twitter, Linkedin, Copy, Check, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const MILESTONE_THRESHOLDS = [
  { cents: 10000000, label: '$100,000' },
  { cents: 5000000,  label: '$50,000' },
  { cents: 1000000,  label: '$10,000' },
  { cents: 500000,   label: '$5,000' },
  { cents: 100000,   label: '$1,000' },
  { cents: 50000,    label: '$500' },
  { cents: 10000,    label: '$100' },
  { cents: 100,      label: '$1' },
];

const CONFETTI_COLORS = ['#a78bfa', '#38bdf8', '#34d399', '#fbbf24', '#f472b6', '#fb923c'];
const PARTICLE_COUNT = 60;

function extractLabel(notification) {
  if (!notification) return 'a milestone';

  let parsed = null;
  try { parsed = JSON.parse(notification.message ?? '{}'); } catch {}
  if (parsed?.amount) {
    const match = MILESTONE_THRESHOLDS.find(t => t.cents === parsed.amount);
    if (match) return match.label;
  }

  const fromTitle = notification.title?.match(/\$([\d,.]+[KkMm]?)/)?.[0];
  if (fromTitle) return fromTitle;

  const fromMsg = notification.message?.match(/\$([\d,.]+[KkMm]?)/)?.[0];
  if (fromMsg) return fromMsg;

  return 'a milestone';
}

function Confetti({ active, seed }) {
  const particles = useRef([]);

  if (particles.current.length === 0 || particles.current[0].__seed !== seed) {
    particles.current = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      __seed: seed,
      id: i,
      x: 5 + Math.random() * 90,
      delay: Math.random() * 0.9,
      dur: 2 + Math.random() * 1.5,
      size: 4 + Math.random() * 7,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      rotate0: Math.floor(Math.random() * 90),
      rotateEnd: 360 + Math.floor(Math.random() * 720),
      shape: i % 3 === 0 ? 'circle' : i % 3 === 1 ? 'rect' : 'diamond',
    }));
  }

  if (!active) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9998] overflow-hidden">
      {particles.current.map(p => (
        <div
          key={p.id}
          className="absolute top-0"
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.shape === 'circle' ? '50%' : '1px',
            animation: `confettiDrop_${p.id % 6} ${p.dur}s ${p.delay}s ease-in both`,
          }}
        />
      ))}
      <style>{`
        ${particles.current.map(p => `
          @keyframes confettiDrop_${p.id % 6} {
            0%   { transform: translateY(-10px) rotate(${p.rotate0}deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(${p.rotateEnd}deg); opacity: 0; }
          }
        `).join('')}
      `}</style>
    </div>
  );
}

export default function MilestoneCelebrationModal({ notifications = [], onDismiss }) {
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);
  const [shownId, setShownId] = useState(null);

  const unreadMilestones = notifications.filter(
    n => n.notificationType === 'milestone_reached' && !n.read
  );
  const latest = unreadMilestones[0] ?? null;

  useEffect(() => {
    if (latest && latest.id !== shownId) {
      setVisible(false);
      const t = setTimeout(() => {
        setShownId(latest.id);
        setVisible(true);
      }, 300);
      return () => clearTimeout(t);
    }
    if (!latest) {
      setVisible(false);
      setShownId(null);
    }
  }, [latest?.id]);

  if (!latest || !visible) return null;

  const label = extractLabel(latest);

  const shareText = `🚀 I just hit ${label} in automated income with ASH AI on Starks Global Group! Building my empire one system at a time. #PassiveIncome #AIAutomation`;
  const shareUrl = `${window.location.origin}/leaderboard`;

  const remaining = unreadMilestones.length;

  function dismiss() {
    setVisible(false);
    setTimeout(onDismiss, 300);
  }

  function copyShare() {
    navigator.clipboard.writeText(`${shareText}\n${shareUrl}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  function tweetShare() {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      '_blank', 'noopener,noreferrer'
    );
  }

  function linkedinShare() {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      '_blank', 'noopener,noreferrer'
    );
  }

  const descText = latest.message?.startsWith('{')
    ? `Congratulations! You've reached the ${label} milestone in automated income. You're officially an Empire Earner!`
    : (latest.message ?? `You've crossed the ${label} lifetime earnings milestone!`);

  return (
    <>
      <Confetti active={visible} seed={latest.id} />

      <div
        className={`fixed inset-0 z-[9997] bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={dismiss}
      />

      <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 pointer-events-none">
        <div
          className={`pointer-events-auto relative w-full max-w-md rounded-2xl border border-primary/30 bg-[#0e1117] shadow-[0_0_80px_rgba(14,165,233,0.2)] transition-all duration-500
            ${visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'}`}
          onClick={e => e.stopPropagation()}
        >
          <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-primary/10 blur-3xl" />
            <div className="absolute bottom-0 left-1/4 w-48 h-24 bg-violet-500/8 blur-3xl" />
          </div>

          <div className="relative z-10 p-8">
            <button
              onClick={dismiss}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/8 transition-all"
              aria-label="Dismiss milestone celebration"
            >
              <X className="w-4 h-4" />
            </button>

            {remaining > 1 && (
              <div className="absolute top-4 left-4">
                <span className="text-[10px] font-mono text-white/30 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                  {remaining} milestones
                </span>
              </div>
            )}

            <div className="flex justify-center mb-6">
              <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-400/20 to-amber-600/20 border border-yellow-500/30 flex items-center justify-center">
                <Trophy className="w-10 h-10 text-yellow-400" />
                <div className="absolute inset-0 rounded-2xl animate-ping bg-yellow-400/10" style={{ animationDuration: '1.5s' }} />
              </div>
            </div>

            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-mono text-emerald-300 uppercase tracking-widest">New Milestone</span>
              </div>
              <h2 className="text-3xl font-black text-white mb-1">
                You Hit{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-primary">
                  {label}
                </span>
              </h2>
              <p className="text-sm text-white/50 leading-relaxed">{descText}</p>
            </div>

            <div className="mb-5">
              <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest text-center mb-3">Share Your Win</p>
              <div className="flex gap-2">
                <button
                  onClick={tweetShare}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-[#1DA1F2]/15 hover:border-[#1DA1F2]/30 transition-all text-white/60 hover:text-white text-xs font-semibold"
                >
                  <Twitter className="w-3.5 h-3.5" /> Twitter/X
                </button>
                <button
                  onClick={linkedinShare}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-[#0A66C2]/15 hover:border-[#0A66C2]/30 transition-all text-white/60 hover:text-white text-xs font-semibold"
                >
                  <Linkedin className="w-3.5 h-3.5" /> LinkedIn
                </button>
                <button
                  onClick={copyShare}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-white/60 hover:text-white text-xs font-semibold"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <Link
                to="/leaderboard"
                onClick={dismiss}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary text-sm font-bold transition-all"
              >
                <Trophy className="w-4 h-4" /> View Leaderboard
              </Link>
              <button
                onClick={dismiss}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-bold transition-all shadow-[0_0_20px_rgba(14,165,233,0.3)]"
              >
                {remaining > 1 ? 'Next Milestone' : 'Keep Building'} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
