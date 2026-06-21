import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Share2, X, Twitter, Linkedin, Copy, Check, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const MILESTONE_LABELS = {
  100: '$1', 10000: '$100', 50000: '$500',
  100000: '$1,000', 500000: '$5,000', 1000000: '$10,000',
  5000000: '$50,000', 10000000: '$100,000',
};

const CONFETTI_COLORS = ['#a78bfa', '#38bdf8', '#34d399', '#fbbf24', '#f472b6', '#fb923c'];
const PARTICLE_COUNT = 60;

function Confetti({ active }) {
  const particles = useRef(
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      x: 20 + Math.random() * 60,
      delay: Math.random() * 0.8,
      dur: 2 + Math.random() * 1.5,
      size: 4 + Math.random() * 6,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      shape: i % 3 === 0 ? 'circle' : i % 3 === 1 ? 'rect' : 'diamond',
    }))
  ).current;

  if (!active) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[9998] overflow-hidden">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute top-0"
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.shape === 'circle' ? '50%' : p.shape === 'diamond' ? '2px' : '1px',
            transform: p.shape === 'diamond' ? 'rotate(45deg)' : undefined,
            animation: `confettiDrop ${p.dur}s ${p.delay}s ease-in forwards`,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiDrop {
          0%   { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default function MilestoneCelebrationModal({ notifications = [], onDismiss }) {
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);

  const milestoneNotifs = notifications.filter(
    n => n.notificationType === 'milestone_reached' && !n.read
  );
  const latest = milestoneNotifs[0];

  useEffect(() => {
    if (latest) {
      const t = setTimeout(() => setVisible(true), 300);
      return () => clearTimeout(t);
    }
  }, [latest?.id]);

  if (!latest || !visible) return null;

  let amount = 0;
  try { amount = JSON.parse(latest.message ?? '{}')?.amount ?? 0; } catch {}
  const label = MILESTONE_LABELS[amount] ?? latest.title?.match(/\$[\d,KMk]+/)?.[0] ?? 'a milestone';

  const shareText = `🚀 I just hit ${label} in automated income with ASH AI on Starks Global Group! Building my empire one system at a time. #PassiveIncome #AIAutomation`;
  const shareUrl = `${window.location.origin}/leaderboard`;

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
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener');
  }

  function linkedinShare() {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener');
  }

  return (
    <>
      <Confetti active={visible} />

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[9997] bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={dismiss}
      />

      {/* Modal */}
      <div className={`fixed inset-0 z-[9999] flex items-center justify-center px-4 pointer-events-none`}>
        <div
          className={`pointer-events-auto relative w-full max-w-md rounded-2xl border border-primary/30 bg-[#0e1117] shadow-[0_0_80px_rgba(14,165,233,0.2)] transition-all duration-500
            ${visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'}`}
          onClick={e => e.stopPropagation()}
        >
          {/* Glow background */}
          <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-primary/10 blur-3xl" />
            <div className="absolute bottom-0 left-1/4 w-48 h-24 bg-violet-500/8 blur-3xl" />
          </div>

          <div className="relative z-10 p-8">
            {/* Dismiss */}
            <button
              onClick={dismiss}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/8 transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Trophy icon */}
            <div className="flex justify-center mb-6">
              <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-400/20 to-amber-600/20 border border-yellow-500/30 flex items-center justify-center">
                <Trophy className="w-10 h-10 text-yellow-400" />
                <div className="absolute inset-0 rounded-2xl animate-ping bg-yellow-400/10" style={{ animationDuration: '1.5s' }} />
              </div>
            </div>

            {/* Headline */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-mono text-emerald-300 uppercase tracking-widest">New Milestone</span>
              </div>
              <h2 className="text-3xl font-black text-white mb-1">
                You Hit <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-primary">{label}</span>
              </h2>
              <p className="text-sm text-white/50 leading-relaxed">
                {latest.message?.includes('{') ? `Congratulations! You've reached the ${label} milestone in automated income. You're officially an Empire Earner!` : latest.message}
              </p>
            </div>

            {/* Share buttons */}
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

            {/* Actions */}
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
                Keep Building <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
