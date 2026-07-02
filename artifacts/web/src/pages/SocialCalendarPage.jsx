import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import AuthLayout from '@/components/AuthLayout.jsx';
import {
  Calendar, ChevronLeft, ChevronRight, Plus, X, Trash2, Link2,
  Twitter, Linkedin, Instagram, Music2, Facebook, Loader2, MousePointerClick,
  CheckCircle2, AlertCircle, Clock,
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

const platformMeta = (key) => PLATFORMS.find(p => p.key === key) || PLATFORMS[0];

const STATUS_META = {
  scheduled: { label: 'Scheduled', icon: Clock, color: 'text-white/40' },
  publishing: { label: 'Publishing…', icon: Loader2, color: 'text-amber-400' },
  published: { label: 'Published', icon: CheckCircle2, color: 'text-emerald-400' },
  failed: { label: 'Failed', icon: AlertCircle, color: 'text-red-400' },
  cancelled: { label: 'Cancelled', icon: X, color: 'text-white/25' },
};

function toLocalDateKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toDatetimeLocalValue(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function PostModal({ initial, defaultDate, onClose, onSaved, onDeleted }) {
  const isEdit = !!initial;
  const [platform, setPlatform] = useState(initial?.platform || 'twitter');
  const [content, setContent] = useState(initial?.content || '');
  const [linkUrl, setLinkUrl] = useState(initial?.linkUrl || '');
  const [scheduledAt, setScheduledAt] = useState(
    toDatetimeLocalValue(initial?.scheduledAt || defaultDate || new Date(Date.now() + 60 * 60 * 1000))
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canEdit = !isEdit || initial.status === 'scheduled' || initial.status === 'failed';

  const handleSave = async () => {
    if (!content.trim()) { toast.error('Post content is required'); return; }
    setSaving(true);
    try {
      const body = {
        platform,
        content: content.trim(),
        linkUrl: linkUrl.trim() || null,
        scheduledAt: new Date(scheduledAt).toISOString(),
      };
      const res = await fetch(
        isEdit ? `/api/social/posts/${initial.id}` : '/api/social/posts',
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: authHeaders(),
          body: JSON.stringify(isEdit ? body : { ...body, mediaUrls: [], status: 'scheduled' }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save post');
      }
      toast.success(isEdit ? 'Post updated' : 'Post scheduled');
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e.message || 'Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this scheduled post?')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/social/posts/${initial.id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Post deleted');
      onDeleted();
      onClose();
    } catch (e) {
      toast.error(e.message || 'Failed to delete post');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d0d12] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">{isEdit ? 'Edit Post' : 'Schedule Post'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/8 text-white/40 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {isEdit && (
          <div className={`flex items-center gap-1.5 text-xs font-mono mb-4 ${STATUS_META[initial.status]?.color || 'text-white/40'}`}>
            {React.createElement(STATUS_META[initial.status]?.icon || Clock, { className: 'w-3.5 h-3.5' })}
            {STATUS_META[initial.status]?.label || initial.status}
            {initial.status === 'failed' && initial.errorMessage && (
              <span className="text-white/30 truncate">— {initial.errorMessage}</span>
            )}
          </div>
        )}

        <div className="space-y-4">
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
                    disabled={!canEdit}
                    onClick={() => setPlatform(p.key)}
                    className={[
                      'flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-colors disabled:opacity-40',
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
            <label className="block text-xs font-mono text-white/40 mb-2">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={!canEdit}
              rows={4}
              maxLength={10000}
              placeholder="What do you want to post?"
              className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500/50 disabled:opacity-50 resize-none"
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
              disabled={!canEdit}
              placeholder="https://example.com/your-page"
              className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500/50 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-white/40 mb-2">Date & time</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              disabled={!canEdit}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 disabled:opacity-50 [color-scheme:dark]"
            />
          </div>

          {isEdit && initial.clickCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-white/40 font-mono">
              <MousePointerClick className="w-3.5 h-3.5" /> {initial.clickCount} link click{initial.clickCount === 1 ? '' : 's'}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-6">
          {isEdit ? (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete
            </button>
          ) : <span />}

          {canEdit && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Schedule Post'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SocialCalendarPage() {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState(null); // { post } | { date } | null
  const [analytics, setAnalytics] = useState([]);

  const monthLabel = cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const rangeBounds = useMemo(() => {
    const from = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 25);
    const to = new Date(cursor.getFullYear(), cursor.getMonth() + 2, 5);
    return { from, to };
  }, [cursor]);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        from: rangeBounds.from.toISOString(),
        to: rangeBounds.to.toISOString(),
      });
      const res = await fetch(`/api/social/posts?${params}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to load posts');
      setPosts(await res.json());
    } catch {
      toast.error('Failed to load content calendar');
    } finally {
      setLoading(false);
    }
  }, [rangeBounds]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch('/api/social/analytics', { headers: authHeaders() });
      if (res.ok) setAnalytics(await res.json());
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);
  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const postsByDay = useMemo(() => {
    const map = {};
    for (const p of posts) {
      const key = toLocalDateKey(p.scheduledAt);
      (map[key] ||= []).push(p);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
    }
    return map;
  }, [posts]);

  const days = useMemo(() => {
    const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startWeekday = firstOfMonth.getDay();
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(gridStart.getDate() - startWeekday);
    const cells = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      cells.push(d);
    }
    return cells;
  }, [cursor]);

  const today = toLocalDateKey(new Date());

  const totalClicks = analytics.reduce((sum, a) => sum + (a.totalClicks || 0), 0);
  const totalPosts = analytics.reduce((sum, a) => sum + (a.totalPosts || 0), 0);
  const totalPublished = analytics.reduce((sum, a) => sum + (a.published || 0), 0);

  return (
    <AuthLayout>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs text-violet-400 font-mono font-semibold mb-4">
              <Calendar className="w-3 h-3" />
              CONTENT CALENDAR
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Social Media Scheduler</h1>
            <p className="text-white/45 text-sm mt-1">Plan, schedule, and track posts across all connected platforms.</p>
          </div>
          <button
            onClick={() => setModalState({ date: new Date() })}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> New Post
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="rounded-2xl border border-white/8 bg-white/3 p-4">
            <p className="text-xs text-white/40 font-mono mb-1">Total Posts</p>
            <p className="text-2xl font-bold text-white">{totalPosts}</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/3 p-4">
            <p className="text-xs text-white/40 font-mono mb-1">Published</p>
            <p className="text-2xl font-bold text-emerald-400">{totalPublished}</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/3 p-4">
            <p className="text-xs text-white/40 font-mono mb-1">Link Clicks</p>
            <p className="text-2xl font-bold text-violet-400">{totalClicks}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
            <h2 className="text-base font-semibold text-white">{monthLabel}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
                className="p-2 rounded-lg hover:bg-white/8 text-white/50 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
                className="px-3 py-1.5 rounded-lg text-xs font-mono text-white/50 hover:text-white hover:bg-white/8 transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
                className="p-2 rounded-lg hover:bg-white/8 text-white/50 hover:text-white transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-white/8">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="px-2 py-2 text-center text-[11px] font-mono text-white/30">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((d, i) => {
              const key = toLocalDateKey(d);
              const inMonth = d.getMonth() === cursor.getMonth();
              const dayPosts = postsByDay[key] || [];
              return (
                <div
                  key={i}
                  className={[
                    'min-h-[64px] sm:min-h-[110px] border-b border-r border-white/5 p-1 sm:p-2 cursor-pointer hover:bg-white/3 transition-colors',
                    i % 7 === 6 ? 'border-r-0' : '',
                    !inMonth ? 'opacity-30' : '',
                  ].join(' ')}
                  onClick={() => setModalState({ date: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9, 0) })}
                >
                  <div className={[
                    'text-[11px] font-mono mb-1',
                    key === today ? 'inline-flex items-center justify-center w-5 h-5 rounded-full bg-violet-600 text-white' : 'text-white/40',
                  ].join(' ')}>
                    {d.getDate()}
                  </div>
                  <div className="space-y-1">
                    {dayPosts.slice(0, 3).map((p) => {
                      const meta = platformMeta(p.platform);
                      const Icon = meta.icon;
                      const statusColor = STATUS_META[p.status]?.color || 'text-white/40';
                      return (
                        <button
                          key={p.id}
                          onClick={(e) => { e.stopPropagation(); setModalState({ post: p }); }}
                          className={`w-full flex items-center gap-1 px-1.5 py-1 rounded-md text-left border ${meta.bg} ${meta.border} hover:brightness-125 transition-all`}
                        >
                          <Icon className={`w-3 h-3 shrink-0 ${meta.color}`} />
                          <span className="text-[10px] text-white/70 truncate flex-1">{p.content}</span>
                          {p.status === 'failed' && <AlertCircle className={`w-3 h-3 shrink-0 ${statusColor}`} />}
                        </button>
                      );
                    })}
                    {dayPosts.length > 3 && (
                      <div className="text-[10px] text-white/30 font-mono px-1">+{dayPosts.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 text-white/30 text-sm mt-6">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading calendar…
          </div>
        )}
      </main>

      {modalState && (
        <PostModal
          initial={modalState.post}
          defaultDate={modalState.date}
          onClose={() => setModalState(null)}
          onSaved={() => { fetchPosts(); fetchAnalytics(); }}
          onDeleted={() => { fetchPosts(); fetchAnalytics(); }}
        />
      )}
    </AuthLayout>
  );
}
