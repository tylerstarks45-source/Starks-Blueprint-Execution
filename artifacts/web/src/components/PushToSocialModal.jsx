import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  X, Link2, Loader2, Twitter, Linkedin, Instagram, Music2, Facebook,
} from 'lucide-react';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
};

const PLATFORMS = [
  { key: 'twitter', label: 'X / Twitter', icon: Twitter, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/25' },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/25' },
  { key: 'instagram', label: 'Instagram', icon: Instagram, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/25' },
  { key: 'tiktok', label: 'TikTok', icon: Music2, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/25' },
  { key: 'facebook', label: 'Facebook', icon: Facebook, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/25' },
];

function toDatetimeLocalValue(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Reusable modal to schedule a media asset as a social post.
 * Posts to POST /api/social/posts, mirroring the Social Calendar create flow.
 *
 * Props:
 *  - mediaUrl?: string      — URL of the asset to attach (skipped if a data: URI)
 *  - defaultContent?: string
 *  - onClose: () => void
 *  - onScheduled?: (post) => void
 */
export default function PushToSocialModal({ mediaUrl, defaultContent = '', onClose, onScheduled }) {
  const isDataUri = typeof mediaUrl === 'string' && mediaUrl.startsWith('data:');
  const attachableUrl = mediaUrl && !isDataUri ? mediaUrl : null;

  const [platform, setPlatform] = useState('instagram');
  const [content, setContent] = useState(defaultContent);
  const [linkUrl, setLinkUrl] = useState('');
  const [scheduledAt, setScheduledAt] = useState(
    toDatetimeLocalValue(new Date(Date.now() + 60 * 60 * 1000))
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!content.trim()) { toast.error('Post content is required'); return; }
    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) { toast.error('Please choose a valid schedule date & time'); return; }
    setSaving(true);
    try {
      const body = {
        platform,
        content: content.trim(),
        mediaUrls: attachableUrl ? [attachableUrl] : [],
        linkUrl: linkUrl.trim() || null,
        scheduledAt: scheduledDate.toISOString(),
        status: 'scheduled',
      };
      const res = await fetch('/api/social/posts', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to schedule post');
      }
      const post = await res.json().catch(() => null);
      toast.success('Scheduled to your social calendar');
      onScheduled?.(post);
      onClose();
    } catch (e) {
      toast.error(e.message || 'Failed to schedule post');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d0d12] p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Push to Social</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/8 text-white/40 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {attachableUrl && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/4 border border-white/8">
              <Link2 className="w-3.5 h-3.5 text-emerald-400/70 shrink-0" />
              <span className="text-[11px] font-mono text-white/45 truncate">{attachableUrl}</span>
            </div>
          )}
          {isDataUri && (
            <p className="text-[11px] text-amber-400/70 font-mono">
              This asset is stored inline and can't be attached directly — the post will be scheduled with your caption. Download and upload the media in your calendar to attach it.
            </p>
          )}

          <div>
            <label className="block text-xs font-mono text-white/40 mb-2">Platform</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {PLATFORMS.map((p) => {
                const Icon = p.icon;
                const active = platform === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPlatform(p.key)}
                    className={[
                      'flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-colors',
                      active ? `${p.bg} ${p.border} ${p.color}` : 'border-white/8 bg-white/3 text-white/40 hover:text-white/70',
                    ].join(' ')}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[10px] font-mono">{p.label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-white/40 mb-2">Caption</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              maxLength={10000}
              placeholder="Write a caption for this post…"
              className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500/50 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-white/40 mb-2 flex items-center gap-1.5">
              <Link2 className="w-3 h-3" /> Link (optional, click-tracked)
            </label>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com/your-page"
              className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-white/40 mb-2">Date & time</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 [color-scheme:dark]"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Schedule Post
          </button>
        </div>
      </div>
    </div>
  );
}
