import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, Send, ExternalLink, Loader2, Coins, AlertCircle, ChevronDown } from 'lucide-react';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const STARTER_PROMPTS = [
  "Which blueprint is best for making passive income?",
  "What tools do I need to run the AI Affiliate Blueprint?",
  "How do I start building my first automated system?",
  "What credentials do I need for Make (Integromat)?",
];

const ToolCard = ({ tool }) => (
  <div className="flex items-start gap-3 p-3 rounded-lg border border-white/10 bg-white/5 mt-2">
    <div className="w-8 h-8 rounded-md bg-primary/20 flex items-center justify-center shrink-0">
      <Bot className="w-4 h-4 text-primary" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-foreground">{tool.name}</p>
      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{tool.description}</p>
      {tool.requiredCredentials?.length > 0 && (
        <p className="text-xs text-amber-400 mt-1">
          📋 Needs: {tool.requiredCredentials.join(', ')}
        </p>
      )}
    </div>
    {tool.affiliateLink && (
      <a
        href={tool.affiliateLink}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0"
      >
        <Button size="sm" variant="outline" className="h-7 text-xs border-primary/40 text-primary hover:bg-primary/10 gap-1">
          Get Access <ExternalLink className="w-3 h-3" />
        </Button>
      </a>
    )}
  </div>
);

const MessageBubble = ({ msg }) => {
  const isUser = msg.role === 'user';
  const lines = msg.content.split('\n');

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} gap-1`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
        isUser
          ? 'bg-primary text-primary-foreground rounded-tr-sm'
          : 'bg-white/8 border border-white/10 text-foreground rounded-tl-sm backdrop-blur-sm'
      }`}>
        {lines.map((line, i) => {
          const isBold = /\*\*(.+?)\*\*/;
          if (isBold.test(line)) {
            const parts = line.split(/\*\*(.+?)\*\*/);
            return (
              <p key={i} className={i > 0 ? 'mt-1' : ''}>
                {parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="font-semibold text-primary">{p}</strong> : p)}
              </p>
            );
          }
          return line ? <p key={i} className={i > 0 ? 'mt-1' : ''}>{line}</p> : <br key={i} />;
        })}
      </div>
      {msg.recommendedTools?.length > 0 && (
        <div className="w-full max-w-[90%] space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-1">Recommended tools from marketplace:</p>
          {msg.recommendedTools.map(t => <ToolCard key={t.id} tool={t} />)}
        </div>
      )}
      <span className="text-[10px] text-muted-foreground/50 px-1">
        {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
};

const UserAIChatCard = () => {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hey, I'm your SBEP AI Build Agent. I know every blueprint and marketplace tool on the platform.\n\nTell me your income goal and I'll match you to the right blueprint, list every tool you need with signup links, and guide you through the build. What do you want to build?",
      recommendedTools: [],
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

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    setError('');

    const userMsg = { id: Date.now(), role: 'user', content: msg, ts: Date.now() };
    const history = messages
      .filter(m => m.id !== 'welcome')
      .map(m => ({ role: m.role, content: m.content }));

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const resp = await fetch('/api/dashboard/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ message: msg, history }),
      });

      if (resp.status === 402) {
        setError('Out of AI credits. Top up to continue chatting.');
        setLoading(false);
        return;
      }
      if (!resp.ok) throw new Error('Chat request failed');

      const data = await resp.json();
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: data.content,
          recommendedTools: data.recommendedTools ?? [],
          ts: Date.now(),
        }
      ]);
    } catch {
      setError('Failed to reach AI agent. Please try again.');
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
    <Card className="flex flex-col border-white/10 bg-black/40 backdrop-blur-md shadow-2xl overflow-hidden" style={{ minHeight: '480px', maxHeight: '580px' }}>
      <CardHeader className="pb-3 border-b border-white/10 bg-gradient-to-r from-primary/10 to-transparent shrink-0">
        <CardTitle className="text-base font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            AI Build Agent
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
        {messages.map(m => <MessageBubble key={m.id} msg={m} />)}
        {loading && (
          <div className="flex items-start gap-2">
            <div className="bg-white/8 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-2.5">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                Agent thinking…
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
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about blueprints, tools, integration requirements…"
            className="flex-1 resize-none text-sm bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-0 transition-colors"
            rows={1}
            style={{ minHeight: '38px', maxHeight: '96px' }}
            onInput={e => {
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
        <p className="text-[10px] text-muted-foreground/40 mt-1.5 text-center">1 credit per message · Tools shown use affiliate links</p>
      </CardContent>
    </Card>
  );
};

export default UserAIChatCard;
