import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Send, Loader2, AlertCircle, Zap, CheckCircle2,
  Eye, EyeOff, ChevronRight, Terminal, Activity, Lock,
  Cpu, Play, ExternalLink, ArrowLeft, Grid3x3,
  MessageSquare, Sparkles, Clock, DollarSign,
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
          : 'border-white/10 bg-white/3 hover:bg-white/6 hover:border-white/20'
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
          STARK Build Engine · Autonomous Mode
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
                <p className="text-sm text-muted-foreground font-semibold">STARK Build Engine</p>
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

  // Phase machine
  const [phase, setPhase] = useState('idle');

  // Chat
  const [messages, setMessages] = useState([{
    id: 'welcome',
    role: 'assistant',
    content: "I'm STARK — your Autonomous System Builder.\n\nGive me your income goal. I'll select the right blueprint, collect only the credentials I need, and build the entire system for you automatically.",
    ts: Date.now(),
  }]);
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
      // Auto-redirect after 3 seconds so user sees success banner
      const timer = setTimeout(() => navigate(`/systems/${buildData.instanceId}`), 3000);
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

  // ── Send message to STARK ──────────────────────────────────────────────────
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
        body: JSON.stringify({ message: msg, history }),
      });
      if (resp.status === 402) { setError('Out of AI credits. Top up to continue.'); return; }
      if (!resp.ok) throw new Error('STARK request failed');

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
        // No credentials needed — execute immediately, passing blueprint directly
        await executeBuild({}, sd.blueprint, sd.systemName ?? '');
      }
    } catch {
      setError('STARK is temporarily unavailable. Please try again.');
    } finally {
      setChatLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, chatLoading, messages, executeBuild]);

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
        body: JSON.stringify({ message: msg, history }),
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
      setError('STARK is temporarily unavailable.');
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

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 bg-black/60 backdrop-blur-lg shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-muted-foreground/60 hover:text-foreground transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </button>
          <span className="text-white/20">/</span>
          <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary" />
            Builder
          </span>
        </div>
        <PhaseBar phase={phase} />
      </div>

      {/* Split pane */}
      <div className="flex flex-1 min-h-0">

        {/* ── Left Pane ──────────────────────────────────────────────────── */}
        <div className="w-[400px] shrink-0 flex flex-col border-r border-white/8 bg-black/40">

          {/* STARK header + mode toggle */}
          <div className="px-4 pt-4 pb-3 border-b border-white/8 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <span className="font-semibold text-sm text-foreground">STARK</span>
                <Badge variant="outline" className="text-[9px] border-primary/30 text-primary bg-primary/5 font-mono">
                  AUTONOMOUS BUILDER
                </Badge>
              </div>
              <span className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-xs text-emerald-400">Online</span>
              </span>
            </div>

            {/* Mode toggle */}
            <div className="flex rounded-lg bg-white/4 border border-white/8 p-0.5">
              <button
                onClick={() => setMode('custom')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  mode === 'custom'
                    ? 'bg-primary/20 text-primary shadow-sm'
                    : 'text-muted-foreground/50 hover:text-muted-foreground'
                }`}
              >
                <MessageSquare className="w-3 h-3" /> Custom Goal
              </button>
              <button
                onClick={() => setMode('blueprint')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  mode === 'blueprint'
                    ? 'bg-primary/20 text-primary shadow-sm'
                    : 'text-muted-foreground/50 hover:text-muted-foreground'
                }`}
              >
                <Grid3x3 className="w-3 h-3" /> Blueprint
              </button>
            </div>
          </div>

          {/* Blueprint mode */}
          {mode === 'blueprint' && (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="px-4 py-3 border-b border-white/6 shrink-0">
                <div className="flex gap-1.5 flex-wrap">
                  <button
                    onClick={() => setActiveCatId(null)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold transition-colors ${
                      activeCatId === null
                        ? 'bg-primary/20 text-primary border border-primary/30'
                        : 'bg-white/4 text-muted-foreground/50 border border-white/8 hover:text-foreground'
                    }`}
                  >
                    All
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCatId(activeCatId === cat.id ? null : cat.id)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold transition-colors ${
                        activeCatId === cat.id
                          ? 'bg-primary/20 text-primary border border-primary/30'
                          : 'bg-white/4 text-muted-foreground/50 border border-white/8 hover:text-foreground'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {bpLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                ) : filteredBps.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground/40 text-sm">No blueprints found</div>
                ) : (
                  filteredBps.map(bp => (
                    <BlueprintCard
                      key={bp.id}
                      bp={bp}
                      selected={selectedBp?.id === bp.id}
                      onSelect={setSelectedBp}
                    />
                  ))
                )}
              </div>

              <div className="p-4 border-t border-white/8 shrink-0 space-y-2">
                <Button
                  className="w-full h-11 gap-2 font-semibold"
                  disabled={!selectedBp || phase === 'building' || phase === 'complete' || chatLoading}
                  onClick={handleBlueprintLaunch}
                >
                  {chatLoading || executeLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Planning…</>
                    : <><Sparkles className="w-4 h-4" /> Plan This System <ChevronRight className="w-4 h-4" /></>}
                </Button>
                {!selectedBp && (
                  <p className="text-[10px] text-muted-foreground/30 text-center">
                    Select a blueprint above to continue
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Custom / Chat mode */}
          {mode === 'custom' && (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
                <SkillActivationPanel activatedSkills={activatedSkills} />
                {messages.map(m => <MessageBubble key={m.id} msg={m} />)}

                {/* Credential collection */}
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
                    <div className="bg-white/6 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-2.5">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                        <span className="font-mono text-xs">STARK is analyzing…</span>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {error}
                  </div>
                )}

                {messages.length === 1 && phase === 'idle' && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-medium mb-2">
                      Quick start
                    </p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {STARTER_PROMPTS.map((g, i) => (
                        <button
                          key={i}
                          onClick={() => sendMessage(g)}
                          className="text-left text-xs px-3 py-2.5 rounded-lg border border-white/8 bg-white/3 hover:bg-white/8 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
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
              <div className="p-3 border-t border-white/10 bg-black/20 shrink-0">
                {phase === 'building' ? (
                  <div className="flex items-center justify-center gap-2 py-1.5 text-xs text-muted-foreground/50">
                    <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span className="font-mono">Building — {buildData?.steps?.length ?? 0} steps queued</span>
                  </div>
                ) : phase === 'complete' ? (
                  <div className="flex items-center justify-center gap-2 py-1.5 text-xs text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="font-mono">System deployed — redirecting…</span>
                  </div>
                ) : (
                  <>
                    {phase === 'idle' && input.trim() && (
                      <Button
                        className="w-full h-9 gap-2 font-semibold mb-2 text-xs bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30"
                        onClick={() => sendMessage()}
                        disabled={chatLoading}
                      >
                        {chatLoading
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Sparkles className="w-3.5 h-3.5" />}
                        Plan My System
                      </Button>
                    )}
                    <div className="flex gap-2">
                      <textarea
                        ref={inputRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKey}
                        placeholder={
                          phase === 'collecting'
                            ? 'Fill in credentials above to proceed…'
                            : 'Describe your income goal…'
                        }
                        disabled={isInputDisabled}
                        className="flex-1 resize-none text-sm bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-40"
                        rows={1}
                        style={{ minHeight: '38px', maxHeight: '96px' }}
                        onInput={e => {
                          e.target.style.height = 'auto';
                          e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px';
                        }}
                      />
                      <Button
                        onClick={() => sendMessage()}
                        disabled={!input.trim() || isInputDisabled}
                        size="icon"
                        className="h-[38px] w-[38px] shrink-0 rounded-xl"
                      >
                        {chatLoading
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Send className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground/25 mt-1.5 text-center font-mono">
                      STARK builds autonomously · Credentials encrypted at rest
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Right Pane: Terminal ────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 p-4 flex flex-col gap-3">
          {phase === 'collecting' && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 shrink-0">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-emerald-400">Plan Ready — Enter credentials, then execute</p>
                <p className="text-[10px] text-muted-foreground/50">Fill the credential form in the sidebar to unlock build</p>
              </div>
              <Button
                className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shrink-0 border-0"
                onClick={() => handleCredentialSubmit(liftedCredValues)}
                disabled={executeLoading || pendingCreds.some(c => c.required !== false && !(liftedCredValues[c.key] || '').trim())}
              >
                {executeLoading
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Play className="w-3.5 h-3.5" />}
                Execute Build
              </Button>
            </div>
          )}
          <div className="flex-1 min-h-0">
            <BuildTerminal
              steps={buildData?.steps ?? []}
              outputs={stepOutputs}
              currentIdx={currentStepIdx}
              instanceId={buildData?.instanceId}
              phase={phase}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuilderPage;
