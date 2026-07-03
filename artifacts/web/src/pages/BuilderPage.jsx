import React, { useEffect, useRef, useState, useCallback } from 'react';
import AuthLayout from '@/components/AuthLayout.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Send, Loader2, AlertCircle, Zap, CheckCircle2, Square,
  Eye, EyeOff, ChevronRight, ChevronDown, Terminal, Activity, Lock,
  Cpu, Play, ExternalLink, ArrowLeft, Grid3x3,
  MessageSquare, Sparkles, Clock, DollarSign, RotateCcw,
  Brain, Gauge, Target, Building2, TrendingUp, X,
  PlusCircle, Rocket, ShoppingCart, Users, Layers,
  Megaphone, Cog, Wand2, FlaskConical, Globe,
  Folder, FolderOpen, FileText, FileJson2, Circle, Server,
  AlertTriangle, CheckCircle, PlayCircle, PauseCircle, BookOpen, Save,
  Search, ImageIcon, Download, Copy, Check, Code2, FileCode2,
  CloudUpload, Package, Hash, Database, Star, Info,
  RefreshCw, Pencil, Trash2, Film, Music, Share2, Mic2,
  LayoutTemplate, Unlock, Mic, MicOff, Volume2, VolumeX, PhoneCall, PhoneOff,
} from 'lucide-react';
import SkillActivationPanel from '@/components/builder/SkillActivationPanel.jsx';
import BrowserView from '@/components/builder/BrowserView.jsx';
import RevenueSetupModal from '@/components/RevenueSetupModal.jsx';
import AIModelBadge from '@/components/AIModelBadge.jsx';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext.jsx';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
};

// Opens a landing page in a new browser tab.
// Published pages use the permanent public URL. Unpublished pages exchange
// the current session (Authorization header, never a URL) for a short-lived,
// single-use, page-scoped preview code via preview-session, then open the
// preview with only that opaque code in the URL — never the real auth token.
const openPageInBrowser = async (page) => {
  if (page.isPublished) {
    window.open(`/api/pages/${page.slug}`, '_blank', 'noopener,noreferrer');
    return;
  }

  // Open the tab synchronously (before the await) so browsers don't treat it
  // as a blocked popup; we redirect it once we have the preview code.
  const previewWin = window.open('', '_blank', 'noopener,noreferrer');
  try {
    const resp = await fetch(`/api/landing-pages/${page.id}/preview-session`, {
      method: 'POST',
      headers: authHeaders(),
    });
    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      throw new Error(body?.error || `Could not start preview (${resp.status})`);
    }
    const { previewToken } = await resp.json();
    if (previewWin) {
      previewWin.location.href = `/api/landing-pages/${page.id}/preview-html?previewToken=${encodeURIComponent(previewToken)}`;
    } else {
      // Popup was blocked — fall back to opening now that we have the URL.
      window.open(
        `/api/landing-pages/${page.id}/preview-html?previewToken=${encodeURIComponent(previewToken)}`,
        '_blank',
        'noopener,noreferrer',
      );
    }
  } catch (err) {
    previewWin?.close();
    toast.error(err instanceof Error ? err.message : 'Could not open preview.');
  }
};

// Detects assistant messages that read like a build plan (numbered steps +
// Step/Phase language + builder vocabulary) but never emitted a structured
// SBEP_DATA block, so the persistent "confirm this plan" banner can still
// surface a way to trigger the plan-confirmation flow.
const PLAN_VOCAB_WORDS = ['blueprint', 'system', 'credential', 'deploy', 'build', 'automation', 'workflow', 'integration', 'tool'];
function isPlanLikeContent(text) {
  if (!text || text.length < 40) return false;
  const hasNumberedList = /(^|\n)\s*(\d+[.)]|step\s*\d+|phase\s*\d+)/i.test(text);
  const hasStepOrPhaseWord = /\b(step|phase)\b/i.test(text);
  const vocabHits = PLAN_VOCAB_WORDS.reduce((count, w) => (new RegExp(`\\b${w}\\b`, 'i').test(text) ? count + 1 : count), 0);
  return hasNumberedList && hasStepOrPhaseWord && vocabHits >= 2;
}

const STARTER_PROMPTS = [
  'Build an affiliate marketing system',
  'Create a digital product business',
  'Launch a coaching funnel',
  'Start a dropshipping store',
  'Automate my content creation',
  'Build an email marketing machine',
];

// ── AI Agent Power Modes ──────────────────────────────────────────────────────
const AI_MODES = [
  {
    id: 'fast',
    label: 'Swift',
    subtitle: 'Quick & frontier',
    creditHint: '~1 cr/msg',
    creditsPerBuild: '3–5 credits',
    description: 'A frontier model tuned for speed. Same top-tier brain, quick turns — perfect for brainstorming and rapid back-and-forth.',
    creditWarning: 'Lightest credit draw. Same frontier quality as the others — just scoped for fast, snappy conversation.',
    model: 'openai/gpt-4o',
    modelLabel: 'GPT-4o',
    speed: '~4 sec / msg',
    useCases: ['Brainstorming', 'Quick questions', 'Rapid iteration', 'Drafting content'],
    icon: Zap,
    color: 'text-emerald-400',
    barColor: 'bg-emerald-500',
    barWidth: 'w-1/4',
    activeBg: 'bg-emerald-500/15 border-emerald-500/40',
    inactiveBg: 'bg-white/3 border-white/8 hover:border-white/20',
    requiredTier: null,
  },
  {
    id: 'business',
    label: 'Deep',
    subtitle: 'Deeper reasoning',
    creditHint: '~3 cr/msg',
    creditsPerBuild: '10–18 credits',
    description: 'Stronger step-by-step reasoning for multi-step systems and business logic. The right default for most real builds.',
    creditWarning: 'Moderate credit draw for extra reasoning depth. Recommended default for planning and production builds.',
    model: 'anthropic/claude-3-5-sonnet',
    modelLabel: 'Claude 3.5 Sonnet',
    speed: '~8 sec / msg',
    useCases: ['Production builds', 'Multi-step systems', 'Business logic', 'Research & planning'],
    icon: Brain,
    color: 'text-blue-400',
    barColor: 'bg-blue-500',
    barWidth: 'w-2/4',
    activeBg: 'bg-blue-500/15 border-blue-500/40',
    inactiveBg: 'bg-white/3 border-white/8 hover:border-white/20',
    requiredTier: null,
  },
  {
    id: 'expert',
    label: 'Expert',
    subtitle: 'Maximum depth',
    creditHint: '~8 cr/msg',
    creditsPerBuild: '25–45 credits',
    description: 'The flagship model at full depth — the most thorough plans, complex automations, and careful analysis on a single track.',
    creditWarning: 'Higher credit draw for maximum reasoning depth. Use when the system is complex and detail really matters.',
    model: 'anthropic/claude-opus-4',
    modelLabel: 'Claude Opus 4',
    speed: '~15 sec / msg',
    useCases: ['Complex automations', 'Deep research', 'Enterprise systems', 'Revenue optimization'],
    icon: Cpu,
    color: 'text-violet-400',
    barColor: 'bg-violet-500',
    barWidth: 'w-3/4',
    activeBg: 'bg-violet-500/15 border-violet-500/40',
    inactiveBg: 'bg-white/3 border-white/8 hover:border-white/20',
    requiredTier: null,
  },
  {
    id: 'empire',
    label: 'Empire',
    subtitle: 'Widest scope',
    creditHint: '~25 cr/msg',
    creditsPerBuild: '80–150 credits',
    description: 'The flagship model at the widest scope — multi-agent orchestration where sub-agents research, plan, build, and validate in parallel across your whole system.',
    creditWarning: 'Highest credit draw for the broadest scope. Reserved for flagship income systems and large multi-agent deployments.',
    model: 'anthropic/claude-opus-4',
    modelLabel: 'Claude Opus 4',
    speed: '~30+ sec / msg',
    useCases: ['Flagship systems', 'Multi-agent builds', 'Whole-system scope', '$10k+/mo revenue targets'],
    icon: Gauge,
    color: 'text-amber-400',
    barColor: 'bg-amber-500',
    barWidth: 'w-full',
    activeBg: 'bg-amber-500/15 border-amber-500/40',
    inactiveBg: 'bg-white/3 border-white/8 hover:border-white/20',
    requiredTier: 'empire',
  },
];

// ── Business Types ─────────────────────────────────────────────────────────────
const BUSINESS_TYPES = [
  { id: 'saas',         label: 'SaaS',           icon: Layers,       color: 'text-blue-400',    bg: 'bg-blue-500/15 border-blue-500/30' },
  { id: 'ecommerce',    label: 'Ecommerce',       icon: ShoppingCart, color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30' },
  { id: 'affiliate',    label: 'Affiliate',       icon: TrendingUp,   color: 'text-amber-400',   bg: 'bg-amber-500/15 border-amber-500/30' },
  { id: 'leadgen',      label: 'Lead Gen',        icon: Target,       color: 'text-rose-400',    bg: 'bg-rose-500/15 border-rose-500/30' },
  { id: 'agency',       label: 'Agency',          icon: Building2,    color: 'text-violet-400',  bg: 'bg-violet-500/15 border-violet-500/30' },
  { id: 'content',      label: 'Content',         icon: Megaphone,    color: 'text-cyan-400',    bg: 'bg-cyan-500/15 border-cyan-500/30' },
  { id: 'automation',   label: 'Automation',      icon: Cog,          color: 'text-orange-400',  bg: 'bg-orange-500/15 border-orange-500/30' },
  { id: 'custom',       label: 'Custom',          icon: Wand2,        color: 'text-pink-400',    bg: 'bg-pink-500/15 border-pink-500/30' },
];

// ── Multi-Agent Roster ─────────────────────────────────────────────────────────
const MULTI_AGENTS = [
  { id: 'planner',    label: 'Planner',    icon: Brain,        phases: ['collecting', 'building'] },
  { id: 'research',   label: 'Research',   icon: FlaskConical, phases: ['building'] },
  { id: 'builder',    label: 'Builder',    icon: Cog,          phases: ['building'] },
  { id: 'tester',     label: 'Tester',     icon: Target,       phases: ['building', 'complete'] },
  { id: 'deploy',     label: 'Activate',   icon: Rocket,       phases: ['complete'] },
];

const aiModeStorageKey = (userId) => `sbep_ai_mode_${userId}`;
const chatModeStorageKey = (userId) => `sbep_chat_mode_${userId}`;

const DIFFICULTY_COLOR = {
  beginner: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/8',
  intermediate: 'text-amber-400 border-amber-400/30 bg-amber-400/8',
  advanced: 'text-rose-400 border-rose-400/30 bg-rose-400/8',
};

// ── Terminal output tag classification ──────────────────────────────────────
const TAG_STYLES = {
  INIT:   { label: '[INIT]',   cls: 'text-cyan-400' },
  BUILD:  { label: '[BUILD]',  cls: 'text-blue-400' },
  TEST:   { label: '[TEST]',   cls: 'text-amber-400' },
  DEPLOY: { label: '[DEPLOY]', cls: 'text-emerald-400' },
  WARN:   { label: '[WARN]',   cls: 'text-orange-400' },
  ERROR:  { label: '[ERROR]',  cls: 'text-rose-400' },
  SYS:    { label: '[SYS]',    cls: 'text-violet-400' },
};

function classifyStep(stepNumber, totalSteps) {
  if (stepNumber === 1) return TAG_STYLES.INIT;
  if (stepNumber >= totalSteps) return TAG_STYLES.DEPLOY;
  if (stepNumber === totalSteps - 1) return TAG_STYLES.TEST;
  return TAG_STYLES.BUILD;
}

// ── Typed text component ─────────────────────────────────────────────────────
const TypedText = ({ text, onDone, speed = 8 }) => {
  const [displayed, setDisplayed] = useState('');
  const idxRef = useRef(0);

  useEffect(() => {
    idxRef.current = 0;
    setDisplayed('');
    const iv = setInterval(() => {
      idxRef.current += speed;
      if (idxRef.current >= text.length) {
        setDisplayed(text);
        clearInterval(iv);
        onDone?.();
      } else {
        setDisplayed(text.slice(0, idxRef.current));
      }
    }, 16);
    return () => clearInterval(iv);
  }, [text]);

  return <>{displayed}</>;
};

// ─── Phase Bar ────────────────────────────────────────────────────────────────
const PhaseBar = ({ phase }) => {
  const phases = [
    { id: 'idle', label: 'GOAL' },
    { id: 'collecting', label: 'PLAN' },
    { id: 'building', label: 'BUILD' },
    { id: 'complete', label: 'LIVE' },
  ];
  const activeIdx = phases.findIndex(p => p.id === phase);
  return (
    <div className="flex items-center gap-0">
      {phases.map((p, i) => {
        const done = i < activeIdx;
        const active = i === activeIdx;
        return (
          <React.Fragment key={p.id}>
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-mono font-bold tracking-widest transition-colors ${
              done ? 'text-emerald-400' : active ? 'text-primary' : 'text-muted-foreground/30'
            }`}>
              {done
                ? <CheckCircle2 className="w-2.5 h-2.5" />
                : active
                ? <Cpu className="w-2.5 h-2.5 animate-pulse" />
                : <span className="w-2.5 h-2.5 rounded-full border border-current opacity-40" />}
              {p.label}
            </div>
            {i < phases.length - 1 && (
              <div className={`h-px w-6 transition-colors ${done ? 'bg-emerald-400/40' : 'bg-white/8'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ─── Blueprint Card ───────────────────────────────────────────────────────────
const BlueprintCard = ({ bp, selected, onSelect }) => {
  const diff = (bp.difficulty || 'beginner').toLowerCase();
  const diffCls = DIFFICULTY_COLOR[diff] || DIFFICULTY_COLOR.beginner;
  return (
    <button
      onClick={() => onSelect(bp)}
      className={`w-full text-left rounded-xl border p-3.5 transition-all active:scale-[0.98] ${
        selected
          ? 'border-primary/60 bg-primary/10 shadow-lg shadow-primary/10'
          : 'border-white/10 bg-black/70 hover:bg-black/85 hover:border-white/20'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={`text-sm font-semibold leading-snug ${selected ? 'text-primary' : 'text-foreground'}`}>
          {bp.name}
        </span>
        <Badge variant="outline" className={`text-[9px] shrink-0 border font-mono ${diffCls}`}>
          {diff}
        </Badge>
      </div>
      {bp.description && (
        <p className="text-[11px] text-muted-foreground/60 line-clamp-2 leading-relaxed mb-2">
          {bp.description}
        </p>
      )}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground/40 font-mono">
        {bp.estimatedCost && (
          <span className="flex items-center gap-1">
            <DollarSign className="w-2.5 h-2.5" />{bp.estimatedCost}/mo
          </span>
        )}
        {bp.estimatedTime && (
          <span className="flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />{bp.estimatedTime}
          </span>
        )}
      </div>
      {selected && (
        <div className="mt-2 flex items-center gap-1 text-[10px] text-primary font-mono">
          <CheckCircle2 className="w-2.5 h-2.5" /> Selected
        </div>
      )}
    </button>
  );
};

// ─── Credential Form ──────────────────────────────────────────────────────────
const CredentialForm = ({ credentials, blueprint, onExecute, loading, prefill, onValuesChange }) => {
  const [values, setValues] = useState(() => {
    const init = {};
    credentials.forEach(c => {
      if (prefill?.[c.key]) init[c.key] = prefill[c.key];
    });
    return init;
  });
  const [revealed, setRevealed] = useState({});
  const [attempted, setAttempted] = useState(false);

  // Re-init when prefill arrives
  useEffect(() => {
    if (!prefill) return;
    setValues(prev => {
      const next = { ...prev };
      credentials.forEach(c => {
        if (prefill[c.key] && !next[c.key]) next[c.key] = prefill[c.key];
      });
      return next;
    });
  }, [prefill]);

  const allFilled = credentials.every(c => (values[c.key] || '').trim().length > 0);

  const handleSubmit = () => {
    setAttempted(true);
    if (!allFilled) return;
    onExecute(values);
  };

  return (
    <div className="rounded-xl border border-primary/25 bg-black/50 overflow-hidden mt-2">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-primary/15 bg-primary/8">
        <Lock className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-mono font-semibold text-primary uppercase tracking-wider">
          Credentials Required — {blueprint?.name}
        </span>
        <Badge variant="outline" className="ml-auto text-[9px] border-primary/20 text-primary/70">
          {credentials.length} {credentials.length === 1 ? 'credential' : 'credentials'}
        </Badge>
      </div>
      <div className="p-4 space-y-3">
        {credentials.map(cred => {
          const isEmpty = !(values[cred.key] || '').trim();
          const isRequired = cred.required !== false;
          const showError = attempted && isRequired && isEmpty;
          return (
            <div key={cred.key}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-foreground">
                  {cred.label}
                  {isRequired && <span className="text-rose-400 ml-1">*</span>}
                </label>
                <span className="text-[10px] text-muted-foreground/60 font-mono">{cred.toolName}</span>
              </div>
              <div className="relative">
                <input
                  type={revealed[cred.key] ? 'text' : 'password'}
                  value={values[cred.key] || ''}
                  onChange={e => setValues(v => {
                    const next = { ...v, [cred.key]: e.target.value };
                    onValuesChange?.(next);
                    return next;
                  })}
                  placeholder={`Enter ${cred.label}`}
                  className={`w-full text-sm bg-white/5 border rounded-lg px-3 py-2 pr-9 text-foreground placeholder:text-muted-foreground/30 focus:outline-none transition-all font-mono ${
                    showError
                      ? 'border-rose-500/60 bg-rose-500/5 focus:border-rose-500'
                      : 'border-white/10 focus:border-primary/50 focus:bg-white/8'
                  }`}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => setRevealed(r => ({ ...r, [cred.key]: !r[cred.key] }))}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                >
                  {revealed[cred.key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              {showError && (
                <p className="text-[10px] text-rose-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-2.5 h-2.5" /> This field is required
                </p>
              )}
              {cred.description && !showError && (
                <p className="text-[11px] text-muted-foreground/50 mt-1">{cred.description}</p>
              )}
            </div>
          );
        })}
      </div>
      <div className="px-4 pb-4">
        <Button
          className="w-full h-10 gap-2 font-semibold text-sm"
          disabled={loading}
          onClick={handleSubmit}
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Initializing Build…</>
            : <><Play className="w-4 h-4" /> Execute Autonomous Build <ChevronRight className="w-4 h-4" /></>}
        </Button>
        <p className="text-[10px] text-muted-foreground/30 text-center mt-2">
          Credentials are encrypted and used only to build your system
        </p>
      </div>
    </div>
  );
};

// ─── Linkify — turns raw URLs inside a string into clickable <a> tags ─────────
const linkify = (text) =>
  text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 underline underline-offset-2 hover:text-blue-300 transition-colors break-all"
        onClick={(e) => e.stopPropagation()}
      >
        {part}
      </a>
    ) : part
  );

// ─── Tool Result Cards ────────────────────────────────────────────────────────

const ToolCallCard = ({ tool, label }) => (
  <div className="flex items-start gap-2.5 my-0.5">
    <div className="w-7 h-7 rounded-full bg-violet-500/15 border border-violet-500/25 flex items-center justify-center shrink-0 mt-0.5">
      {tool === 'search' ? <Search className="w-3.5 h-3.5 text-violet-400" /> : tool === 'image' ? <ImageIcon className="w-3.5 h-3.5 text-violet-400" /> : tool === 'video' ? <Film className="w-3.5 h-3.5 text-violet-400" /> : tool === 'music' || tool === 'tts' ? <Music className="w-3.5 h-3.5 text-violet-400" /> : <Cpu className="w-3.5 h-3.5 text-violet-400" />}
    </div>
    <div className="flex flex-col gap-0.5 items-start">
      <span className="text-[10px] text-violet-400/55 font-mono font-semibold px-1">ASH · Tool Call</span>
      <div className="bg-[#0a0816] border border-violet-500/15 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2.5">
        <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin shrink-0" />
        <p className="text-xs text-white/55 font-mono">{label || 'Executing…'}</p>
      </div>
    </div>
  </div>
);

const SearchResultsCard = ({ data }) => {
  const [expanded, setExpanded] = React.useState(false);
  const findings = Array.isArray(data?.findings) ? data.findings : [];
  return (
    <div className="flex items-start gap-2.5 my-0.5">
      <div className="w-7 h-7 rounded-full bg-sky-500/15 border border-sky-500/25 flex items-center justify-center shrink-0 mt-0.5">
        <Search className="w-3.5 h-3.5 text-sky-400" />
      </div>
      <div className="flex flex-col gap-0.5 items-start max-w-[85%]">
        <span className="text-[10px] text-sky-400/55 font-mono font-semibold px-1">ASH · Web Search</span>
        <div className="bg-[#040a10] border border-sky-500/15 rounded-2xl rounded-tl-sm px-4 py-3 w-full">
          {data?.query && <p className="text-[9px] text-white/30 font-mono font-semibold mb-2 uppercase tracking-widest">Query: {data.query}</p>}
          {data?.summary && <p className="text-xs text-white/70 leading-relaxed mb-2">{data.summary}</p>}
          {findings.length > 0 && (
            <div className="space-y-1.5 mt-2">
              {(expanded ? findings : findings.slice(0, 3)).map((f, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-sky-500/5 border border-sky-500/10">
                  <Hash className="w-3 h-3 text-sky-400/50 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-white/65">{f.point}</p>
                    {f.source && <p className="text-[9px] text-sky-400/45 font-mono mt-0.5 truncate">{f.source}</p>}
                  </div>
                </div>
              ))}
              {findings.length > 3 && (
                <button onClick={() => setExpanded(e => !e)} className="text-[9px] text-sky-400/55 hover:text-sky-400 font-mono transition-colors">
                  {expanded ? 'Show less' : `+ ${findings.length - 3} more findings`}
                </button>
              )}
            </div>
          )}
          {data?.marketOpportunity && (
            <div className="mt-2 pt-2 border-t border-white/5">
              <p className="text-[10px] text-emerald-400/60 font-mono leading-relaxed">💡 {data.marketOpportunity}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ImageResultCard = ({ data }) => {
  const [loaded, setLoaded] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const downloadImage = () => {
    const a = document.createElement('a');
    a.href = data.url;
    a.download = `ash-image-${Date.now()}.jpg`;
    a.target = '_blank';
    a.click();
  };
  return (
    <div className="flex items-start gap-2.5 my-0.5">
      <div className="w-7 h-7 rounded-full bg-purple-500/15 border border-purple-500/25 flex items-center justify-center shrink-0 mt-0.5">
        <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
      </div>
      <div className="flex flex-col gap-0.5 items-start max-w-[80%]">
        <span className="text-[10px] text-purple-400/55 font-mono font-semibold px-1">ASH · Image Generation</span>
        <div className="bg-[#080410] border border-purple-500/15 rounded-2xl rounded-tl-sm p-3 w-full">
          {data?.prompt && <p className="text-[9px] text-white/28 font-mono mb-2 italic">"{data.prompt}"</p>}
          <div className="relative rounded-xl overflow-hidden bg-white/4 border border-white/8">
            {!loaded && <div className="h-36 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-white/20" /></div>}
            <img
              src={data.url}
              alt={data.prompt || 'Generated image'}
              onLoad={() => setLoaded(true)}
              className={`w-full object-cover rounded-xl transition-opacity ${loaded ? 'opacity-100' : 'opacity-0 h-0'}`}
            />
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={downloadImage} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/18 border border-purple-500/20 text-purple-300 text-[10px] font-mono transition-colors">
              <Download className="w-3 h-3" />
              Download
            </button>
            <button
              onClick={() => { navigator.clipboard.writeText(data.url); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/8 border border-white/10 text-white/42 text-[10px] font-mono transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied!' : 'Copy URL'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const GeneratedVideoCard = ({ data }) => (
  <div className="flex items-start gap-2.5 my-0.5">
    <div className="w-7 h-7 rounded-full bg-rose-500/15 border border-rose-500/25 flex items-center justify-center shrink-0 mt-0.5">
      <Film className="w-3.5 h-3.5 text-rose-400" />
    </div>
    <div className="flex flex-col gap-0.5 items-start max-w-[85%]">
      <span className="text-[10px] text-rose-400/55 font-mono font-semibold px-1">ASH · Video Generation</span>
      <div className="bg-[#100408] border border-rose-500/15 rounded-2xl rounded-tl-sm px-4 py-3 w-full">
        {data?.prompt && <p className="text-[9px] text-white/28 font-mono mb-2 italic">"{(data.prompt || '').slice(0, 80)}{data.prompt?.length > 80 ? '…' : ''}"</p>}
        {data?.status === 'needs_credentials' && (
          <div className="space-y-2">
            <p className="text-xs text-white/65 leading-relaxed">{data.message}</p>
            {Array.isArray(data?.providers) && data.providers.map((p, i) => (
              <a key={i} href="/connections" className="flex items-center gap-2 p-2 rounded-lg bg-rose-500/6 border border-rose-500/12 hover:border-rose-500/25 transition-colors">
                <span className="text-[11px] text-white/70 font-semibold">{p.name}</span>
                <span className="text-[10px] text-white/35 ml-auto">{p.desc}</span>
                <ExternalLink className="w-2.5 h-2.5 text-rose-400/50 shrink-0" />
              </a>
            ))}
            <a href="/connections" className="inline-flex items-center gap-1.5 text-[11px] text-rose-400 hover:text-rose-300 mt-1 transition-colors">Connect video tool →</a>
          </div>
        )}
        {data?.status === 'queued' && (
          <div className="flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 text-rose-400 animate-spin" />
            <p className="text-xs text-white/60">{data.message}</p>
          </div>
        )}
      </div>
    </div>
  </div>
);

const GeneratedAudioCard = ({ data, label }) => {
  const audioSrc = data?.audioBase64 ? `data:${data.mimeType ?? 'audio/mpeg'};base64,${data.audioBase64}` : null;
  return (
    <div className="flex items-start gap-2.5 my-0.5">
      <div className="w-7 h-7 rounded-full bg-fuchsia-500/15 border border-fuchsia-500/25 flex items-center justify-center shrink-0 mt-0.5">
        <Music className="w-3.5 h-3.5 text-fuchsia-400" />
      </div>
      <div className="flex flex-col gap-0.5 items-start max-w-[85%]">
        <span className="text-[10px] text-fuchsia-400/55 font-mono font-semibold px-1">{label ?? 'ASH · Audio Generation'}</span>
        <div className="bg-[#0e0410] border border-fuchsia-500/15 rounded-2xl rounded-tl-sm px-4 py-3 w-full">
          {data?.status === 'needs_credentials' ? (
            <div className="space-y-2">
              <p className="text-xs text-white/65 leading-relaxed">{data.message}</p>
              {Array.isArray(data?.providers) && data.providers.map((p, i) => (
                <a key={i} href="/connections" className="flex items-center gap-2 p-2 rounded-lg bg-fuchsia-500/6 border border-fuchsia-500/12 hover:border-fuchsia-500/25 transition-colors">
                  <span className="text-[11px] text-white/70 font-semibold">{p.name}</span>
                  <span className="text-[10px] text-white/35 ml-auto">{p.desc}</span>
                </a>
              ))}
              <a href="/connections" className="inline-flex items-center gap-1.5 text-[11px] text-fuchsia-400 hover:text-fuchsia-300 mt-1 transition-colors">Connect audio tool →</a>
            </div>
          ) : audioSrc ? (
            <div className="space-y-2">
              {data?.voice && <p className="text-[9px] text-white/35 font-mono">Voice: {data.voice} · {data.characterCount} chars</p>}
              <audio controls src={audioSrc} className="w-full h-8 rounded-lg" style={{ colorScheme: 'dark' }} />
              <a
                href={audioSrc}
                download={`ash-audio-${Date.now()}.mp3`}
                className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-fuchsia-500/10 hover:bg-fuchsia-500/18 border border-fuchsia-500/20 text-fuchsia-300 text-[10px] font-mono transition-colors"
              >
                <Download className="w-3 h-3" />
                Download Audio
              </a>
            </div>
          ) : (
            <p className="text-xs text-white/50">{data?.note ?? 'Audio generation complete.'}</p>
          )}
        </div>
      </div>
    </div>
  );
};

const CodeFileCard = ({ data }) => {
  const [copied, setCopied] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const fileExt = (data?.name || '').split('.').pop() || 'txt';
  const lines = (data?.content || '').split('\n');
  const preview = expanded ? lines : lines.slice(0, 12);
  const copyContent = () => {
    navigator.clipboard.writeText(data?.content || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const downloadFile = () => {
    const blob = new Blob([data?.content || ''], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = data?.name || 'file.txt';
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="flex items-start gap-2.5 my-0.5">
      <div className="w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0 mt-0.5">
        <FileCode2 className="w-3.5 h-3.5 text-emerald-400" />
      </div>
      <div className="flex flex-col gap-0.5 items-start max-w-[88%]">
        <span className="text-[10px] text-emerald-400/55 font-mono font-semibold px-1">ASH · File Generated</span>
        <div className="bg-[#030d06] border border-emerald-500/15 rounded-2xl rounded-tl-sm w-full overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Code2 className="w-3.5 h-3.5 text-emerald-400/70" />
              <span className="text-[11px] font-mono text-white/65 font-semibold">{data?.name || 'file'}</span>
              <span className="text-[9px] font-mono text-white/22 bg-white/5 px-1.5 py-0.5 rounded">{fileExt}</span>
            </div>
            <div className="flex gap-1.5">
              <button onClick={copyContent} className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/38 text-[9px] font-mono transition-colors">
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
              <button onClick={downloadFile} className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/38 text-[9px] font-mono transition-colors">
                <Download className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <pre className="text-[11px] font-mono text-white/60 leading-relaxed px-4 py-3 whitespace-pre">
              {preview.join('\n')}
              {!expanded && lines.length > 12 && <span className="text-white/25">{'\n'}…</span>}
            </pre>
          </div>
          {lines.length > 12 && (
            <button onClick={() => setExpanded(e => !e)} className="w-full py-1.5 text-[9px] font-mono text-emerald-400/45 hover:text-emerald-400 transition-colors border-t border-white/5 bg-black/20">
              {expanded ? 'Collapse' : `Show all ${lines.length} lines`}
            </button>
          )}
          {data?.description && (
            <p className="px-4 pb-2.5 text-[9px] text-white/25 font-mono border-t border-white/5 pt-2 mt-0">{data.description}</p>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Connector Action Cards ───────────────────────────────────────────────────

const CONNECTOR_COLORS = {
  twitter:      { bg: 'bg-sky-500/12',     border: 'border-sky-500/20',     text: 'text-sky-400',     icon: Share2 },
  mailchimp:    { bg: 'bg-amber-500/12',   border: 'border-amber-500/20',   text: 'text-amber-400',   icon: Users },
  convertkit:   { bg: 'bg-orange-500/12',  border: 'border-orange-500/20',  text: 'text-orange-400',  icon: Users },
  zapier:       { bg: 'bg-orange-500/12',  border: 'border-orange-500/20',  text: 'text-orange-400',  icon: Zap },
  gohighlevel:  { bg: 'bg-blue-500/12',    border: 'border-blue-500/20',    text: 'text-blue-400',    icon: Building2 },
  slack:        { bg: 'bg-purple-500/12',  border: 'border-purple-500/20',  text: 'text-purple-400',  icon: MessageSquare },
  sendgrid:     { bg: 'bg-teal-500/12',    border: 'border-teal-500/20',    text: 'text-teal-400',    icon: Send },
  stripe:       { bg: 'bg-violet-500/12',  border: 'border-violet-500/20',  text: 'text-violet-400',  icon: DollarSign },
  webhook:      { bg: 'bg-emerald-500/12', border: 'border-emerald-500/20', text: 'text-emerald-400', icon: Globe },
};

const ConnectorActionCard = ({ data, onRetry }) => {
  const [expanded, setExpanded] = React.useState(false);
  const { ok, connectorId, connectorName, action, error, latencyMs } = data || {};
  const colors = CONNECTOR_COLORS[connectorId] || { bg: 'bg-white/5', border: 'border-white/10', text: 'text-white/70', icon: Cpu };
  const Icon = colors.icon;
  const resultData = data?.data;
  const resultMessage = resultData?.message || (ok ? 'Action completed successfully' : error || 'Action failed');

  if (!ok) {
    return (
      <div className="flex items-start gap-2.5 my-0.5">
        <div className="w-7 h-7 rounded-full bg-rose-500/15 border border-rose-500/25 flex items-center justify-center shrink-0 mt-0.5">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
        </div>
        <div className="flex flex-col gap-0.5 items-start max-w-[85%]">
          <span className="text-[10px] text-rose-400/55 font-mono font-semibold px-1">ASH · Connector Error</span>
          <div className="bg-[#130208] border border-rose-500/18 rounded-2xl rounded-tl-sm px-4 py-3 w-full">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-3.5 h-3.5 ${colors.text}`} />
              <span className="text-[11px] font-semibold text-white/75">{connectorName || connectorId}</span>
              <span className="text-[9px] font-mono text-white/30 ml-auto">{action}</span>
            </div>
            <p className="text-xs text-rose-300/80 leading-relaxed">{error || 'Action failed'}</p>
            {latencyMs && <p className="text-[9px] text-white/20 font-mono mt-1">{latencyMs}ms</p>}
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-2.5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/12 hover:bg-rose-500/20 border border-rose-500/22 text-rose-300 text-[10px] font-mono transition-colors"
              >
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5 my-0.5">
      <div className={`w-7 h-7 rounded-full ${colors.bg} border ${colors.border} flex items-center justify-center shrink-0 mt-0.5`}>
        <Icon className={`w-3.5 h-3.5 ${colors.text}`} />
      </div>
      <div className="flex flex-col gap-0.5 items-start max-w-[85%]">
        <span className={`text-[10px] ${colors.text} opacity-55 font-mono font-semibold px-1`}>ASH · {connectorName || connectorId}</span>
        <div className={`${colors.bg} border ${colors.border} rounded-2xl rounded-tl-sm px-4 py-3 w-full`}>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <p className="text-xs text-white/75 leading-relaxed">{resultMessage}</p>
          </div>
          <div className="flex items-center gap-3 text-[9px] font-mono text-white/28">
            <span className={`${colors.text} opacity-70`}>{action}</span>
            {latencyMs && <span>{latencyMs}ms</span>}
          </div>
          {resultData && Object.keys(resultData).length > 1 && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="mt-2 text-[9px] font-mono text-white/28 hover:text-white/50 flex items-center gap-1 transition-colors"
            >
              {expanded ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
              {expanded ? 'Hide details' : 'Show details'}
            </button>
          )}
          {expanded && resultData && (
            <div className="mt-2 pt-2 border-t border-white/6 space-y-1">
              {Object.entries(resultData)
                .filter(([k]) => k !== 'message')
                .slice(0, 8)
                .map(([k, v]) => (
                  <div key={k} className="flex gap-2 text-[9px] font-mono">
                    <span className="text-white/30 shrink-0">{k}:</span>
                    <span className="text-white/55 break-all">{typeof v === 'object' ? JSON.stringify(v).slice(0, 80) : String(v).slice(0, 80)}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Message Bubble ───────────────────────────────────────────────────────────
const MessageBubble = ({ msg, onConfirmPlan }) => {
  const isUser = msg.role === 'user';

  // Generated files card
  if (msg.type === 'files') {
    return (
      <div className="flex items-start gap-2.5 my-0.5">
        <div className="w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0 mt-0.5">
          <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <div className="flex flex-col gap-0.5 items-start">
          <span className="text-[10px] text-emerald-400/55 font-mono font-semibold px-1">ASH · File Generation Log</span>
          <div className="bg-[#040d07] border border-emerald-500/15 rounded-2xl rounded-tl-sm px-4 py-3 min-w-[260px]">
            <p className="text-[9px] text-white/28 font-mono font-semibold mb-2.5 uppercase tracking-widest">Generated for this build</p>
            <div className="space-y-1.5">
              {msg.files.map((f, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-[12px] text-white/65">{f.name}</span>
                  <span className="text-[9px] text-white/22 font-mono ml-auto">{f.tag}</span>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-white/18 font-mono mt-3 border-t border-white/5 pt-2">Saved to your build history · accessible from the timeline</p>
          </div>
          <span className="text-[10px] text-muted-foreground/30 px-1">
            {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    );
  }

  // Tool call in progress
  if (msg.type === 'tool_call') return <ToolCallCard tool={msg.tool} label={msg.label} />;
  // Web search result
  if (msg.type === 'search') return <SearchResultsCard data={msg.data} />;
  // Generated image
  if (msg.type === 'image') return <ImageResultCard data={msg.data} />;
  // Generated file/code
  if (msg.type === 'code') return <CodeFileCard data={msg.data} />;
  // Generated video
  if (msg.type === 'generated_video') return <GeneratedVideoCard data={msg.data} />;
  // Generated audio (TTS or music)
  if (msg.type === 'generated_audio') return <GeneratedAudioCard data={msg.data} label={msg.label} />;
  // Build-step AI error recovery card
  if (msg.type === 'error_recovery') return (
    <div className="flex items-start gap-2.5">
      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-red-500/20 border border-red-500/30">
        <AlertCircle className="w-3.5 h-3.5 text-red-400" />
      </div>
      <div className="flex-1 bg-red-500/8 border border-red-500/18 rounded-xl p-3 max-w-lg">
        <p className="text-[11px] font-mono font-semibold text-red-300 mb-1.5 flex items-center gap-1.5">
          <AlertCircle className="w-3 h-3" /> Step {msg.data?.stepNumber} failed — AI unavailable
        </p>
        <p className="text-[11px] text-white/60 font-mono mb-2 leading-relaxed">{msg.data?.stepDescription}</p>
        {msg.data?.explanation && (
          <p className="text-[11px] text-white/55 mb-2 leading-relaxed">{msg.data.explanation}</p>
        )}
        {msg.data?.message && (
          <p className="text-[10px] text-red-300/50 font-mono mb-3 truncate">{msg.data.message}</p>
        )}
        <div className="flex gap-2">
          <button onClick={msg.retryFn}
            className="text-[10px] font-mono font-semibold px-3 py-1.5 rounded-lg bg-violet-500/20 border border-violet-500/30 text-violet-300 hover:bg-violet-500/30 transition-colors flex items-center gap-1.5">
            <RotateCcw className="w-2.5 h-2.5" /> Retry
          </button>
          <button onClick={msg.skipFn}
            className="text-[10px] font-mono px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white/70 transition-colors">
            Skip step →
          </button>
        </div>
      </div>
    </div>
  );
  // Connector action result (success or failure with retry)
  if (msg.type === 'connector_action') return (
    <ConnectorActionCard
      data={msg.data}
      onRetry={msg.retryFn ? msg.retryFn : undefined}
    />
  );
  // Landing page created by ASH — includes inline mini-preview iframe
  if (msg.type === 'page_created') {
    return (
      <div className="flex items-start gap-2.5">
        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-violet-500/20 border border-violet-500/30">
          <LayoutTemplate className="w-3.5 h-3.5 text-violet-400" />
        </div>
        <div className="flex-1 bg-violet-500/8 border border-violet-500/18 rounded-xl p-3 max-w-lg">
          <p className="text-[11px] font-mono font-semibold text-violet-300 mb-1.5 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" /> Landing page created!
          </p>
          {msg.data && (
            <>
              <p className="text-[12px] text-white/75 font-medium mb-0.5">{msg.data.title}</p>
              <p className="text-[10px] font-mono text-white/35 mb-2">/{msg.data.slug}</p>
              {/* Inline mini-preview iframe */}
              {msg.data.htmlContent && (
                <div className="relative w-full mb-2 rounded-lg overflow-hidden border border-white/10 bg-black/30"
                  style={{ height: '140px' }}>
                  {/* srcdoc renders pre-fetched HTML — no token in URL, scripts blocked */}
                  <iframe
                    srcDoc={msg.data.htmlContent}
                    title="Landing page preview"
                    className="absolute inset-0 w-full h-full"
                    style={{ transform: 'scale(0.45)', transformOrigin: 'top left', width: '222%', height: '222%', border: 'none', pointerEvents: 'none' }}
                    sandbox=""
                  />
                </div>
              )}
              <div className="flex gap-2">
                {msg.data.isPublished && (
                  <a href={`/api/pages/${msg.data.slug}`} target="_blank" rel="noopener noreferrer"
                    className="text-[10px] font-mono text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors">
                    <ExternalLink className="w-2.5 h-2.5" /> View live
                  </a>
                )}
                <button onClick={() => { /* handled by right panel */ }}
                  className="text-[10px] font-mono text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors">
                  <LayoutTemplate className="w-2.5 h-2.5" /> See in Pages tab →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'items-start gap-2.5'}`}>
      {!isUser && (
        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${msg.streaming ? 'bg-violet-500/20 border border-violet-500/30' : 'bg-primary/20 border border-primary/30'}`}>
          <Wand2 className={`w-3.5 h-3.5 ${msg.streaming ? 'text-violet-400 animate-pulse' : 'text-primary'}`} />
        </div>
      )}
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} gap-0.5 max-w-[82%]`}>
        {!isUser && (
          <span className="text-[10px] text-white/30 font-mono font-semibold px-1">
            ASH{msg.streaming ? <span className="text-violet-400/60"> · writing…</span> : ''}
          </span>
        )}
        <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-sm shadow-lg shadow-primary/20'
            : msg.streaming
              ? 'bg-[#0c0b1c] border border-violet-500/15 text-white/90 rounded-tl-sm shadow-sm shadow-violet-900/10'
              : 'bg-[#111120] border border-white/12 text-white/90 rounded-tl-sm shadow-sm'
        }`}>
          {msg.content.split('\n').map((line, i) => {
            if (!line) return <br key={i} />;
            const boldParts = line.split(/\*\*(.+?)\*\*/);
            return (
              <p key={i} className={i > 0 ? 'mt-1' : ''}>
                {boldParts.map((part, j) =>
                  j % 2 === 1
                    ? <strong key={j} className="text-primary font-semibold">{linkify(part)}</strong>
                    : <React.Fragment key={j}>{linkify(part)}</React.Fragment>
                )}
              </p>
            );
          })}
          {msg.streaming && (
            <span className="inline-block w-0.5 h-[1em] bg-violet-400/80 animate-pulse ml-0.5 align-middle rounded-sm" />
          )}
          {msg.missingPlan && onConfirmPlan && (
            <div className="mt-3 pt-3 border-t border-violet-500/20">
              <button
                onClick={onConfirmPlan}
                className="flex items-center gap-1.5 text-xs font-semibold text-violet-300 hover:text-violet-100 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/25 rounded-lg px-3 py-1.5 transition-colors"
              >
                <span>Confirm this plan</span>
                <span className="text-violet-400">→</span>
              </button>
            </div>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground/30 px-1">
          {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
};

// ─── Execution Stream ─────────────────────────────────────────────────────────
const ExecutionStream = ({ steps, currentIdx, expandedSteps, onToggle }) => {
  const pct = steps.length > 0 ? Math.round((Math.min(currentIdx, steps.length) / steps.length) * 100) : 0;
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-7 h-7 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0 mt-0.5 shadow-lg shadow-violet-900/20">
        <Zap className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
      </div>
      <div className="flex flex-col gap-0.5 items-start flex-1 min-w-0">
        <div className="flex items-center gap-2 px-1">
          <span className="text-[10px] text-violet-400/60 font-mono font-semibold">ASH · Execution Engine</span>
          <span className="text-[9px] text-white/18 font-mono">
            step {Math.min(currentIdx + 1, steps.length)}/{steps.length}
          </span>
        </div>
        <div className="bg-[#0c0b1c] border border-violet-500/20 rounded-2xl rounded-tl-sm px-4 py-3 w-full shadow-lg shadow-violet-900/10">
          <div className="space-y-1">
            {steps.map((step, i) => {
              const done = i < currentIdx;
              const active = i === currentIdx;
              const isExpanded = expandedSteps?.has(i);
              const label = typeof step === 'string' ? step : step.label;
              const reasoning = typeof step === 'string' ? null : step.reasoning;
              return (
                <div key={i}>
                  <button
                    onClick={() => done && reasoning && onToggle(i)}
                    className={`flex items-center gap-2.5 w-full text-left rounded-lg px-2 py-1 transition-all duration-150 ${
                      done && reasoning ? 'hover:bg-white/4 cursor-pointer group' : 'cursor-default'
                    }`}
                  >
                    <span className="shrink-0 w-4 flex items-center justify-center">
                      {done ? (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      ) : active ? (
                        <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" />
                      ) : (
                        <Circle className="w-3 h-3 text-white/15" />
                      )}
                    </span>
                    <span className={`text-[12px] flex-1 transition-colors duration-300 ${
                      done ? 'text-white/35' : active ? 'text-white/90' : 'text-white/18'
                    }`}>
                      {label}
                    </span>
                    {done && reasoning && (
                      <span className="shrink-0 ml-1 opacity-0 group-hover:opacity-60 transition-opacity">
                        {isExpanded
                          ? <ChevronDown className="w-3 h-3 text-violet-400" />
                          : <ChevronRight className="w-3 h-3 text-white/30" />}
                      </span>
                    )}
                  </button>
                  {done && isExpanded && reasoning && (
                    <div className="ml-9 mr-2 mb-1.5 px-3 py-2 rounded-lg bg-violet-500/6 border border-violet-500/15 text-[11px] text-white/45 leading-relaxed">
                      {reasoning}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-white/6">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-mono text-white/18 uppercase tracking-wider">Execution Progress</span>
              <span className="text-[9px] font-mono text-violet-400/50">{pct}%</span>
            </div>
            <div className="h-0.5 bg-white/6 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-600 to-violet-400 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-[9px] text-white/15 font-mono mt-2">↑ Click completed steps to see ASH reasoning</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Progress Tracker ─────────────────────────────────────────────────────────
const TRACKER_PHASES = [
  { label: 'Goal Analysis', Icon: Target },
  { label: 'Blueprint',     Icon: BookOpen },
  { label: 'Architecture',  Icon: Building2 },
  { label: 'System Build',  Icon: Cpu },
  { label: 'Activate',      Icon: Rocket },
];

const ProgressTracker = ({ phase }) => {
  const activeIdx =
    phase === 'complete'   ? 5 :
    phase === 'building'   ? 3 :
    phase === 'collecting' ? 2 :
    phase === 'planning'   ? 1 : 0;

  return (
    <div className="shrink-0 border-b border-white/8 bg-black/30 px-5 py-2.5">
      <div className="flex items-center">
        {TRACKER_PHASES.map(({ label, Icon }, i) => {
          const done    = i < activeIdx;
          const active  = i === activeIdx && phase !== 'idle';
          const pending = !done && !active;
          return (
            <React.Fragment key={i}>
              {i > 0 && (
                <div className={`flex-1 h-px mx-2 transition-colors duration-500 ${done ? 'bg-emerald-500/30' : active ? 'bg-violet-500/20' : 'bg-white/8'}`} />
              )}
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 ${
                  done    ? 'bg-emerald-500/15 border border-emerald-500/40' :
                  active  ? 'bg-violet-500/20 border border-violet-500/50' :
                            'bg-white/4 border border-white/10'
                }`}>
                  {done
                    ? <CheckCircle className="w-3 h-3 text-emerald-400" />
                    : <Icon className={`w-3 h-3 ${active ? 'text-violet-400 animate-pulse' : 'text-white/18'}`} />
                  }
                </div>
                <span className={`text-[8px] font-mono font-semibold text-center leading-tight ${
                  done ? 'text-emerald-400/50' : active ? 'text-violet-400/80' : 'text-white/18'
                }`}>{label}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

// ─── Checkpoint Marker (inline in chat thread) ─────────────────────────────────
const CheckpointMarker = ({ cp, onRestore }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="my-2">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center gap-2 group">
        <div className="flex-1 h-px bg-white/8 group-hover:bg-emerald-500/20 transition-colors" />
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 border border-emerald-500/20 hover:border-emerald-500/35 transition-all shrink-0">
          <CheckCircle className="w-2.5 h-2.5 text-emerald-400/60" />
          <span className="text-[10px] text-white/45 font-mono font-semibold">Build v{cp.versionNum}</span>
          <span className="text-[9px] text-white/22 font-mono">· {formatTs(cp.ts)}</span>
          {open
            ? <ChevronDown className="w-2.5 h-2.5 text-white/25" />
            : <ChevronRight className="w-2.5 h-2.5 text-white/25" />}
        </div>
        <div className="flex-1 h-px bg-white/8 group-hover:bg-emerald-500/20 transition-colors" />
      </button>
      {open && (
        <div className="mx-2 mt-2 rounded-xl border border-emerald-500/15 bg-[#030d06] p-3.5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
                <Save className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-[12px] text-white/70 font-semibold">Checkpoint v{cp.versionNum}</p>
                <p className="text-[9px] text-white/30 font-mono">{new Date(cp.ts).toLocaleString()}</p>
              </div>
            </div>
            <span className="text-[9px] font-mono text-emerald-400/70 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">
              {cp.msgCount} messages
            </span>
          </div>
          <p className="text-[10px] text-white/28 font-mono leading-relaxed border-t border-white/5 pt-2.5">
            ASH saved the full conversation state here. Redo from this point to rebuild everything after it, or restore to continue from here.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onRestore}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-violet-500/30 bg-violet-500/8 hover:bg-violet-500/14 transition-all text-[11px] text-violet-300 font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Redo From Here
            </button>
            <button
              onClick={onRestore}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-white/12 bg-white/4 hover:bg-white/6 transition-all text-[11px] text-white/45 font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Restore State
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Plan Review Card ─────────────────────────────────────────────────────────
// Interactive plan card shown after ASH presents a plan.
// User can review each step, type edit requests inline, then confirm to build.
const PlanReviewCard = ({ planData, aiMode, chatLoading, onConfirm, onEdit }) => {
  const [editDraft, setEditDraft] = React.useState('');
  const [editOpen, setEditOpen] = React.useState(false);
  const editRef = React.useRef(null);

  const handleEditSubmit = () => {
    const text = editDraft.trim();
    if (!text) return;
    onEdit(text);
    setEditDraft('');
    setEditOpen(false);
  };

  const modeMultipliers = { fast: 1.0, business: 1.5, expert: 2.5, empire: 4.0 };
  const stepCount = planData?.buildSteps?.length ?? 5;
  const mult = modeMultipliers[aiMode] ?? 1.0;
  const raw = Math.round((50 + stepCount * 20) * mult);
  const estimate = Math.ceil(raw / 25) * 25;
  const minMin = Math.round(stepCount * (aiMode === 'fast' ? 1.5 : aiMode === 'business' ? 2.5 : aiMode === 'expert' ? 4 : 6));
  const maxMin = Math.round(stepCount * (aiMode === 'fast' ? 3 : aiMode === 'business' ? 5 : aiMode === 'expert' ? 8 : 12));

  return (
    <div className="rounded-xl border border-violet-500/25 bg-violet-500/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 bg-violet-500/8 border-b border-violet-500/15">
        <div className="w-7 h-7 rounded-full bg-violet-500/25 border border-violet-500/35 flex items-center justify-center shrink-0">
          <Brain className="w-3.5 h-3.5 text-violet-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">Review Your Build Plan</p>
          <p className="text-[10px] text-violet-300/60 font-mono truncate">
            {planData.systemName || 'Custom System'} · {stepCount} steps · built from scratch by ASH
          </p>
        </div>
        <span className="text-[9px] font-mono text-violet-400/65 bg-violet-500/15 border border-violet-500/25 rounded-full px-2 py-0.5 shrink-0">
          READY TO REVIEW
        </span>
      </div>

      <div className="p-4 space-y-3.5">
        {/* Steps */}
        {planData.buildSteps?.length > 0 && (
          <div className="space-y-2">
            <p className="text-[9px] text-white/30 font-mono uppercase tracking-widest flex items-center gap-1.5">
              <Layers className="w-3 h-3" /> Build Steps — Read each one carefully
            </p>
            <div className="space-y-1.5">
              {planData.buildSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-2.5 bg-black/20 rounded-lg px-3 py-2.5 border border-white/6 hover:border-white/10 transition-colors">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-[9px] font-bold font-mono text-violet-300 mt-0.5">{i + 1}</span>
                  <span className="text-[11px] text-white/70 leading-relaxed pt-0.5">{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cost estimate */}
        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg bg-amber-500/5 border border-amber-500/15">
          <div className="flex items-center gap-2">
            <DollarSign className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-[11px] text-white/50 font-mono">Estimated build cost</span>
            <span className="text-[10px] text-white/22 font-mono hidden sm:inline">· {aiMode} mode</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[12px] font-bold font-mono text-amber-400 tabular-nums">~{estimate.toLocaleString()} credits</span>
            <span className="text-[10px] text-white/30 font-mono">{minMin}–{maxMin} min</span>
          </div>
        </div>

        {/* Edit section */}
        <div className="rounded-lg border border-white/10 bg-black/25 overflow-hidden">
          <button
            onClick={() => { setEditOpen(v => !v); if (!editOpen) setTimeout(() => editRef.current?.focus(), 50); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-white/3 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5 text-white/35 shrink-0" />
            <span className="text-[11px] text-white/45 flex-1">Want to change something? Tell ASH what to edit…</span>
            <ChevronDown className={`w-3.5 h-3.5 text-white/25 transition-transform ${editOpen ? 'rotate-180' : ''}`} />
          </button>
          {editOpen && (
            <div className="border-t border-white/8 p-3 space-y-2">
              <textarea
                ref={editRef}
                value={editDraft}
                onChange={e => setEditDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSubmit(); } }}
                placeholder={'e.g. "Change step 3 to use ConvertKit instead of Mailchimp" or "Add a YouTube automation step" or "Focus more on organic traffic instead of paid ads"'}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-[11px] text-white/70 placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 resize-none font-mono"
                rows={3}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleEditSubmit}
                  disabled={!editDraft.trim() || chatLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/35 text-violet-300 text-[11px] font-semibold disabled:opacity-30 transition-colors"
                >
                  <Wand2 className="w-3 h-3" /> Update Plan
                </button>
                <span className="text-[10px] text-white/20 font-mono">Enter to send · ASH will revise the entire plan</span>
              </div>
            </div>
          )}
        </div>

        {/* Confirm */}
        <div className="pt-1 border-t border-white/8">
          <p className="text-[10px] text-white/28 font-mono text-center mb-2.5">Happy with the plan? Start the build.</p>
          <Button
            onClick={onConfirm}
            disabled={chatLoading}
            className="w-full gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold h-11 text-sm"
          >
            {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
            Confirm Plan — Start Building
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── Build Terminal ───────────────────────────────────────────────────────────
const BuildTerminal = ({ steps, outputs, currentIdx, instanceId, phase, liveMode, setLiveMode, stepConnectorResults = {}, preflightWarnings = [] }) => {
  const bottomRef = useRef(null);
  const navigate = useNavigate();
  const isComplete = currentIdx >= steps.length && steps.length > 0 && phase === 'complete';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [outputs, currentIdx, isComplete]);

  return (
    <div className="flex flex-col h-full bg-black/90 rounded-xl border border-white/10 overflow-hidden font-mono relative">
      {/* macOS chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-black/60 shrink-0">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-rose-500/80" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
        </div>
        <span className="text-[11px] text-muted-foreground/50 ml-3 flex items-center gap-2">
          <Terminal className="w-3 h-3" />
          ASH Build Engine · Autonomous Mode
        </span>
        <div className="ml-auto flex items-center gap-3">
          {phase === 'building' ? (
            <>
              <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-semibold">RUNNING</span>
            </>
          ) : phase === 'complete' ? (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] text-emerald-400 font-semibold">COMPLETE</span>
            </>
          ) : (
            <span className="text-[10px] text-muted-foreground/30">IDLE</span>
          )}
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Step sidebar */}
        {steps.length > 0 && (
          <div className="w-40 shrink-0 border-r border-white/8 bg-black/40 overflow-y-auto py-3 px-2 space-y-1 ash-scroll">
            <div className="flex items-center justify-between px-2 mb-2">
              <p className="text-[9px] text-muted-foreground/30 uppercase tracking-widest">Steps</p>
              {/* Live / Demo toggle */}
              <button
                onClick={() => setLiveMode(l => !l)}
                title={liveMode ? 'Live mode — real API calls' : 'Demo mode — simulated output'}
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold border transition-all ${
                  liveMode
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                    : 'bg-white/5 border-white/10 text-muted-foreground/40 hover:border-white/20'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${liveMode ? 'bg-rose-400 animate-pulse' : 'bg-white/20'}`} />
                {liveMode ? 'LIVE' : 'DEMO'}
              </button>
            </div>
            {/* Pre-flight warnings — missing credentials */}
            {liveMode && preflightWarnings.length > 0 && (
              <div className="mx-2 mb-2 px-2 py-1.5 rounded bg-amber-500/10 border border-amber-500/25">
                <p className="text-[8px] text-amber-400 font-bold uppercase tracking-wide mb-1">Missing credentials</p>
                {preflightWarnings.map(w => (
                  <p key={w.id} className="text-[8px] text-amber-300/80 leading-tight">⚠ {w.name}</p>
                ))}
                <a href="/connections" className="block mt-1 text-[8px] text-amber-400 underline">Connect →</a>
              </div>
            )}
            {steps.map((step, i) => {
              const isDone = i < currentIdx;
              const isActive = i === currentIdx && phase === 'building';
              const tag = classifyStep(step.stepNumber, steps.length);
              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-2 px-2 py-2 rounded-lg text-[10px] transition-colors ${
                    isActive
                      ? 'bg-primary/15 text-primary border border-primary/20'
                      : isDone
                      ? 'text-emerald-400/70'
                      : 'text-muted-foreground/25'
                  }`}
                >
                  <span className="shrink-0 text-[10px]">
                    {isDone ? '✓' : isActive ? '▶' : String(i + 1).padStart(2, '0')}
                  </span>
                  <span className={`leading-tight text-[9px] font-bold ${tag.cls} opacity-60`}>
                    {tag.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Output area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5 text-xs ash-scroll">

          {/* Idle placeholder */}
          {phase === 'idle' && steps.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-4 opacity-30">
              <Terminal className="w-12 h-12 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm text-muted-foreground font-semibold">ASH Build Engine</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Awaiting build instructions…</p>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground/50 text-[10px]">
                <span className="text-primary animate-pulse">█</span>
                <span>ready_</span>
              </div>
            </div>
          )}

          {/* Per-step output lines */}
          {steps.map((step, i) => {
            const isDone = i < currentIdx;
            const isActive = i === currentIdx && phase === 'building';
            const isPending = i > currentIdx;
            const tag = classifyStep(step.stepNumber, steps.length);

            return (
              <React.Fragment key={step.id}>
                {/* Step header line */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isPending ? 0.2 : 1 }}
                  className="flex items-start gap-2 py-0.5"
                >
                  <span className={`shrink-0 w-4 text-center mt-0.5 ${
                    isDone ? 'text-emerald-400' : isActive ? 'text-primary' : 'text-muted-foreground/30'
                  }`}>
                    {isDone ? '✓' : isActive ? '▶' : '○'}
                  </span>
                  <span>
                    <span className="text-muted-foreground/30">[{String(step.stepNumber).padStart(2, '0')}/{String(steps.length).padStart(2, '0')}] </span>
                    <span className={`font-semibold mr-1.5 ${tag.cls}`}>{tag.label}</span>
                    <span className={isDone ? 'text-emerald-400/80' : isActive ? 'text-foreground' : 'text-muted-foreground/30'}>
                      {step.notes}
                    </span>
                    {/* Live vs Demo execution badge — visible once step is done */}
                    {isDone && (
                      liveMode && (stepConnectorResults[step.id]?.length > 0)
                        ? <span className="ml-1.5 inline-flex items-center gap-0.5 px-1 py-0 rounded text-[8px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            ⚡ LIVE
                          </span>
                        : <span className="ml-1.5 inline-flex items-center gap-0.5 px-1 py-0 rounded text-[8px] font-bold bg-white/5 text-white/25 border border-white/10">
                            ∷ SIM
                          </span>
                    )}
                  </span>
                </motion.div>

                {/* Active — spinning cursor */}
                {isActive && !outputs[step.id] && (
                  <div className="ml-6 flex items-center gap-1.5 text-primary/60 py-0.5">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    <span className="text-[10px]">executing</span>
                    <span className="text-primary animate-pulse">█</span>
                  </div>
                )}

                {/* Output with typing animation */}
                {outputs[step.id] && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="ml-6 pl-3 border-l-2 border-white/8 text-muted-foreground/60 leading-relaxed py-0.5"
                  >
                    <TypedText text={outputs[step.id]} speed={12} />
                  </motion.div>
                )}

                {/* Connector execution results (live mode) */}
                {stepConnectorResults[step.id]?.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="ml-6 mt-0.5 mb-0.5 space-y-0.5"
                  >
                    {stepConnectorResults[step.id].map((r, idx) => (
                      <span
                        key={idx}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono border ${
                          r.ok
                            ? 'bg-rose-500/12 border-rose-500/25 text-rose-300'
                            : 'bg-orange-500/12 border-orange-500/25 text-orange-300'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${r.ok ? 'bg-rose-400 animate-pulse' : 'bg-orange-400'}`} />
                        {r.ok ? '⚡' : '⚠'} {r.connectorName} → {r.action} {r.ok ? `(${r.latencyMs}ms)` : 'failed'}
                      </span>
                    ))}
                  </motion.div>
                )}
              </React.Fragment>
            );
          })}

          {/* SYSTEM DEPLOYED banner */}
          <AnimatePresence>
            {isComplete && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/8 p-4"
              >
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-bold tracking-widest text-sm">SYSTEM DEPLOYED</span>
                </div>
                <p className="text-[11px] text-emerald-400/60 mb-3">
                  All {steps.length} build steps completed. Your system is live and running.
                </p>
                <button
                  onClick={() => navigate(`/systems/${instanceId}`)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/30 transition-colors"
                >
                  View System <ExternalLink className="w-3 h-3" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
};

// ─── Session persistence helpers ──────────────────────────────────────────────
const WELCOME_MSG = {
  id: 'welcome',
  role: 'assistant',
  content: "Hey — I'm ASH, your AI business partner.\n\nTell me what you want to build or what income goal you're going after. We can just talk through ideas first, or if you're ready to go I'll put together a full build plan and execute the whole system for you.\n\nWhat's on your mind?",
  ts: Date.now(),
};

const sessionKey = (userId) => `sbep_builder_v1_${userId}`;

const loadSession = (userId) => {
  try {
    const raw = localStorage.getItem(sessionKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const clearStoredSession = (userId) => {
  try { localStorage.removeItem(sessionKey(userId)); } catch {}
};

// ─── Checkpoint helpers ────────────────────────────────────────────────────────
const checkpointsKey = (userId) => `sbep_checkpoints_v1_${userId}`;
const MAX_CHECKPOINTS = 12;

const formatTs = (ts) => {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const isYesterday = d.toDateString() === new Date(now - 86400000).toDateString();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Today ${time}`;
  if (isYesterday) return `Yesterday ${time}`;
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`;
};

const getCheckpoints = (userId) => {
  try {
    const raw = localStorage.getItem(checkpointsKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const saveCheckpoint = (userId, { messages, phase, buildData, stepOutputs, currentStepIdx, activatedSkills, mode, selectedBp }) => {
  if (!userId) return;
  const userMsgs = messages.filter(m => m.id !== 'welcome' && m.role === 'user');
  if (userMsgs.length === 0) return;
  const summary = userMsgs[0]?.content?.slice(0, 60) || 'Conversation';
  const checkpoint = {
    id: Date.now(),
    ts: Date.now(),
    summary,
    messageCount: messages.filter(m => m.id !== 'welcome').length,
    phase,
    messages,
    buildData,
    stepOutputs,
    currentStepIdx,
    activatedSkills,
    mode,
    selectedBp,
  };
  try {
    const existing = getCheckpoints(userId);
    const updated = [checkpoint, ...existing].slice(0, MAX_CHECKPOINTS);
    localStorage.setItem(checkpointsKey(userId), JSON.stringify(updated));
  } catch {}
};

// ─── Builder Page ─────────────────────────────────────────────────────────────
const BuilderPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();

  // Mode: 'blueprint' | 'custom'
  const [mode, setMode] = useState('custom');

  // Blueprint data
  const [blueprints, setBlueprints] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCatId, setActiveCatId] = useState(null);
  const [selectedBp, setSelectedBp] = useState(null);
  const [bpLoading, setBpLoading] = useState(false);

  // Stored credential prefill map: { [credentialKey]: '•••' (masked placeholder) }
  const [storedCredKeys, setStoredCredKeys] = useState({});

  // AI Agent Power Mode
  const [aiMode, setAiMode] = useState(() => {
    try { return localStorage.getItem(aiModeStorageKey(currentUser?.id)) || 'fast'; } catch { return 'fast'; }
  });

  // Persist AI mode to localStorage on change
  useEffect(() => {
    if (!currentUser?.id) return;
    try { localStorage.setItem(aiModeStorageKey(currentUser.id), aiMode); } catch {}
  }, [aiMode, currentUser?.id]);

  // Plan / Build chat mode
  const [chatMode, setChatMode] = useState(() => {
    try { return localStorage.getItem(chatModeStorageKey(currentUser?.id)) || 'build'; } catch { return 'build'; }
  });
  const isPlanMode = chatMode === 'plan';

  useEffect(() => {
    if (!currentUser?.id) return;
    try { localStorage.setItem(chatModeStorageKey(currentUser.id), chatMode); } catch {}
  }, [chatMode, currentUser?.id]);

  const userTier = (currentUser?.membershipTier || 'free').toLowerCase();
  const isEmpireTier = userTier === 'empire' || userTier === 'operator';
  const isFounderAdmin = currentUser?.role === 'FOUNDER_ADMIN';

  // Business context
  const [businessType, setBusinessType] = useState(() => {
    try { return localStorage.getItem(`sbep_biz_${currentUser?.id}`) || undefined; } catch { return undefined; }
  });
  const [revenueGoal, setRevenueGoal] = useState(() => {
    try { return localStorage.getItem(`sbep_goal_${currentUser?.id}`) || ''; } catch { return ''; }
  });
  const [showRevenueGoalInput, setShowRevenueGoalInput] = useState(false);

  useEffect(() => {
    if (!currentUser?.id) return;
    try { localStorage.setItem(`sbep_biz_${currentUser.id}`, businessType ?? ''); } catch {}
  }, [businessType, currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id) return;
    try { localStorage.setItem(`sbep_goal_${currentUser.id}`, revenueGoal); } catch {}
  }, [revenueGoal, currentUser?.id]);

  // Phase machine
  const [phase, setPhase] = useState('idle');

  // Chat — starts empty; welcome message injected after session check
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState('');

  // Skill Engine
  const [activatedSkills, setActivatedSkills] = useState([]);

  // Browser agent state
  const [activeBrowser, setActiveBrowser] = useState(null); // {task, startUrl, msgId}

  // Streaming + thinking display state
  const [thinkingSteps, setThinkingSteps] = useState([]);
  const [thinkingCurrentIdx, setThinkingCurrentIdx] = useState(-1);
  const [expandedSteps, setExpandedSteps] = useState(new Set());
  const [lastGenFiles, setLastGenFiles] = useState([]);

  // Credential collection
  const [pendingCreds, setPendingCreds] = useState([]);
  const [pendingPlanData, setPendingPlanData] = useState(null);
  const [executeLoading, setExecuteLoading] = useState(false);
  const [liftedCredValues, setLiftedCredValues] = useState({});

  // Build execution
  const [buildData, setBuildData] = useState(null);
  const [stepOutputs, setStepOutputs] = useState({});
  const [stepConnectorResults, setStepConnectorResults] = useState({});
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [stepExecuting, setStepExecuting] = useState(false);
  const [stepPaused, setStepPaused] = useState(false); // true when recovery card is shown
  const [liveMode, setLiveMode] = useState(false);
  const [preflightWarnings, setPreflightWarnings] = useState([]);
  // Auto-enable live mode if user has stored credentials
  useEffect(() => {
    const token = localStorage.getItem('sbep_auth_token');
    if (!token) return;
    fetch('/api/user-credentials', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(creds => { if (Array.isArray(creds) && creds.length > 0) setLiveMode(true); })
      .catch(() => {});
  }, []);
  const [showRevenueModal, setShowRevenueModal] = useState(false);

  const chatBottomRef = useRef(null);
  const inputRef = useRef(null);
  const attachImgRef = useRef(null);
  const attachFileRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Message box toolbar state
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showAiDropdown, setShowAiDropdown] = useState(false);
  const [attachments, setAttachments] = useState([]);

  // Active side panel: null | 'explorer' | 'blueprints' | 'tools' | 'settings'
  const [activeSidePanel, setActiveSidePanel] = useState('explorer');

  // Right resource panel tab
  const [rightPanel, setRightPanel] = useState('blueprints');

  // Checkpoints — loaded from localStorage, refreshed after each save
  const [checkpoints, setCheckpoints] = useState([]);
  // Right panel search query
  const [rightSearch, setRightSearch] = useState('');

  // Library (right) panel open/closed
  const [libraryOpen, setLibraryOpen] = useState(true);

  // Pages panel state
  const [builderPages, setBuilderPages] = useState([]);
  const [builderPagesLoading, setBuilderPagesLoading] = useState(false);
  const [pageEditorPage, setPageEditorPage] = useState(null);
  const [pageEditorHtml, setPageEditorHtml] = useState('');
  const [selectedPage, setSelectedPage] = useState(null); // tracks last page clicked in the Pages panel (for top-bar preview button)
  const [pageEditorSaving, setPageEditorSaving] = useState(false);
  const [pageEditorPublishing, setPageEditorPublishing] = useState(false);

  // DB-backed session history
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [savedSessions, setSavedSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // User's system instances for the file tree
  const [userSystems, setUserSystems] = useState([]);
  const [systemsLoading, setSystemsLoading] = useState(false);
  const [expandedSystems, setExpandedSystems] = useState({});   // { [id]: true }
  const [expandedFolders, setExpandedFolders] = useState({});   // { [id+folder]: true }

  // ── Voice interface state ──────────────────────────────────────────────────
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    try { return localStorage.getItem('sbep_voice_enabled') === 'true'; } catch { return false; }
  });
  const [voiceCallMode, setVoiceCallMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTTSPlaying, setIsTTSPlaying] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceLastTranscript, setVoiceLastTranscript] = useState('');
  const [voiceLastResponse, setVoiceLastResponse] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const ttsAudioRef = useRef(null);

  const toggleVoiceEnabled = useCallback(() => {
    setVoiceEnabled(v => {
      const next = !v;
      try { localStorage.setItem('sbep_voice_enabled', String(next)); } catch { /* ignore */ }
      if (!next) {
        setVoiceCallMode(false);
        ttsAudioRef.current?.pause();
        setIsTTSPlaying(false);
      }
      return next;
    });
  }, []);

  const playTTS = useCallback(async (text) => {
    if (!voiceEnabled || !text || isTTSPlaying) return;
    const clean = text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`[^`]+`/g, '')
      .replace(/#{1,6}\s/g, '')
      .replace(/[*_~]/g, '')
      .replace(/https?:\/\/\S+/g, 'link')
      .replace(/<[^>]+>/g, '')
      .trim()
      .slice(0, 1200);
    if (!clean) return;
    const voicePreset = (() => { try { return localStorage.getItem('sbep_voice_preset') ?? 'warm narrator'; } catch { return 'warm narrator'; } })();
    const voiceSpeed  = (() => { try { const s = parseFloat(localStorage.getItem('sbep_voice_speed') ?? '1'); return isNaN(s) ? 1 : Math.max(0.5, Math.min(s, 2)); } catch { return 1; } })();
    try {
      setIsTTSPlaying(true);
      const res = await fetch('/api/media-gen/tts', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ text: clean, voice: voicePreset }),
      });
      const data = await res.json();
      if (data.audioBase64) {
        const audio = new Audio(`data:${data.mimeType ?? 'audio/mpeg'};base64,${data.audioBase64}`);
        audio.playbackRate = voiceSpeed;
        ttsAudioRef.current = audio;
        audio.onended = () => setIsTTSPlaying(false);
        audio.onerror = () => setIsTTSPlaying(false);
        setVoiceLastResponse(clean.slice(0, 180));
        await audio.play();
      } else {
        setIsTTSPlaying(false);
      }
    } catch {
      setIsTTSPlaying(false);
    }
  }, [voiceEnabled, isTTSPlaying]);

  const startVoiceRecording = useCallback(async () => {
    if (isRecording || isTranscribing) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg' });
      audioChunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mr.mimeType });
        audioChunksRef.current = [];
        setIsTranscribing(true);
        try {
          const form = new FormData();
          form.append('audio', blob, 'voice.webm');
          const res = await fetch('/api/ai-orchestrator/transcribe', {
            method: 'POST',
            headers: { Authorization: `Bearer ${localStorage.getItem('sbep_auth_token') ?? ''}` },
            body: form,
          });
          const data = await res.json();
          if (data.text) {
            setVoiceLastTranscript(data.text);
            setInput(data.text);
            setTimeout(() => sendMessage(data.text), 400);
          }
        } catch {
          toast.error('Transcription failed — please type your message');
        } finally {
          setIsTranscribing(false);
        }
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
    } catch {
      toast.error('Microphone access denied');
    }
  }, [isRecording, isTranscribing]);

  const stopVoiceRecording = useCallback(() => {
    if (!isRecording || !mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }, [isRecording]);

  // ASH Workspace state
  const [generatedFiles, setGeneratedFiles] = useState([]);
  const [ashMemory, setAshMemory] = useState([]);
  const [leftSideTab, setLeftSideTab] = useState('tasks');
  const [filesCopied, setFilesCopied] = useState(null);
  const [showAllCheckpoints, setShowAllCheckpoints] = useState(false);
  const [expandedSessionId, setExpandedSessionId] = useState(null);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  // Track whether we've loaded (or decided not to load) a saved session
  const sessionLoadedRef = useRef(false);

  // ── Restore session from localStorage once currentUser is known ───────────
  useEffect(() => {
    if (!currentUser?.id || sessionLoadedRef.current) return;
    sessionLoadedRef.current = true;

    const saved = loadSession(currentUser.id);
    if (saved && Array.isArray(saved.messages) && saved.messages.length > 0) {
      setMessages(saved.messages);
      setPhase(saved.phase ?? 'idle');
      setActivatedSkills(saved.activatedSkills ?? []);
      if (saved.buildData) setBuildData(saved.buildData);
      if (saved.stepOutputs) setStepOutputs(saved.stepOutputs);
      if (typeof saved.currentStepIdx === 'number') setCurrentStepIdx(saved.currentStepIdx);
      if (saved.mode) setMode(saved.mode);
      if (saved.selectedBp) setSelectedBp(saved.selectedBp);
      if (saved.pendingCreds?.length > 0) setPendingCreds(saved.pendingCreds);
      if (saved.pendingBlueprint) pendingBlueprintRef.current = saved.pendingBlueprint;
      if (saved.pendingSystemName) pendingSystemNameRef.current = saved.pendingSystemName;
    } else {
      setMessages([WELCOME_MSG]);
    }
    // Load saved checkpoints
    setCheckpoints(getCheckpoints(currentUser.id));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // ── Persist session to localStorage whenever relevant state changes ────────
  useEffect(() => {
    if (!currentUser?.id || !sessionLoadedRef.current) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(sessionKey(currentUser.id), JSON.stringify({
          messages,
          phase,
          activatedSkills,
          buildData,
          stepOutputs,
          currentStepIdx,
          mode,
          selectedBp,
          pendingCreds,
          pendingBlueprint: pendingBlueprintRef.current,
          pendingSystemName: pendingSystemNameRef.current,
        }));
      } catch {}
    }, 400);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, phase, activatedSkills, buildData, stepOutputs, currentStepIdx, mode, selectedBp, pendingCreds, currentUser?.id]);

  // ── Load saved sessions from DB ───────────────────────────────────────────
  const loadSavedSessions = useCallback(async () => {
    if (!currentUser?.id) return;
    setSessionsLoading(true);
    try {
      const resp = await fetch('/api/chat-sessions', { headers: authHeaders() });
      if (resp.ok) setSavedSessions((await resp.json()) || []);
    } catch {} finally { setSessionsLoading(false); }
  }, [currentUser?.id]);

  useEffect(() => { loadSavedSessions(); }, [loadSavedSessions]);

  // ── Save / update current session in DB ──────────────────────────────────
  const saveSessionToDB = useCallback(async (sessionId, msgs, phs, bd, so, csi, md, sbp, as_) => {
    if (!currentUser?.id) return null;
    const userMsgs = msgs.filter(m => m.id !== 'welcome' && m.role === 'user');
    if (userMsgs.length === 0) return null;
    const title = (userMsgs[0]?.content || 'New Session').slice(0, 80);
    const body = JSON.stringify({
      title,
      stateJson: JSON.stringify({ messages: msgs, phase: phs, buildData: bd, stepOutputs: so, currentStepIdx: csi, mode: md, selectedBp: sbp, activatedSkills: as_ }),
      messageCount: msgs.filter(m => m.id !== 'welcome').length,
      phase: phs,
    });
    try {
      if (sessionId) {
        await fetch(`/api/chat-sessions/${sessionId}`, { method: 'PUT', headers: authHeaders(), body });
        return sessionId;
      } else {
        const resp = await fetch('/api/chat-sessions', { method: 'POST', headers: authHeaders(), body });
        if (resp.ok) { const d = await resp.json(); return d.id; }
      }
    } catch {}
    return null;
  }, [currentUser?.id]);

  // ── Auto-save to DB after each assistant reply ────────────────────────────
  const autoSaveTimerRef = useRef(null);
  useEffect(() => {
    if (!sessionLoadedRef.current || !currentUser?.id) return;
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== 'assistant' || lastMsg.id === 'welcome') return;
    clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      const newId = await saveSessionToDB(currentSessionId, messages, phase, buildData, stepOutputs, currentStepIdx, mode, selectedBp, activatedSkills);
      if (newId && !currentSessionId) {
        setCurrentSessionId(newId);
        setSavedSessions(prev => {
          const exists = prev.some(s => s.id === newId);
          return exists ? prev : [{ id: newId, title: (messages.find(m => m.role === 'user' && m.id !== 'welcome')?.content || 'New Session').slice(0, 80), messageCount: messages.filter(m => m.id !== 'welcome').length, phase, updatedAt: new Date().toISOString() }, ...prev];
        });
      } else if (newId) {
        setSavedSessions(prev => prev.map(s => s.id === newId ? { ...s, updatedAt: new Date().toISOString(), messageCount: messages.filter(m => m.id !== 'welcome').length, phase } : s));
      }
    }, 2500);
    return () => clearTimeout(autoSaveTimerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // ── Auto-open RevenueSetupModal when backend emits prompt_revenue_setup ─────
  useEffect(() => {
    if (phase !== 'complete' || !buildData?.instanceId) return;
    let cancelled = false;
    const token = localStorage.getItem('sbep_auth_token');
    fetch(`/api/system-instances/${buildData.instanceId}/activity`, {
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
      .then(r => r.ok ? r.json() : [])
      .then(events => {
        if (cancelled) return;
        const hasPrompt = Array.isArray(events) && events.some(e =>
          e.eventType === 'action' && (e.description === 'prompt_revenue_setup' || (e.metadata && JSON.parse(e.metadata || '{}').action === 'prompt_revenue_setup'))
        );
        if (hasPrompt) {
          setTimeout(() => { if (!cancelled) setShowRevenueModal(true); }, 1500);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [phase, buildData?.instanceId]);

  // ── Restore a session from DB ─────────────────────────────────────────────
  const restoreSession = useCallback(async (session) => {
    try {
      const resp = await fetch(`/api/chat-sessions/${session.id}`, { headers: authHeaders() });
      if (!resp.ok) { toast.error('Could not load session'); return; }
      const data = await resp.json();
      const state = JSON.parse(data.stateJson || '{}');
      if (Array.isArray(state.messages) && state.messages.length > 0) {
        setMessages(state.messages);
        setPhase(['complete', 'planning'].includes(state.phase) ? 'idle' : (state.phase ?? 'idle'));
        setActivatedSkills(state.activatedSkills ?? []);
        setBuildData(state.buildData ?? null);
        setStepOutputs(state.stepOutputs ?? {});
        setCurrentStepIdx(state.currentStepIdx ?? 0);
        setMode(state.mode ?? 'custom');
        setSelectedBp(state.selectedBp ?? null);
        setPendingCreds([]);
        setError('');
        setInput('');
        setCurrentSessionId(session.id);
        toast.success('Session restored', { description: session.title });
      }
    } catch { toast.error('Failed to restore session'); }
  }, []);

  // ── Delete a session from DB ──────────────────────────────────────────────
  const deleteSession = useCallback(async (sessionId, e) => {
    e.stopPropagation();
    try {
      await fetch(`/api/chat-sessions/${sessionId}`, { method: 'DELETE', headers: authHeaders() });
      setSavedSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSessionId === sessionId) setCurrentSessionId(null);
    } catch { toast.error('Failed to delete session'); }
  }, [currentSessionId]);

  // ── Reset to a fresh session ───────────────────────────────────────────────
  const clearSession = useCallback(async () => {
    // Archive current session to DB before clearing
    const userMsgs = messages.filter(m => m.id !== 'welcome' && m.role === 'user');
    if (userMsgs.length > 0) {
      const savedId = await saveSessionToDB(currentSessionId, messages, phase, buildData, stepOutputs, currentStepIdx, mode, selectedBp, activatedSkills);
      if (savedId) {
        const title = (userMsgs[0]?.content || 'New Session').slice(0, 80);
        setSavedSessions(prev => {
          const exists = prev.some(s => s.id === savedId);
          if (exists) return prev.map(s => s.id === savedId ? { ...s, title, updatedAt: new Date().toISOString(), messageCount: userMsgs.length, phase } : s);
          return [{ id: savedId, title, messageCount: userMsgs.length, phase, updatedAt: new Date().toISOString() }, ...prev];
        });
      }
    }
    clearStoredSession(currentUser?.id);
    setCurrentSessionId(null);
    setMessages([WELCOME_MSG]);
    setPhase('idle');
    setActivatedSkills([]);
    setBuildData(null);
    setStepOutputs({});
    setCurrentStepIdx(0);
    setMode('custom');
    setSelectedBp(null);
    setPendingCreds([]);
    setPendingPlanData(null);
    setError('');
    setInput('');
    pendingBlueprintRef.current = null;
    pendingSystemNameRef.current = '';
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [currentUser?.id, messages, phase, buildData, stepOutputs, currentStepIdx, mode, selectedBp, activatedSkills, currentSessionId, saveSessionToDB]);

  // Save file tree snapshot to Library (system instance)
  const saveFileTreeToLibrary = useCallback(async (sys) => {
    const steps = Array.isArray(sys.steps) ? sys.steps : [];
    const treeNodes = [
      { name: 'README.md', type: 'file' },
      { name: 'config.json', type: 'file' },
      { name: 'activity.log', type: 'file' },
      {
        name: 'build-steps/',
        type: 'folder',
        children: steps.map((step, i) => ({
          name: `${String(i + 1).padStart(2, '0')}_${(step.notes || step.name || `step_${i + 1}`).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 22)}.md`,
          type: 'file',
        })),
      },
    ];
    try {
      await fetch(`/api/system-instances/${sys.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ fileTree: treeNodes }),
      });
      toast.success(`File tree saved to Library for "${sys.name}"`);
    } catch {
      toast.error('Failed to save file tree');
    }
  }, [authHeaders]);

  // Load blueprints + categories
  useEffect(() => {
    setBpLoading(true);
    Promise.all([
      fetch('/api/blueprints', { headers: authHeaders() }),
      fetch('/api/blueprint-categories', { headers: authHeaders() }),
    ]).then(async ([bpRes, catRes]) => {
      const bps = bpRes.ok ? await bpRes.json() : [];
      const cats = catRes.ok ? await catRes.json() : [];
      setBlueprints(Array.isArray(bps) ? bps : []);
      setCategories(Array.isArray(cats) ? cats : []);
    }).catch(() => {}).finally(() => setBpLoading(false));
  }, []);

  // Pre-select blueprint from ?blueprintId= query param (Rebuild flow)
  useEffect(() => {
    const preId = searchParams.get('blueprintId');
    if (!preId || blueprints.length === 0) return;
    const match = blueprints.find(b => String(b.id) === String(preId));
    if (match) {
      setSelectedBp(match);
      setMode('blueprint');
    }
  }, [blueprints, searchParams]);

  // Pre-fill chat input from ?goal= query param (Onboarding Wizard handoff)
  useEffect(() => {
    const goal = searchParams.get('goal');
    if (goal) setInput(goal);
  }, [searchParams]);

  // Load stored credential keys for prefill hints
  useEffect(() => {
    if (!currentUser?.id) return;
    fetch(`/api/user-credentials?userId=${currentUser.id}`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(rows => {
        if (!Array.isArray(rows)) return;
        const map = {};
        rows.forEach(r => { map[r.credentialKey] = '••••••••'; });
        setStoredCredKeys(map);
      })
      .catch(() => {});
  }, [currentUser?.id]);

  // Load pages when Pages tab is opened
  useEffect(() => {
    if (rightPanel !== 'pages' || !currentUser?.id) return;
    setBuilderPagesLoading(true);
    fetch('/api/landing-pages', { headers: authHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(data => setBuilderPages(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setBuilderPagesLoading(false));
  }, [rightPanel, currentUser?.id]);

  // Load user's system instances for file tree
  useEffect(() => {
    if (!currentUser?.id) return;
    setSystemsLoading(true);
    fetch('/api/system-instances', { headers: authHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(rows => {
        const arr = Array.isArray(rows) ? rows : [];
        setUserSystems(arr);
        // Auto-expand the most recent system
        if (arr.length > 0) {
          setExpandedSystems({ [arr[0].id]: true });
          setExpandedFolders({ [`${arr[0].id}_steps`]: true });
        }
      })
      .catch(() => {})
      .finally(() => setSystemsLoading(false));
  }, [currentUser?.id]);

  // Scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, phase, pendingCreds]);

  // Auto-execute build steps
  useEffect(() => {
    if (phase !== 'building' || !buildData || stepExecuting || stepPaused) return;
    if (currentStepIdx >= buildData.steps.length) {
      setPhase('complete');
      toast.success('System activated and live!', {
        description: `${buildData.blueprint?.name ?? 'Your system'} is ready.`,
      });
      // Save a checkpoint for the completed build before redirecting
      saveCheckpoint(currentUser?.id, { messages, phase: 'complete', buildData, stepOutputs, currentStepIdx, activatedSkills, mode, selectedBp });
      setCheckpoints(getCheckpoints(currentUser?.id));
      // Auto-redirect after 3 seconds — keep session so user can return to history
      const timer = setTimeout(() => {
        navigate(`/systems/${buildData.instanceId}`);
      }, 3000);
      return () => clearTimeout(timer);
    }

    const step = buildData.steps[currentStepIdx];
    if (!step) return;
    setStepExecuting(true);

    const runStep = async () => {
      try {
        const resp = await fetch('/api/build-engine/execute-step', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            stepId: step.id,
            stepDescription: step.notes,
            blueprintName: buildData.blueprint?.name ?? 'System',
            stepNumber: step.stepNumber,
            totalSteps: buildData.steps.length,
            systemInstanceId: buildData.instanceId,
            sessionId: buildData.sessionId,
            model: activeMode?.model ?? 'openai/gpt-4o',
            liveMode,
          }),
        });
        if (resp.status === 402) {
          window.dispatchEvent(new CustomEvent('sbep:out-of-credits', { detail: { code: 'out_of_credits' } }));
          setError('Out of AI credits. Top up to continue building.');
          setPhase('idle');
          return;
        }
        if (!resp.ok) {
          // Non-2xx server error — throw so the catch block shows the recovery card
          // rather than silently advancing the step as "Completed".
          let errDetail = `Server error ${resp.status}`;
          try { const body = await resp.json(); errDetail = body?.error ?? errDetail; } catch { /* ignore */ }
          throw new Error(errDetail);
        }
        const data = await resp.json();
        setStepOutputs(prev => ({ ...prev, [step.id]: data.output ?? `Completed: ${step.notes}` }));
        if (data.connectorResults?.length > 0) {
          setStepConnectorResults(prev => ({ ...prev, [step.id]: data.connectorResults }));
        }
        // Show a recovery card if the AI call failed so the user can retry or skip
        if (data.stepFailed) {
          const recoveryId = Date.now() + Math.random();
          // Pause auto-execution so the effect doesn't re-trigger the same step
          setStepPaused(true);

          // Stream an AI explanation from ai-orchestrator/step-recovery (SSE)
          let explanation = 'Try retrying the step — transient AI errors often resolve on retry.';
          try {
            const sseResp = await fetch('/api/ai-orchestrator/step-recovery', {
              method: 'POST',
              headers: authHeaders(),
              body: JSON.stringify({
                stepDescription: step.notes,
                errorMessage: data.recoveryMessage || undefined,
                stepNumber: step.stepNumber,
                systemInstanceId: buildData.instanceId,
              }),
            });
            if (sseResp.ok && sseResp.body) {
              const reader = sseResp.body.getReader();
              const decoder = new TextDecoder();
              let buf = '';
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += decoder.decode(value, { stream: true });
                const lines = buf.split('\n');
                buf = lines.pop() ?? '';
                for (const line of lines) {
                  if (!line.startsWith('data: ')) continue;
                  try {
                    const evt = JSON.parse(line.slice(6));
                    if (evt.type === 'error_recovery' && evt.explanation) {
                      explanation = evt.explanation;
                    }
                  } catch { /* ignore malformed lines */ }
                }
              }
            } else if (!sseResp.ok) {
              throw new Error(`Recovery explanation request failed (${sseResp.status})`);
            }
          } catch (explainErr) {
            // Non-fatal — the recovery card still renders with a sensible default
            // explanation, but let the user know the AI explanation didn't load.
            toast.error(
              explainErr instanceof Error
                ? `Could not load a detailed explanation: ${explainErr.message}. Showing a generic tip instead.`
                : 'Could not load a detailed explanation — showing a generic tip instead.',
            );
          }

          const retryFn = () => {
            setMessages(prev => prev.filter(m => m.id !== recoveryId));
            // Un-pause — useEffect will re-run and execute the same stepIdx again
            setStepPaused(false);
          };
          const skipFn = async () => {
            // Tell the server to mark this step as skipped and advance session state.
            // Only dismiss the recovery card and advance local state once the server
            // confirms the skip — otherwise the frontend would diverge from the DB
            // (step still "in_progress" server-side while the UI moved on).
            try {
              const skipResp = await fetch('/api/build-engine/skip-step', {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({
                  stepId: step.id,
                  sessionId: buildData.sessionId,
                  stepNumber: step.stepNumber,
                  totalSteps: buildData.steps.length,
                  systemInstanceId: buildData.instanceId,
                  blueprintName: buildData.blueprint?.name ?? 'System',
                }),
              });
              if (!skipResp.ok) {
                const body = await skipResp.json().catch(() => ({}));
                throw new Error(body?.error || `Skip failed (${skipResp.status})`);
              }
              setMessages(prev => prev.filter(m => m.id !== recoveryId));
              setCurrentStepIdx(i => i + 1);
              setStepPaused(false);
            } catch (skipErr) {
              toast.error(skipErr instanceof Error ? skipErr.message : 'Failed to skip step — please try again.');
              // Leave the recovery card and paused state in place so the user can retry.
            }
          };
          setMessages(prev => [...prev, {
            id: recoveryId, role: 'assistant', type: 'error_recovery', ts: Date.now(),
            data: {
              message: data.recoveryMessage || 'AI model unavailable',
              explanation,
              stepDescription: step.notes,
              stepNumber: step.stepNumber,
            },
            retryFn,
            skipFn,
          }]);
          return;
        }
        setCurrentStepIdx(i => i + 1);
      } catch (fetchErr) {
        // Network-level error (fetch itself threw) — show recovery card instead of
        // silently advancing. The DB step stays in_progress; retry will re-run it.
        const recoveryId = Date.now() + Math.random();
        setStepPaused(true);
        const errMsg = fetchErr instanceof Error ? fetchErr.message : 'Network error — could not reach build server';
        const retryFn = () => {
          setMessages(prev => prev.filter(m => m.id !== recoveryId));
          setStepPaused(false);
        };
        const skipFn = async () => {
          try {
            const skipResp = await fetch('/api/build-engine/skip-step', {
              method: 'POST',
              headers: authHeaders(),
              body: JSON.stringify({
                stepId: step.id,
                sessionId: buildData.sessionId,
                stepNumber: step.stepNumber,
                totalSteps: buildData.steps.length,
                systemInstanceId: buildData.instanceId,
                blueprintName: buildData.blueprint?.name ?? 'System',
              }),
            });
            if (!skipResp.ok) {
              const body = await skipResp.json().catch(() => ({}));
              throw new Error(body?.error || `Skip failed (${skipResp.status})`);
            }
            setMessages(prev => prev.filter(m => m.id !== recoveryId));
            setCurrentStepIdx(i => i + 1);
            setStepPaused(false);
          } catch (skipErr) {
            toast.error(skipErr instanceof Error ? skipErr.message : 'Failed to skip step — the server may be unreachable. Try again.');
            // Leave the recovery card and paused state in place so the user can retry.
          }
        };
        setMessages(prev => [...prev, {
          id: recoveryId, role: 'assistant', type: 'error_recovery', ts: Date.now(),
          data: {
            message: errMsg,
            explanation: 'A network error prevented this step from running. Retry to try again — transient errors usually resolve on the next attempt.',
            stepDescription: step.notes,
            stepNumber: step.stepNumber,
          },
          retryFn,
          skipFn,
        }]);
      } finally {
        setStepExecuting(false);
      }
    };

    const timer = setTimeout(runStep, currentStepIdx === 0 ? 300 : 800);
    return () => clearTimeout(timer);
  }, [phase, buildData, currentStepIdx, stepExecuting, stepPaused]);

  // ── Execute build — takes blueprint and systemName directly to avoid stale state ──
  const executeBuild = useCallback(async (credValues, blueprint, sysName) => {
    if (!blueprint?.slug) return;
    setExecuteLoading(true);
    setError('');

    const credentials = Object.entries(credValues)
      .filter(([, v]) => String(v).trim())
      .map(([key, value]) => ({ key, value: String(value) }));

    try {
      const resp = await fetch('/api/ai-orchestrator/execute', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          blueprintSlug: blueprint.slug,
          systemName: sysName || `My ${blueprint.name}`,
          credentials,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Build initialization failed');
      }
      const data = await resp.json();
      const steps = data.steps ?? [];
      setBuildData({
        instanceId: data.instanceId,
        sessionId: data.sessionId,
        steps,
        blueprint: data.blueprint,
      });
      setCurrentStepIdx(0);
      setStepOutputs({});
      setPreflightWarnings([]);
      // Pre-flight: check for missing credentials if live mode is active.
      // A failed check must not silently pretend everything is ready — the user
      // is in Live Mode and could otherwise miss a real missing-credential warning.
      if (liveMode && steps.length > 0) {
        try {
          const pfResp = await fetch('/api/build-engine/preflight', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ stepDescriptions: steps.map(s => s.notes ?? '') }),
          });
          if (!pfResp.ok) {
            const body = await pfResp.json().catch(() => ({}));
            throw new Error(body?.error || `Pre-flight check failed (${pfResp.status})`);
          }
          const pf = await pfResp.json();
          if (!pf.ready && pf.missingHints?.length > 0) {
            setPreflightWarnings(pf.missingHints);
          }
        } catch (pfErr) {
          toast.error(
            pfErr instanceof Error
              ? `Could not verify Live Mode credentials: ${pfErr.message}. Proceeding, but some connector steps may fail if credentials are missing.`
              : 'Could not verify Live Mode credentials — proceeding, but some connector steps may fail if credentials are missing.',
          );
        }
      }
      setPhase('building');
      setMessages(prev => [...prev, {
        id: Date.now() + 2,
        role: 'assistant',
        content: `Build initiated. Executing ${data.steps?.length ?? 5} autonomous steps for ${data.blueprint?.name ?? blueprint.name}. Watch the terminal →`,
        ts: Date.now(),
      }]);
    } catch (err) {
      setError(err.message || 'Failed to start build.');
    } finally {
      setExecuteLoading(false);
    }
  }, []);

  // Refs to hold latest blueprint/systemName for the credential form submit
  const pendingBlueprintRef = useRef(null);
  const pendingSystemNameRef = useRef('');

  // ── Streaming send message to ASH ─────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || chatLoading) return;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Proactive block: show the credits modal immediately before any API call
    // Admins (isFounderAdmin) bypass this check so testing is never blocked
    if (!isFounderAdmin) {
      const totalCredits = (currentUser?.creditsBalance ?? 0) + (currentUser?.walletBalance ?? 0);
      if (totalCredits <= 0) {
        window.dispatchEvent(new CustomEvent('sbep:out-of-credits', { detail: { code: 'out_of_credits' } }));
        return;
      }
    }

    setInput('');
    setError('');

    // If user replies during planning phase, dismiss the plan card — they're continuing the conversation
    if (phase === 'planning') {
      setPendingPlanData(null);
      setPhase('idle');
    }

    const history = messages
      .filter(m => m.id !== 'welcome' && typeof m.content === 'string' && m.content.length > 0)
      .map(m => ({ role: m.role, content: m.content }));

    setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: msg, ts: Date.now() }]);
    setChatLoading(true);
    setThinkingSteps([]);
    setThinkingCurrentIdx(-1);
    setExpandedSteps(new Set());

    const msgId = Date.now() + 1;
    let doneData = null;

    try {
      const resp = await fetch('/api/ai-orchestrator/stream', {
        method: 'POST',
        headers: authHeaders(),
        signal: controller.signal,
        body: JSON.stringify({ message: msg, history, agentMode: aiMode, businessType, revenueGoal, planMode: isPlanMode, systemInstanceId: buildData?.instanceId ?? undefined }),
      });

      if (resp.status === 402) {
        window.dispatchEvent(new CustomEvent('sbep:out-of-credits', { detail: { code: 'out_of_credits' } }));
        setError('Out of AI credits. Top up to continue.');
        return;
      }
      if (!resp.ok) throw new Error('ASH request failed');

      // Add streaming placeholder message
      setMessages(prev => [...prev, { id: msgId, role: 'assistant', content: '', streaming: true, ts: Date.now() }]);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullStreamContent = '';
      let firstToken = true;

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          let event;
          try { event = JSON.parse(line.slice(6)); } catch { continue; }

          if (event.type === 'thinking') {
            setThinkingSteps(event.steps ?? []);
            setThinkingCurrentIdx(event.index ?? 0);
          } else if (event.type === 'token') {
            if (firstToken) {
              firstToken = false;
              setThinkingSteps([]);
              setThinkingCurrentIdx(-1);
            }
            fullStreamContent += event.delta;
            // Strip partial SBEP_DATA block from the live display
            const clean = fullStreamContent
              .replace(/<SBEP_DATA>[\s\S]*?<\/SBEP_DATA>/g, '')
              .replace(/<SBEP_DATA>[\s\S]*/g, '')
              .trim();
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: clean } : m));
          } else if (event.type === 'tool_result') {
            const toolMsgId = Date.now() + Math.random();
            let newMsg = null;
            if (event.tool === 'search') {
              newMsg = { id: toolMsgId, role: 'assistant', type: 'search', data: event.data, ts: Date.now() };
            } else if (event.tool === 'image') {
              newMsg = { id: toolMsgId, role: 'assistant', type: 'image', data: event.data, ts: Date.now() };
            } else if (event.tool === 'connector') {
              const connData = event.data || {};
              // Build a retry function using the call context embedded in the SSE payload
              const retryFn = !connData.ok && connData.connectorId ? async () => {
                try {
                  const res = await fetch('/api/ash/connector-action', {
                    method: 'POST',
                    headers: authHeaders(),
                    body: JSON.stringify({
                      connectorId: connData.connectorId,
                      action: connData.action,
                      params: connData.params || {},
                      systemInstanceId: connData.systemInstanceId ?? buildData?.instanceId ?? undefined,
                    }),
                  });
                  const data = await res.json();
                  setMessages(prev => prev.map(m => m.id === toolMsgId ? {
                    ...m, data,
                    retryFn: !data.ok ? retryFn : undefined,
                  } : m));
                } catch (err) {
                  setMessages(prev => prev.map(m => m.id === toolMsgId ? {
                    ...m,
                    data: { ...connData, ok: false, error: err?.message || 'Network error' },
                    retryFn,
                  } : m));
                }
              } : undefined;
              newMsg = { id: toolMsgId, role: 'assistant', type: 'connector_action', data: connData, retryFn, ts: Date.now() };
            }
            if (newMsg) {
              setMessages(prev => {
                const idx = prev.findIndex(m => m.id === msgId);
                if (idx === -1) return [...prev, newMsg];
                return [...prev.slice(0, idx), newMsg, ...prev.slice(idx)];
              });
            }
          } else if (event.type === 'done') {
            doneData = event;
            const finalContent = event.content ?? fullStreamContent.replace(/<SBEP_DATA>[\s\S]*/g, '').trim();
            const missingPlan = !event.structuredData && isPlanLikeContent(finalContent);
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: finalContent, streaming: false, missingPlan: missingPlan || undefined } : m));
            setThinkingSteps([]);
            setThinkingCurrentIdx(-1);
          } else if (event.type === 'end') {
            break outer;
          } else if (event.type === 'error') {
            throw new Error(event.message ?? 'Stream error');
          }
        }
      }

      // ── TTS auto-playback ─────────────────────────────────────────────────
      if (voiceEnabled && doneData?.content) {
        void playTTS(doneData.content);
      }

      // Skill Engine — merge newly activated skills
      if (Array.isArray(doneData?.activatedSkills) && doneData.activatedSkills.length > 0) {
        setActivatedSkills(prev => {
          const slugs = new Set(prev.map(s => s.slug));
          return [...prev, ...doneData.activatedSkills.filter(s => !slugs.has(s.slug))];
        });
      }

      const sd = doneData?.structuredData;
      const action = sd?.action;

      if (action === 'present_plan') {
        pendingBlueprintRef.current = sd.blueprint ?? null;
        pendingSystemNameRef.current = sd.systemName ?? '';
        setPendingPlanData({
          blueprint: sd.blueprint ?? null,
          systemName: sd.systemName ?? '',
          buildSteps: sd.buildSteps ?? [],
          requiredCredentials: sd.requiredCredentials ?? [],
        });
        setPhase('planning');
        // Push generated files card into chat
        const genFiles = [
          { name: `Build Plan: ${sd.systemName || sd.blueprint?.name || 'Custom System'}`, tag: 'plan' },
        ];
        if (sd.buildSteps?.length) genFiles.push({ name: `System Architecture (${sd.buildSteps.length} steps)`, tag: 'arch' });
        if (sd.requiredCredentials?.length) genFiles.push({ name: `Connection Map (${sd.requiredCredentials.length} integrations)`, tag: 'conn' });
        genFiles.push({ name: 'Revenue Model Analysis', tag: 'model' });
        genFiles.push({ name: 'Deployment Workflow', tag: 'deploy' });
        setMessages(prev => [...prev, { id: Date.now() + 2, role: 'assistant', type: 'files', files: genFiles, ts: Date.now() }]);
      } else if (action === 'collect_credentials' && sd?.requiredCredentials?.length > 0 && !isPlanMode) {
        pendingBlueprintRef.current = sd.blueprint ?? null;
        pendingSystemNameRef.current = sd.systemName ?? '';
        setPendingCreds(sd.requiredCredentials);
        setPendingPlanData(null);
        setPhase('collecting');
      } else if (action === 'start_build' && sd?.blueprint && !isPlanMode) {
        setPendingPlanData(null);
        await executeBuild({}, sd.blueprint, sd.systemName ?? '');
      } else if (action === 'browser_use' && sd?.startUrl) {
        setActiveBrowser({ task: sd.task ?? 'Browse the web', startUrl: sd.startUrl, msgId: Date.now() });
      } else if (action === 'tool_calls' && Array.isArray(sd?.calls)) {
        for (const call of sd.calls) {
          if (call.type === 'search') {
            const toolMsgId = Date.now() + Math.random();
            setMessages(prev => [...prev, { id: toolMsgId, role: 'assistant', type: 'tool_call', tool: 'search', label: `Searching: ${call.query}`, ts: Date.now() }]);
            try {
              const res = await fetch('/api/ash/search', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ query: call.query }) });
              if (res.ok) {
                const data = await res.json();
                setMessages(prev => prev.map(m => m.id === toolMsgId ? { ...m, type: 'search', data, tool: undefined, label: undefined } : m));
              } else {
                setMessages(prev => prev.filter(m => m.id !== toolMsgId));
              }
            } catch {
              setMessages(prev => prev.filter(m => m.id !== toolMsgId));
            }
          } else if (call.type === 'image') {
            const toolMsgId = Date.now() + Math.random();
            setMessages(prev => [...prev, { id: toolMsgId, role: 'assistant', type: 'tool_call', tool: 'image', label: `Generating image: ${(call.prompt || '').slice(0, 40)}…`, ts: Date.now() }]);
            try {
              const res = await fetch('/api/ash/image', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ prompt: call.prompt }) });
              if (res.ok) {
                const data = await res.json();
                setMessages(prev => prev.map(m => m.id === toolMsgId ? { ...m, type: 'image', data, tool: undefined, label: undefined } : m));
              } else {
                setMessages(prev => prev.filter(m => m.id !== toolMsgId));
              }
            } catch {
              setMessages(prev => prev.filter(m => m.id !== toolMsgId));
            }
          } else if (call.type === 'generate_video') {
            const toolMsgId = Date.now() + Math.random();
            setMessages(prev => [...prev, { id: toolMsgId, role: 'assistant', type: 'tool_call', tool: 'video', label: `Generating video: ${(call.prompt || '').slice(0, 40)}…`, ts: Date.now() }]);
            try {
              const res = await fetch('/api/media-gen/video', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ prompt: call.prompt, aspectRatio: call.aspectRatio || '9:16', durationSeconds: call.durationSeconds || 6 }) });
              if (res.ok) {
                const data = await res.json();
                setMessages(prev => prev.map(m => m.id === toolMsgId ? { ...m, type: 'generated_video', data, tool: undefined, label: undefined } : m));
              } else {
                setMessages(prev => prev.filter(m => m.id !== toolMsgId));
              }
            } catch {
              setMessages(prev => prev.filter(m => m.id !== toolMsgId));
            }
          } else if (call.type === 'generate_music') {
            const toolMsgId = Date.now() + Math.random();
            setMessages(prev => [...prev, { id: toolMsgId, role: 'assistant', type: 'tool_call', tool: 'music', label: `Generating music: ${(call.prompt || '').slice(0, 40)}…`, ts: Date.now() }]);
            try {
              const res = await fetch('/api/media-gen/music', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ prompt: call.prompt, durationSeconds: call.durationSeconds || 30, style: call.style }) });
              if (res.ok) {
                const data = await res.json();
                setMessages(prev => prev.map(m => m.id === toolMsgId ? { ...m, type: 'generated_audio', data, label: 'ASH · Music Generation', tool: undefined } : m));
              } else {
                setMessages(prev => prev.filter(m => m.id !== toolMsgId));
              }
            } catch {
              setMessages(prev => prev.filter(m => m.id !== toolMsgId));
            }
          } else if (call.type === 'text_to_speech') {
            const toolMsgId = Date.now() + Math.random();
            setMessages(prev => [...prev, { id: toolMsgId, role: 'assistant', type: 'tool_call', tool: 'tts', label: `Converting to speech: ${(call.text || '').slice(0, 40)}…`, ts: Date.now() }]);
            try {
              const res = await fetch('/api/media-gen/tts', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ text: call.text, voice: call.voice || 'warm narrator' }) });
              if (res.ok) {
                const data = await res.json();
                setMessages(prev => prev.map(m => m.id === toolMsgId ? { ...m, type: 'generated_audio', data, label: 'ASH · Text-to-Speech', tool: undefined } : m));
              } else {
                setMessages(prev => prev.filter(m => m.id !== toolMsgId));
              }
            } catch {
              setMessages(prev => prev.filter(m => m.id !== toolMsgId));
            }
          } else if (call.type === 'file') {
            try {
              const res = await fetch('/api/ash/files', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ name: call.name, content: call.content, fileType: call.fileType || 'text', description: call.description || '' }) });
              if (res.ok) {
                const data = await res.json();
                setGeneratedFiles(prev => [data, ...prev]);
                setMessages(prev => [...prev, { id: Date.now() + Math.random(), role: 'assistant', type: 'code', data, ts: Date.now() }]);
              }
            } catch { /* non-fatal */ }
          } else if (call.type === 'connector_action') {
            const toolMsgId = Date.now() + Math.random();
            const connLabel = `${call.connectorId} → ${call.action}`;
            // Show loading state
            setMessages(prev => [...prev, {
              id: toolMsgId, role: 'assistant', type: 'tool_call',
              tool: 'connector', label: `Executing: ${connLabel}…`, ts: Date.now(),
            }]);

            const executeConnectorAction = async () => {
              try {
                const res = await fetch('/api/ash/connector-action', {
                  method: 'POST',
                  headers: authHeaders(),
                  body: JSON.stringify({
                    connectorId: call.connectorId,
                    action: call.action,
                    params: call.params || {},
                    systemInstanceId: buildData?.instanceId ?? undefined,
                  }),
                });
                const data = await res.json();
                // Replace loading card with result card (includes retry fn if failed)
                setMessages(prev => prev.map(m => m.id === toolMsgId ? {
                  ...m,
                  type: 'connector_action',
                  data,
                  tool: undefined,
                  label: undefined,
                  retryFn: !data.ok ? executeConnectorAction : undefined,
                } : m));
              } catch (err) {
                setMessages(prev => prev.map(m => m.id === toolMsgId ? {
                  ...m,
                  type: 'connector_action',
                  data: {
                    ok: false,
                    connectorId: call.connectorId,
                    connectorName: call.connectorId,
                    action: call.action,
                    error: err?.message || 'Network error',
                  },
                  tool: undefined,
                  label: undefined,
                  retryFn: executeConnectorAction,
                } : m));
              }
            };

            await executeConnectorAction();
          }
        }
      }

      // ── build_landing_page ──────────────────────────────────────────────────
      if (action === 'build_landing_page') {
        const pageTitle = sd.pageTitle || 'My Landing Page';
        const pagePrompt = sd.prompt || msg;
        const pageType = sd.pageType || 'affiliate';

        const genMsgId = Date.now() + Math.random();
        setMessages(prev => [...prev, {
          id: genMsgId, role: 'assistant', type: 'tool_call',
          tool: 'landing_page', label: `Building landing page: "${pageTitle}"…`, ts: Date.now(),
        }]);

        try {
          const createRes = await fetch('/api/landing-pages', {
            method: 'POST', headers: authHeaders(),
            body: JSON.stringify({ title: pageTitle }),
          });
          if (createRes.ok) {
            const created = await createRes.json();
            const genRes = await fetch('/api/landing-pages/generate', {
              method: 'POST', headers: authHeaders(),
              body: JSON.stringify({ pageId: created.id, prompt: pagePrompt, pageType }),
            });
            if (genRes.ok) {
              const generated = await genRes.json();
              setBuilderPages(prev => [generated, ...prev.filter(p => p.id !== generated.id)]);
              setMessages(prev => prev.map(m => m.id === genMsgId ? {
                id: genMsgId, role: 'assistant', type: 'page_created',
                data: generated, label: `Landing page "${pageTitle}" created!`, ts: Date.now(),
              } : m));
              setRightPanel('pages');
            } else {
              setMessages(prev => prev.filter(m => m.id !== genMsgId));
              setMessages(prev => [...prev, { id: Date.now() + Math.random(), role: 'assistant', type: 'text', content: 'I had trouble generating the page HTML. Try again or visit the Pages tab to create one manually.', ts: Date.now() }]);
            }
          }
        } catch {
          setMessages(prev => prev.filter(m => m.id !== genMsgId));
        }
      }

      // Auto-save checkpoint
      const finalMsg = doneData?.content ?? '';
      const updatedMessages = [...messages,
        { id: Date.now(), role: 'user', content: msg, ts: Date.now() },
        { id: msgId, role: 'assistant', content: finalMsg, ts: Date.now() },
      ];
      saveCheckpoint(currentUser?.id, { messages: updatedMessages, phase, buildData, stepOutputs, currentStepIdx, activatedSkills, mode, selectedBp });
      setCheckpoints(getCheckpoints(currentUser?.id));
    } catch (err) {
      if (err?.name === 'AbortError') {
        // User stopped generation — keep partial message, clear streaming flag
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, streaming: false } : m));
      } else {
        setError('ASH is temporarily unavailable. Please try again.');
        setMessages(prev => prev.filter(m => m.id !== msgId));
      }
    } finally {
      setChatLoading(false);
      setThinkingSteps([]);
      setThinkingCurrentIdx(-1);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, chatLoading, messages, executeBuild, phase, buildData, stepOutputs, currentStepIdx, activatedSkills, mode, selectedBp, currentUser?.id]);

  // ── Blueprint mode: launch selected blueprint ──────────────────────────────
  const handleBlueprintLaunch = useCallback(async () => {
    if (!selectedBp) return;
    setMode('custom');
    // Blueprint = inspiration only. ASH redesigns from scratch, makes it 10x better.
    await sendMessage(`I want to build something inspired by "${selectedBp.name}" — but don't just copy the blueprint. Redesign it from scratch and make it dramatically better. Use the best tools available, design an optimal architecture specifically for my situation, and build me the best possible version of this system.`);
  }, [selectedBp, sendMessage]);

  // ── Credential form submit (uses refs to avoid stale state) ───────────────
  const handleCredentialSubmit = useCallback((credValues) => {
    const bp = pendingBlueprintRef.current;
    const sysName = pendingSystemNameRef.current;
    executeBuild(credValues, bp, sysName);
  }, [executeBuild]);

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleAttachFile = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const MAX = 5 * 1024 * 1024; // 5 MB per file
    const valid = files.filter(f => {
      if (f.size > MAX) { toast.error(`${f.name} exceeds 5 MB`); return false; }
      return true;
    });
    setAttachments(prev => [...prev, ...valid].slice(0, 8)); // max 8 attachments
    e.target.value = '';
  };

  const isInputDisabled = chatLoading || phase === 'building' || phase === 'complete';

  // Escape key → stop generation
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && chatLoading) stopGeneration(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [chatLoading, stopGeneration]);

  // Mode badge — derived from phase
  const modeBadge = phase === 'collecting'
    ? { label: 'PLAN', cls: 'text-violet-400 border-violet-500/30 bg-violet-500/10' }
    : phase === 'building'
    ? { label: 'BUILD', cls: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' }
    : phase === 'complete'
    ? { label: 'LIVE', cls: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' }
    : { label: 'CHAT', cls: 'text-white/40 border-white/12 bg-white/4' };

  // Status line shown above input while ASH is generating
  const ashStatusLine = chatLoading
    ? phase === 'collecting' ? 'ASH is planning…'
    : phase === 'building' ? 'ASH is building…'
    : 'ASH is thinking…'
    : null;
  const filteredBps = blueprints.filter(b =>
    (!activeCatId || b.categoryId === activeCatId) &&
    (!rightSearch || b.name.toLowerCase().includes(rightSearch.toLowerCase()) || (b.description || '').toLowerCase().includes(rightSearch.toLowerCase()))
  );

  // Build a map: message index (1-based) → checkpoint with version number for inline markers
  const checkpointByMsgCount = {};
  [...checkpoints].reverse().forEach((cp, idx) => {
    checkpointByMsgCount[cp.messageCount] = { ...cp, versionNum: idx + 1 };
  });

  // ── Restore a checkpoint ───────────────────────────────────────────────────
  const restoreCheckpoint = useCallback((cp) => {
    setMessages(cp.messages);
    setPhase(['complete', 'planning'].includes(cp.phase) ? 'idle' : (cp.phase ?? 'idle'));
    setActivatedSkills(cp.activatedSkills ?? []);
    setBuildData(cp.buildData ?? null);
    setStepOutputs(cp.stepOutputs ?? {});
    setCurrentStepIdx(cp.currentStepIdx ?? 0);
    setMode(cp.mode ?? 'custom');
    setSelectedBp(cp.selectedBp ?? null);
    setPendingCreds([]);
    setError('');
    setInput('');
    toast.success('Checkpoint restored', { description: cp.summary });
  }, []);

  const SIDE_PANELS = [
    { id: 'explorer',   icon: Layers,       title: 'Explorer' },
    { id: 'blueprints', icon: Grid3x3,      title: 'Blueprints' },
    { id: 'tools',      icon: Cog,          title: 'Tools' },
    { id: 'settings',   icon: Brain,        title: 'Settings' },
  ];

  const [marketplaceTools, setMarketplaceTools] = useState([]);
  const [toolCategoryMap, setToolCategoryMap] = useState({});
  const [toolsLoading, setToolsLoading] = useState(false);

  useEffect(() => {
    setToolsLoading(true);
    Promise.all([
      fetch('/api/tools?limit=200', { headers: authHeaders() }).then(r => r.ok ? r.json() : []),
      fetch('/api/tool-categories', { headers: authHeaders() }).then(r => r.ok ? r.json() : []),
    ])
      .then(([toolsData, catsData]) => {
        const tools = Array.isArray(toolsData) ? toolsData : (toolsData?.items ?? []);
        const cats = Array.isArray(catsData) ? catsData : [];
        const catMap = {};
        cats.forEach(c => { catMap[c.id] = c.name; });
        setToolCategoryMap(catMap);
        setMarketplaceTools(tools);
      })
      .catch(() => { setMarketplaceTools([]); setToolCategoryMap({}); })
      .finally(() => setToolsLoading(false));
  }, []);

  // Load generated files when user is known
  useEffect(() => {
    if (!currentUser?.id) return;
    fetch('/api/ash/files', { headers: authHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(data => setGeneratedFiles(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [currentUser?.id]);

  // Load ASH memory
  useEffect(() => {
    if (!currentUser?.id) return;
    fetch(`/api/user-memory?userId=${currentUser.id}`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(data => setAshMemory(Array.isArray(data) ? data : (data?.items ?? [])))
      .catch(() => {});
  }, [currentUser?.id]);

  const activeMode = AI_MODES.find(m => m.id === aiMode);

  return (
    <AuthLayout>
    <div className="h-screen flex flex-col overflow-hidden">

      {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-cyan-500/10 bg-[#02020c]/97 backdrop-blur-2xl shrink-0 gap-3 relative">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent pointer-events-none" />

        {/* Left: breadcrumb */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-white/30 hover:text-cyan-400 transition-colors text-xs shrink-0 font-mono tracking-wide uppercase"
          >
            <ArrowLeft className="w-3 h-3" />
            Dashboard
          </button>
          <span className="text-white/10 shrink-0 font-mono">/</span>
          <span className="flex items-center gap-1.5 shrink-0">
            <div className="w-5 h-5 rounded-md bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.2)]">
              <Wand2 className="w-3 h-3 text-cyan-400" />
            </div>
            <span className="text-[12px] font-bold text-white/85 font-mono tracking-widest uppercase">ASH Builder</span>
          </span>
          {businessType && (
            <>
              <span className="text-white/12 shrink-0 hidden sm:block">/</span>
              <span className="text-xs text-white/30 font-mono capitalize truncate hidden sm:block">{businessType}</span>
            </>
          )}
          {revenueGoal && (
            <span className="hidden lg:flex items-center gap-1 text-[10px] text-emerald-400/60 bg-emerald-500/6 border border-emerald-500/15 rounded-full px-2 py-0.5 font-mono shrink-0">
              <Target className="w-2.5 h-2.5" /> {revenueGoal}/mo
            </span>
          )}
        </div>

        {/* Center: phase bar */}
        <div className="shrink-0">
          <PhaseBar phase={phase} />
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {activeMode && (
            <button
              onClick={() => setActiveSidePanel(p => p === 'settings' ? null : 'settings')}
              className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded border text-[10px] font-mono transition-colors ${activeMode.activeBg} ${activeMode.color}`}
            >
              <activeMode.icon className="w-2.5 h-2.5" />
              {activeMode.label}
            </button>
          )}
          {isFounderAdmin && (
            <span className="hidden md:block text-[9px] font-mono text-amber-400/60 bg-amber-500/8 border border-amber-500/15 rounded-full px-2 py-0.5">
              👑 FOUNDER
            </span>
          )}
          {/* Open page in browser — visible when Pages panel is active and any page is selected or being edited */}
          {rightPanel === 'pages' && (pageEditorPage || selectedPage) && (() => {
            const p = pageEditorPage || selectedPage;
            return (
              <button
                onClick={() => openPageInBrowser(p)}
                title={p.isPublished ? 'Open live page in new tab' : 'Preview page in new tab'}
                className="flex items-center gap-1.5 text-sky-400/70 hover:text-sky-300 transition-all text-[10px] px-2.5 py-1.5 rounded-lg border border-sky-500/20 hover:border-sky-500/40 bg-sky-500/5 hover:bg-sky-500/12 font-mono uppercase tracking-wider hover:shadow-[0_0_12px_rgba(14,165,233,0.2)]"
              >
                <ExternalLink className="w-3 h-3" />
                <span className="hidden sm:inline">{p.isPublished ? 'View Live' : 'Preview'}</span>
              </button>
            );
          })()}
          <button
            onClick={() => navigate('/library')}
            title="My Library"
            className="flex items-center gap-1.5 text-white/35 hover:text-cyan-400 transition-all text-[10px] px-2.5 py-1.5 rounded-lg border border-white/8 hover:border-cyan-500/30 font-mono uppercase tracking-wider hover:shadow-[0_0_12px_rgba(6,182,212,0.15)]"
          >
            <BookOpen className="w-3 h-3" />
            <span className="hidden sm:inline">Library</span>
          </button>
          <button
            onClick={clearSession}
            disabled={phase === 'building'}
            title="Start a new session"
            className="flex items-center gap-1.5 text-white/35 hover:text-cyan-400 transition-all text-[10px] disabled:opacity-20 disabled:cursor-not-allowed px-2.5 py-1.5 rounded-lg border border-white/8 hover:border-cyan-500/30 font-mono uppercase tracking-wider hover:shadow-[0_0_12px_rgba(6,182,212,0.15)]"
          >
            <PlusCircle className="w-3 h-3" />
            <span className="hidden sm:inline">New</span>
          </button>
        </div>
      </div>

      {/* ── 3-PANEL MAIN LAYOUT (Replit-style) ─────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* ═══════════════════════════════════════════════════════════════
            LEFT PANEL (260px) — Sessions as Tasks + Agent Modes
        ═══════════════════════════════════════════════════════════════ */}
        <div className="hidden md:flex w-[260px] shrink-0 flex-col border-r border-white/8 bg-[#05050c] relative">

          {/* Header — gradient top section */}
          <div className="relative px-3 pt-3 pb-2.5 border-b border-cyan-500/10 shrink-0 bg-gradient-to-b from-cyan-500/8 to-transparent overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent pointer-events-none" />
            <div className="absolute -top-6 left-0 w-24 h-16 bg-cyan-500/6 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-2 relative">
              <div className="w-7 h-7 rounded-xl bg-cyan-500/15 border border-cyan-500/35 flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(6,182,212,0.25)]">
                <Wand2 className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-white/80 font-mono tracking-widest uppercase">ASH Workspace</p>
                <p className="text-[9px] font-mono leading-tight">
                  {phase === 'building' ? <span className="text-cyan-400/70">Building…</span>
                    : phase === 'complete' ? <span className="text-emerald-400/70">Build complete</span>
                    : phase === 'planning' ? <span className="text-violet-400/70">Reviewing plan…</span>
                    : phase === 'collecting' ? <span className="text-amber-400/70">Awaiting credentials</span>
                    : <span className="text-white/28">Ready</span>}
                </p>
              </div>
              {phase !== 'idle' && (
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 shadow-lg ${
                  phase === 'building' ? 'bg-cyan-400 animate-pulse shadow-cyan-400/50'
                  : phase === 'complete' ? 'bg-emerald-400 shadow-emerald-400/50'
                  : phase === 'planning' ? 'bg-violet-400 animate-pulse shadow-violet-400/50'
                  : 'bg-amber-400 animate-pulse shadow-amber-400/50'
                }`} />
              )}
            </div>
          </div>

          {/* + New task button */}
          <div className="px-2.5 py-2 shrink-0">
            <button
              onClick={clearSession}
              disabled={phase === 'building'}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-white/6 bg-white/2 hover:bg-cyan-500/6 hover:border-cyan-500/25 text-white/30 hover:text-cyan-400 text-[10px] font-mono font-bold transition-all disabled:opacity-25 disabled:cursor-not-allowed group uppercase tracking-widest"
            >
              <PlusCircle className="w-3 h-3 shrink-0 group-hover:rotate-90 transition-transform duration-200" />
              New task
            </button>
          </div>

          {/* ── Left sidebar tabs: Tasks | Files | Memory ── */}
          <div className="flex border-b border-white/6 shrink-0 px-2 gap-1 pb-2">
            {[
              { id: 'tasks',  label: 'Tasks',  icon: Activity },
              { id: 'files',  label: 'Files',  icon: FileCode2 },
              { id: 'memory', label: 'Memory', icon: Brain },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setLeftSideTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[8px] font-mono font-bold transition-all rounded-lg uppercase tracking-widest ${
                  leftSideTab === tab.id
                    ? 'text-cyan-400 bg-cyan-500/8 border border-cyan-500/25 shadow-[0_0_10px_rgba(6,182,212,0.12)]'
                    : 'text-white/22 hover:text-white/50 border border-transparent hover:bg-white/3'
                }`}
              >
                <tab.icon className="w-2.5 h-2.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── TASKS PANEL ── */}
          <div className={`flex-1 overflow-y-auto py-1 select-none ash-scroll${leftSideTab !== 'tasks' ? ' hidden' : ''}`}>

            {/* ── Active task ── */}
            {phase !== 'idle' && messages.filter(m => m.role === 'user' && m.id !== 'welcome').length > 0 && (
              <div className="px-2 pt-2 pb-1">
                <p className="text-[9px] uppercase tracking-widest text-white/28 font-mono font-bold px-1 mb-1.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse inline-block" /> Active
                </p>
                <div className={`flex items-start gap-2.5 px-2.5 py-2 rounded-xl border ${
                  phase === 'building' ? 'bg-blue-500/8 border-blue-500/18'
                  : phase === 'complete' ? 'bg-emerald-500/8 border-emerald-500/18'
                  : phase === 'collecting' ? 'bg-amber-500/8 border-amber-500/18'
                  : phase === 'planning' ? 'bg-violet-500/8 border-violet-500/18'
                  : 'bg-primary/8 border-primary/18'
                }`}>
                  <span className={`w-2 h-2 rounded-full shrink-0 mt-1 ${
                    phase === 'building' ? 'bg-blue-400 animate-pulse'
                    : phase === 'complete' ? 'bg-emerald-400'
                    : phase === 'collecting' ? 'bg-amber-400 animate-pulse'
                    : phase === 'planning' ? 'bg-violet-400 animate-pulse'
                    : 'bg-primary'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-white/72 truncate font-mono leading-snug">
                      {messages.find(m => m.role === 'user' && m.id !== 'welcome')?.content?.slice(0, 44) ?? 'Current task'}
                    </p>
                    <p className={`text-[9px] font-mono mt-0.5 ${
                      phase === 'building' ? 'text-blue-400/65'
                      : phase === 'complete' ? 'text-emerald-400/65'
                      : phase === 'collecting' ? 'text-amber-400/65'
                      : 'text-primary/65'
                    }`}>
                      {phase === 'building' ? `Building · ${currentStepIdx}/${buildData?.steps?.length ?? 0} steps`
                        : phase === 'complete' ? 'Complete ✓'
                        : phase === 'collecting' ? 'Awaiting credentials'
                        : 'Active'}
                    </p>
                  </div>
                </div>
                {/* Build steps inline under active task */}
                {buildData && (
                  <div className="mt-1.5 space-y-0.5 px-1">
                    {buildData.steps?.map((step, i) => {
                      const isDone = i < currentStepIdx;
                      const isRunning = i === currentStepIdx && phase === 'building';
                      return (
                        <div key={step.id} className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono ${
                          isDone ? 'text-emerald-400/60' : isRunning ? 'text-primary' : 'text-white/18'
                        }`}>
                          {isDone ? <CheckCircle className="w-2.5 h-2.5 shrink-0" />
                            : isRunning ? <PlayCircle className="w-2.5 h-2.5 shrink-0 animate-pulse" />
                            : <Circle className="w-2.5 h-2.5 shrink-0 opacity-30" />}
                          <span className="truncate">{step.notes}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── History Link Button (replaces inline list) ── */}
            <div className="px-2.5 pt-1 pb-2">
              <button
                onClick={() => setShowHistoryDrawer(true)}
                className="w-full group flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-white/8 bg-white/[0.02] hover:bg-primary/6 hover:border-primary/22 transition-all"
              >
                <div className="w-6 h-6 rounded-lg bg-white/6 border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 group-hover:border-primary/25 transition-all">
                  <Clock className="w-3 h-3 text-white/38 group-hover:text-primary transition-colors" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[11px] font-mono font-semibold text-white/50 group-hover:text-white/80 transition-colors leading-none">Conversation History</p>
                  <p className="text-[9px] font-mono text-white/22 group-hover:text-primary/55 transition-colors mt-0.5 leading-none">
                    {sessionsLoading ? 'Loading…' : savedSessions.length === 0 ? 'No sessions yet' : `${savedSessions.length} session${savedSessions.length !== 1 ? 's' : ''}`}
                  </p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-primary/55 shrink-0 group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>

            {/* ── Checkpoints ── */}
            {checkpoints.length > 0 && (
              <>
                {savedSessions.length > 0 && <div className="border-t border-white/6 mx-3 mb-2" />}
                <div className="px-2 pb-2">
                  <div className="flex items-center justify-between px-1 mb-1.5">
                    <p className="text-[9px] uppercase tracking-widest text-white/28 font-mono font-bold flex items-center gap-1">
                      <RotateCcw className="w-2.5 h-2.5" /> Checkpoints <span className="text-white/18 normal-case tracking-normal font-normal">({checkpoints.length})</span>
                    </p>
                    <button
                      onClick={() => { try { localStorage.removeItem(checkpointsKey(currentUser?.id)); } catch {} setCheckpoints([]); setShowAllCheckpoints(false); }}
                      className="text-[9px] text-white/18 hover:text-rose-400/55 transition-colors font-mono"
                    >clear</button>
                  </div>
                  <div className="space-y-0.5">
                    {([...checkpoints].reverse().slice(0, showAllCheckpoints ? checkpoints.length : 3)).map((cp, idx) => (
                      <div
                        key={`${cp.id}-${idx}`}
                        onClick={() => restoreCheckpoint(cp)}
                        className="group flex items-center gap-2 px-2 py-1.5 rounded-lg border border-transparent hover:bg-white/4 hover:border-white/8 transition-all cursor-pointer"
                      >
                        <div className="w-4 h-4 rounded bg-primary/10 border border-primary/18 flex items-center justify-center shrink-0">
                          <span className="text-[7px] text-primary/80 font-bold font-mono">{checkpoints.length - idx}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-white/48 truncate font-mono leading-tight">{cp.summary}</p>
                          <p className="text-[8px] text-white/20 font-mono">{formatTs(cp.ts)}</p>
                        </div>
                        <span className="shrink-0 opacity-0 group-hover:opacity-100 text-[8px] text-primary/70 font-mono transition-opacity">↩</span>
                      </div>
                    ))}
                  </div>
                  {checkpoints.length > 3 && (
                    <button
                      onClick={() => setShowAllCheckpoints(v => !v)}
                      className="w-full mt-1.5 text-[9px] font-mono text-white/22 hover:text-white/45 transition-colors py-1 rounded-lg hover:bg-white/4 border border-transparent hover:border-white/6"
                    >
                      {showAllCheckpoints ? 'Show less ↑' : `Show ${checkpoints.length - 3} more ↓`}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* ── FILES PANEL ── */}
          {leftSideTab === 'files' && (
            <div className="flex-1 overflow-y-auto py-1 min-h-0 ash-scroll">
              <div className="px-2 pt-2 pb-1 flex items-center justify-between">
                <p className="text-[9px] uppercase tracking-widest text-white/28 font-mono font-bold flex items-center gap-1">
                  <FileCode2 className="w-2.5 h-2.5" /> Generated Files
                </p>
                <button onClick={() => navigate('/workspace')} className="text-[8px] text-primary/55 hover:text-primary font-mono transition-colors">
                  Open workspace →
                </button>
              </div>
              {generatedFiles.length === 0 ? (
                <div className="px-3 py-6 text-center">
                  <FileCode2 className="w-6 h-6 text-white/8 mx-auto mb-2" />
                  <p className="text-[10px] text-white/20 font-mono">No files yet</p>
                  <p className="text-[9px] text-white/12 font-mono mt-0.5">Ask ASH to generate files</p>
                </div>
              ) : (
                <div className="px-2 space-y-0.5">
                  {generatedFiles.slice(0, 20).map(file => {
                    const extColor = file.fileType === 'markdown' ? 'text-sky-400' : file.fileType === 'json' ? 'text-amber-400' : file.fileType === 'python' ? 'text-blue-400' : 'text-emerald-400';
                    return (
                      <div key={file.id} className="group flex items-center gap-2 px-2 py-1.5 rounded-lg border border-transparent hover:bg-white/5 hover:border-white/8 transition-all cursor-pointer" onClick={() => navigate('/workspace')}>
                        <FileCode2 className={`w-3 h-3 shrink-0 ${extColor}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-mono text-white/48 truncate">{file.name}</p>
                          <p className="text-[8px] text-white/20 font-mono">{file.fileType}</p>
                        </div>
                        <ExternalLink className="w-2.5 h-2.5 text-white/12 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
                      </div>
                    );
                  })}
                  {generatedFiles.length > 20 && (
                    <p className="text-[9px] text-white/22 font-mono text-center py-1">+{generatedFiles.length - 20} more in workspace</p>
                  )}
                </div>
              )}
              <div className="p-2 border-t border-white/6 mt-2 shrink-0">
                <button onClick={() => navigate('/workspace')} className="w-full py-2 text-[10px] font-mono text-primary/55 hover:text-primary bg-primary/5 hover:bg-primary/10 border border-primary/15 rounded-lg transition-all">
                  Open Full Workspace →
                </button>
              </div>
            </div>
          )}

          {/* ── MEMORY PANEL ── */}
          {leftSideTab === 'memory' && (
            <div className="flex-1 overflow-y-auto py-1 min-h-0 ash-scroll">
              <div className="px-2 pt-2 pb-1 flex items-center justify-between">
                <p className="text-[9px] uppercase tracking-widest text-white/28 font-mono font-bold flex items-center gap-1">
                  <Brain className="w-2.5 h-2.5" /> ASH Memory
                </p>
                <button onClick={() => navigate('/memory')} className="text-[8px] text-primary/55 hover:text-primary font-mono transition-colors">
                  Manage →
                </button>
              </div>
              {ashMemory.length === 0 ? (
                <div className="px-3 py-6 text-center">
                  <Brain className="w-6 h-6 text-white/8 mx-auto mb-2" />
                  <p className="text-[10px] text-white/20 font-mono">No memory yet</p>
                  <p className="text-[9px] text-white/12 font-mono mt-0.5">ASH learns as you chat</p>
                </div>
              ) : (
                <div className="px-2 space-y-0.5">
                  {ashMemory.slice(0, 15).map(entry => (
                    <div key={entry.id} className="px-2 py-1.5 rounded-lg border border-white/5 bg-white/2 hover:bg-white/4 transition-all">
                      <p className="text-[9px] font-mono text-primary/55 font-bold truncate">{entry.memoryKey}</p>
                      <p className="text-[10px] text-white/40 font-mono truncate mt-0.5">{entry.memoryValue || '—'}</p>
                    </div>
                  ))}
                  {ashMemory.length > 15 && (
                    <p className="text-[9px] text-white/22 font-mono text-center py-1">+{ashMemory.length - 15} more</p>
                  )}
                </div>
              )}
              <div className="p-2 border-t border-white/6 mt-2 shrink-0">
                <button onClick={() => navigate('/memory')} className="w-full py-2 text-[10px] font-mono text-primary/55 hover:text-primary bg-primary/5 hover:bg-primary/10 border border-primary/15 rounded-lg transition-all">
                  Manage Memory →
                </button>
              </div>
            </div>
          )}

          {/* ── History Drawer — slide-in overlay ── */}
          <AnimatePresence>
            {showHistoryDrawer && (
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', stiffness: 340, damping: 32, mass: 0.8 }}
                className="absolute inset-0 z-50 flex flex-col bg-[#05050c] border-r border-white/8"
              >
                {/* Header */}
                <div className="flex items-center gap-2.5 px-3 pt-3 pb-2.5 border-b border-white/8 shrink-0">
                  <div className="w-6 h-6 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
                    <Clock className="w-3 h-3 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-white/80 font-mono leading-none">History</p>
                    <p className="text-[9px] text-white/28 font-mono mt-0.5 leading-none">{savedSessions.length} conversation{savedSessions.length !== 1 ? 's' : ''}</p>
                  </div>
                  <button
                    onClick={() => setShowHistoryDrawer(false)}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-white/30 hover:text-white/65 hover:bg-white/8 transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Search */}
                <div className="px-2.5 py-2 shrink-0">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/22 pointer-events-none" />
                    <input
                      type="text"
                      value={historySearch}
                      onChange={e => setHistorySearch(e.target.value)}
                      placeholder="Search sessions…"
                      className="w-full pl-7 pr-3 py-1.5 text-[11px] font-mono bg-white/4 border border-white/8 rounded-lg text-white/60 placeholder:text-white/20 focus:outline-none focus:border-primary/35 focus:bg-primary/5 transition-all"
                    />
                  </div>
                </div>

                {/* New conversation button */}
                <div className="px-2.5 pb-2 shrink-0">
                  <button
                    onClick={() => { clearSession(); setShowHistoryDrawer(false); }}
                    disabled={phase === 'building'}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/22 bg-primary/8 hover:bg-primary/15 text-primary text-[11px] font-mono font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <PlusCircle className="w-3.5 h-3.5 shrink-0" />
                    New conversation
                  </button>
                </div>

                {/* Sessions list */}
                <div className="flex-1 overflow-y-auto ash-scroll px-2 pb-3">
                  {sessionsLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-4 h-4 animate-spin text-white/20" /></div>
                  ) : savedSessions.length === 0 ? (
                    <div className="px-3 py-8 text-center space-y-2">
                      <Clock className="w-6 h-6 text-white/10 mx-auto" />
                      <p className="text-[11px] text-white/30 font-mono font-semibold">No sessions yet</p>
                      <p className="text-[9px] text-white/18 font-mono leading-relaxed">Start a task to begin your build history.</p>
                    </div>
                  ) : (() => {
                    const now = Date.now();
                    const DAY = 86400000;
                    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
                    const query = historySearch.toLowerCase().trim();
                    const filtered = query
                      ? savedSessions.filter(s => s.title?.toLowerCase().includes(query))
                      : savedSessions;
                    const groups = [
                      { label: 'Today',     sessions: [] },
                      { label: 'Yesterday', sessions: [] },
                      { label: 'This Week', sessions: [] },
                      { label: 'Older',     sessions: [] },
                    ];
                    filtered.forEach(s => {
                      const t = new Date(s.updatedAt ?? now).getTime();
                      const d = todayStart.getTime();
                      if (t >= d)              groups[0].sessions.push(s);
                      else if (t >= d - DAY)   groups[1].sessions.push(s);
                      else if (t >= d - 6*DAY) groups[2].sessions.push(s);
                      else                     groups[3].sessions.push(s);
                    });
                    if (query && filtered.length === 0) return (
                      <p className="text-center text-[10px] text-white/25 font-mono py-6">No results for "{historySearch}"</p>
                    );
                    return groups.filter(g => g.sessions.length > 0).map(group => (
                      <div key={group.label} className="mb-3">
                        <p className="text-[8px] uppercase tracking-widest text-white/22 font-mono font-bold px-1 mb-1.5">{group.label}</p>
                        <div className="space-y-0.5">
                          {group.sessions.map(s => {
                            const isActive = currentSessionId === s.id;
                            const isExpanded = expandedSessionId === s.id;
                            const phaseDot = s.phase === 'complete' ? 'bg-emerald-400'
                              : s.phase === 'building' ? 'bg-blue-400 animate-pulse'
                              : s.phase === 'planning' ? 'bg-violet-400 animate-pulse'
                              : 'bg-white/22';
                            return (
                              <div key={s.id} className={`rounded-xl border transition-all relative overflow-hidden ${
                                isActive
                                  ? 'bg-primary/6 border-primary/22 shadow-[0_0_10px_rgba(14,165,233,0.07)]'
                                  : 'border-transparent hover:bg-white/[0.03] hover:border-white/8'
                              }`}>
                                {isActive && <div className="absolute left-0 top-2 bottom-2 w-[2px] bg-primary rounded-full" />}
                                <div
                                  className={`flex items-center gap-2 px-2.5 py-2 cursor-pointer ${isActive ? 'pl-4' : ''}`}
                                  onClick={() => setExpandedSessionId(isExpanded ? null : s.id)}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${phaseDot}`} />
                                  <p className={`flex-1 min-w-0 text-[10px] truncate font-mono leading-snug ${isActive ? 'text-white/80' : 'text-white/52'}`}>{s.title}</p>
                                  <span className="text-[8px] text-white/20 font-mono shrink-0">{formatTs(new Date(s.updatedAt ?? now).getTime())}</span>
                                  <ChevronRight className={`w-2.5 h-2.5 text-white/18 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                </div>
                                {isExpanded && (
                                  <div className={`flex gap-1 pb-2 border-t border-white/5 pt-1.5 ${isActive ? 'pl-4 pr-2.5' : 'px-2.5'}`}>
                                    <button
                                      onClick={() => { restoreSession(s); setExpandedSessionId(null); setShowHistoryDrawer(false); }}
                                      className={`flex-1 text-[9px] font-mono font-semibold rounded-md py-1 transition-all ${isActive ? 'text-primary bg-primary/10 hover:bg-primary/18 border border-primary/22' : 'text-white/42 hover:text-white/70 bg-white/3 hover:bg-white/6 border border-white/8 hover:border-white/18'}`}
                                    >Resume</button>
                                    {s.phase === 'complete' && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `ash-build-${String(s.id).slice(0,8)}.json`; a.click(); URL.revokeObjectURL(url); }}
                                        className="flex-1 text-[9px] font-mono font-semibold text-white/38 hover:text-white/65 bg-white/3 hover:bg-white/6 border border-white/8 hover:border-white/18 rounded-md py-1 transition-all"
                                      >Export</button>
                                    )}
                                    <button
                                      onClick={(e) => { deleteSession(s.id, e); setExpandedSessionId(null); }}
                                      className="text-[9px] font-mono text-rose-400/42 hover:text-rose-400/75 bg-white/3 hover:bg-rose-500/8 border border-white/8 hover:border-rose-500/22 rounded-md py-1 px-2 transition-all"
                                    >Del</button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── BOTTOM: Model status (settings now in the message box) ── */}
          <div className="shrink-0 border-t border-white/8 bg-black/85 px-3 py-2 flex items-center justify-between">
            <span className="text-[9px] font-mono text-white/22">Agent Mode</span>
            {activeMode && (
              <span className={`flex items-center gap-1 text-[9px] font-mono ${activeMode.color} opacity-55`}>
                <activeMode.icon className="w-2.5 h-2.5" />
                {activeMode.label} · {activeMode.modelLabel}
              </span>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            CENTER PANEL (flex-1) — ASH Chat + Build Terminal
        ═══════════════════════════════════════════════════════════════ */}
        <div className="flex-1 min-w-0 flex flex-col bg-[#04040c]">

          {/* Chat header / ASH identity bar */}
          <div className="shrink-0 border-b border-white/8 px-4 py-2 bg-black/70 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center">
                <Wand2 className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">ASH</span>
                  <Badge variant="outline" className="text-[8px] border-primary/30 text-primary bg-primary/5 font-mono px-1 py-0">AI</Badge>
                  {activeMode && (
                    <span className={`text-[9px] font-mono ${activeMode.color} opacity-55`}>· {activeMode.modelLabel}</span>
                  )}
                </div>
                <p className="text-[9px] text-white/28 font-mono">Autonomous Business Builder</p>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              {/* Save to Library button */}
              <button
                onClick={() => {
                  const activeId = buildData?.instanceId;
                  const sys = activeId
                    ? userSystems.find(s => s.id === activeId) ?? userSystems[0]
                    : userSystems[0];
                  if (!sys) {
                    toast.info('Start a conversation with ASH first, then save your system.');
                    return;
                  }
                  saveFileTreeToLibrary(sys).catch(() => {});
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-primary/25 bg-primary/8 hover:bg-primary/15 text-primary text-[10px] font-bold font-mono transition-all"
                title="Save current system to Library"
              >
                <Save className="w-3 h-3 shrink-0" />
                Save
              </button>
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                <span className="text-[10px] text-emerald-400/70 font-mono">Online</span>
              </div>
            </div>
          </div>

          {/* Agent team status (when building/collecting/planning/complete) */}
          {(phase === 'building' || phase === 'collecting' || phase === 'complete' || phase === 'planning') && (
            <div className="shrink-0 border-b border-white/8 px-4 py-2 bg-black/50 flex items-center gap-3 flex-wrap">
              <p className="text-[9px] uppercase tracking-widest text-white/28 font-mono flex items-center gap-1 shrink-0">
                <Globe className="w-2.5 h-2.5" /> Agents
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {MULTI_AGENTS.map(agent => {
                  const AIcon = agent.icon;
                  const isActive = agent.phases.includes(phase);
                  const isDone = phase === 'complete';
                  return (
                    <span key={agent.id} className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-mono transition-all ${
                      isDone ? 'bg-emerald-500/10 border-emerald-500/28 text-emerald-400'
                      : isActive && phase === 'building' ? 'bg-primary/10 border-primary/28 text-primary'
                      : isActive ? 'bg-blue-500/10 border-blue-500/28 text-blue-400'
                      : 'bg-white/3 border-white/8 text-white/18'
                    }`}>
                      <AIcon className="w-2.5 h-2.5" />
                      {agent.label}
                      {isActive && phase === 'building' && !isDone && (
                        <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                      )}
                    </span>
                  );
                })}
              </div>
              {phase === 'building' && buildData?.steps && (
                <div className="ml-auto flex items-center gap-2 shrink-0">
                  {activeMode && <AIModelBadge model={activeMode.model} isActive size="xs" />}
                  <span className="text-[9px] font-mono text-primary/55">
                    {currentStepIdx}/{buildData.steps.length} steps
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Plan review status bar */}
          {phase === 'planning' && pendingPlanData && (
            <div className="shrink-0 border-b border-white/8 px-4 py-2 bg-violet-500/5 flex items-center gap-4 flex-wrap">
              <p className="text-[9px] text-violet-400/65 font-mono uppercase tracking-widest shrink-0">Build plan ready</p>
              <div className="flex items-center gap-2 flex-1">
                <span className="text-[11px] text-white/55 truncate">{pendingPlanData.systemName || pendingPlanData.blueprint?.name || 'Custom System'}</span>
                {pendingPlanData.buildSteps?.length > 0 && (
                  <span className="text-[10px] text-white/30 font-mono shrink-0">· {pendingPlanData.buildSteps.length} steps</span>
                )}
              </div>
              <Button
                className="ml-auto h-7 gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-semibold border-0 shrink-0"
                onClick={() => sendMessage("I've reviewed the plan and I'm ready to proceed with the build.")}
                disabled={chatLoading}
              >
                {chatLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Rocket className="w-3 h-3" />}
                Confirm Plan
              </Button>
            </div>
          )}

          {/* Credential status bar */}
          {phase === 'collecting' && pendingCreds.length > 0 && (
            <div className="shrink-0 border-b border-white/8 px-4 py-2 bg-amber-500/5 flex items-center gap-4 flex-wrap">
              <p className="text-[9px] text-amber-400/65 font-mono uppercase tracking-widest shrink-0">Credentials needed</p>
              <div className="flex items-center gap-3 flex-wrap">
                {pendingCreds.map(cred => {
                  const isStored = !!storedCredKeys[cred.key];
                  return (
                    <span key={cred.key} className="flex items-center gap-1.5 text-[11px]">
                      <span className={`w-1.5 h-1.5 rounded-full ${isStored ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                      <span className="text-white/55">{cred.name || cred.key}</span>
                      {!isStored && (
                        <a href={`/connections?connect=${encodeURIComponent(cred.key)}`} className="text-amber-400 hover:text-amber-300 underline text-[9px] font-mono">connect</a>
                      )}
                    </span>
                  );
                })}
              </div>
              <div className="ml-auto flex items-center gap-2 shrink-0">
                <Button
                  className="h-7 gap-1.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-[11px] font-semibold border border-white/10 shrink-0"
                  onClick={() => executeBuild({}, pendingBlueprintRef.current, pendingSystemNameRef.current)}
                  disabled={executeLoading}
                  title="Run a simulated demo build without entering credentials"
                >
                  {executeLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                  Demo Build
                </Button>
                <Button
                  className="h-7 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold border-0 shrink-0"
                  onClick={() => handleCredentialSubmit(liftedCredValues)}
                  disabled={executeLoading || pendingCreds.some(c => c.required !== false && !(liftedCredValues[c.key] || '').trim())}
                >
                  {executeLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                  Execute Build
                </Button>
              </div>
            </div>
          )}

          {phase !== 'idle' && <ProgressTracker phase={phase} />}

          {/* Main scrollable chat area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 ash-scroll">
            <SkillActivationPanel activatedSkills={activatedSkills} />

            {messages.map((m, idx) => {
              const cp = checkpointByMsgCount[idx + 1];
              return (
                <React.Fragment key={m.id}>
                  <MessageBubble
                    msg={m}
                    onConfirmPlan={m.missingPlan ? () => sendMessage('Please output the SBEP_DATA plan block for the system you just described. Include action, blueprint, systemName, buildSteps, and requiredCredentials.') : undefined}
                  />
                  {cp && <CheckpointMarker cp={cp} onRestore={() => restoreCheckpoint(cp)} />}
                </React.Fragment>
              );
            })}

            {phase === 'planning' && pendingPlanData && (
              <PlanReviewCard
                planData={pendingPlanData}
                aiMode={aiMode}
                chatLoading={chatLoading}
                onConfirm={() => sendMessage("I've reviewed the plan and I'm ready to proceed with the build.")}
                onEdit={(editRequest) => sendMessage(editRequest)}
              />
            )}

            {phase === 'collecting' && pendingCreds.length > 0 && (
              <CredentialForm
                credentials={pendingCreds}
                blueprint={pendingBlueprintRef.current}
                onExecute={handleCredentialSubmit}
                loading={executeLoading}
                prefill={storedCredKeys}
                onValuesChange={setLiftedCredValues}
              />
            )}

            {activeBrowser && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[11px] text-white/50 font-mono">ASH Browser — {activeBrowser.task}</span>
                </div>
                <BrowserView
                  task={activeBrowser.task}
                  startUrl={activeBrowser.startUrl}
                  authToken={localStorage.getItem('sbep_auth_token')}
                  onResult={(result) => {
                    // Do NOT close the browser — user closes it themselves
                    const resultMsg = `**Browser session complete.** Here is what I found:\n\n${result}`;
                    setMessages(prev => [...prev, {
                      id: Date.now(),
                      role: 'assistant',
                      content: resultMsg,
                      ts: Date.now(),
                    }]);
                  }}
                  onClose={() => setActiveBrowser(null)}
                />
              </div>
            )}

            {chatLoading && thinkingSteps.length > 0 && thinkingCurrentIdx >= 0 && (
              <ExecutionStream
                steps={thinkingSteps}
                currentIdx={thinkingCurrentIdx}
                expandedSteps={expandedSteps}
                onToggle={i => setExpandedSteps(prev => {
                  const next = new Set(prev);
                  next.has(i) ? next.delete(i) : next.add(i);
                  return next;
                })}
              />
            )}
            {chatLoading && thinkingSteps.length === 0 && !messages.some(m => m.streaming) && (
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Wand2 className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="flex flex-col gap-0.5 items-start">
                  <span className="text-[10px] text-white/30 font-mono font-semibold px-1">ASH</span>
                  <div className="bg-[#111120] border border-white/12 rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {[0, 1, 2].map(i => (
                        <span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-primary/55 animate-bounce"
                          style={{ animationDelay: `${i * 160}ms`, animationDuration: '0.9s' }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {messages.length === 1 && phase === 'idle' && (
              <div className="mt-2">
                <p className="text-[9px] uppercase tracking-widest text-white/28 font-mono mb-2">Quick start</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {STARTER_PROMPTS.map((g, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setInput(g);
                        setTimeout(() => inputRef.current?.focus(), 0);
                      }}
                      className="w-full text-left text-[11px] px-3 py-3 rounded-xl border border-white/10 bg-black/35 hover:bg-black/55 hover:border-primary/30 text-white/50 hover:text-white transition-colors flex items-start gap-2.5"
                    >
                      <Zap className="w-3.5 h-3.5 text-primary/50 shrink-0 mt-0.5" />
                      <span className="leading-snug">{g}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Save & Create Product — shown when build completes */}
            {phase === 'complete' && buildData?.instanceId && (
              <div className="border border-emerald-500/25 bg-emerald-500/5 rounded-xl p-4 space-y-3 mt-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <p className="text-sm font-bold text-white">System Activated!</p>
                  <span className="ml-auto text-[10px] font-mono text-emerald-400/60 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
                    {buildData?.steps?.length ?? 0} steps complete
                  </span>
                </div>
                <p className="text-xs text-white/45 leading-relaxed">Your system is live and running. Open the system dashboard to track revenue and activity, or save it to your Library.</p>

                {/* Revenue tracking prompt */}
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 flex items-start gap-2.5">
                  <DollarSign className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-amber-300">Connect revenue tracking to see real earnings</p>
                    <p className="text-[10px] text-white/35 leading-relaxed mt-0.5">Link Stripe, Gumroad, or PayPal so ASH can automatically track income from this system.</p>
                  </div>
                  <button
                    onClick={() => setShowRevenueModal(true)}
                    className="shrink-0 flex items-center gap-1 h-7 px-2.5 rounded-lg bg-amber-500/18 hover:bg-amber-500/28 border border-amber-500/30 text-amber-300 text-[10px] font-bold transition-colors whitespace-nowrap"
                  >
                    <Zap className="w-3 h-3" /> Connect
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => navigate(`/systems/${buildData.instanceId}`)}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-emerald-500/18 hover:bg-emerald-500/28 border border-emerald-500/35 text-emerald-300 text-xs font-bold transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open System Dashboard
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const sys = userSystems.find(s => s.id === buildData.instanceId) ?? { id: buildData.instanceId, steps: buildData.steps ?? [] };
                        saveFileTreeToLibrary(sys);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-primary/12 hover:bg-primary/22 border border-primary/25 text-primary text-xs font-bold transition-colors"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save to Library
                    </button>
                    <button
                      onClick={() => navigate('/products')}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/12 text-white/55 text-xs font-bold transition-colors"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      Create Product
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Persistent plan confirmation banner — shown whenever ASH's last reply reads like a build plan but no structured plan card appeared */}
          {(() => {
            const lastMsg = messages[messages.length - 1];
            const showConfirmBanner = lastMsg?.role === 'assistant' && lastMsg?.missingPlan && phase !== 'planning' && !chatLoading;
            if (!showConfirmBanner) return null;
            return (
              <div className="shrink-0 border-t border-amber-500/25 bg-amber-500/10 px-4 py-2.5 flex items-center gap-2.5 flex-wrap">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <p className="text-[11px] text-amber-200 flex-1 min-w-[160px]">This looks like a build plan — confirm it so ASH can start building.</p>
                <Button
                  className="h-7 gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[11px] font-semibold border border-amber-500/40 shrink-0"
                  onClick={() => sendMessage('Please output the SBEP_DATA plan block for the system you just described. Include action, blueprint, systemName, buildSteps, and requiredCredentials.')}
                >
                  Confirm this plan
                </Button>
              </div>
            );
          })()}

          {/* Build terminal — slides in when building */}
          {buildData && (phase === 'building' || phase === 'complete') && (
            <div className="shrink-0 border-t border-white/8 h-52">
              <BuildTerminal
                steps={buildData?.steps ?? []}
                outputs={stepOutputs}
                currentIdx={currentStepIdx}
                instanceId={buildData?.instanceId}
                phase={phase}
                liveMode={liveMode}
                setLiveMode={setLiveMode}
                stepConnectorResults={stepConnectorResults}
                preflightWarnings={preflightWarnings}
              />
            </div>
          )}

          {/* Input bar */}
          <div className="px-3 pb-3 pt-2 border-t border-white/10 bg-black/90 shrink-0">
            {phase === 'building' ? (
              <div className="flex items-center justify-center gap-2 py-1.5 flex-wrap">
                <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span className="font-mono text-[11px] text-white/42">Building — {buildData?.steps?.length ?? 0} steps in progress</span>
                {activeMode && <AIModelBadge model={activeMode.model} isActive />}
              </div>
            ) : phase === 'complete' ? (
              <div className="flex items-center justify-center gap-2 py-1.5 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="font-mono text-[11px]">Activated — redirecting…</span>
              </div>
            ) : (
              <>
                {/* Attachment chips */}
                {attachments.length > 0 && (
                  <div className="flex gap-1.5 mb-2 flex-wrap">
                    {attachments.map((f, i) => (
                      <div key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/6 border border-white/12 text-[10px] text-white/55 font-mono">
                        {f.type.startsWith('image/') ? <ImageIcon className="w-3 h-3 shrink-0 text-blue-400" /> : <FileText className="w-3 h-3 shrink-0 text-emerald-400" />}
                        <span className="max-w-[80px] truncate">{f.name}</span>
                        <button onClick={() => setAttachments(a => a.filter((_, j) => j !== i))} className="text-white/30 hover:text-rose-400 ml-0.5 transition-colors leading-none">×</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Main input card */}
                <div className={`rounded-xl border transition-colors overflow-visible relative ${isInputDisabled ? 'border-white/8 opacity-55' : 'border-white/14 focus-within:border-primary/45'} bg-black/60`}>
                  {/* Toolbar row */}
                  <div className="flex items-center gap-1.5 px-2.5 pt-2 pb-1">
                    {/* + Attach dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => { setShowAttachMenu(p => !p); setShowAiDropdown(false); }}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/40 hover:text-white/70 transition-all text-[10px] font-mono font-bold"
                        title="Attach file or image"
                      >
                        <PlusCircle className="w-3 h-3" /> Attach
                      </button>
                      <AnimatePresence>
                        {showAttachMenu && (
                          <motion.div
                            initial={{ opacity: 0, y: 4, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.95 }}
                            transition={{ duration: 0.1 }}
                            className="absolute bottom-full left-0 mb-1.5 w-44 rounded-xl border border-white/12 bg-[#0d0d1a] shadow-xl z-50 overflow-hidden"
                          >
                            <button
                              onClick={() => { attachImgRef.current?.click(); setShowAttachMenu(false); }}
                              className="flex items-center gap-2 w-full px-3 py-2.5 text-[11px] font-mono text-white/65 hover:bg-white/6 hover:text-white/90 transition-colors"
                            >
                              <ImageIcon className="w-3.5 h-3.5 text-blue-400" /> Upload Image
                            </button>
                            <button
                              onClick={() => { attachFileRef.current?.click(); setShowAttachMenu(false); }}
                              className="flex items-center gap-2 w-full px-3 py-2.5 text-[11px] font-mono text-white/65 hover:bg-white/6 hover:text-white/90 transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5 text-emerald-400" /> Upload File
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <input ref={attachImgRef} type="file" accept="image/*" className="hidden" onChange={handleAttachFile} />
                      <input ref={attachFileRef} type="file" accept=".pdf,.txt,.md,.json,.csv,.docx" className="hidden" onChange={handleAttachFile} multiple />
                    </div>

                    {/* Plan mode toggle — single subtle pill, no Build button */}
                    <button
                      onClick={() => setChatMode(isPlanMode ? 'build' : 'plan')}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold font-mono transition-all border ${
                        isPlanMode
                          ? 'bg-violet-500/18 border-violet-500/35 text-violet-300'
                          : 'bg-white/5 border-white/10 text-white/30 hover:text-white/55 hover:border-white/18'
                      }`}
                      title={isPlanMode ? 'Plan mode — click to switch back to normal chat' : 'Switch to plan mode — explore ideas without triggering a build'}
                    >
                      <Brain className="w-3 h-3" />
                      {isPlanMode ? 'Plan' : 'Chat'}
                    </button>

                    <div className="flex-1" />

                    {/* AI Model dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => { setShowAiDropdown(p => !p); setShowAttachMenu(false); }}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-mono font-bold transition-all ${
                          showAiDropdown
                            ? `${activeMode?.color ?? 'text-primary'} border-current bg-white/6`
                            : 'text-white/38 border-white/10 hover:border-white/22 hover:text-white/65'
                        }`}
                        title="Change AI agent mode and settings"
                      >
                        {activeMode && <activeMode.icon className="w-3 h-3" />}
                        {activeMode?.label ?? 'Fast'}
                        <ChevronDown className={`w-2.5 h-2.5 transition-transform duration-150 ${showAiDropdown ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {showAiDropdown && (
                          <motion.div
                            initial={{ opacity: 0, y: 4, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.95 }}
                            transition={{ duration: 0.1 }}
                            className="absolute bottom-full right-0 mb-1.5 w-64 rounded-xl border border-white/12 bg-[#0d0d1a] shadow-xl z-50 overflow-hidden"
                          >
                            <div className="p-3">
                              <p className="text-[9px] uppercase tracking-widest text-white/28 font-mono mb-2">ASH Agent Mode</p>
                              <div className="space-y-0.5 mb-3">
                                {AI_MODES.map(m => {
                                  const MIcon = m.icon;
                                  const isActive = aiMode === m.id;
                                  const isLocked = m.requiredTier && !isEmpireTier;
                                  return (
                                    <button
                                      key={m.id}
                                      disabled={!!isLocked}
                                      onClick={() => { if (!isLocked) { setAiMode(m.id); setShowAiDropdown(false); } }}
                                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all ${
                                        isActive ? `${m.color} bg-white/5 border border-current/20` : 'text-white/45 hover:bg-white/5 hover:text-white/75 border border-transparent'
                                      } ${isLocked ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                                    >
                                      <MIcon className="w-3.5 h-3.5 shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1">
                                          <span className="text-[11px] font-bold font-mono">{m.label}</span>
                                          <span className="text-[9px] font-mono opacity-45">{m.modelLabel}</span>
                                        </div>
                                        <p className="text-[9px] opacity-40 truncate mt-0.5">{m.description.split('.')[0]}</p>
                                      </div>
                                      {isActive && <Check className="w-3 h-3 shrink-0 opacity-75" />}
                                      {isLocked && <Lock className="w-3 h-3 shrink-0 text-amber-400/55" />}
                                    </button>
                                  );
                                })}
                              </div>
                              <div className="border-t border-white/8 pt-2.5 space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                  <div>
                                    <p className="text-[11px] text-white/55 font-mono">High effort <span className="text-[9px] text-amber-400/55">·+credits</span></p>
                                    <p className="text-[9px] text-white/22">Stronger model for harder tasks</p>
                                  </div>
                                  <div
                                    onClick={() => aiMode === 'fast' ? setAiMode('business') : setAiMode('fast')}
                                    className={`w-9 h-5 rounded-full shrink-0 flex items-center px-0.5 transition-colors cursor-pointer ${aiMode !== 'fast' ? 'bg-amber-500/65' : 'bg-white/12'}`}
                                  >
                                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${aiMode !== 'fast' ? 'translate-x-4' : 'translate-x-0'}`} />
                                  </div>
                                </div>
                                <div>
                                  <p className="text-[9px] uppercase tracking-widest text-white/22 font-mono mb-1.5 flex items-center gap-1">
                                    <Building2 className="w-2.5 h-2.5" /> Business type
                                  </p>
                                  <div className="grid grid-cols-4 gap-1">
                                    {BUSINESS_TYPES.slice(0, 4).map(bt => {
                                      const BIcon = bt.icon;
                                      const isActive = businessType === bt.id;
                                      return (
                                        <button
                                          key={bt.id}
                                          onClick={() => setBusinessType(isActive ? null : bt.id)}
                                          className={`flex flex-col items-center gap-0.5 py-1.5 rounded-lg border text-[9px] font-mono transition-all ${isActive ? `${bt.bg} ${bt.color}` : 'bg-white/3 border-white/8 hover:border-white/18 text-white/35'}`}
                                        >
                                          <BIcon className={`w-3.5 h-3.5 ${isActive ? bt.color : ''}`} />
                                          {bt.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                                {showRevenueGoalInput ? (
                                  <div className="flex gap-1">
                                    <input
                                      type="text"
                                      value={revenueGoal}
                                      onChange={e => setRevenueGoal(e.target.value)}
                                      placeholder="e.g. $5,000/mo"
                                      className="flex-1 text-[11px] bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white placeholder:text-white/22 focus:outline-none focus:border-primary/45 font-mono"
                                      onKeyDown={e => { if (e.key === 'Enter') setShowRevenueGoalInput(false); }}
                                      autoFocus
                                    />
                                    <button onClick={() => setShowRevenueGoalInput(false)} className="text-primary hover:text-primary/80 px-2 text-sm">✓</button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setShowRevenueGoalInput(true)}
                                    className="w-full flex items-center justify-between text-[11px] px-2 py-1.5 rounded-lg border border-white/8 bg-white/3 hover:border-white/18 transition-colors"
                                  >
                                    <span className="text-white/35 font-mono flex items-center gap-1"><Target className="w-2.5 h-2.5" /> {revenueGoal || 'Set revenue goal…'}</span>
                                    {revenueGoal && <span className="text-emerald-400 font-mono font-bold text-[10px]">{revenueGoal}/mo</span>}
                                  </button>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Mode badge + status line */}
                  <div className="flex items-center justify-between px-3 pt-2 pb-0.5">
                    <span className={`text-[9px] font-mono font-bold tracking-widest border rounded px-1.5 py-0.5 ${modeBadge.cls}`}>
                      {modeBadge.label}
                    </span>
                    {ashStatusLine && (
                      <span className="flex items-center gap-1 text-[9px] text-white/30 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        {ashStatusLine}
                      </span>
                    )}
                  </div>

                  {/* Textarea + send */}
                  <div className="flex items-end gap-2 px-2.5 pb-2.5">
                    {/* Mic button */}
                    <button
                      type="button"
                      title={isRecording ? 'Stop recording' : 'Voice input'}
                      disabled={isInputDisabled || isTranscribing || chatLoading}
                      onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                      className={`shrink-0 w-[30px] h-[30px] rounded-lg flex items-center justify-center transition-all mb-0.5 ${
                        isRecording
                          ? 'bg-rose-500/25 border border-rose-500/60 text-rose-400 animate-pulse'
                          : isTranscribing
                          ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                          : 'bg-white/5 border border-white/12 text-white/35 hover:text-white/65 hover:border-white/25'
                      } disabled:opacity-30`}
                    >
                      {isTranscribing
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : isRecording
                        ? <MicOff className="w-3.5 h-3.5" />
                        : <Mic className="w-3.5 h-3.5" />}
                    </button>
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKey}
                      placeholder={
                        phase === 'collecting' ? 'Describe what you want to plan…'
                        : phase === 'building' ? 'Confirm or adjust your build…'
                        : phase === 'complete' ? 'Your system is live — ask ASH anything…'
                        : 'Message ASH…'
                      }
                      disabled={isInputDisabled}
                      className="flex-1 resize-none text-xs bg-transparent text-white placeholder:text-white/22 focus:outline-none disabled:opacity-40 py-1 min-h-[28px]"
                      rows={1}
                      style={{ maxHeight: '120px' }}
                      onInput={e => {
                        e.target.style.height = 'auto';
                        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                      }}
                    />
                    {/* Voice toggle */}
                    <button
                      type="button"
                      title={voiceEnabled ? 'Voice responses on — click to mute' : 'Enable voice responses'}
                      onClick={toggleVoiceEnabled}
                      className={`shrink-0 w-[30px] h-[30px] rounded-lg flex items-center justify-center transition-all mb-0.5 ${
                        voiceEnabled
                          ? isTTSPlaying
                            ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400'
                            : 'bg-violet-500/15 border border-violet-500/35 text-violet-400'
                          : 'bg-white/5 border border-white/12 text-white/25 hover:text-white/50 hover:border-white/22'
                      }`}
                    >
                      {voiceEnabled
                        ? isTTSPlaying
                          ? <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                          : <Volume2 className="w-3.5 h-3.5" />
                        : <VolumeX className="w-3.5 h-3.5" />}
                    </button>
                    {/* Voice Call Mode entry */}
                    <button
                      type="button"
                      title="Enter ASH voice call mode"
                      onClick={() => { if (!voiceEnabled) { setVoiceEnabled(true); try { localStorage.setItem('sbep_voice_enabled', 'true'); } catch {} } setVoiceCallMode(true); }}
                      className="shrink-0 w-[30px] h-[30px] rounded-lg flex items-center justify-center transition-all mb-0.5 bg-white/5 border border-white/12 text-white/30 hover:text-violet-400 hover:border-violet-500/40 hover:bg-violet-500/10"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                    </button>
                    {chatLoading ? (
                      <button
                        type="button"
                        onClick={stopGeneration}
                        title="Stop generation (Esc)"
                        className="h-[30px] w-[30px] shrink-0 rounded-lg mb-0.5 flex items-center justify-center bg-rose-500/15 border border-rose-500/40 text-rose-400 hover:bg-rose-500/25 transition-colors"
                      >
                        <Square className="w-3 h-3 fill-rose-400" />
                      </button>
                    ) : (
                      <Button
                        onClick={() => sendMessage()}
                        disabled={!input.trim() || isInputDisabled}
                        size="icon"
                        className="h-[30px] w-[30px] shrink-0 rounded-lg mb-0.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            RIGHT PANEL — Library / Resources (collapsible)
        ═══════════════════════════════════════════════════════════════ */}
        <div className={`hidden lg:flex shrink-0 flex-col border-l bg-[#03030a] transition-all duration-200 overflow-hidden ${libraryOpen ? 'w-[240px] border-cyan-500/8' : 'w-10 border-white/6'}`}>

          {/* Library header */}
          {libraryOpen ? (
            <div className="px-3 py-2.5 border-b border-cyan-500/8 flex items-center justify-between shrink-0 relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/25 to-transparent pointer-events-none" />
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-3 h-3 text-cyan-400/60" />
                <span className="text-[9px] font-bold text-white/60 font-mono uppercase tracking-widest">Library</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRightPanel(p => p === 'files' ? 'blueprints' : 'files')}
                  className={`text-[8px] font-mono uppercase tracking-wide transition-colors ${rightPanel === 'files' ? 'text-cyan-400' : 'text-white/28 hover:text-cyan-400'}`}
                >
                  Files
                </button>
                <button
                  onClick={() => setLibraryOpen(false)}
                  title="Collapse Library"
                  className="p-0.5 text-white/20 hover:text-cyan-400 transition-colors rounded"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center pt-3 gap-3">
              <button
                onClick={() => setLibraryOpen(true)}
                title="Open Library"
                className="p-1.5 text-white/20 hover:text-cyan-400 transition-colors rounded-lg hover:bg-cyan-500/8"
              >
                <BookOpen className="w-4 h-4" />
              </button>
              <div className="w-px h-20 bg-gradient-to-b from-cyan-500/20 to-transparent" />
            </div>
          )}

          {libraryOpen && (<>
          {/* Search + New */}
          <div className="px-2 py-2 border-b border-cyan-500/6 shrink-0 flex items-center gap-1.5">
            <div className="flex-1 flex items-center gap-1.5 bg-white/4 border border-white/8 rounded-lg px-2 py-1.5">
              <MessageSquare className="w-3 h-3 text-white/22 shrink-0" />
              <input
                type="text"
                value={rightSearch}
                onChange={e => setRightSearch(e.target.value)}
                placeholder="Search blueprints, tools…"
                className="flex-1 bg-transparent text-[11px] text-white/55 placeholder:text-white/22 focus:outline-none font-mono min-w-0"
              />
            </div>
            <button
              onClick={clearSession}
              disabled={phase === 'building'}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-primary/12 hover:bg-primary/22 border border-primary/22 text-primary text-[10px] font-mono font-bold transition-all disabled:opacity-28"
            >
              <PlusCircle className="w-3 h-3" /> New
            </button>
          </div>

          {/* Resource tabs */}
          <div className="grid grid-cols-3 border-b border-cyan-500/8 shrink-0 p-1 gap-0.5">
            {[
              { id: 'blueprints', label: 'BPs',    icon: Grid3x3 },
              { id: 'tools',      label: 'Tools',  icon: Layers },
              { id: 'files',      label: 'Apps',   icon: FolderOpen },
              { id: 'pages',      label: 'Pages',  icon: LayoutTemplate },
              { id: 'social',     label: 'Social', icon: Share2 },
              { id: 'media',      label: 'Media',  icon: Film },
              { id: 'deploy',     label: 'Deploy', icon: CloudUpload },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setRightPanel(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1 py-1 text-[8px] font-mono font-bold uppercase tracking-wide transition-all rounded-md ${
                  rightPanel === tab.id
                    ? 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/25 shadow-[0_0_8px_rgba(6,182,212,0.1)]'
                    : 'text-white/20 hover:text-white/45 border border-transparent hover:bg-white/3'
                }`}
              >
                <tab.icon className="w-2.5 h-2.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto min-h-0 ash-scroll">

            {/* ── BLUEPRINTS (Inspiration Ideas) ── */}
            {rightPanel === 'blueprints' && (
              <div className="flex flex-col h-full">
                {/* Inspiration note */}
                <div className="px-3 py-2 bg-primary/4 border-b border-primary/10 shrink-0">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-3 h-3 text-primary/60 shrink-0 mt-0.5" />
                    <p className="text-[9px] text-white/38 leading-relaxed font-mono">
                      <span className="text-primary/70 font-bold">Ideas only.</span> ASH builds everything from scratch — faster, smarter, and tailored to you. Select one to get ASH inspired.
                    </p>
                  </div>
                </div>
                <div className="p-2 flex flex-wrap gap-1 border-b border-white/6 shrink-0">
                  <button
                    onClick={() => setActiveCatId(null)}
                    className={`px-2 py-0.5 rounded-full text-[9px] font-mono transition-colors ${activeCatId === null ? 'bg-primary/20 text-primary border border-primary/28' : 'bg-white/4 text-white/32 border border-white/8 hover:text-white'}`}
                  >All</button>
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCatId(activeCatId === cat.id ? null : cat.id)}
                      className={`px-2 py-0.5 rounded-full text-[9px] font-mono transition-colors ${activeCatId === cat.id ? 'bg-primary/20 text-primary border border-primary/28' : 'bg-white/4 text-white/32 border border-white/8 hover:text-white'}`}
                    >{cat.name}</button>
                  ))}
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5 ash-scroll">
                  {bpLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                  ) : filteredBps.length === 0 ? (
                    <p className="text-center py-6 text-white/22 text-xs">No ideas found</p>
                  ) : filteredBps.map(bp => (
                    <BlueprintCard key={bp.id} bp={bp} selected={selectedBp?.id === bp.id} onSelect={setSelectedBp} />
                  ))}
                </div>
                <div className="p-2 border-t border-white/8 shrink-0 space-y-1.5">
                  <Button
                    className="w-full h-9 gap-2 text-xs font-semibold"
                    disabled={!selectedBp || phase === 'building' || phase === 'complete' || chatLoading}
                    onClick={handleBlueprintLaunch}
                  >
                    {chatLoading || executeLoading
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Designing…</>
                      : <><Wand2 className="w-3.5 h-3.5" /> Build This My Way</>}
                  </Button>
                  {!selectedBp
                    ? <p className="text-[9px] text-white/20 text-center font-mono">Select an idea above</p>
                    : <p className="text-[9px] text-white/20 text-center font-mono">ASH will redesign this from scratch</p>}
                </div>
              </div>
            )}

            {/* ── TOOLS ── */}
            {rightPanel === 'tools' && (
              <div>
                <div className="px-3 pt-2.5 pb-1">
                  <p className="text-[10px] text-white/32 leading-relaxed">Connect tools so ASH can build with them automatically.</p>
                </div>
                {toolsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                ) : marketplaceTools.length === 0 ? (
                  <p className="text-center py-6 text-white/22 text-xs font-mono">No tools found</p>
                ) : (
                  (() => {
                    const filtered = marketplaceTools.filter(t =>
                      !rightSearch || (t.name || '').toLowerCase().includes(rightSearch.toLowerCase())
                    );
                    const grouped = filtered.reduce((acc, t) => {
                      const cat = toolCategoryMap[t.categoryId] || 'Other';
                      if (!acc[cat]) acc[cat] = [];
                      acc[cat].push(t);
                      return acc;
                    }, {});
                    return Object.entries(grouped).map(([catName, tools]) => (
                      <div key={catName} className="px-3 py-2">
                        <p className="text-[9px] uppercase tracking-widest text-white/20 font-mono mb-1">{catName}</p>
                        <div className="space-y-0.5">
                          {tools.map(tool => (
                            <div key={tool.id} className="flex items-center justify-between px-2 py-1 rounded hover:bg-white/4 transition-colors gap-2">
                              <span className="text-[11px] text-white/48 truncate">{tool.name}</span>
                              {tool.affiliateLink ? (
                                <a
                                  href={tool.affiliateLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[9px] font-mono text-emerald-400/60 hover:text-emerald-300 transition-colors shrink-0"
                                >
                                  Get →
                                </a>
                              ) : (
                                <button
                                  onClick={() => navigate('/connections')}
                                  className="text-[9px] font-mono text-primary/45 hover:text-primary transition-colors shrink-0"
                                >
                                  Connect →
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="border-t border-white/5 mt-2" />
                      </div>
                    ));
                  })()
                )}
                <div className="p-3 pt-1">
                  <button onClick={() => navigate('/marketplace')} className="w-full py-2 px-3 text-xs font-semibold text-primary bg-primary/8 hover:bg-primary/15 border border-primary/18 rounded-lg transition-colors">
                    Browse Full Marketplace →
                  </button>
                </div>
              </div>
            )}

            {/* ── SOCIAL HUB ── */}
            {rightPanel === 'social' && (
              <div className="py-2">
                <div className="px-3 py-2">
                  <p className="text-[10px] text-white/35 font-mono leading-relaxed mb-3">
                    Connect social platforms so ASH can automate content across them.
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 mb-3">
                    {[
                      { name: 'TikTok', icon: '🎵', key: 'TIKTOK_ACCESS_TOKEN' },
                      { name: 'Instagram', icon: '📸', key: 'INSTAGRAM_ACCESS_TOKEN' },
                      { name: 'YouTube', icon: '▶️', key: 'YOUTUBE_API_KEY' },
                      { name: 'X / Twitter', icon: '✖️', key: 'TWITTER_BEARER_TOKEN' },
                      { name: 'LinkedIn', icon: '💼', key: 'LINKEDIN_ACCESS_TOKEN' },
                      { name: 'Snapchat', icon: '👻', key: 'SNAPCHAT_ACCESS_TOKEN' },
                      { name: 'Facebook', icon: '👥', key: 'FACEBOOK_PAGE_TOKEN' },
                    ].map(p => {
                      const connected = !!storedCredKeys[p.key];
                      return (
                        <div key={p.name} className={`flex items-center gap-2 px-2 py-2 rounded-lg border transition-all ${
                          connected
                            ? 'border-emerald-500/20 bg-emerald-500/5'
                            : 'border-white/8 bg-white/2'
                        }`}>
                          <span className="text-sm shrink-0">{p.icon}</span>
                          <span className="text-[10px] font-mono text-white/50 truncate flex-1">{p.name}</span>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${connected ? 'bg-emerald-400' : 'bg-white/15'}`} />
                        </div>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => navigate('/social-accounts')}
                    className="w-full py-2 text-[10px] font-mono text-violet-400/65 hover:text-violet-300 bg-violet-500/6 hover:bg-violet-500/12 border border-violet-500/18 rounded-lg transition-all"
                  >
                    Manage Social Accounts →
                  </button>
                </div>
              </div>
            )}

            {/* ── PAGES ── */}
            {rightPanel === 'pages' && (
              <div className="py-2 flex flex-col h-full">
                <div className="px-3 pt-1 pb-2">
                  <p className="text-[10px] text-white/35 font-mono leading-relaxed mb-2.5">
                    Your hosted landing pages. Ask ASH to build one or manage them here.
                  </p>

                  {/* Ask ASH CTA */}
                  <button
                    onClick={() => { setRightPanel('blueprints'); sendMessage('Build me a landing page'); }}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-violet-500/10 hover:bg-violet-500/18 border border-violet-500/22 text-[10px] font-mono text-violet-400 hover:text-violet-300 transition-all mb-3"
                  >
                    <Sparkles className="w-3 h-3 shrink-0" /> Ask ASH to build a page
                  </button>

                  {/* Pages list */}
                  {builderPagesLoading ? (
                    <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-white/25" /></div>
                  ) : builderPages.length === 0 ? (
                    <div className="text-center py-6">
                      <LayoutTemplate className="w-7 h-7 text-white/10 mx-auto mb-2" />
                      <p className="text-[10px] text-white/22 font-mono">No pages yet</p>
                      <p className="text-[9px] text-white/15 font-mono mt-0.5">Ask ASH to build one above</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 mb-3">
                      {builderPages.slice(0, 6).map(page => (
                        <div
                          key={page.id}
                          onClick={() => setSelectedPage(page)}
                          className={`rounded-lg border transition-all cursor-pointer ${page.isPublished ? 'border-emerald-500/15 bg-emerald-500/4' : 'border-white/8 bg-white/2'} ${selectedPage?.id === page.id ? 'ring-1 ring-sky-500/30' : ''}`}
                        >
                          <div className="px-2.5 pt-2 pb-1.5">
                            <div className="flex items-start gap-2 mb-1">
                              <span className="text-[11px] font-mono text-white/62 flex-1 leading-snug line-clamp-1">{page.title}</span>
                              <span className={`text-[8px] font-mono font-bold uppercase shrink-0 mt-0.5 ${page.isPublished ? 'text-emerald-400' : 'text-white/25'}`}>
                                {page.isPublished ? 'Live' : 'Draft'}
                              </span>
                            </div>
                            {page.systemName && (
                              <p className="text-[9px] font-mono text-violet-400/55 mb-1 flex items-center gap-1">
                                <Zap className="w-2 h-2 shrink-0" />{page.systemName}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[9px] font-mono text-white/20 flex items-center gap-1">
                                <Globe className="w-2 h-2" />{page.pageViews} views
                              </span>
                              <div className="flex items-center gap-1.5 ml-auto">
                                <button
                                  onClick={e => { e.stopPropagation(); setSelectedPage(page); openPageInBrowser(page); }}
                                  title={page.isPublished ? 'Open live page in browser' : 'Preview page in browser'}
                                  className="text-white/22 hover:text-sky-400 transition-colors"
                                >
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  onClick={e => { e.stopPropagation(); setSelectedPage(page); setPageEditorPage(page); setPageEditorHtml(page.htmlContent || ''); }}
                                  className="text-white/22 hover:text-violet-400 transition-colors"
                                  title="Edit HTML"
                                >
                                  <Pencil className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <button onClick={() => navigate('/landing-pages')}
                    className="w-full py-2 text-[10px] font-mono text-violet-400/60 hover:text-violet-300 bg-violet-500/5 hover:bg-violet-500/12 border border-violet-500/15 rounded-lg transition-all">
                    Manage All Pages →
                  </button>
                </div>
              </div>
            )}

            {/* ── MEDIA LAB ── */}
            {rightPanel === 'media' && (
              <div className="py-2">
                <div className="px-3 py-2">
                  <p className="text-[10px] text-white/35 font-mono leading-relaxed mb-3">
                    ASH uses these during builds. Image gen runs on your OpenRouter key — no extra setup needed.
                  </p>
                  <div className="space-y-1.5 mb-3">
                    {[
                      { icon: ImageIcon, label: 'Image Generation', desc: 'DALL-E 3 via OpenRouter', key: 'OPENROUTER_API_KEY', color: 'text-pink-400', activeBg: 'border-pink-500/20 bg-pink-500/5' },
                      { icon: Film, label: 'Video Generation', desc: 'HEYGEN_API_KEY required', key: 'HEYGEN_API_KEY', color: 'text-violet-400', activeBg: 'border-violet-500/20 bg-violet-500/5' },
                      { icon: Music, label: 'Music Generation', desc: 'ELEVENLABS_API_KEY required', key: 'ELEVENLABS_API_KEY', color: 'text-emerald-400', activeBg: 'border-emerald-500/20 bg-emerald-500/5' },
                      { icon: Mic2, label: 'Text-to-Speech', desc: 'ELEVENLABS_API_KEY required', key: 'ELEVENLABS_API_KEY', color: 'text-sky-400', activeBg: 'border-sky-500/20 bg-sky-500/5' },
                    ].map((item, i) => {
                      const available = !!storedCredKeys[item.key];
                      return (
                        <div key={i} className={`flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg border transition-all ${available ? item.activeBg : 'border-white/6 bg-white/2'}`}>
                          <item.icon className={`w-4 h-4 ${item.color} shrink-0`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-mono text-white/62 font-bold">{item.label}</p>
                            <p className="text-[9px] font-mono text-white/30 truncate">{item.desc}</p>
                          </div>
                          <span className={`text-[9px] font-mono shrink-0 font-bold ${available ? 'text-emerald-400' : 'text-white/22'}`}>
                            {available ? '✓' : '○'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[9px] font-mono text-white/22 mb-2 leading-relaxed">
                    ASH will call these tools automatically when your build plan requires them.
                  </p>
                  <button
                    onClick={() => navigate('/connections')}
                    className="w-full py-2 text-[10px] font-mono text-amber-400/65 hover:text-amber-300 bg-amber-500/6 hover:bg-amber-500/12 border border-amber-500/18 rounded-lg transition-all"
                  >
                    Connect API Keys →
                  </button>
                </div>
              </div>
            )}

            {/* ── APPS / FILE TREE ── */}
            {rightPanel === 'files' && (
              <div className="py-1 select-none">
                <div className="px-3 py-1.5 flex items-center gap-2">
                  <p className="text-[9px] uppercase tracking-widest text-white/20 font-mono">Apps</p>
                  {systemsLoading && <Loader2 className="w-2.5 h-2.5 text-white/28 animate-spin" />}
                </div>

                {!systemsLoading && userSystems.length === 0 && (
                  <div className="px-3 py-5 text-center">
                    <Server className="w-6 h-6 text-white/10 mx-auto mb-2" />
                    <p className="text-[10px] text-white/22 font-mono">No apps yet.</p>
                    <p className="text-[9px] text-white/15 font-mono mt-0.5">Build one with ASH →</p>
                  </div>
                )}

                <div className="px-2 space-y-2">
                  {userSystems.map(sys => {
                    const status = (sys.buildStatus || '').toLowerCase();
                    const health = (sys.healthStatus || '').toLowerCase();
                    const isOpen = !!expandedSystems[sys.id];
                    const stepsOpen = !!expandedFolders[`${sys.id}_steps`];
                    const dotColor = status === 'active' || status === 'completed' || health === 'healthy'
                      ? 'bg-emerald-400'
                      : status === 'building' ? 'bg-blue-400 animate-pulse'
                      : status === 'paused' ? 'bg-amber-400'
                      : health === 'unhealthy' || status === 'failed' ? 'bg-rose-400'
                      : 'bg-white/18';
                    const steps = Array.isArray(sys.steps) ? sys.steps : [];
                    return (
                      <div key={sys.id} className="rounded-xl border border-white/8 bg-black/35 overflow-hidden">
                        <button
                          onClick={() => setExpandedSystems(prev => ({ ...prev, [sys.id]: !prev[sys.id] }))}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/4 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg bg-primary/12 border border-primary/18 flex items-center justify-center shrink-0">
                            <Rocket className="w-4 h-4 text-primary/65" />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-[11px] text-white/65 font-mono truncate">{sys.name || 'Unnamed System'}</p>
                            <p className="text-[9px] text-white/28 font-mono">Website</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                            {isOpen ? <ChevronDown className="w-3 h-3 text-white/22" /> : <ChevronRight className="w-3 h-3 text-white/22" />}
                          </div>
                        </button>
                        {isOpen && (
                          <div className="border-t border-white/6 bg-black/18">
                            <div className="py-1">
                              <button onClick={() => navigate(`/systems/${sys.id}`)} className="w-full flex items-center gap-1.5 px-3 py-1 hover:bg-white/5 transition-colors group">
                                <FileText className="w-3 h-3 shrink-0 text-sky-400/55" />
                                <span className="text-[10px] text-white/42 font-mono group-hover:text-sky-300/75 truncate">README.md</span>
                                <ExternalLink className="w-2.5 h-2.5 text-white/12 opacity-0 group-hover:opacity-100 ml-auto shrink-0" />
                              </button>
                              <div className="flex items-center gap-1.5 px-3 py-1">
                                <FileJson2 className="w-3 h-3 shrink-0 text-amber-400/50" />
                                <span className="text-[10px] text-white/28 font-mono truncate">config.json</span>
                              </div>
                              <div className="flex items-center gap-1.5 px-3 py-1">
                                <FileText className="w-3 h-3 shrink-0 text-violet-400/42" />
                                <span className="text-[10px] text-white/22 font-mono truncate">activity.log</span>
                              </div>
                              {steps.length > 0 && (
                                <>
                                  <button
                                    onClick={() => setExpandedFolders(prev => ({ ...prev, [`${sys.id}_steps`]: !prev[`${sys.id}_steps`] }))}
                                    className="w-full flex items-center gap-1 px-3 py-1 hover:bg-white/5 transition-colors"
                                  >
                                    {stepsOpen ? <ChevronDown className="w-2.5 h-2.5 text-white/20 shrink-0" /> : <ChevronRight className="w-2.5 h-2.5 text-white/20 shrink-0" />}
                                    <Folder className="w-3 h-3 shrink-0 text-orange-400/50" />
                                    <span className="text-[10px] text-white/32 font-mono">build-steps/</span>
                                    <span className="ml-auto text-[8px] font-mono text-white/18">{steps.length}</span>
                                  </button>
                                  {stepsOpen && (
                                    <div className="ml-5 border-l border-white/5 pl-2 py-0.5 space-y-0.5">
                                      {steps.map((step, i) => {
                                        const stepNum = String(i + 1).padStart(2, '0');
                                        const stepNote = (step.notes || step.name || `step_${i + 1}`).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 20);
                                        const isComplete = step.status === 'completed' || step.completedAt;
                                        const isActive = step.status === 'in_progress' || step.status === 'running';
                                        return (
                                          <div key={step.id || i} className="flex items-center gap-1.5 px-1 py-0.5">
                                            {isComplete ? <CheckCircle className="w-2.5 h-2.5 shrink-0 text-emerald-400/60" />
                                              : isActive ? <PlayCircle className="w-2.5 h-2.5 shrink-0 text-blue-400 animate-pulse" />
                                              : <Circle className="w-2.5 h-2.5 shrink-0 text-white/16" />}
                                            <span className={`text-[9px] font-mono truncate ${isComplete ? 'text-emerald-400/52' : isActive ? 'text-blue-400/72' : 'text-white/22'}`}>
                                              {stepNum}_{stepNote}.md
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </>
                              )}
                              <button onClick={() => saveFileTreeToLibrary(sys)} className="w-full flex items-center gap-1.5 px-3 py-1 mt-0.5 text-white/22 hover:text-primary hover:bg-primary/8 transition-all">
                                <Save className="w-3 h-3 shrink-0" />
                                <span className="text-[9px] font-mono">Save to Library</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── DEPLOY ── */}
            {rightPanel === 'deploy' && (
              <div className="p-3 flex flex-col gap-3">
                <div className="rounded-xl border border-white/8 bg-black/25 p-3">
                  <p className="text-[9px] uppercase tracking-widest text-white/25 font-mono font-bold mb-2.5 flex items-center gap-1.5">
                    <CloudUpload className="w-3 h-3" /> Activation Checklist
                  </p>
                  {[
                    { label: 'Blueprint selected',   done: !!selectedBp },
                    { label: 'Credentials connected', done: Object.keys(storedCredKeys).length > 0 },
                    { label: 'System built',          done: userSystems.some(s => s.buildStatus === 'completed' || s.buildStatus === 'active') },
                    { label: 'API server ready',      done: true },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5 py-1.5 border-b border-white/4 last:border-0">
                      {item.done
                        ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        : <Circle className="w-3.5 h-3.5 text-white/18 shrink-0" />}
                      <span className={`text-[11px] font-mono ${item.done ? 'text-white/55' : 'text-white/25'}`}>{item.label}</span>
                      {item.done && <span className="ml-auto text-[8px] font-mono text-emerald-400/50">✓</span>}
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-white/8 bg-black/25 p-3">
                  <p className="text-[9px] uppercase tracking-widest text-white/25 font-mono font-bold mb-2.5 flex items-center gap-1.5">
                    <Activity className="w-3 h-3" /> Active Systems
                  </p>
                  {userSystems.filter(s => s.buildStatus === 'active' || s.buildStatus === 'completed').length === 0 ? (
                    <p className="text-[10px] text-white/18 font-mono text-center py-3">No active systems yet</p>
                  ) : (
                    <div className="space-y-1.5">
                      {userSystems.filter(s => s.buildStatus === 'active' || s.buildStatus === 'completed').map(sys => (
                        <div key={sys.id} className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/12">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                          <span className="text-[10px] font-mono text-white/48 flex-1 truncate">{sys.name}</span>
                          <button onClick={() => navigate(`/systems/${sys.id}`)} className="text-[8px] font-mono text-emerald-400/55 hover:text-emerald-400 transition-colors">View →</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => navigate('/systems')}
                  className="w-full py-2.5 rounded-xl bg-primary/10 hover:bg-primary/18 border border-primary/22 text-primary text-[11px] font-mono font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <Rocket className="w-3.5 h-3.5" />
                  View All Systems
                </button>

                <div className="rounded-xl border border-violet-500/15 bg-violet-500/4 p-3">
                  <p className="text-[9px] text-violet-400/55 font-mono font-bold mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" /> One-Click Activate
                  </p>
                  <p className="text-[10px] text-white/28 font-mono leading-relaxed">Tell ASH "activate my system" in the chat to trigger automated activation with live tracking enabled.</p>
                </div>
              </div>
            )}

          </div>
          </>)}
        </div>

      </div>
    </div>

    {/* ── Voice Call Mode Overlay ───────────────────────────────────────────── */}
    <AnimatePresence>
      {voiceCallMode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/85 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="flex flex-col items-center gap-8 p-12 rounded-3xl border border-violet-500/20 bg-[#0a0814] shadow-2xl shadow-violet-500/10 min-w-[320px]"
          >
            {/* ASH avatar */}
            <div className="relative">
              <div className={`w-24 h-24 rounded-full bg-violet-500/15 border-2 flex items-center justify-center transition-all ${
                isTTSPlaying ? 'border-violet-400 shadow-lg shadow-violet-500/40' : isRecording ? 'border-rose-400 shadow-lg shadow-rose-500/40' : 'border-violet-500/30'
              }`}>
                {isRecording
                  ? <MicOff className="w-10 h-10 text-rose-400" />
                  : isTTSPlaying
                  ? <Volume2 className="w-10 h-10 text-violet-400" />
                  : <Mic className="w-10 h-10 text-violet-400/60" />}
              </div>
              {(isTTSPlaying || isRecording) && (
                <span className="absolute inset-0 rounded-full border-2 border-violet-400/40 animate-ping" />
              )}
            </div>

            {/* Waveform bars */}
            <div className="flex items-center gap-1 h-10">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all ${
                    isTTSPlaying || isRecording ? 'bg-violet-400' : 'bg-white/15'
                  }`}
                  style={{
                    height: isTTSPlaying || isRecording
                      ? `${20 + Math.sin(i * 0.8) * 16}px`
                      : '6px',
                    animation: (isTTSPlaying || isRecording)
                      ? `pulse ${0.4 + i * 0.07}s ease-in-out infinite alternate`
                      : 'none',
                  }}
                />
              ))}
            </div>

            {/* Status */}
            <div className="text-center">
              <p className="text-sm font-mono font-semibold text-white/80">
                {isTranscribing ? 'Transcribing…' : isRecording ? 'Listening…' : isTTSPlaying ? 'ASH is speaking…' : chatLoading ? 'ASH is thinking…' : 'Tap mic to speak'}
              </p>
              <p className="text-xs font-mono text-white/30 mt-1">ASH Voice Mode</p>
            </div>

            {/* Live transcript bubble */}
            {voiceLastTranscript && (
              <div className="w-full max-w-xs rounded-2xl rounded-br-sm bg-violet-500/15 border border-violet-500/25 px-4 py-2.5 self-end">
                <p className="text-[11px] font-mono text-white/50 mb-0.5">You said</p>
                <p className="text-xs text-white/80 leading-relaxed">{voiceLastTranscript}</p>
              </div>
            )}

            {/* ASH last response snippet */}
            {voiceLastResponse && (
              <div className="w-full max-w-xs rounded-2xl rounded-bl-sm bg-white/5 border border-white/10 px-4 py-2.5 self-start">
                <p className="text-[11px] font-mono text-violet-400/70 mb-0.5">ASH</p>
                <p className="text-xs text-white/65 leading-relaxed line-clamp-3">{voiceLastResponse}{voiceLastResponse.length >= 180 ? '…' : ''}</p>
              </div>
            )}

            {/* Recent chat history (last 3 pairs) */}
            {messages.length > 0 && !voiceLastTranscript && !voiceLastResponse && (
              <div className="w-full max-w-xs space-y-2">
                <p className="text-[10px] font-mono text-white/25 text-center uppercase tracking-wider">Recent conversation</p>
                {messages.slice(-4).map((m, i) => (
                  <div
                    key={i}
                    className={`rounded-xl px-3 py-2 text-[11px] leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-violet-500/12 border border-violet-500/20 text-white/70 ml-4'
                        : 'bg-white/4 border border-white/8 text-white/55 mr-4'
                    }`}
                  >
                    <span className="font-mono text-[9px] uppercase tracking-wider opacity-50 block mb-0.5">{m.role === 'user' ? 'You' : 'ASH'}</span>
                    {typeof m.content === 'string' ? m.content.slice(0, 100) : ''}
                    {typeof m.content === 'string' && m.content.length > 100 ? '…' : ''}
                  </div>
                ))}
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center gap-4">
              <button
                onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                disabled={isTranscribing || chatLoading || isTTSPlaying}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                  isRecording
                    ? 'bg-rose-500/25 border-2 border-rose-500 text-rose-400'
                    : 'bg-violet-500/20 border-2 border-violet-500/60 text-violet-300 hover:bg-violet-500/30'
                } disabled:opacity-40`}
              >
                {isTranscribing
                  ? <Loader2 className="w-6 h-6 animate-spin" />
                  : isRecording
                  ? <MicOff className="w-6 h-6" />
                  : <Mic className="w-6 h-6" />}
              </button>
              <button
                onClick={() => {
                  ttsAudioRef.current?.pause();
                  setIsTTSPlaying(false);
                  if (isRecording) stopVoiceRecording();
                  setVoiceCallMode(false);
                }}
                className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 hover:bg-rose-500/30 flex items-center justify-center transition-all"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* ── Page Editor Modal ─────────────────────────────────────────────────── */}
    {pageEditorPage && (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={e => { if (e.target === e.currentTarget) setPageEditorPage(null); }}>
        <div className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#0d0d14] border border-white/12 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/8 shrink-0">
            <div className="flex items-center gap-2.5">
              <LayoutTemplate className="w-4 h-4 text-violet-400" />
              <div>
                <p className="text-sm font-semibold text-white/85">{pageEditorPage.title}</p>
                <p className="text-[10px] font-mono text-white/30">/{pageEditorPage.slug}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Publish/unpublish */}
              <button
                disabled={pageEditorPublishing}
                onClick={async () => {
                  setPageEditorPublishing(true);
                  try {
                    const res = await fetch(`/api/landing-pages/${pageEditorPage.id}/publish`, {
                      method: 'POST', headers: authHeaders(),
                      body: JSON.stringify({ publish: !pageEditorPage.isPublished }),
                    });
                    if (res.ok) {
                      const updated = await res.json();
                      setPageEditorPage(p => ({ ...p, isPublished: updated.isPublished, publishedAt: updated.publishedAt }));
                      setBuilderPages(prev => prev.map(p => p.id === updated.id ? { ...p, isPublished: updated.isPublished } : p));
                    }
                  } finally { setPageEditorPublishing(false); }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono font-semibold transition-all ${
                  pageEditorPage.isPublished
                    ? 'bg-emerald-500/12 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                    : 'bg-white/6 text-white/45 border border-white/12 hover:bg-white/10'
                }`}
              >
                {pageEditorPublishing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Globe className="w-3 h-3" />}
                {pageEditorPage.isPublished ? 'Published' : 'Publish'}
              </button>
              {/* Save HTML */}
              <button
                disabled={pageEditorSaving}
                onClick={async () => {
                  setPageEditorSaving(true);
                  try {
                    const res = await fetch(`/api/landing-pages/${pageEditorPage.id}`, {
                      method: 'PATCH', headers: authHeaders(),
                      body: JSON.stringify({ htmlContent: pageEditorHtml }),
                    });
                    if (res.ok) {
                      const updated = await res.json();
                      setBuilderPages(prev => prev.map(p => p.id === updated.id ? { ...p, htmlContent: updated.htmlContent } : p));
                      toast.success('Page saved!');
                    }
                  } finally { setPageEditorSaving(false); }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/25 hover:bg-violet-500/25 transition-all"
              >
                {pageEditorSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Save
              </button>
              <button
                onClick={() => openPageInBrowser(pageEditorPage)}
                title={pageEditorPage.isPublished ? 'Open live page in new tab' : 'Preview page in new tab'}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-mono border transition-all ${
                  pageEditorPage.isPublished
                    ? 'text-sky-400 border-sky-500/20 bg-sky-500/8 hover:bg-sky-500/15'
                    : 'text-white/40 border-white/10 bg-white/4 hover:bg-white/8 hover:text-sky-400'
                }`}
              >
                <ExternalLink className="w-3 h-3" />
                {pageEditorPage.isPublished ? 'View Live' : 'Preview'}
              </button>
              <button onClick={() => setPageEditorPage(null)} className="p-1.5 rounded-lg text-white/35 hover:text-white/65 hover:bg-white/8 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tabs: HTML / Preview */}
          <div className="flex border-b border-white/8 shrink-0">
            {['HTML', 'Preview'].map(tab => (
              <button
                key={tab}
                onClick={() => setPageEditorPage(p => ({ ...p, _editorTab: tab }))}
                className={`px-5 py-2.5 text-[11px] font-mono transition-all ${
                  (pageEditorPage._editorTab || 'HTML') === tab
                    ? 'text-violet-300 border-b-2 border-violet-400 bg-violet-500/5'
                    : 'text-white/35 hover:text-white/55'
                }`}
              >
                {tab === 'HTML' ? <><Code2 className="w-3 h-3 inline mr-1.5" />HTML Editor</> : <><Eye className="w-3 h-3 inline mr-1.5" />Preview</>}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {(pageEditorPage._editorTab || 'HTML') === 'HTML' ? (
              <textarea
                className="w-full h-full min-h-[400px] bg-[#090910] text-emerald-300/80 font-mono text-[11px] p-4 resize-none outline-none border-0 leading-relaxed"
                value={pageEditorHtml}
                onChange={e => setPageEditorHtml(e.target.value)}
                spellCheck={false}
                placeholder="<!-- Your page HTML goes here -->"
              />
            ) : (
              <iframe
                srcDoc={pageEditorHtml || '<p style="font-family:sans-serif;color:#888;padding:2rem;">No HTML content yet.</p>'}
                className="w-full h-full min-h-[400px] border-0 bg-white"
                title="Page preview"
                sandbox="allow-scripts"
              />
            )}
          </div>
        </div>
      </div>
    )}

    {showRevenueModal && buildData?.instanceId && (
      <RevenueSetupModal
        systemInstanceId={buildData.instanceId}
        blueprintName={selectedBp?.name ?? buildData?.blueprintName ?? 'Your System'}
        onClose={() => setShowRevenueModal(false)}
        onConnected={() => { setShowRevenueModal(false); toast.success('Revenue tracking connected!', { description: 'ASH will now track real income from this system.' }); }}
      />
    )}

    {/* ── MOBILE BOTTOM BAR (visible on md and below) ─────────────────── */}
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-t border-white/8 flex items-center justify-around px-2 py-1.5 safe-area-pb">
      <button
        onClick={() => navigate('/dashboard')}
        className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-white/35 hover:text-white/70 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-[9px] font-mono">Back</span>
      </button>
      <button
        onClick={clearSession}
        disabled={phase === 'building'}
        className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-white/35 hover:text-primary transition-colors disabled:opacity-25"
      >
        <PlusCircle className="w-4 h-4" />
        <span className="text-[9px] font-mono">New</span>
      </button>
      <button
        onClick={() => navigate('/library')}
        className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-white/35 hover:text-white/70 transition-colors"
      >
        <BookOpen className="w-4 h-4" />
        <span className="text-[9px] font-mono">Library</span>
      </button>
      <button
        onClick={() => navigate('/blueprints')}
        className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-white/35 hover:text-white/70 transition-colors"
      >
        <Grid3x3 className="w-4 h-4" />
        <span className="text-[9px] font-mono">Blueprints</span>
      </button>
      <button
        onClick={() => navigate('/marketplace')}
        className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-white/35 hover:text-white/70 transition-colors"
      >
        <Layers className="w-4 h-4" />
        <span className="text-[9px] font-mono">Tools</span>
      </button>
    </div>

    </AuthLayout>
  );
};

export default BuilderPage;
