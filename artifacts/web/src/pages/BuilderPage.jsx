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
  AlertTriangle, CheckCircle, PlayCircle, PauseCircle,
} from 'lucide-react';
import SkillActivationPanel from '@/components/builder/SkillActivationPanel.jsx';
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
  'TikTok affiliate business',
  'YouTube automation channel',
  'AI lead gen agency',
  'Email marketing system',
  'Shopify automation',
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
    model: 'anthropic/claude-3.5-sonnet',
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
    model: 'anthropic/claude-3-opus',
    modelLabel: 'Multi-Model Orchestration',
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
  { id: 'deploy',     label: 'Deploy',     icon: Rocket,       phases: ['complete'] },
];

const aiModeStorageKey = (userId) => `sbep_ai_mode_${userId}`;

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

// ─── Message Bubble ───────────────────────────────────────────────────────────
const MessageBubble = ({ msg }) => {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} gap-0.5`}>
      <div className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
        isUser
          ? 'bg-primary text-primary-foreground rounded-tr-sm'
          : 'bg-white/6 border border-white/10 text-foreground rounded-tl-sm'
      }`}>
        {msg.content.split('\n').map((line, i) => {
          if (!line) return <br key={i} />;
          const parts = line.split(/\*\*(.+?)\*\*/);
          if (parts.length === 1) return <p key={i} className={i > 0 ? 'mt-1' : ''}>{line}</p>;
          return (
            <p key={i} className={i > 0 ? 'mt-1' : ''}>
              {parts.map((p, j) => j % 2 === 1
                ? <strong key={j} className="text-primary font-semibold">{p}</strong>
                : p)}
            </p>
          );
        })}
      </div>
      <span className="text-[10px] text-muted-foreground/30 px-1">
        {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
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

  const userTier = (currentUser?.membershipTier || 'free').toLowerCase();
  const isEmpireTier = userTier === 'empire' || userTier === 'operator';
  const isFounderAdmin = currentUser?.role === 'FOUNDER_ADMIN';

  // Business context
  const [businessType, setBusinessType] = useState(() => {
    try { return localStorage.getItem(`sbep_biz_${currentUser?.id}`) || null; } catch { return null; }
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

  // Credential collection
  const [pendingCreds, setPendingCreds] = useState([]);
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

  // Checkpoints — loaded from localStorage, refreshed after each save
  const [checkpoints, setCheckpoints] = useState([]);

  // User's system instances for the file tree
  const [userSystems, setUserSystems] = useState([]);
  const [systemsLoading, setSystemsLoading] = useState(false);
  const [expandedSystems, setExpandedSystems] = useState({});   // { [id]: true }
  const [expandedFolders, setExpandedFolders] = useState({});   // { [id+folder]: true }

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

  // ── Reset to a fresh session ───────────────────────────────────────────────
  const clearSession = useCallback(() => {
    clearStoredSession(currentUser?.id);
    setMessages([WELCOME_MSG]);
    setPhase('idle');
    setActivatedSkills([]);
    setBuildData(null);
    setStepOutputs({});
    setCurrentStepIdx(0);
    setMode('custom');
    setSelectedBp(null);
    setPendingCreds([]);
    setError('');
    setInput('');
    pendingBlueprintRef.current = null;
    pendingSystemNameRef.current = '';
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [currentUser?.id]);

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
      toast.success('System deployed and live!', {
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

  // ── Send message to ASH ────────────────────────────────────────────────────
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

    try {
      const resp = await fetch('/api/ai-orchestrator/chat', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ message: msg, history, agentMode: aiMode, businessType, revenueGoal }),
      });
      if (resp.status === 402) { setError('Out of AI credits. Top up to continue.'); return; }
      if (!resp.ok) throw new Error('ASH request failed');

      const data = await resp.json();
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.content,
        ts: Date.now(),
      }]);

      // Skill Engine — merge newly activated skills (deduplicate by slug)
      if (Array.isArray(data.activatedSkills) && data.activatedSkills.length > 0) {
        setActivatedSkills(prev => {
          const slugs = new Set(prev.map(s => s.slug));
          const fresh = data.activatedSkills.filter(s => !slugs.has(s.slug));
          return [...prev, ...fresh];
        });
      }

      const sd = data.structuredData;
      const action = sd?.action;

      if (action === 'collect_credentials' && sd?.requiredCredentials?.length > 0) {
        pendingBlueprintRef.current = sd.blueprint ?? null;
        pendingSystemNameRef.current = sd.systemName ?? '';
        setPendingCreds(sd.requiredCredentials);
        setPhase('collecting');
      } else if (action === 'start_build' && sd?.blueprint) {
        await executeBuild({}, sd.blueprint, sd.systemName ?? '');
      }

      // Auto-save checkpoint after each successful AI exchange
      const updatedMessages = [...messages,
        { id: Date.now(), role: 'user', content: msg, ts: Date.now() },
        { id: Date.now() + 1, role: 'assistant', content: data.content, ts: Date.now() },
      ];
      saveCheckpoint(currentUser?.id, { messages: updatedMessages, phase, buildData, stepOutputs, currentStepIdx, activatedSkills, mode, selectedBp });
      setCheckpoints(getCheckpoints(currentUser?.id));
    } catch {
      setError('ASH is temporarily unavailable. Please try again.');
    } finally {
      setChatLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, chatLoading, messages, executeBuild, phase, buildData, stepOutputs, currentStepIdx, activatedSkills, mode, selectedBp, currentUser?.id]);

  // ── Blueprint mode: launch selected blueprint ──────────────────────────────
  const handleBlueprintLaunch = useCallback(async () => {
    if (!selectedBp) return;
    const msg = `Build me a ${selectedBp.name} system`;
    setMode('custom');
    const history = messages
      .filter(m => m.id !== 'welcome')
      .map(m => ({ role: m.role, content: m.content }));

    setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: msg, ts: Date.now() }]);
    setChatLoading(true);
    setError('');

    try {
      const resp = await fetch('/api/ai-orchestrator/chat', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ message: msg, history, agentMode: aiMode, businessType, revenueGoal }),
      });
      if (resp.status === 402) { setError('Out of AI credits.'); return; }
      if (!resp.ok) throw new Error();
      const data = await resp.json();
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: data.content, ts: Date.now() }]);

      const sd = data.structuredData;
      const action = sd?.action;
      if (action === 'collect_credentials' && sd?.requiredCredentials?.length > 0) {
        pendingBlueprintRef.current = sd.blueprint ?? null;
        pendingSystemNameRef.current = sd.systemName ?? '';
        setPendingCreds(sd.requiredCredentials);
        setPhase('collecting');
      } else if (action === 'start_build' && sd?.blueprint) {
        await executeBuild({}, sd.blueprint, sd.systemName ?? '');
      }
    } catch {
      setError('ASH is temporarily unavailable.');
    } finally {
      setChatLoading(false);
    }
  }, [selectedBp, messages, executeBuild]);

  // ── Credential form submit (uses refs to avoid stale state) ───────────────
  const handleCredentialSubmit = useCallback((credValues) => {
    const bp = pendingBlueprintRef.current;
    const sysName = pendingSystemNameRef.current;
    executeBuild(credValues, bp, sysName);
  }, [executeBuild]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const isInputDisabled = chatLoading || phase === 'building' || phase === 'complete';
  const filteredBps = activeCatId
    ? blueprints.filter(b => b.categoryId === activeCatId)
    : blueprints;

  // ── Restore a checkpoint ───────────────────────────────────────────────────
  const restoreCheckpoint = useCallback((cp) => {
    setMessages(cp.messages);
    setPhase(cp.phase === 'complete' ? 'idle' : (cp.phase ?? 'idle'));
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

  const TOOLS_CATALOG = [
    { category: 'Email & CRM',   items: ['Mailchimp', 'ConvertKit', 'ActiveCampaign', 'HubSpot'] },
    { category: 'Payments',      items: ['Stripe', 'PayPal', 'Gumroad'] },
    { category: 'Social Media',  items: ['Twitter/X', 'Instagram', 'TikTok', 'YouTube'] },
    { category: 'Ecommerce',     items: ['Shopify', 'WooCommerce', 'Etsy'] },
    { category: 'Automation',    items: ['Zapier', 'Make', 'n8n'] },
    { category: 'AI & Content',  items: ['OpenAI', 'Claude', 'Midjourney'] },
  ];

  const activeMode = AI_MODES.find(m => m.id === aiMode);

  return (
    <VideoBackground>
    <div className="h-screen flex flex-col overflow-hidden">

      {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
      <div className="h-11 flex items-center justify-between px-3 border-b border-white/8 bg-black/80 backdrop-blur-lg shrink-0 gap-3">

        {/* Left: breadcrumb */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-muted-foreground/50 hover:text-foreground transition-colors text-xs shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Dashboard
          </button>
          <ChevronRight className="w-3 h-3 text-white/20 shrink-0" />
          <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground shrink-0">
            <Wand2 className="w-3.5 h-3.5 text-primary" />
            ASH Builder
          </span>
          {businessType && (
            <>
              <ChevronRight className="w-3 h-3 text-white/20 shrink-0" />
              <span className="text-xs text-muted-foreground/50 font-mono capitalize truncate">{businessType}</span>
            </>
          )}
          {revenueGoal && (
            <span className="hidden lg:flex items-center gap-1 text-[10px] text-emerald-400/70 bg-emerald-500/8 border border-emerald-500/20 rounded-full px-2 py-0.5 font-mono shrink-0">
              <Target className="w-2.5 h-2.5" /> {revenueGoal}/mo
            </span>
          )}
        </div>

        {/* Center: phase bar */}
        <div className="shrink-0">
          <PhaseBar phase={phase} />
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-2 shrink-0">
          {activeMode && (
            <button
              onClick={() => setActiveSidePanel(p => p === 'settings' ? null : 'settings')}
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-mono font-bold transition-colors ${activeMode.activeBg} ${activeMode.color}`}
            >
              <activeMode.icon className="w-3 h-3" />
              {activeMode.label}
              <span className="text-[9px] opacity-60">· {activeMode.creditHint}</span>
            </button>
          )}
          {isFounderAdmin && (
            <span className="hidden md:block text-[9px] font-mono text-amber-400/70 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">
              👑 FOUNDER
            </span>
          )}
          <button
            onClick={clearSession}
            disabled={phase === 'building'}
            title="Start a new session"
            className="flex items-center gap-1.5 text-muted-foreground/40 hover:text-muted-foreground transition-colors text-xs disabled:opacity-20 disabled:cursor-not-allowed px-2 py-1 rounded border border-white/8 hover:border-white/20"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Session</span>
          </button>
        </div>
      </div>

      {/* ── MAIN LAYOUT ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* ── ACTIVITY BAR (48px) ───────────────────────────────────────── */}
        <div className="w-12 shrink-0 flex flex-col items-center py-3 gap-1 border-r border-white/8 bg-black/70">
          {SIDE_PANELS.map(({ id, icon: Icon, title }) => (
            <button
              key={id}
              title={title}
              onClick={() => setActiveSidePanel(p => p === id ? null : id)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                activeSidePanel === id
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'text-muted-foreground/35 hover:text-muted-foreground hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
          <div className="flex-1" />
          <button
            title="Connections Hub"
            onClick={() => navigate('/connections')}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/25 hover:text-muted-foreground hover:bg-white/5 transition-all"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>

        {/* ── COLLAPSIBLE SIDE PANEL (240px) ───────────────────────────── */}
        <AnimatePresence initial={false}>
          {activeSidePanel && (
            <motion.div
              key="side-panel"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 240, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeInOut' }}
              className="shrink-0 border-r border-white/8 bg-black/50 flex flex-col overflow-hidden"
            >
              {/* Panel header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/8 shrink-0">
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground/40 font-mono font-bold">
                  {SIDE_PANELS.find(p => p.id === activeSidePanel)?.title}
                </span>
                <button
                  onClick={() => setActiveSidePanel(null)}
                  className="text-muted-foreground/25 hover:text-muted-foreground transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* ── EXPLORER ── */}
              {activeSidePanel === 'explorer' && (
                <div className="flex-1 overflow-y-auto py-1 select-none">

                  {/* ── SESSION ACTIONS ── */}
                  <div className="px-2 py-1.5">
                    <button
                      onClick={() => setMode('custom')}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] transition-colors ${
                        mode === 'custom' ? 'bg-primary/12 text-primary' : 'text-muted-foreground/50 hover:text-foreground hover:bg-white/5'
                      }`}
                    >
                      <MessageSquare className="w-3 h-3 shrink-0" />
                      Chat with ASH
                    </button>
                    <button
                      onClick={() => { setMode('blueprint'); setActiveSidePanel('blueprints'); }}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] transition-colors ${
                        mode === 'blueprint' ? 'bg-primary/12 text-primary' : 'text-muted-foreground/50 hover:text-foreground hover:bg-white/5'
                      }`}
                    >
                      <Grid3x3 className="w-3 h-3 shrink-0" />
                      Blueprint Picker
                    </button>
                  </div>

                  <div className="border-t border-white/6 mx-2 my-1" />

                  {/* ── SYSTEMS FILE TREE ── */}
                  <div className="px-2 py-1">
                    <div className="flex items-center justify-between px-1 mb-1">
                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground/30 font-mono">Systems</p>
                      {systemsLoading && <Loader2 className="w-2.5 h-2.5 text-muted-foreground/30 animate-spin" />}
                    </div>

                    {!systemsLoading && userSystems.length === 0 && (
                      <div className="px-2 py-3 text-center">
                        <Server className="w-5 h-5 text-muted-foreground/15 mx-auto mb-1.5" />
                        <p className="text-[9px] text-muted-foreground/25 font-mono">No systems yet.</p>
                        <p className="text-[9px] text-muted-foreground/20 font-mono">Build one with ASH →</p>
                      </div>
                    )}

                    <div className="space-y-0.5">
                      {userSystems.map((sys) => {
                        const status = (sys.buildStatus || '').toLowerCase();
                        const health = (sys.healthStatus || '').toLowerCase();
                        const isOpen = !!expandedSystems[sys.id];
                        const stepsOpen = !!expandedFolders[`${sys.id}_steps`];

                        const statusColor =
                          status === 'active' || status === 'completed' || health === 'healthy'
                            ? 'text-emerald-400'
                            : status === 'building'
                            ? 'text-blue-400'
                            : status === 'paused'
                            ? 'text-amber-400'
                            : health === 'unhealthy' || status === 'failed'
                            ? 'text-rose-400'
                            : 'text-zinc-500';

                        const dotColor =
                          status === 'active' || status === 'completed' || health === 'healthy'
                            ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                            : status === 'building'
                            ? 'bg-blue-400 animate-pulse shadow-[0_0_6px_rgba(96,165,250,0.6)]'
                            : status === 'paused'
                            ? 'bg-amber-400'
                            : health === 'unhealthy' || status === 'failed'
                            ? 'bg-rose-400'
                            : 'bg-zinc-600';

                        const folderIconColor =
                          status === 'active' || status === 'completed' || health === 'healthy'
                            ? 'text-emerald-400/70'
                            : status === 'building'
                            ? 'text-blue-400/70'
                            : status === 'paused'
                            ? 'text-amber-400/70'
                            : 'text-zinc-500/60';

                        const steps = Array.isArray(sys.steps) ? sys.steps : [];

                        return (
                          <div key={sys.id}>
                            {/* ── System root folder ── */}
                            <button
                              onClick={() => setExpandedSystems(prev => ({ ...prev, [sys.id]: !prev[sys.id] }))}
                              className="w-full group flex items-center gap-1 px-1 py-1 rounded hover:bg-white/6 transition-colors"
                            >
                              {isOpen
                                ? <ChevronDown className="w-3 h-3 text-muted-foreground/30 shrink-0" />
                                : <ChevronRight className="w-3 h-3 text-muted-foreground/30 shrink-0" />
                              }
                              {isOpen
                                ? <FolderOpen className={`w-3.5 h-3.5 shrink-0 ${folderIconColor}`} />
                                : <Folder className={`w-3.5 h-3.5 shrink-0 ${folderIconColor}`} />
                              }
                              <span className="flex-1 truncate text-[11px] text-foreground/75 text-left font-mono leading-tight">
                                {sys.name || 'Unnamed System'}
                              </span>
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                            </button>

                            {/* ── Expanded content ── */}
                            {isOpen && (
                              <div className="ml-4 border-l border-white/6 pl-2 mb-0.5 space-y-0.5">

                                {/* README.md */}
                                <button
                                  onClick={() => navigate(`/systems/${sys.id}`)}
                                  className="w-full flex items-center gap-1.5 px-1 py-0.5 rounded hover:bg-white/5 transition-colors group"
                                >
                                  <FileText className="w-3 h-3 shrink-0 text-sky-400/60" />
                                  <span className="text-[10px] text-muted-foreground/55 font-mono group-hover:text-sky-300/80 truncate transition-colors">README.md</span>
                                  <ExternalLink className="w-2.5 h-2.5 text-muted-foreground/20 opacity-0 group-hover:opacity-100 ml-auto shrink-0 transition-all" />
                                </button>

                                {/* config.json */}
                                <div className="flex items-center gap-1.5 px-1 py-0.5">
                                  <FileJson2 className="w-3 h-3 shrink-0 text-amber-400/60" />
                                  <span className="text-[10px] text-muted-foreground/40 font-mono truncate">config.json</span>
                                </div>

                                {/* activity.log */}
                                <div className="flex items-center gap-1.5 px-1 py-0.5">
                                  <FileText className="w-3 h-3 shrink-0 text-violet-400/50" />
                                  <span className="text-[10px] text-muted-foreground/40 font-mono truncate">activity.log</span>
                                  <span className={`ml-auto text-[8px] font-mono shrink-0 ${statusColor}`}>
                                    {status || 'pending'}
                                  </span>
                                </div>

                                {/* build-steps/ folder */}
                                <button
                                  onClick={() => setExpandedFolders(prev => ({ ...prev, [`${sys.id}_steps`]: !prev[`${sys.id}_steps`] }))}
                                  className="w-full flex items-center gap-1 px-1 py-0.5 rounded hover:bg-white/5 transition-colors"
                                >
                                  {stepsOpen
                                    ? <ChevronDown className="w-2.5 h-2.5 text-muted-foreground/25 shrink-0" />
                                    : <ChevronRight className="w-2.5 h-2.5 text-muted-foreground/25 shrink-0" />
                                  }
                                  {stepsOpen
                                    ? <FolderOpen className="w-3 h-3 shrink-0 text-orange-400/60" />
                                    : <Folder className="w-3 h-3 shrink-0 text-orange-400/60" />
                                  }
                                  <span className="text-[10px] text-muted-foreground/45 font-mono">build-steps/</span>
                                  {steps.length > 0 && (
                                    <span className="ml-auto text-[8px] font-mono text-muted-foreground/25">{steps.length}</span>
                                  )}
                                </button>

                                {/* Step files */}
                                {stepsOpen && (
                                  <div className="ml-3 border-l border-white/5 pl-2 space-y-0.5">
                                    {steps.length === 0 ? (
                                      <p className="text-[9px] text-muted-foreground/20 font-mono px-1 py-0.5">no steps</p>
                                    ) : (
                                      steps.map((step, i) => {
                                        const stepNum = String(i + 1).padStart(2, '0');
                                        const stepNote = (step.notes || step.name || `Step ${i + 1}`)
                                          .toLowerCase()
                                          .replace(/\s+/g, '_')
                                          .replace(/[^a-z0-9_]/g, '')
                                          .slice(0, 22);
                                        const isComplete = step.status === 'completed' || step.completedAt;
                                        const isActive   = step.status === 'in_progress' || step.status === 'running';
                                        const isFailed   = step.status === 'failed';
                                        return (
                                          <div key={step.id || i} className="flex items-center gap-1.5 px-1 py-0.5">
                                            {isComplete
                                              ? <CheckCircle className="w-2.5 h-2.5 shrink-0 text-emerald-400/70" />
                                              : isActive
                                              ? <PlayCircle className="w-2.5 h-2.5 shrink-0 text-blue-400 animate-pulse" />
                                              : isFailed
                                              ? <AlertTriangle className="w-2.5 h-2.5 shrink-0 text-rose-400/70" />
                                              : <Circle className="w-2.5 h-2.5 shrink-0 text-muted-foreground/20" />
                                            }
                                            <span className={`text-[9px] font-mono truncate ${
                                              isComplete ? 'text-emerald-400/60'
                                                : isActive ? 'text-blue-400/80'
                                                : isFailed ? 'text-rose-400/60'
                                                : 'text-muted-foreground/30'
                                            }`}>
                                              {stepNum}_{stepNote}.md
                                            </span>
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t border-white/6 mx-2 my-1" />

                  {/* ── QUICK START ── */}
                  <div className="px-2 py-1">
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground/25 font-mono mb-1 px-1">Quick Start</p>
                    <div className="space-y-0.5">
                      {STARTER_PROMPTS.map((prompt, i) => (
                        <button
                          key={i}
                          onClick={() => { setMode('custom'); sendMessage(prompt); }}
                          className="w-full flex items-center gap-2 px-2 py-1 rounded text-[10px] text-muted-foreground/45 hover:text-foreground hover:bg-white/5 transition-colors text-left"
                        >
                          <Zap className="w-2.5 h-2.5 shrink-0 text-primary/35" />
                          <span className="truncate">{prompt}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ── ACTIVE BUILD OUTPUT ── */}
                  {buildData && (
                    <>
                      <div className="border-t border-white/6 mx-2 my-1" />
                      <div className="px-2 py-1">
                        <p className="text-[9px] uppercase tracking-widest text-muted-foreground/25 font-mono mb-1 px-1">Active Build</p>
                        <div className="space-y-0.5">
                          {buildData.steps?.map((step, i) => {
                            const isDone = i < currentStepIdx;
                            const isRunning = i === currentStepIdx && phase === 'building';
                            return (
                              <div
                                key={step.id}
                                className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-mono ${
                                  isDone ? 'text-emerald-400/65' : isRunning ? 'text-primary' : 'text-muted-foreground/22'
                                }`}
                              >
                                {isDone
                                  ? <CheckCircle className="w-2.5 h-2.5 shrink-0" />
                                  : isRunning
                                  ? <PlayCircle className="w-2.5 h-2.5 shrink-0 animate-pulse" />
                                  : <Circle className="w-2.5 h-2.5 shrink-0" />
                                }
                                <span className="truncate">{step.notes}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}

                  {/* ── CHECKPOINTS ── */}
                  <div className="border-t border-white/6 mx-2 my-1" />
                  <div className="px-2 py-1">
                    <div className="flex items-center justify-between px-1 mb-1.5">
                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground/25 font-mono">Checkpoints</p>
                      {checkpoints.length > 0 && (
                        <button
                          onClick={() => {
                            try { localStorage.removeItem(checkpointsKey(currentUser?.id)); } catch {}
                            setCheckpoints([]);
                          }}
                          className="text-[9px] text-muted-foreground/25 hover:text-rose-400/60 transition-colors font-mono"
                        >
                          clear
                        </button>
                      )}
                    </div>
                    {checkpoints.length === 0 ? (
                      <p className="text-[9px] text-muted-foreground/20 font-mono px-1">
                        Auto-saved after each AI reply.
                      </p>
                    ) : (
                      <div className="space-y-0.5">
                        {checkpoints.map((cp) => (
                          <div
                            key={cp.id}
                            className="group flex items-start gap-1.5 px-1 py-1 rounded hover:bg-white/5 transition-colors"
                          >
                            <div className="w-1 h-1 rounded-full bg-primary/35 mt-1.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[9px] text-foreground/60 truncate font-mono leading-tight">{cp.summary}</p>
                              <p className="text-[8px] text-muted-foreground/25 font-mono mt-0.5">
                                {formatTs(cp.ts)} · {cp.messageCount}msg
                              </p>
                            </div>
                            <button
                              onClick={() => restoreCheckpoint(cp)}
                              className="shrink-0 opacity-0 group-hover:opacity-100 text-[8px] text-primary/55 hover:text-primary font-mono transition-all"
                              title="Restore checkpoint"
                            >
                              restore
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── BLUEPRINTS ── */}
              {activeSidePanel === 'blueprints' && (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="p-2 border-b border-white/6 flex flex-wrap gap-1 shrink-0">
                    <button
                      onClick={() => setActiveCatId(null)}
                      className={`px-2 py-0.5 rounded-full text-[9px] font-mono transition-colors ${
                        activeCatId === null
                          ? 'bg-primary/20 text-primary border border-primary/30'
                          : 'bg-white/4 text-muted-foreground/45 border border-white/8 hover:text-foreground'
                      }`}
                    >
                      All
                    </button>
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCatId(activeCatId === cat.id ? null : cat.id)}
                        className={`px-2 py-0.5 rounded-full text-[9px] font-mono transition-colors ${
                          activeCatId === cat.id
                            ? 'bg-primary/20 text-primary border border-primary/30'
                            : 'bg-white/4 text-muted-foreground/45 border border-white/8 hover:text-foreground'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                    {bpLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      </div>
                    ) : filteredBps.length === 0 ? (
                      <p className="text-center py-6 text-muted-foreground/30 text-xs">No blueprints found</p>
                    ) : filteredBps.map(bp => (
                      <BlueprintCard key={bp.id} bp={bp} selected={selectedBp?.id === bp.id} onSelect={setSelectedBp} />
                    ))}
                  </div>
                  <div className="p-2.5 border-t border-white/8 shrink-0">
                    <Button
                      className="w-full h-9 gap-2 text-xs font-semibold"
                      disabled={!selectedBp || phase === 'building' || phase === 'complete' || chatLoading}
                      onClick={handleBlueprintLaunch}
                    >
                      {chatLoading || executeLoading
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Planning…</>
                        : <><Sparkles className="w-3.5 h-3.5" /> Plan Blueprint</>}
                    </Button>
                    {!selectedBp && (
                      <p className="text-[9px] text-muted-foreground/25 text-center mt-1.5 font-mono">
                        Select a blueprint above
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ── TOOLS ── */}
              {activeSidePanel === 'tools' && (
                <div className="flex-1 overflow-y-auto">
                  <div className="px-3 pt-2.5 pb-1">
                    <p className="text-[10px] text-muted-foreground/40 leading-relaxed">
                      Connect tools so ASH can build with them automatically.
                    </p>
                  </div>
                  {TOOLS_CATALOG.map(({ category, items }) => (
                    <div key={category} className="px-3 py-2">
                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground/25 font-mono mb-1">{category}</p>
                      <div className="space-y-0.5">
                        {items.map(tool => (
                          <div key={tool} className="flex items-center justify-between px-2 py-1 rounded hover:bg-white/4 transition-colors">
                            <span className="text-[11px] text-muted-foreground/60">{tool}</span>
                            <button
                              onClick={() => navigate('/connections')}
                              className="text-[9px] font-mono text-primary/50 hover:text-primary transition-colors"
                            >
                              Connect →
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-white/5 mt-2" />
                    </div>
                  ))}
                  <div className="p-3 pt-1">
                    <button
                      onClick={() => navigate('/connections')}
                      className="w-full py-2 px-3 text-xs font-semibold text-primary bg-primary/8 hover:bg-primary/15 border border-primary/20 rounded-lg transition-colors"
                    >
                      Open Connections Hub →
                    </button>
                  </div>
                </div>
              )}

              {/* ── SETTINGS ── */}
              {activeSidePanel === 'settings' && (
                <div className="flex-1 overflow-y-auto py-3 px-3 space-y-5">
                  {/* Business type */}
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground/40 font-mono mb-2 flex items-center gap-1">
                      <Building2 className="w-2.5 h-2.5" /> Business Type
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {BUSINESS_TYPES.map(bt => {
                        const BIcon = bt.icon;
                        const isActive = businessType === bt.id;
                        return (
                          <button
                            key={bt.id}
                            onClick={() => setBusinessType(isActive ? null : bt.id)}
                            className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs font-medium transition-all ${
                              isActive ? `${bt.bg} ${bt.color}` : 'bg-white/3 border-white/8 hover:border-white/20 text-muted-foreground/50'
                            }`}
                          >
                            <BIcon className={`w-3.5 h-3.5 shrink-0 ${isActive ? bt.color : 'text-muted-foreground/35'}`} />
                            {bt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Revenue goal */}
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground/40 font-mono mb-2 flex items-center gap-1">
                      <Target className="w-2.5 h-2.5" /> Revenue Goal
                    </p>
                    {showRevenueGoalInput ? (
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={revenueGoal}
                          onChange={e => setRevenueGoal(e.target.value)}
                          placeholder="e.g. $5,000/mo"
                          className="flex-1 text-xs bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/50 font-mono"
                          onKeyDown={e => { if (e.key === 'Enter') setShowRevenueGoalInput(false); }}
                          autoFocus
                        />
                        <button onClick={() => setShowRevenueGoalInput(false)} className="text-primary hover:text-primary/80 px-2 text-sm">✓</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowRevenueGoalInput(true)}
                        className="w-full flex items-center justify-between text-xs px-2.5 py-2 rounded-lg border border-white/8 bg-white/3 hover:border-white/20 transition-colors"
                      >
                        <span className="text-muted-foreground/45">{revenueGoal || 'Set monthly goal…'}</span>
                        {revenueGoal && <span className="text-emerald-400 font-mono font-bold">{revenueGoal}/mo</span>}
                      </button>
                    )}
                  </div>

                  {/* AI Power Mode */}
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground/40 font-mono mb-2 flex items-center gap-1">
                      <Brain className="w-2.5 h-2.5" /> Agent Power Mode
                    </p>
                    <div className="space-y-1.5">
                      {AI_MODES.map(m => {
                        const Icon = m.icon;
                        const isLocked = m.requiredTier && !isEmpireTier;
                        const isActive = aiMode === m.id;
                        return (
                          <button
                            key={m.id}
                            disabled={isLocked}
                            onClick={() => !isLocked && setAiMode(m.id)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs transition-all ${
                              isLocked
                                ? 'opacity-35 cursor-not-allowed border-white/8 bg-white/2'
                                : isActive ? m.activeBg : m.inactiveBg
                            }`}
                          >
                            <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? m.color : 'text-muted-foreground/45'}`} />
                            <div className="flex-1 text-left min-w-0">
                              <div className={`font-semibold font-mono text-[11px] ${isActive ? m.color : 'text-muted-foreground/55'}`}>{m.label}</div>
                              <div className="text-[9px] text-muted-foreground/35 truncate">{m.subtitle}</div>
                            </div>
                            <span className={`font-mono text-[9px] shrink-0 ${isActive ? m.color : 'text-muted-foreground/25'}`}>{m.creditHint}</span>
                            {isLocked && <Lock className="w-3 h-3 text-muted-foreground/25 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                    {activeMode && (
                      <div className={`mt-2 p-2.5 rounded-lg border ${activeMode.activeBg}`}>
                        <p className={`text-[10px] leading-relaxed ${activeMode.color} opacity-70`}>{activeMode.description}</p>
                        <div className="mt-1.5">
                          <div className="w-full h-0.5 rounded-full bg-white/8">
                            <div className={`h-0.5 rounded-full ${activeMode.barColor} ${activeMode.barWidth}`} />
                          </div>
                          <p className={`text-[9px] font-mono mt-1 ${activeMode.color} opacity-50`}>{activeMode.creditsPerBuild} per build</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── CENTER: Build Terminal ───────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Agent team status strip */}
          {(phase === 'building' || phase === 'collecting' || phase === 'complete') && (
            <div className="shrink-0 border-b border-white/8 px-4 py-2 bg-black/40 flex items-center gap-3 flex-wrap">
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground/35 font-mono flex items-center gap-1 shrink-0">
                <Globe className="w-2.5 h-2.5" /> Agents
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {MULTI_AGENTS.map(agent => {
                  const AIcon = agent.icon;
                  const isActive = agent.phases.includes(phase);
                  const isDone = phase === 'complete';
                  return (
                    <span
                      key={agent.id}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-mono transition-all ${
                        isDone
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : isActive && phase === 'building'
                          ? 'bg-primary/10 border-primary/30 text-primary'
                          : isActive
                          ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                          : 'bg-white/3 border-white/8 text-muted-foreground/20'
                      }`}
                    >
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
                <span className="ml-auto text-[9px] font-mono text-primary/60 shrink-0">
                  {currentStepIdx}/{buildData.steps.length} steps
                </span>
              )}
            </div>
          )}

          {/* Credential status (inline, no sidebar clutter) */}
          {phase === 'collecting' && pendingCreds.length > 0 && (
            <div className="shrink-0 border-b border-white/8 px-4 py-2 bg-amber-500/5 flex items-center gap-4 flex-wrap">
              <p className="text-[9px] text-amber-400/70 font-mono uppercase tracking-widest shrink-0">Credentials needed</p>
              <div className="flex items-center gap-3 flex-wrap">
                {pendingCreds.map(cred => {
                  const isStored = !!storedCredKeys[cred.key];
                  return (
                    <span key={cred.key} className="flex items-center gap-1.5 text-[11px]">
                      <span className={`w-1.5 h-1.5 rounded-full ${isStored ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                      <span className="text-muted-foreground/60">{cred.name || cred.key}</span>
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

          {/* Terminal fills remaining space */}
          <div className="flex-1 min-h-0 p-4">
            <BuildTerminal
              steps={buildData?.steps ?? []}
              outputs={stepOutputs}
              currentIdx={currentStepIdx}
              instanceId={buildData?.instanceId}
              phase={phase}
            />
          </div>
        </div>

        {/* ── RIGHT: Chat Panel (320px) ────────────────────────────────── */}
        <div className="w-[300px] xl:w-[320px] shrink-0 flex flex-col border-l border-white/8 bg-black/40">

          {/* Chat header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/8 shrink-0 bg-black/60">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center">
                <Wand2 className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-foreground">ASH</span>
                  <Badge variant="outline" className="text-[8px] border-primary/30 text-primary bg-primary/5 font-mono px-1 py-0">AI</Badge>
                </div>
                <p className="text-[9px] text-muted-foreground/35 font-mono">Autonomous Business Builder</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              <span className="text-[10px] text-emerald-400">Online</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scrollbar-thin scrollbar-thumb-white/10">
            <SkillActivationPanel activatedSkills={activatedSkills} />

            {messages.map(m => <MessageBubble key={m.id} msg={m} />)}

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

            {chatLoading && (
              <div className="flex items-start gap-2">
                <div className="bg-white/5 border border-white/10 rounded-xl rounded-tl-sm px-3 py-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    <span className="font-mono text-[11px]">ASH is analyzing…</span>
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
              <div>
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground/35 font-mono mb-2">Quick start</p>
                <div className="space-y-1">
                  {STARTER_PROMPTS.map((g, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(g)}
                      className="w-full text-left text-[11px] px-3 py-2 rounded-lg border border-white/8 bg-white/3 hover:bg-white/8 text-muted-foreground/70 hover:text-foreground transition-colors flex items-center gap-2"
                    >
                      <Zap className="w-3 h-3 text-primary/50 shrink-0" />
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Input bar */}
          <div className="p-3 border-t border-white/10 bg-black/60 shrink-0">
            {phase === 'building' ? (
              <div className="flex items-center justify-center gap-2 py-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span className="font-mono text-[11px] text-muted-foreground/50">Building — {buildData?.steps?.length ?? 0} steps</span>
              </div>
            ) : phase === 'complete' ? (
              <div className="flex items-center justify-center gap-2 py-1.5 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="font-mono text-[11px]">Deployed — redirecting…</span>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder={phase === 'collecting' ? 'Fill credentials above…' : 'Describe your income goal…'}
                    disabled={isInputDisabled}
                    className="flex-1 resize-none text-xs bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-foreground placeholder:text-muted-foreground/35 focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-40"
                    rows={1}
                    style={{ minHeight: '36px', maxHeight: '88px' }}
                    onInput={e => {
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 88) + 'px';
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
                <p className="text-[9px] text-muted-foreground/20 mt-1.5 text-center font-mono">
                  ASH builds autonomously · Credentials encrypted at rest
                </p>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
    </VideoBackground>
  );
};

export default BuilderPage;
