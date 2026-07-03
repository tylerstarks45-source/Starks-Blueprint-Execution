import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '@/components/AuthLayout.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { toast } from 'sonner';
import {
  ArrowLeft, Brain, Loader2, RefreshCw, TrendingUp, Target,
  Sparkles, Layers, Tag, Wrench, Activity, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
};

function money(cents) {
  if (!cents) return '$0';
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`;
}

function timeAgo(ts) {
  if (!ts) return 'never';
  const d = new Date(ts);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString();
}

const OUTCOME_STYLES = {
  proven:     { label: 'Proven',     color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25' },
  promising:  { label: 'Promising',  color: 'text-sky-400',     bg: 'bg-sky-500/10',     border: 'border-sky-500/25' },
  struggling: { label: 'Struggling', color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/25' },
  emerging:   { label: 'Emerging',   color: 'text-white/50',    bg: 'bg-white/5',        border: 'border-white/10' },
};

const SCOPE_META = {
  niche:              { label: 'Niche', icon: Tag },
  blueprint_category: { label: 'Category', icon: Layers },
  tool:               { label: 'Tool', icon: Wrench },
};

function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 text-white/50 text-xs uppercase tracking-wider">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
      {hint ? <div className="mt-1 text-xs text-white/40">{hint}</div> : null}
    </div>
  );
}

function ConfidenceBar({ value }) {
  const pct = Math.max(0, Math.min(100, value));
  const color = pct >= 60 ? 'bg-emerald-400' : pct >= 30 ? 'bg-sky-400' : 'bg-white/30';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-white/50 tabular-nums">{pct}%</span>
    </div>
  );
}

function LessonCard({ lesson }) {
  const style = OUTCOME_STYLES[lesson.outcome] || OUTCOME_STYLES.emerging;
  const scope = SCOPE_META[lesson.scopeType] || { label: lesson.scopeType, icon: Info };
  const ScopeIcon = scope.icon;
  return (
    <div className={`rounded-xl border ${style.border} ${style.bg} p-4`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <ScopeIcon className="w-4 h-4 text-white/40 shrink-0" />
          <span className="text-white font-medium truncate">{lesson.scopeLabel || lesson.scopeKey}</span>
          <span className="text-[10px] uppercase tracking-wider text-white/40 border border-white/10 rounded px-1.5 py-0.5">{scope.label}</span>
        </div>
        <span className={`text-[10px] uppercase tracking-wider font-semibold ${style.color} border ${style.border} rounded px-2 py-0.5`}>
          {style.label}
        </span>
      </div>

      <p className="mt-3 text-sm text-white/70 leading-relaxed">{lesson.summary}</p>

      <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
        <ConfidenceBar value={lesson.confidence} />
        <div className="flex items-center gap-3 text-xs text-white/45">
          <span>{lesson.successCount}/{lesson.sampleSize} earned</span>
          {lesson.totalRevenueCents > 0 ? <span className="text-emerald-400/80">{money(lesson.totalRevenueCents)} total</span> : null}
          {typeof lesson.avgHealth === 'number' ? <span>health {lesson.avgHealth}</span> : null}
        </div>
      </div>

      {Array.isArray(lesson.topTools) && lesson.topTools.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {lesson.topTools.slice(0, 4).map((t) => (
            <span key={t.toolId} className="text-[11px] text-white/55 bg-white/5 border border-white/10 rounded-full px-2 py-0.5">
              {t.name}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function AshIntelligencePage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'FOUNDER_ADMIN'].includes(currentUser?.role);

  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [distilling, setDistilling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai-orchestrator/brain', { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to load');
      setOverview(await res.json());
    } catch {
      toast.error('Could not load ASH Intelligence');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const runDistill = async () => {
    setDistilling(true);
    try {
      const res = await fetch('/api/ai-orchestrator/brain/distill', { method: 'POST', headers: authHeaders() });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      toast.success(`Distilled ${data.lessons} lessons from ${data.scanned} systems`);
      await load();
    } catch {
      toast.error('Distillation failed');
    } finally {
      setDistilling(false);
    }
  };

  const lessons = overview?.topLessons || [];
  const learningActive = overview?.learningActive;

  return (
    <AuthLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white">ASH Intelligence</h1>
              <p className="text-sm text-white/50 mt-1 max-w-2xl">
                What ASH has learned from real outcomes across the platform. These patterns are distilled from actual
                revenue, business health, and tool usage — and ASH grounds its plans and recommendations in them.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {isAdmin ? (
              <Button size="sm" onClick={runDistill} disabled={distilling}>
                {distilling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Distill now
              </Button>
            ) : null}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-white/40">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : !learningActive ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
            <Brain className="w-10 h-10 text-white/25 mx-auto" />
            <h2 className="mt-4 text-lg font-medium text-white">ASH is still gathering data</h2>
            <p className="mt-2 text-sm text-white/50 max-w-md mx-auto">
              ASH hasn't accumulated enough real outcomes yet to cite proven patterns. As your systems run and earn,
              ASH distills what actually works and its confidence grows over time. Until then, it relies on sound
              fundamentals — and it will never claim something is "proven" without the data to back it.
            </p>
            {isAdmin ? (
              <Button className="mt-5" size="sm" onClick={runDistill} disabled={distilling}>
                {distilling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Run first distillation
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              <StatCard icon={Sparkles} label="Lessons learned" value={overview.totalLessons} hint={`updated ${timeAgo(overview.lastDistilledAt)}`} />
              <StatCard icon={TrendingUp} label="Proven patterns" value={overview.provenCount} hint={`${overview.promisingCount} promising`} />
              <StatCard icon={Target} label="Avg confidence" value={`${overview.avgConfidence}%`} hint="grows with data" />
              <StatCard icon={Activity} label="Outcomes tracked" value={overview.totalSampleSize} hint={overview.totalRevenueCents > 0 ? `${money(overview.totalRevenueCents)} attributed` : 'across systems'} />
            </div>

            <div className="flex items-center gap-2 mb-3 text-white/60 text-sm font-medium">
              <Brain className="w-4 h-4 text-primary" />
              Learned patterns
              <span className="text-white/30">· ranked by confidence</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {lessons.map((l) => (
                <LessonCard key={`${l.scopeType}-${l.scopeKey}`} lesson={l} />
              ))}
            </div>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
