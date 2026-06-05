import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, Send, ExternalLink, Loader2, AlertCircle, Zap, Wrench, ChevronRight, Star, Clock, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : { 'Content-Type': 'application/json' };
};

const STARTER_PROMPTS = [
  "I want to make passive income with affiliate marketing",
  "Help me build an email automation system",
  "What's the best blueprint for a beginner?",
  "I want to generate leads automatically for my agency",
];

// ─── Structured Recommendation Card ────────────────────────────────────────
const RecommendationCard = ({ data, onBuild }) => {
  if (!data?.recommendation) return null;
  const { recommendation, requiredTools = [], nextSteps = [], cta } = data;

  return (
    <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-primary/20 bg-primary/10">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-primary font-mono uppercase tracking-wider">Blueprint Match</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span className="text-xs font-bold text-amber-400">{recommendation.matchScore}% match</span>
        </div>
      </div>

      {/* Blueprint info */}
      <div className="px-4 py-3 border-b border-white/10">
        <h4 className="font-semibold text-foreground text-sm">{recommendation.blueprintName}</h4>
        <p className="text-xs text-muted-foreground mt-1">{recommendation.reasoning}</p>
        <div className="flex items-center gap-4 mt-2">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <DollarSign className="w-3 h-3" />{recommendation.estimatedCost}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />{recommendation.estimatedTime}
          </span>
        </div>
      </div>

      {/* Required tools */}
      {requiredTools.length > 0 && (
        <div className="px-4 py-3 border-b border-white/10">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-2">Required Tool Stack</p>
          <div className="space-y-1.5">
            {requiredTools.slice(0, 4).map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <Wrench className="w-3 h-3 text-primary/60 shrink-0" />
                <span className="font-medium text-foreground">{t.name}</span>
                <span className="text-muted-foreground">—</span>
                <span className="text-muted-foreground truncate">{t.purpose}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next steps */}
      {nextSteps.length > 0 && (
        <div className="px-4 py-3 border-b border-white/10">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-2">Build Plan</p>
          <div className="space-y-1">
            {nextSteps.slice(0, 3).map((step, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="shrink-0 w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[9px] font-bold mt-px">{i + 1}</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      {cta && (
        <div className="px-4 py-3">
          <Button
            size="sm"
            className="w-full h-9 text-xs font-semibold gap-1.5"
            onClick={() => onBuild(cta.blueprintSlug)}
          >
            <Zap className="w-3.5 h-3.5" />
            {cta.label}
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
};

// ─── Message Bubble ─────────────────────────────────────────────────────────
const MessageBubble = ({ msg, onBuild }) => {
  const isUser = msg.role === 'user';

  const renderContent = (text) => {
    return text.split('\n').map((line, i) => {
      const boldRegex = /\*\*(.+?)\*\*/g;
      if (boldRegex.test(line)) {
        const parts = line.split(/\*\*(.+?)\*\*/);
        return (
          <p key={i} className={i > 0 ? 'mt-1' : ''}>
            {parts.map((p, j) =>
              j % 2 === 1 ? <strong key={j} className="font-semibold text-primary">{p}</strong> : p
            )}
          </p>
        );
      }
      return line ? <p key={i} className={i > 0 ? 'mt-1' : ''}>{line}</p> : <br key={i} />;
    });
  };

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} gap-1`}>
      <div className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
        isUser
          ? 'bg-primary text-primary-foreground rounded-tr-sm'
          : 'bg-white/8 border border-white/10 text-foreground rounded-tl-sm backdrop-blur-sm'
      }`}>
        {renderContent(msg.content)}
      </div>
      {!isUser && msg.structuredData && (
        <div className="w-full max-w-[90%]">
          <RecommendationCard data={msg.structuredData} onBuild={onBuild} />
        </div>
      )}
      <span className="text-[10px] text-muted-foreground/40 px-1">
        {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────
const UserAIChatCard = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: "I'm STARK — the SBEP AI Orchestrator.\n\nI know every blueprint and tool on the platform. Tell me your income goal and I'll match you to the right blueprint, build your tool stack, and guide you through setup step by step.\n\nWhat do you want to build?",
      structuredData: null,
      ts: Date.now(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleBuild = async (slug) => {
    // Create a system instance for the given blueprint slug, then navigate to build
    try {
      const bpResp = await fetch(`/api/blueprints?slug=${slug}`, { headers: authHeaders() });
      if (!bpResp.ok) throw new Error('Blueprint not found');
      const bpData = await bpResp.json();
      const blueprint = Array.isArray(bpData) ? bpData[0] : bpData?.items?.[0];
      if (!blueprint) throw new Error('Blueprint not found');

      const user = JSON.parse(localStorage.getItem('sbep_auth_user') || '{}');
      const instResp = await fetch('/api/system-instances', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ blueprintId: blueprint.id, name: blueprint.name, userId: user.id }),
      });
      if (!instResp.ok) throw new Error('Failed to create system');
      const inst = await instResp.json();
      navigate(`/build/${inst.id}`);
    } catch {
      navigate(`/blueprints/${slug}`);
    }
  };

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    setError('');

    const history = messages
      .filter((m) => m.id !== 'welcome')
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, { id: Date.now(), role: 'user', content: msg, structuredData: null, ts: Date.now() }]);
    setLoading(true);

    try {
      const resp = await fetch('/api/ai-orchestrator/chat', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ message: msg, history }),
      });

      if (resp.status === 402) {
        setError('Out of AI credits. Top up to continue.');
        setLoading(false);
        return;
      }
      if (!resp.ok) throw new Error('Orchestrator request failed');

      const data = await resp.json();
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: data.content,
          structuredData: data.structuredData ?? null,
          ts: Date.now(),
        }
      ]);
    } catch {
      setError('Failed to reach STARK. Please try again.');
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Card className="flex flex-col border-white/10 bg-black/40 backdrop-blur-md shadow-2xl overflow-hidden" style={{ minHeight: '500px', maxHeight: '620px' }}>
      <CardHeader className="pb-3 border-b border-white/10 bg-gradient-to-r from-primary/10 to-transparent shrink-0">
        <CardTitle className="text-base font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <span>STARK Orchestrator</span>
            <Badge variant="outline" className="text-[9px] border-primary/30 text-primary bg-primary/5 font-mono">AI BRAIN</Badge>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs text-emerald-400 font-normal">Online</span>
          </span>
        </CardTitle>
      </CardHeader>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
        {messages.map((m) => (
          <MessageBubble key={m.id} msg={m} onBuild={handleBuild} />
        ))}
        {loading && (
          <div className="flex items-start gap-2">
            <div className="bg-white/8 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-2.5">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                <span>STARK is analyzing your goal…</span>
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
        <div ref={bottomRef} />
      </div>

      {messages.length === 1 && (
        <div className="px-4 pb-2 shrink-0">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium mb-2">Suggested goals</p>
          <div className="grid grid-cols-2 gap-2">
            {STARTER_PROMPTS.map((p, i) => (
              <button
                key={i}
                onClick={() => sendMessage(p)}
                className="text-left text-xs px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      <CardContent className="p-3 border-t border-white/10 bg-black/20 shrink-0">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Describe your income goal or ask about blueprints…"
            className="flex-1 resize-none text-sm bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
            rows={1}
            style={{ minHeight: '38px', maxHeight: '96px' }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px';
            }}
            disabled={loading}
          />
          <Button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            size="icon"
            className="h-[38px] w-[38px] shrink-0 rounded-xl"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground/30 mt-1.5 text-center">
          1 credit per message · STARK has full platform knowledge
        </p>
      </CardContent>
    </Card>
  );
};

export default UserAIChatCard;
