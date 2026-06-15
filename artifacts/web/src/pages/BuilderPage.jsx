import React, { useEffect, useRef, useState, useCallback } from 'react';
import VideoBackground from '@/components/VideoBackground.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Send, Loader2, AlertCircle, Zap, CheckCircle2,
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
  RefreshCw, Pencil, Trash2,
} from 'lucide-react';
import SkillActivationPanel from '@/components/builder/SkillActivationPanel.jsx';
import BrowserView from '@/components/builder/BrowserView.jsx';
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

const STARTER_PROMPTS = [
  'TikTok affiliate marketing machine',
  'YouTube automation channel with AI content',
  'AI lead generation agency for local businesses',
  'Shopify dropshipping store with email automation',
  'Digital course funnel with email sequences',
  'LinkedIn B2B outreach & client acquisition system',
];

// ── AI Agent Power Modes ──────────────────────────────────────────────────────
const AI_MODES = [
  {
    id: 'fast',
    label: 'Fast',
    subtitle: 'Quick responses',
    creditHint: '~1 cr/msg',
    creditsPerBuild: '3–5 credits',
    description: 'Lightweight model optimised for speed. Best for simple blueprints and quick iterations.',
    creditWarning: 'Lowest credit usage — ideal for exploring ideas before committing to a full build.',
    model: 'openai/gpt-4o-mini',
    modelLabel: 'GPT-4o Mini',
    speed: '~3 sec / msg',
    useCases: ['Idea validation', 'Simple blueprints', 'Quick iterations', 'Drafting content'],
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
    label: 'Business',
    subtitle: 'Deeper research',
    creditHint: '~3 cr/msg',
    creditsPerBuild: '10–18 credits',
    description: 'Balanced model with stronger reasoning. Handles multi-step blueprints and business logic well.',
    creditWarning: 'Moderate credit usage — 3× more than Fast. Recommended for most production builds.',
    model: 'openai/gpt-4o',
    modelLabel: 'GPT-4o',
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
    subtitle: 'Deep reasoning',
    creditHint: '~8 cr/msg',
    creditsPerBuild: '25–45 credits',
    description: 'Advanced reasoning model. Produces highly detailed plans, complex automations, and thorough analysis.',
    creditWarning: 'High credit usage — 8× more than Fast. Use for complex systems where quality matters most.',
    model: 'anthropic/claude-3-5-sonnet',
    modelLabel: 'Claude 3.5 Sonnet',
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
    subtitle: 'Multi-agent',
    creditHint: '~25 cr/msg',
    creditsPerBuild: '80–150 credits',
    description: 'Full multi-agent orchestration. Parallel sub-agents research, plan, build, and validate simultaneously.',
    creditWarning: 'Maximum credit usage — 25× more than Fast. Reserved for flagship income systems and large deployments.',
    model: 'anthropic/claude-opus-4',
    modelLabel: 'Claude Opus 4',
    speed: '~30+ sec / msg',
    useCases: ['Flagship systems', 'Multi-agent builds', 'Maximum quality', '$10k+/mo revenue targets'],
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
      {tool === 'search' ? <Search className="w-3.5 h-3.5 text-violet-400" /> : tool === 'image' ? <ImageIcon className="w-3.5 h-3.5 text-violet-400" /> : <Cpu className="w-3.5 h-3.5 text-violet-400" />}
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

// ─── Message Bubble ───────────────────────────────────────────────────────────
const MessageBubble = ({ msg }) => {
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

// ─── Build Terminal ───────────────────────────────────────────────────────────
const BuildTerminal = ({ steps, outputs, currentIdx, instanceId, phase }) => {
  const bottomRef = useRef(null);
  const navigate = useNavigate();
  const isComplete = currentIdx >= steps.length && steps.length > 0 && phase === 'complete';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [outputs, currentIdx, isComplete]);

  return (
    <div className="flex flex-col h-full bg-black/90 rounded-xl border border-white/10 overflow-hidden font-mono">
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
        <div className="ml-auto flex items-center gap-1.5">
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
          <div className="w-40 shrink-0 border-r border-white/8 bg-black/40 overflow-y-auto py-3 px-2 space-y-1">
            <p className="text-[9px] text-muted-foreground/30 uppercase tracking-widest px-2 mb-2">Steps</p>
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
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5 text-xs">

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
  content: "I'm ASH — your Autonomous Business Builder.\n\nTell me your income goal, your business type, and what you want to build. I'll select the right blueprint, collect only the credentials I need, and build the entire system for you automatically.\n\nYou can build anything — SaaS products, affiliate engines, ecommerce stores, lead generation systems, content machines, and more.",
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
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [stepExecuting, setStepExecuting] = useState(false);

  const chatBottomRef = useRef(null);
  const inputRef = useRef(null);

  // Active side panel: null | 'explorer' | 'blueprints' | 'tools' | 'settings'
  const [activeSidePanel, setActiveSidePanel] = useState('explorer');

  // Right resource panel tab
  const [rightPanel, setRightPanel] = useState('blueprints');

  // Agent modes popup (bottom-left panel)
  const [showAgentModes, setShowAgentModes] = useState(false);

  // Checkpoints — loaded from localStorage, refreshed after each save
  const [checkpoints, setCheckpoints] = useState([]);
  // Right panel search query
  const [rightSearch, setRightSearch] = useState('');

  // DB-backed session history
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [savedSessions, setSavedSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // User's system instances for the file tree
  const [userSystems, setUserSystems] = useState([]);
  const [systemsLoading, setSystemsLoading] = useState(false);
  const [expandedSystems, setExpandedSystems] = useState({});   // { [id]: true }
  const [expandedFolders, setExpandedFolders] = useState({});   // { [id+folder]: true }

  // ASH Workspace state
  const [generatedFiles, setGeneratedFiles] = useState([]);
  const [ashMemory, setAshMemory] = useState([]);
  const [leftSideTab, setLeftSideTab] = useState('tasks');
  const [filesCopied, setFilesCopied] = useState(null);

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
    if (phase !== 'building' || !buildData || stepExecuting) return;
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
          }),
        });
        if (resp.status === 402) {
          setError('Out of AI credits. Top up to continue building.');
          setPhase('idle');
          return;
        }
        const data = resp.ok ? await resp.json() : { output: `Completed: ${step.notes}` };
        setStepOutputs(prev => ({ ...prev, [step.id]: data.output ?? `Completed: ${step.notes}` }));
        setCurrentStepIdx(i => i + 1);
      } catch {
        setStepOutputs(prev => ({ ...prev, [step.id]: `Completed: ${step.notes}` }));
        setCurrentStepIdx(i => i + 1);
      } finally {
        setStepExecuting(false);
      }
    };

    const timer = setTimeout(runStep, currentStepIdx === 0 ? 300 : 800);
    return () => clearTimeout(timer);
  }, [phase, buildData, currentStepIdx, stepExecuting]);

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
      setBuildData({
        instanceId: data.instanceId,
        sessionId: data.sessionId,
        steps: data.steps ?? [],
        blueprint: data.blueprint,
      });
      setCurrentStepIdx(0);
      setStepOutputs({});
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
    setInput('');
    setError('');

    const history = messages
      .filter(m => m.id !== 'welcome')
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
        body: JSON.stringify({ message: msg, history, agentMode: aiMode, businessType, revenueGoal, planMode: isPlanMode }),
      });

      if (resp.status === 402) { setError('Out of AI credits. Top up to continue.'); return; }
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
            const newMsg = event.tool === 'search'
              ? { id: toolMsgId, role: 'assistant', type: 'search', data: event.data, ts: Date.now() }
              : event.tool === 'image'
              ? { id: toolMsgId, role: 'assistant', type: 'image', data: event.data, ts: Date.now() }
              : null;
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
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: finalContent, streaming: false } : m));
            setThinkingSteps([]);
            setThinkingCurrentIdx(-1);
          } else if (event.type === 'end') {
            break outer;
          } else if (event.type === 'error') {
            throw new Error(event.message ?? 'Stream error');
          }
        }
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
          } else if (call.type === 'file') {
            try {
              const res = await fetch('/api/ash/files', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ name: call.name, content: call.content, fileType: call.fileType || 'text', description: call.description || '' }) });
              if (res.ok) {
                const data = await res.json();
                setGeneratedFiles(prev => [data, ...prev]);
                setMessages(prev => [...prev, { id: Date.now() + Math.random(), role: 'assistant', type: 'code', data, ts: Date.now() }]);
              }
            } catch { /* non-fatal */ }
          }
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
    } catch {
      setError('ASH is temporarily unavailable. Please try again.');
      setMessages(prev => prev.filter(m => m.id !== msgId));
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
    // Delegate to sendMessage so it uses the streaming endpoint too
    setMode('custom');
    await sendMessage(`Build me a ${selectedBp.name} system`);
  }, [selectedBp, sendMessage]);

  // ── Credential form submit (uses refs to avoid stale state) ───────────────
  const handleCredentialSubmit = useCallback((credValues) => {
    const bp = pendingBlueprintRef.current;
    const sysName = pendingSystemNameRef.current;
    executeBuild(credValues, bp, sysName);
  }, [executeBuild]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const isInputDisabled = chatLoading || phase === 'building' || phase === 'complete' || (phase === 'planning' && !!pendingPlanData);
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
    <VideoBackground>
    <div className="h-screen flex flex-col overflow-hidden">

      {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
      <div className="h-11 flex items-center justify-between px-4 border-b border-white/6 bg-black/85 backdrop-blur-lg shrink-0 gap-3">

        {/* Left: breadcrumb */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-white/35 hover:text-white/70 transition-colors text-xs shrink-0 font-mono"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Dashboard
          </button>
          <span className="text-white/15 shrink-0">/</span>
          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-white/80 shrink-0">
            <Wand2 className="w-3.5 h-3.5 text-primary" />
            ASH Builder
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
          <button
            onClick={() => navigate('/library')}
            title="My Library"
            className="flex items-center gap-1.5 text-white/28 hover:text-white/60 transition-colors text-xs px-2 py-1 rounded border border-white/6 hover:border-white/15 font-mono"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Library</span>
          </button>
          <button
            onClick={clearSession}
            disabled={phase === 'building'}
            title="Start a new session"
            className="flex items-center gap-1.5 text-white/28 hover:text-white/60 transition-colors text-xs disabled:opacity-20 disabled:cursor-not-allowed px-2 py-1 rounded border border-white/6 hover:border-white/15 font-mono"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New</span>
          </button>
        </div>
      </div>

      {/* ── 3-PANEL MAIN LAYOUT (Replit-style) ─────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* ═══════════════════════════════════════════════════════════════
            LEFT PANEL (260px) — Sessions as Tasks + Agent Modes
        ═══════════════════════════════════════════════════════════════ */}
        <div className="w-[260px] shrink-0 flex flex-col border-r border-white/8 bg-[#05050c] relative">

          {/* Header — gradient top section */}
          <div className="relative px-3 pt-3 pb-2.5 border-b border-white/6 shrink-0 bg-gradient-to-b from-primary/8 to-transparent">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(14,165,233,0.2)]">
                <Wand2 className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-white/75 font-mono tracking-tight">ASH Workspace</p>
                <p className="text-[9px] font-mono text-white/28 leading-tight">
                  {phase === 'building' ? 'Building…'
                    : phase === 'complete' ? 'Build complete'
                    : phase === 'planning' ? 'Reviewing plan…'
                    : phase === 'collecting' ? 'Awaiting credentials'
                    : 'Ready'}
                </p>
              </div>
              {phase !== 'idle' && (
                <span className={`w-2 h-2 rounded-full shrink-0 shadow-lg ${
                  phase === 'building' ? 'bg-blue-400 animate-pulse shadow-blue-400/40'
                  : phase === 'complete' ? 'bg-emerald-400 shadow-emerald-400/40'
                  : phase === 'planning' ? 'bg-violet-400 animate-pulse shadow-violet-400/40'
                  : 'bg-amber-400 animate-pulse shadow-amber-400/40'
                }`} />
              )}
            </div>
          </div>

          {/* + New task button */}
          <div className="px-2.5 py-2 shrink-0">
            <button
              onClick={clearSession}
              disabled={phase === 'building'}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-white/8 bg-white/3 hover:bg-primary/8 hover:border-primary/22 text-white/35 hover:text-primary text-[11px] font-mono font-medium transition-all disabled:opacity-25 disabled:cursor-not-allowed group"
            >
              <PlusCircle className="w-3.5 h-3.5 shrink-0 group-hover:rotate-90 transition-transform duration-200" />
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
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[9px] font-mono font-semibold transition-all rounded-lg ${
                  leftSideTab === tab.id
                    ? 'text-primary bg-primary/10 border border-primary/22 shadow-[0_0_8px_rgba(14,165,233,0.1)]'
                    : 'text-white/28 hover:text-white/55 border border-transparent hover:bg-white/4'
                }`}
              >
                <tab.icon className="w-2.5 h-2.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── TASKS PANEL ── */}
          <div className={`flex-1 overflow-y-auto py-1 select-none${leftSideTab !== 'tasks' ? ' hidden' : ''}`}>

            {/* Live/active task */}
            {phase !== 'idle' && messages.filter(m => m.role === 'user' && m.id !== 'welcome').length > 0 && (
              <div className="px-2 pt-2 pb-1">
                <div className={`flex items-start gap-2.5 px-2.5 py-2 rounded-lg border ${
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
                    <p className={`text-[9px] font-mono uppercase tracking-widest mt-0.5 ${
                      phase === 'building' ? 'text-blue-400/65'
                      : phase === 'complete' ? 'text-emerald-400/65'
                      : phase === 'collecting' ? 'text-amber-400/65'
                      : 'text-primary/65'
                    }`}>
                      {phase === 'building' ? `Building · ${currentStepIdx}/${buildData?.steps?.length ?? 0} steps`
                        : phase === 'complete' ? 'Activated ✓'
                        : phase === 'collecting' ? 'Awaiting credentials'
                        : 'Active'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Checkpoints (primary navigation) ── */}
            {checkpoints.length > 0 && (
              <div className="px-2 pt-2 pb-1">
                <div className="flex items-center justify-between px-1 mb-1.5">
                  <p className="text-[9px] uppercase tracking-widest text-white/35 font-mono font-bold flex items-center gap-1">
                    <RotateCcw className="w-2.5 h-2.5" /> Checkpoints
                  </p>
                  <button
                    onClick={() => { try { localStorage.removeItem(checkpointsKey(currentUser?.id)); } catch {} setCheckpoints([]); }}
                    className="text-[9px] text-white/20 hover:text-rose-400/55 transition-colors font-mono"
                  >clear</button>
                </div>
                <div className="space-y-0.5">
                  {[...checkpoints].reverse().map((cp, idx) => (
                    <div
                      key={cp.id}
                      onClick={() => restoreCheckpoint(cp)}
                      className="group flex items-center gap-2 px-2 py-1.5 rounded-lg border border-transparent hover:bg-white/5 hover:border-white/8 transition-all cursor-pointer"
                    >
                      <div className="w-5 h-5 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-[8px] text-primary font-bold font-mono">{idx + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-white/55 truncate font-mono leading-tight">{cp.summary}</p>
                        <p className="text-[9px] text-white/22 font-mono">{formatTs(cp.ts)}</p>
                      </div>
                      <span className="shrink-0 opacity-0 group-hover:opacity-100 text-[9px] text-primary font-mono font-bold transition-opacity">
                        restore
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Divider between checkpoints and sessions */}
            {checkpoints.length > 0 && savedSessions.length > 0 && (
              <div className="border-t border-white/6 mx-3 my-1" />
            )}

            {/* ── Build Timeline ── */}
            {savedSessions.length > 0 && (
              <div className="px-2 pt-1">
                <div className="flex items-center justify-between px-1 mb-2">
                  <p className="text-[9px] uppercase tracking-widest text-white/28 font-mono font-bold flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" /> Build Timeline
                  </p>
                  <span className="text-[9px] text-white/20 font-mono">{savedSessions.length} builds</span>
                </div>
                {sessionsLoading && <div className="flex justify-center py-2"><Loader2 className="w-3.5 h-3.5 animate-spin text-white/20" /></div>}
                <div className="space-y-1.5">
                  {savedSessions.map(s => {
                    const isActive = currentSessionId === s.id;
                    const phaseDot = s.phase === 'complete' ? 'bg-emerald-400' : s.phase === 'building' ? 'bg-blue-400 animate-pulse' : s.phase === 'planning' ? 'bg-violet-400 animate-pulse' : 'bg-white/22';
                    const phasePill = s.phase === 'complete'
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/22'
                      : s.phase === 'building' ? 'text-blue-400 bg-blue-500/10 border-blue-500/22'
                      : s.phase === 'planning' ? 'text-violet-400 bg-violet-500/10 border-violet-500/22'
                      : 'text-white/30 bg-white/5 border-white/10';
                    return (
                    <div key={s.id} className={`group rounded-xl border transition-all relative ${
                      isActive
                        ? 'bg-primary/6 border-primary/22 shadow-[0_0_12px_rgba(14,165,233,0.08)]'
                        : 'border-white/6 bg-white/[0.025] hover:bg-white/[0.04] hover:border-white/12'
                    }`}>
                      {isActive && <div className="absolute left-0 top-3 bottom-3 w-[2px] bg-primary rounded-full" />}
                      <div className={`flex items-start gap-2 pt-2 pb-1.5 cursor-pointer ${isActive ? 'pl-4 pr-2.5' : 'px-2.5'}`} onClick={() => restoreSession(s)}>
                        <span className={`w-2 h-2 rounded-full shrink-0 mt-1 ${phaseDot}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-[11px] truncate font-mono leading-snug font-medium ${isActive ? 'text-white/80' : 'text-white/55'}`}>{s.title}</p>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded-full border ${phasePill}`}>
                              {s.phase === 'complete' ? '✓ done' : s.phase === 'building' ? '⟳ building' : s.phase || 'active'}
                            </span>
                            <span className="text-[9px] text-white/18 font-mono">{formatTs(new Date(s.updatedAt ?? Date.now()).getTime())}</span>
                          </div>
                        </div>
                        <button onClick={(e) => deleteSession(s.id, e)} className="shrink-0 opacity-0 group-hover:opacity-100 text-white/18 hover:text-rose-400/65 transition-all p-0.5 rounded mt-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className={`flex gap-1.5 pb-2 ${isActive ? 'pl-4 pr-2.5' : 'px-2.5'}`}>
                        <button onClick={() => restoreSession(s)} className={`flex-1 text-[9px] font-mono font-semibold rounded-md py-1 transition-all ${isActive ? 'text-primary bg-primary/10 hover:bg-primary/18 border border-primary/22' : 'text-white/35 hover:text-white/60 bg-white/3 hover:bg-white/6 border border-white/8 hover:border-white/15'}`}>
                          Resume
                        </button>
                        {s.phase === 'complete' && (
                          <button onClick={(e) => { e.stopPropagation(); const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `ash-build-${s.id.slice(0,8)}.json`; a.click(); URL.revokeObjectURL(url); }}
                            className="flex-1 text-[9px] font-mono font-semibold text-white/35 hover:text-white/60 bg-white/3 hover:bg-white/6 border border-white/8 hover:border-white/15 rounded-md py-1 transition-all">
                            Export
                          </button>
                        )}
                        <button onClick={(e) => deleteSession(s.id, e)} className="text-[9px] font-mono text-rose-400/40 hover:text-rose-400/70 bg-white/3 hover:bg-rose-500/8 border border-white/8 hover:border-rose-500/20 rounded-md py-1 px-2 transition-all">Del</button>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            )}

            {savedSessions.length === 0 && !sessionsLoading && phase === 'idle' && checkpoints.length === 0 && (
              <div className="px-4 py-4 space-y-1">
                <p className="text-[10px] text-white/30 font-mono font-semibold">No builds yet</p>
                <p className="text-[9px] text-white/18 font-mono leading-relaxed">Your build timeline will appear here as you work with ASH.</p>
              </div>
            )}

            {/* ── Active build steps ── */}
            {buildData && (
              <>
                <div className="border-t border-white/6 mx-3 my-1.5" />
                <div className="px-3">
                  <p className="text-[9px] uppercase tracking-widest text-white/25 font-mono font-bold mb-1.5">Build steps</p>
                  <div className="space-y-0.5">
                    {buildData.steps?.map((step, i) => {
                      const isDone = i < currentStepIdx;
                      const isRunning = i === currentStepIdx && phase === 'building';
                      return (
                        <div key={step.id} className={`flex items-center gap-1.5 px-1 py-0.5 rounded text-[10px] font-mono ${
                          isDone ? 'text-emerald-400/65' : isRunning ? 'text-primary' : 'text-white/18'
                        }`}>
                          {isDone ? <CheckCircle className="w-2.5 h-2.5 shrink-0" />
                            : isRunning ? <PlayCircle className="w-2.5 h-2.5 shrink-0 animate-pulse" />
                            : <Circle className="w-2.5 h-2.5 shrink-0" />}
                          <span className="truncate">{step.notes}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── FILES PANEL ── */}
          {leftSideTab === 'files' && (
            <div className="flex-1 overflow-y-auto py-1 min-h-0">
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
            <div className="flex-1 overflow-y-auto py-1 min-h-0">
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
                      <p className="text-[9px] font-mono text-primary/55 font-bold truncate">{entry.key}</p>
                      <p className="text-[10px] text-white/40 font-mono truncate mt-0.5">{entry.value || '—'}</p>
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

          {/* ── BOTTOM: Agent Modes (Replit-style popup) ── */}
          <div className="shrink-0 border-t border-white/8 bg-black/85">
            {/* Expandable agent modes panel */}
            <AnimatePresence>
              {showAgentModes && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden border-b border-white/8 bg-[#08080f]"
                >
                  <div className="p-3 pt-2.5">
                    <p className="text-[9px] uppercase tracking-widest text-white/28 font-mono mb-2">
                      Agent modes <span className="text-white/15 normal-case">· Cycle Ctrl+Shift+I</span>
                    </p>
                    {/* Mode tabs */}
                    <div className="flex gap-1 mb-3">
                      {AI_MODES.map(m => {
                        const MIcon = m.icon;
                        const isActive = aiMode === m.id;
                        const isLocked = m.requiredTier && !isEmpireTier;
                        return (
                          <button
                            key={m.id}
                            disabled={!!isLocked}
                            onClick={() => !isLocked && setAiMode(m.id)}
                            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] font-mono font-bold transition-all border ${
                              isActive ? `${m.color} border-current bg-white/4`
                                : 'text-white/28 border-white/8 hover:border-white/18 hover:text-white/55'
                            } ${isLocked ? 'opacity-22 cursor-not-allowed' : ''}`}
                          >
                            <MIcon className="w-3 h-3" />
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                    {/* Active mode description */}
                    {activeMode && (
                      <p className={`text-[10px] leading-relaxed ${activeMode.color} opacity-55 mb-3`}>{activeMode.description}</p>
                    )}
                    {/* Replit-style toggles */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[11px] text-white/55 font-mono">App testing</p>
                          <p className="text-[9px] text-white/22 truncate">Agent tests your build automatically</p>
                        </div>
                        <div className={`w-9 h-5 rounded-full shrink-0 flex items-center px-0.5 transition-colors ${
                          phase === 'building' ? 'bg-primary/80' : 'bg-white/12'
                        }`}>
                          <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                            phase === 'building' ? 'translate-x-4' : 'translate-x-0'
                          }`} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[11px] text-white/55 font-mono">High effort <span className="text-[9px] text-amber-400/55">·+$</span></p>
                          <p className="text-[9px] text-white/22 truncate">Powered by stronger model for harder tasks</p>
                        </div>
                        <div
                          onClick={() => aiMode === 'fast' ? setAiMode('business') : setAiMode('fast')}
                          className={`w-9 h-5 rounded-full shrink-0 flex items-center px-0.5 transition-colors cursor-pointer ${
                            aiMode !== 'fast' ? 'bg-amber-500/65' : 'bg-white/12'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                            aiMode !== 'fast' ? 'translate-x-4' : 'translate-x-0'
                          }`} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 opacity-32">
                        <div className="min-w-0">
                          <p className="text-[11px] text-white/55 font-mono">Turbo <span className="text-[9px] text-violet-400/55">· Pro</span></p>
                          <p className="text-[9px] text-white/22 truncate">Upgrade to Pro to unlock the fastest models.</p>
                        </div>
                        <div className="w-9 h-5 rounded-full shrink-0 bg-white/10 flex items-center px-0.5 cursor-not-allowed">
                          <div className="w-4 h-4 rounded-full bg-white/38 shadow-sm" />
                        </div>
                      </div>
                    </div>
                    {/* Business type + revenue goal */}
                    <div className="mt-3 pt-2.5 border-t border-white/8 space-y-2">
                      <div>
                        <p className="text-[9px] uppercase tracking-widest text-white/22 font-mono mb-1.5 flex items-center gap-1">
                          <Building2 className="w-2.5 h-2.5" /> Business Type
                        </p>
                        <div className="grid grid-cols-4 gap-1">
                          {BUSINESS_TYPES.slice(0, 4).map(bt => {
                            const BIcon = bt.icon;
                            const isActive = businessType === bt.id;
                            return (
                              <button
                                key={bt.id}
                                onClick={() => setBusinessType(isActive ? null : bt.id)}
                                className={`flex flex-col items-center gap-0.5 py-1.5 rounded-lg border text-[9px] font-mono transition-all ${
                                  isActive ? `${bt.bg} ${bt.color}` : 'bg-white/3 border-white/8 hover:border-white/18 text-white/35'
                                }`}
                              >
                                <BIcon className={`w-3.5 h-3.5 ${isActive ? bt.color : ''}`} />
                                {bt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-widest text-white/22 font-mono mb-1 flex items-center gap-1">
                          <Target className="w-2.5 h-2.5" /> Revenue Goal
                        </p>
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
                            <span className="text-white/35 font-mono">{revenueGoal || 'Set monthly goal…'}</span>
                            {revenueGoal && <span className="text-emerald-400 font-mono font-bold text-[10px]">{revenueGoal}/mo</span>}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Agent mode bar */}
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-[9px] font-mono text-white/22">AI Model</span>
              <button
                onClick={() => setShowAgentModes(p => !p)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[10px] font-mono font-bold transition-all ${
                  showAgentModes
                    ? `${activeMode?.color ?? 'text-primary'} border-current bg-white/4`
                    : 'text-white/32 border-white/10 hover:border-white/22 hover:text-white/55'
                }`}
              >
                {activeMode && <activeMode.icon className="w-3 h-3" />}
                {activeMode?.label ?? 'Fast'} ↑
              </button>
            </div>
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
              {/* Plan / Build mode toggle */}
              <div className="flex items-center bg-black/50 border border-white/10 rounded-lg p-0.5 gap-0.5">
                <button
                  onClick={() => setChatMode('plan')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold font-mono transition-all ${
                    isPlanMode
                      ? 'bg-violet-500/25 border border-violet-500/40 text-violet-300'
                      : 'text-white/30 hover:text-white/55'
                  }`}
                  title="Plan mode — discuss and explore without building"
                >
                  <Brain className="w-3 h-3" />
                  Plan
                </button>
                <button
                  onClick={() => setChatMode('build')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold font-mono transition-all ${
                    !isPlanMode
                      ? 'bg-primary/20 border border-primary/35 text-primary'
                      : 'text-white/30 hover:text-white/55'
                  }`}
                  title="Build mode — ASH builds and activates systems"
                >
                  <Cpu className="w-3 h-3" />
                  Build
                </button>
              </div>

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
                <span className="ml-auto text-[9px] font-mono text-primary/55 shrink-0">
                  {currentStepIdx}/{buildData.steps.length} steps
                </span>
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
              <Button
                className="ml-auto h-7 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold border-0 shrink-0"
                onClick={() => handleCredentialSubmit(liftedCredValues)}
                disabled={executeLoading || pendingCreds.some(c => c.required !== false && !(liftedCredValues[c.key] || '').trim())}
              >
                {executeLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                Execute Build
              </Button>
            </div>
          )}

          {phase !== 'idle' && <ProgressTracker phase={phase} />}

          {/* Main scrollable chat area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-thin scrollbar-thumb-white/10">
            <SkillActivationPanel activatedSkills={activatedSkills} />

            {messages.map((m, idx) => {
              const cp = checkpointByMsgCount[idx + 1];
              return (
                <React.Fragment key={m.id}>
                  <MessageBubble msg={m} />
                  {cp && <CheckpointMarker cp={cp} onRestore={() => restoreCheckpoint(cp)} />}
                </React.Fragment>
              );
            })}

            {phase === 'planning' && pendingPlanData && (
              <div className="rounded-xl border border-violet-500/25 bg-violet-500/5 p-5 space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0">
                    <Brain className="w-3.5 h-3.5 text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">Build Plan Ready</p>
                    <p className="text-[10px] text-white/40 font-mono truncate">
                      {pendingPlanData.systemName || 'Custom System'} · {pendingPlanData.blueprint?.name ?? 'Custom Build'}
                    </p>
                  </div>
                  <span className="text-[9px] font-mono text-violet-400/65 bg-violet-500/10 border border-violet-500/20 rounded-full px-2 py-0.5 shrink-0">
                    PHASE 1 COMPLETE
                  </span>
                </div>

                {pendingPlanData.buildSteps?.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-white/35 font-mono uppercase tracking-widest">Execution Roadmap</p>
                    {pendingPlanData.buildSteps.map((step, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-white/60">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-white/6 border border-white/12 flex items-center justify-center text-[9px] font-bold font-mono text-white/40 mt-0.5">{i + 1}</span>
                        <span className="leading-relaxed pt-0.5">{step}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2.5 pt-1 border-t border-white/8">
                  <Button
                    onClick={() => sendMessage("I've reviewed the plan and I'm ready to proceed with the build.")}
                    disabled={chatLoading}
                    className="flex-1 gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold h-10 text-sm"
                  >
                    {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                    Confirm Plan — Proceed to Build
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => sendMessage("I want to adjust this plan. Can you change something about the approach or tool stack?")}
                    disabled={chatLoading}
                    className="h-10 text-xs border-white/15 text-white/50 hover:text-white hover:border-white/30 bg-transparent"
                  >
                    Adjust Plan
                  </Button>
                </div>
              </div>
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
                <div className="grid grid-cols-1 gap-1.5">
                  {STARTER_PROMPTS.map((g, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(g)}
                      className="w-full text-left text-[11px] px-3 py-2 rounded-lg border border-white/10 bg-black/35 hover:bg-black/55 hover:border-white/18 text-white/42 hover:text-white transition-colors flex items-center gap-2"
                    >
                      <Zap className="w-3 h-3 text-primary/45 shrink-0" />
                      {g}
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

          {/* Build terminal — slides in when building */}
          {buildData && (phase === 'building' || phase === 'complete') && (
            <div className="shrink-0 border-t border-white/8 h-52">
              <BuildTerminal
                steps={buildData?.steps ?? []}
                outputs={stepOutputs}
                currentIdx={currentStepIdx}
                instanceId={buildData?.instanceId}
                phase={phase}
              />
            </div>
          )}

          {/* Input bar */}
          <div className="p-3 border-t border-white/10 bg-black/90 shrink-0">
            {phase === 'building' ? (
              <div className="flex items-center justify-center gap-2 py-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span className="font-mono text-[11px] text-white/42">Building — {buildData?.steps?.length ?? 0} steps in progress</span>
              </div>
            ) : phase === 'complete' ? (
              <div className="flex items-center justify-center gap-2 py-1.5 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="font-mono text-[11px]">Activated — redirecting…</span>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder={phase === 'collecting' ? 'Fill credentials above…' : phase === 'planning' ? 'Plan ready — confirm above or ask to adjust…' : isPlanMode ? 'Ask ASH anything — explore ideas, understand systems, or plan a build…' : 'Describe your income goal to ASH…'}
                    disabled={isInputDisabled}
                    className="flex-1 resize-none text-xs bg-black/50 border border-white/12 rounded-xl px-3 py-2 text-white placeholder:text-white/22 focus:outline-none focus:border-primary/45 transition-colors disabled:opacity-40"
                    rows={1}
                    style={{ minHeight: '36px', maxHeight: '120px' }}
                    onInput={e => {
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                    }}
                  />
                  <Button
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || isInputDisabled}
                    size="icon"
                    className="h-[36px] w-[36px] shrink-0 rounded-xl"
                  >
                    {chatLoading
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Send className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-[9px] text-white/16 mt-1.5 text-center font-mono">
                  ASH builds autonomously · Credentials encrypted · {activeMode?.modelLabel ?? 'GPT-4o Mini'}
                </p>
              </>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            RIGHT PANEL (240px) — Library / Resources
        ═══════════════════════════════════════════════════════════════ */}
        <div className="w-[240px] shrink-0 flex flex-col border-l border-white/8 bg-[#060608]">

          {/* Library header */}
          <div className="px-3 py-2.5 border-b border-white/8 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-white/38" />
              <span className="text-xs font-bold text-white/55">Library</span>
            </div>
            <button
              onClick={() => setRightPanel(p => p === 'files' ? 'blueprints' : 'files')}
              className={`text-[9px] font-mono transition-colors ${rightPanel === 'files' ? 'text-primary' : 'text-primary/45 hover:text-primary'}`}
            >
              File tree
            </button>
          </div>

          {/* Search + New */}
          <div className="px-2 py-2 border-b border-white/6 shrink-0 flex items-center gap-1.5">
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
          <div className="flex border-b border-white/6 shrink-0 p-1 gap-0.5">
            {[
              { id: 'blueprints', label: 'Blueprints', icon: Grid3x3 },
              { id: 'tools',      label: 'Tools',      icon: Layers },
              { id: 'files',      label: 'Apps',       icon: FolderOpen },
              { id: 'deploy',     label: 'Deploy',     icon: CloudUpload },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setRightPanel(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1 py-1 text-[9px] font-mono transition-all rounded-md ${
                  rightPanel === tab.id
                    ? 'text-primary bg-primary/8 border border-primary/15'
                    : 'text-white/22 hover:text-white/45 border border-transparent'
                }`}
              >
                <tab.icon className="w-2.5 h-2.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto min-h-0">

            {/* ── BLUEPRINTS ── */}
            {rightPanel === 'blueprints' && (
              <div className="flex flex-col h-full">
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
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                  {bpLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                  ) : filteredBps.length === 0 ? (
                    <p className="text-center py-6 text-white/22 text-xs">No blueprints found</p>
                  ) : filteredBps.map(bp => (
                    <BlueprintCard key={bp.id} bp={bp} selected={selectedBp?.id === bp.id} onSelect={setSelectedBp} />
                  ))}
                </div>
                <div className="p-2 border-t border-white/8 shrink-0">
                  <Button
                    className="w-full h-9 gap-2 text-xs font-semibold"
                    disabled={!selectedBp || phase === 'building' || phase === 'complete' || chatLoading}
                    onClick={handleBlueprintLaunch}
                  >
                    {chatLoading || executeLoading
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Planning…</>
                      : <><Sparkles className="w-3.5 h-3.5" /> Plan Blueprint</>}
                  </Button>
                  {!selectedBp && <p className="text-[9px] text-white/22 text-center mt-1.5 font-mono">Select a blueprint above</p>}
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
        </div>

      </div>
    </div>
    </VideoBackground>
  );
};

export default BuilderPage;
