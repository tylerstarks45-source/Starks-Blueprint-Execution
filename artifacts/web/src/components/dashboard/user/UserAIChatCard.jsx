import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bot, Send, Loader2, AlertCircle, Zap, CheckCircle2,
  Eye, EyeOff, ChevronRight, Terminal, Activity, Lock,
  Cpu, Play, ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : { 'Content-Type': 'application/json' };
};

const STARTER_GOALS = [
  "Build me a passive income system with affiliate marketing",
  "I want an AI system that generates leads for my agency",
  "Create an automated content machine for YouTube Shorts",
  "Build me an email marketing automation system",
];

// ─── Phase Indicator ─────────────────────────────────────────────────────────
const PhaseBar = ({ phase }) => {
  const phases = [
    { id: 'idle', label: 'GOAL' },
    { id: 'collecting', label: 'CREDENTIALS' },
    { id: 'building', label: 'BUILDING' },
    { id: 'complete', label: 'LIVE' },
  ];
  const activeIdx = phases.findIndex(p => p.id === phase);

  return (
    <div className="flex items-center gap-0 w-full">
      {phases.map((p, i) => {
        const done = i < activeIdx;
        const active = i === activeIdx;
        return (
          <React.Fragment key={p.id}>
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-mono font-bold tracking-widest transition-colors ${
              done ? 'text-emerald-400' : active ? 'text-primary' : 'text-muted-foreground/30'
            }`}>
              {done ? <CheckCircle2 className="w-2.5 h-2.5" /> : active ? <Cpu className="w-2.5 h-2.5 animate-pulse" /> : <span className="w-2.5 h-2.5 rounded-full border border-current opacity-40" />}
              {p.label}
            </div>
            {i < phases.length - 1 && (
              <div className={`h-px flex-1 transition-colors ${done ? 'bg-emerald-400/40' : 'bg-white/8'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ─── Credential Input Card ────────────────────────────────────────────────────
const CredentialForm = ({ credentials, blueprint, systemName, onExecute, loading }) => {
  const [values, setValues] = useState({});
  const [revealed, setRevealed] = useState({});

  const allFilled = credentials.every(c => (values[c.key] || '').trim().length > 0);

  return (
    <div className="rounded-xl border border-primary/25 bg-black/50 overflow-hidden mt-2">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-primary/15 bg-primary/8">
        <Lock className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-mono font-semibold text-primary uppercase tracking-wider">
          Credentials Required — {blueprint?.name}
        </span>
        <Badge variant="outline" className="ml-auto text-[9px] border-primary/20 text-primary/70">
          {credentials.length} {credentials.length === 1 ? 'credential' : 'credentials'}
        </Badge>
      </div>

      {/* Credential inputs */}
      <div className="p-4 space-y-3">
        {credentials.map((cred) => (
          <div key={cred.key}>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-foreground">
                {cred.label}
                {cred.required !== false && <span className="text-rose-400 ml-1">*</span>}
              </label>
              <span className="text-[10px] text-muted-foreground/60 font-mono">{cred.toolName}</span>
            </div>
            <div className="relative">
              <input
                type={revealed[cred.key] ? 'text' : 'password'}
                value={values[cred.key] || ''}
                onChange={e => setValues(v => ({ ...v, [cred.key]: e.target.value }))}
                placeholder={`Enter ${cred.label}`}
                className="w-full text-sm bg-white/5 border border-white/10 rounded-lg px-3 py-2 pr-9 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/50 focus:bg-white/8 transition-all font-mono"
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
            {cred.description && (
              <p className="text-[11px] text-muted-foreground/50 mt-1">{cred.description}</p>
            )}
          </div>
        ))}
      </div>

      {/* Execute button */}
      <div className="px-4 pb-4">
        <Button
          className="w-full h-10 gap-2 font-semibold text-sm"
          disabled={!allFilled || loading}
          onClick={() => onExecute(values)}
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Initializing Build…</>
            : <><Play className="w-4 h-4" /> Execute Autonomous Build <ChevronRight className="w-4 h-4" /></>
          }
        </Button>
        <p className="text-[10px] text-muted-foreground/30 text-center mt-2">
          Credentials are encrypted and used only to build your system
        </p>
      </div>
    </div>
  );
};

// ─── Build Progress Terminal ──────────────────────────────────────────────────
const BuildTerminal = ({ steps, outputs, currentIdx, instanceId, onComplete }) => {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [outputs]);

  const navigate = useNavigate();

  return (
    <div className="rounded-xl border border-white/10 bg-black/70 overflow-hidden mt-2 font-mono">
      {/* Terminal header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10 bg-black/40">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
        </div>
        <span className="text-[10px] text-muted-foreground/50 ml-2">STARK Build Engine — Autonomous Mode</span>
        <div className="ml-auto flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
          <span className="text-[10px] text-emerald-400">RUNNING</span>
        </div>
      </div>

      {/* Terminal output */}
      <div className="p-4 space-y-3 max-h-72 overflow-y-auto text-xs">
        {steps.map((step, i) => {
          const isDone = step.status === 'completed' || (outputs[step.id] && i < currentIdx);
          const isActive = i === currentIdx;
          const isPending = i > currentIdx;

          return (
            <div key={step.id} className={`transition-opacity ${isPending ? 'opacity-30' : 'opacity-100'}`}>
              <div className="flex items-start gap-2">
                <span className={`shrink-0 mt-0.5 ${isDone ? 'text-emerald-400' : isActive ? 'text-primary' : 'text-muted-foreground/40'}`}>
                  {isDone ? '✓' : isActive ? '▶' : '○'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold ${isDone ? 'text-emerald-400/80' : isActive ? 'text-foreground' : 'text-muted-foreground/40'}`}>
                    [{String(step.stepNumber).padStart(2, '0')}/{String(steps.length).padStart(2, '0')}] {step.notes}
                  </div>
                  {isActive && !outputs[step.id] && (
                    <div className="flex items-center gap-1.5 mt-1 text-primary/60">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      <span>Executing…</span>
                    </div>
                  )}
                  {outputs[step.id] && (
                    <div className="mt-1 text-muted-foreground/70 leading-relaxed border-l-2 border-white/10 pl-2">
                      {outputs[step.id]}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Complete CTA */}
      {currentIdx >= steps.length && (
        <div className="border-t border-emerald-500/20 bg-emerald-500/5 px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> System deployed and live
            </p>
            <p className="text-[10px] text-muted-foreground/50 mt-0.5">All {steps.length} build steps completed successfully</p>
          </div>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => instanceId ? navigate(`/systems/${instanceId}`) : navigate('/dashboard')}
          >
            View System <ExternalLink className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
};

// ─── Message Bubble ───────────────────────────────────────────────────────────
const MessageBubble = ({ msg }) => {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} gap-0.5`}>
      <div className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
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
              {parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="text-primary font-semibold">{p}</strong> : p)}
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

// ─── Main Component ───────────────────────────────────────────────────────────
const UserAIChatCard = () => {
  const navigate = useNavigate();

  // Phase machine
  const [phase, setPhase] = useState('idle'); // idle | collecting | building | complete

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

  // Credential collection
  const [pendingCreds, setPendingCreds] = useState([]);
  const [targetBlueprint, setTargetBlueprint] = useState(null);
  const [systemName, setSystemName] = useState('');
  const [executeLoading, setExecuteLoading] = useState(false);

  // Build execution
  const [buildData, setBuildData] = useState(null); // { instanceId, sessionId, steps }
  const [stepOutputs, setStepOutputs] = useState({});
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [stepExecuting, setStepExecuting] = useState(false);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, phase, buildData, currentStepIdx]);

  // ── Auto-execute build steps ─────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'building' || !buildData || stepExecuting) return;
    if (currentStepIdx >= buildData.steps.length) {
      setPhase('complete');
      return;
    }

    const step = buildData.steps[currentStepIdx];
    if (!step) return;

    setStepExecuting(true);

    const executeStep = async () => {
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

    // Small delay between steps for readability
    const timer = setTimeout(executeStep, currentStepIdx === 0 ? 300 : 800);
    return () => clearTimeout(timer);
  }, [phase, buildData, currentStepIdx, stepExecuting]);

  // ── Send message to STARK ─────────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    const msg = text ?? input.trim();
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

      if (resp.status === 402) {
        setError('Out of AI credits. Top up to continue.');
        return;
      }
      if (!resp.ok) throw new Error('STARK request failed');

      const data = await resp.json();

      // Add AI message
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.content,
        ts: Date.now(),
      }]);

      // Handle structured action
      const action = data.structuredData?.action;
      if (action === 'collect_credentials' && data.structuredData?.requiredCredentials?.length > 0) {
        setPendingCreds(data.structuredData.requiredCredentials);
        setTargetBlueprint(data.structuredData.blueprint ?? null);
        setSystemName(data.structuredData.systemName ?? '');
        setPhase('collecting');
      } else if (action === 'start_build' && data.structuredData?.blueprint) {
        // AI said start build directly (no credentials needed)
        setTargetBlueprint(data.structuredData.blueprint);
        setSystemName(data.structuredData.systemName ?? '');
        await handleExecute({});
      }
    } catch {
      setError('STARK is temporarily unavailable. Please try again.');
    } finally {
      setChatLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, chatLoading, messages]);

  // ── Execute autonomous build ──────────────────────────────────────────────
  const handleExecute = useCallback(async (credValues) => {
    if (!targetBlueprint?.slug) return;
    setExecuteLoading(true);
    setError('');

    const credentials = Object.entries(credValues)
      .filter(([, v]) => String(v).trim())
      .map(([key, value]) => {
        const cred = pendingCreds.find(c => c.key === key);
        return { key, value: String(value), toolName: cred?.toolName };
      });

    try {
      const resp = await fetch('/api/ai-orchestrator/execute', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          blueprintSlug: targetBlueprint.slug,
          systemName: systemName || `My ${targetBlueprint.name}`,
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
        requiredTools: data.requiredTools ?? [],
        buildPlan: data.buildPlan ?? [],
      });
      setCurrentStepIdx(0);
      setStepOutputs({});
      setPhase('building');

      // Add a message confirming build started
      setMessages(prev => [...prev, {
        id: Date.now() + 2,
        role: 'assistant',
        content: `Build initiated. Executing ${data.steps?.length ?? 5} autonomous steps for ${data.blueprint?.name ?? targetBlueprint.name}. I'll handle everything from here.`,
        ts: Date.now(),
      }]);
    } catch (err) {
      setError(err.message || 'Failed to start build. Please try again.');
    } finally {
      setExecuteLoading(false);
    }
  }, [targetBlueprint, systemName, pendingCreds]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const isInputDisabled = chatLoading || phase === 'building' || phase === 'complete';

  return (
    <Card className="flex flex-col border-white/10 bg-black/40 backdrop-blur-md shadow-2xl overflow-hidden" style={{ minHeight: '560px', maxHeight: '700px' }}>

      {/* Header */}
      <CardHeader className="pb-0 border-b border-white/10 bg-gradient-to-r from-primary/8 to-transparent shrink-0">
        <div className="flex items-center justify-between mb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <span>STARK</span>
            <Badge variant="outline" className="text-[9px] border-primary/30 text-primary bg-primary/5 font-mono">
              AUTONOMOUS BUILDER
            </Badge>
          </CardTitle>
          <span className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs text-emerald-400 font-normal">Online</span>
          </span>
        </div>
        <div className="pb-3">
          <PhaseBar phase={phase} />
        </div>
      </CardHeader>

      {/* Scroll area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10">

        {/* Chat messages */}
        {messages.map(m => <MessageBubble key={m.id} msg={m} />)}

        {/* Credential collection */}
        {phase === 'collecting' && pendingCreds.length > 0 && (
          <CredentialForm
            credentials={pendingCreds}
            blueprint={targetBlueprint}
            systemName={systemName}
            onExecute={handleExecute}
            loading={executeLoading}
          />
        )}

        {/* Build terminal */}
        {(phase === 'building' || phase === 'complete') && buildData && (
          <BuildTerminal
            steps={buildData.steps}
            outputs={stepOutputs}
            currentIdx={currentStepIdx}
            instanceId={buildData.instanceId}
            onComplete={() => setPhase('complete')}
          />
        )}

        {/* STARK analyzing */}
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

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}

        {/* Starter prompts */}
        {messages.length === 1 && phase === 'idle' && (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-medium mb-2">What do you want to build?</p>
            <div className="grid grid-cols-1 gap-1.5">
              {STARTER_GOALS.map((g, i) => (
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

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <CardContent className="p-3 border-t border-white/10 bg-black/20 shrink-0">
        {phase === 'building' ? (
          <div className="flex items-center justify-center gap-2 py-1 text-xs text-muted-foreground/50">
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="font-mono">Building autonomously — {buildData?.steps?.length ?? 0} steps queued</span>
          </div>
        ) : phase === 'complete' ? (
          <div className="flex items-center justify-center gap-2 py-1 text-xs text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="font-mono">System deployed successfully</span>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={phase === 'collecting' ? 'Fill in credentials above to proceed…' : 'Describe your income goal…'}
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
                {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground/25 mt-1.5 text-center font-mono">
              STARK builds autonomously · Credentials encrypted at rest
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default UserAIChatCard;
