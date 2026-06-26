import React, { useState, useEffect, useRef, useCallback } from 'react';
import PageMeta from '@/components/PageMeta.jsx';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, Eye, Search, CheckCircle, TrendingUp, Zap,
  Play, Download, Clock, Loader2, ChevronRight, FlaskConical,
  Sparkles, X, AlertCircle, History, RotateCcw,
} from 'lucide-react';
import VideoBackground from '@/components/VideoBackground.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { toast } from 'sonner';

// ─── Tool configuration ───────────────────────────────────────────────────────

const TOOLS = [
  {
    id: 'niche_finder',
    label: 'Niche Finder',
    icon: Target,
    color: 'violet',
    description: 'Find the top 10 profitable sub-niches ranked by competition, revenue potential, and affiliate opportunities.',
    fields: [
      { key: 'topic', label: 'Broad Topic', placeholder: 'e.g. fitness, personal finance, pet care, photography' },
    ],
  },
  {
    id: 'competitor_spy',
    label: 'Competitor Spy',
    icon: Eye,
    color: 'rose',
    description: 'Deep-dive any competitor\'s funnel, pricing, traffic sources, and content strategy.',
    fields: [
      { key: 'target', label: 'URL or Brand Name', placeholder: 'e.g. clickfunnels.com or Pat Flynn' },
    ],
  },
  {
    id: 'keyword_goldmine',
    label: 'Keyword Goldmine',
    icon: Search,
    color: 'amber',
    description: 'Get 50+ long-tail keywords with difficulty scores, search volumes, and affiliate content angles.',
    fields: [
      { key: 'niche', label: 'Niche', placeholder: 'e.g. keto diet, remote work, home automation' },
    ],
  },
  {
    id: 'idea_validator',
    label: 'Idea Validator',
    icon: CheckCircle,
    color: 'emerald',
    description: 'Run a 5-point validation (demand, competition, monetization, audience, effort) and get a viability score.',
    fields: [
      { key: 'idea', label: 'Business Idea', placeholder: 'e.g. An affiliate blog about sustainable living products targeting eco-conscious millennials' },
    ],
  },
  {
    id: 'trend_radar',
    label: 'Trend Radar',
    icon: TrendingUp,
    color: 'sky',
    description: 'Discover trending niches, viral content formats, and rising opportunities — pulled from live web data.',
    fields: [
      { key: 'category', label: 'Category (optional)', placeholder: 'e.g. AI tools, fitness, make money online (leave blank for all)' },
    ],
  },
  {
    id: 'blueprint_matcher',
    label: 'Blueprint Matcher',
    icon: Zap,
    color: 'indigo',
    description: 'Describe your goal and get the top 3 SBEP blueprints with expected earnings and a custom action plan.',
    fields: [
      { key: 'goal', label: 'Income Goal', placeholder: 'e.g. $5,000/month with affiliate marketing in 6 months' },
      { key: 'budget', label: 'Monthly Budget (optional)', placeholder: 'e.g. $100–$500/month' },
      { key: 'timeframe', label: 'Time Available (optional)', placeholder: 'e.g. 2 hours/day for 3 months' },
    ],
  },
];

const COLOR_MAP = {
  violet: {
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    text: 'text-violet-400',
    glow: 'shadow-violet-500/20',
    btn: 'bg-violet-600 hover:bg-violet-500',
    tab: 'bg-violet-500/15 border-violet-500/40 text-violet-300',
    tabActive: 'bg-violet-500/25 border-violet-400/60 text-violet-200',
  },
  rose: {
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    text: 'text-rose-400',
    glow: 'shadow-rose-500/20',
    btn: 'bg-rose-600 hover:bg-rose-500',
    tab: 'bg-rose-500/15 border-rose-500/40 text-rose-300',
    tabActive: 'bg-rose-500/25 border-rose-400/60 text-rose-200',
  },
  amber: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    glow: 'shadow-amber-500/20',
    btn: 'bg-amber-600 hover:bg-amber-500',
    tab: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
    tabActive: 'bg-amber-500/25 border-amber-400/60 text-amber-200',
  },
  emerald: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    glow: 'shadow-emerald-500/20',
    btn: 'bg-emerald-600 hover:bg-emerald-500',
    tab: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
    tabActive: 'bg-emerald-500/25 border-emerald-400/60 text-emerald-200',
  },
  sky: {
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
    text: 'text-sky-400',
    glow: 'shadow-sky-500/20',
    btn: 'bg-sky-600 hover:bg-sky-500',
    tab: 'bg-sky-500/15 border-sky-500/40 text-sky-300',
    tabActive: 'bg-sky-500/25 border-sky-400/60 text-sky-200',
  },
  indigo: {
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/30',
    text: 'text-indigo-400',
    glow: 'shadow-indigo-500/20',
    btn: 'bg-indigo-600 hover:bg-indigo-500',
    tab: 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300',
    tabActive: 'bg-indigo-500/25 border-indigo-400/60 text-indigo-200',
  },
};

// ─── Simple Markdown renderer ─────────────────────────────────────────────────

function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="bg-white/10 px-1 rounded text-violet-300 font-mono text-[11px]">{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={i} className="text-white/70 italic">{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

function MarkdownDisplay({ content }) {
  if (!content) return null;
  const lines = content.split('\n');
  const output = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // H1
    if (/^# (?!#)/.test(line)) {
      output.push(
        <h1 key={i} className="text-xl font-bold text-white mt-6 mb-2 font-['Space_Mono'] leading-snug">
          {renderInline(line.slice(2))}
        </h1>
      );
      i++; continue;
    }
    // H2
    if (/^## (?!#)/.test(line)) {
      output.push(
        <h2 key={i} className="text-base font-bold text-violet-300 mt-5 mb-2 pb-1 border-b border-white/10">
          {renderInline(line.slice(3))}
        </h2>
      );
      i++; continue;
    }
    // H3
    if (/^### (?!#)/.test(line)) {
      output.push(
        <h3 key={i} className="text-sm font-bold text-white/85 mt-4 mb-1.5">
          {renderInline(line.slice(4))}
        </h3>
      );
      i++; continue;
    }
    // HR
    if (line.trim() === '---') {
      output.push(<hr key={i} className="border-white/10 my-4" />);
      i++; continue;
    }

    // Table: collect consecutive | lines
    if (line.startsWith('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        const isSeparator = /^\|[-:| ]+\|$/.test(lines[i].trim());
        if (!isSeparator) tableLines.push(lines[i]);
        i++;
      }
      if (tableLines.length > 0) {
        const rows = tableLines.map(r =>
          r.split('|').filter((_, ci) => ci > 0 && ci < r.split('|').length - 1).map(c => c.trim())
        );
        const header = rows[0];
        const body = rows.slice(1);
        output.push(
          <div key={`table-${i}`} className="overflow-x-auto my-3">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  {header.map((cell, ci) => (
                    <th key={ci} className="text-left px-3 py-2 bg-white/5 border border-white/10 text-white/70 font-mono font-semibold text-[10px] uppercase tracking-wider">
                      {renderInline(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, ri) => (
                  <tr key={ri} className="border-b border-white/5 hover:bg-white/[0.02]">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 py-2 text-white/65 border border-white/[0.06]">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // Bullet list: collect consecutive items
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const items = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push(lines[i].slice(2));
        i++;
      }
      output.push(
        <ul key={`ul-${i}`} className="space-y-1 my-2 ml-1">
          {items.map((item, ii) => (
            <li key={ii} className="flex gap-2 text-sm text-white/70 leading-relaxed">
              <span className="text-violet-400 mt-0.5 shrink-0">▸</span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (/^\d+\. /.test(line)) {
      const items = [];
      const startNum = parseInt(line, 10);
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ''));
        i++;
      }
      output.push(
        <ol key={`ol-${i}`} className="space-y-1.5 my-2 ml-1">
          {items.map((item, ii) => (
            <li key={ii} className="flex gap-2.5 text-sm text-white/70 leading-relaxed">
              <span className="text-violet-400 font-mono text-xs mt-0.5 shrink-0 w-4">{startNum + ii}.</span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Empty line → spacer
    if (line.trim() === '') {
      if (output.length > 0) {
        output.push(<div key={`sp-${i}`} className="h-1" />);
      }
      i++; continue;
    }

    // Paragraph
    output.push(
      <p key={i} className="text-sm text-white/65 leading-relaxed my-1">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <div className="research-md">{output}</div>;
}

// ─── Main page ────────────────────────────────────────────────────────────────

const INITIAL_TOOL_STATE = () =>
  Object.fromEntries(
    TOOLS.map(t => [t.id, {
      inputs: Object.fromEntries(t.fields.map(f => [f.key, ''])),
      result: '',
      status: 'idle', // idle | loading | done | error
      steps: [],
      errorMsg: '',
    }])
  );

const ResearchLabPage = () => {
  const { currentUser } = useAuth();
  const [activeTool, setActiveTool] = useState('niche_finder');
  const [toolState, setToolState] = useState(INITIAL_TOOL_STATE);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const readerRef = useRef(null);

  const authHeader = useCallback(() => {
    const token = localStorage.getItem('sbep_auth_token') ?? '';
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  }, []);

  // Load research history
  const loadHistory = useCallback(async () => {
    if (!currentUser) return;
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/research/history', { headers: authHeader() });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch {
      // non-critical
    } finally {
      setHistoryLoading(false);
    }
  }, [currentUser, authHeader]);

  useEffect(() => {
    if (currentUser) loadHistory();
  }, [currentUser, loadHistory]);

  const updateTool = (toolId, patch) => {
    setToolState(prev => ({
      ...prev,
      [toolId]: { ...prev[toolId], ...patch },
    }));
  };

  const updateInput = (toolId, key, value) => {
    setToolState(prev => ({
      ...prev,
      [toolId]: {
        ...prev[toolId],
        inputs: { ...prev[toolId].inputs, [key]: value },
      },
    }));
  };

  const runResearch = useCallback(async (toolId) => {
    if (!currentUser) {
      toast.error('Please log in to run research');
      return;
    }

    const state = toolState[toolId];
    if (state.status === 'loading') return;

    updateTool(toolId, { status: 'loading', result: '', steps: [], errorMsg: '' });

    try {
      const res = await fetch(`/api/research/${toolId}`, {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify(state.inputs),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error ?? 'Request failed');
      }

      const reader = res.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = '';
      let fullResult = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === 'step') {
              updateTool(toolId, prev => ({
                steps: [...(prev?.steps ?? []), { label: event.label, step: event.step }],
              }));
              setToolState(prev => ({
                ...prev,
                [toolId]: {
                  ...prev[toolId],
                  steps: [...(prev[toolId].steps ?? []), { label: event.label, step: event.step }],
                },
              }));
            } else if (event.type === 'chunk') {
              fullResult += event.text;
              setToolState(prev => ({
                ...prev,
                [toolId]: { ...prev[toolId], result: fullResult },
              }));
            } else if (event.type === 'done') {
              setToolState(prev => ({
                ...prev,
                [toolId]: { ...prev[toolId], status: 'done', result: fullResult },
              }));
              loadHistory();
            } else if (event.type === 'error') {
              throw new Error(event.message ?? 'Research failed');
            }
          } catch (parseErr) {
            if (parseErr instanceof SyntaxError) continue;
            throw parseErr;
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Research failed';
      setToolState(prev => ({
        ...prev,
        [toolId]: { ...prev[toolId], status: 'error', errorMsg: msg },
      }));
      toast.error(msg.slice(0, 100));
    }
  }, [currentUser, toolState, authHeader, loadHistory]);

  const cancelResearch = useCallback(() => {
    try { readerRef.current?.cancel(); } catch {}
    readerRef.current = null;
    setToolState(prev => ({
      ...prev,
      [activeTool]: { ...prev[activeTool], status: 'idle' },
    }));
  }, [activeTool]);

  const resetTool = useCallback((toolId) => {
    setToolState(prev => ({
      ...prev,
      [toolId]: {
        ...prev[toolId],
        result: '',
        status: 'idle',
        steps: [],
        errorMsg: '',
      },
    }));
  }, []);

  const downloadReport = useCallback((toolId) => {
    const state = toolState[toolId];
    if (!state.result) return;
    const tool = TOOLS.find(t => t.id === toolId);
    const blob = new Blob([state.result], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tool?.label ?? toolId}-report-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report downloaded');
  }, [toolState]);

  const activeTool_ = TOOLS.find(t => t.id === activeTool);
  const activeState = toolState[activeTool];
  const colors = COLOR_MAP[activeTool_?.color ?? 'violet'];

  return (
    <VideoBackground>
      <PageMeta
        title="Research Lab | Starks Global Group"
        description="AI-powered research tools — find niches, spy on competitors, discover keywords, validate ideas, and match blueprints."
      />
      <Header />
      <main className="flex-grow pt-28 pb-24 bg-background/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">

          {/* Page header */}
          <section className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-500/20 backdrop-blur-md text-violet-400 mb-5 shadow-lg border border-violet-500/30">
              <FlaskConical className="w-7 h-7" />
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-3 tracking-tight font-['Space_Mono']">
              AI Research Lab
            </h1>
            <p className="text-lg text-zinc-300 max-w-2xl mx-auto mb-2 font-medium">
              6 AI-powered tools — real-time web research processed by ASH.
            </p>
            <p className="text-sm text-violet-400 font-mono">
              Powered by Perplexity + GPT-4o-mini · Results stream in real-time
            </p>
          </section>

          <div className="flex gap-6 items-start">
            {/* Main content */}
            <div className="flex-1 min-w-0">
              {/* Tool tabs */}
              <div className="flex flex-wrap gap-2 mb-6">
                {TOOLS.map(tool => {
                  const isActive = activeTool === tool.id;
                  const c = COLOR_MAP[tool.color];
                  const Icon = tool.icon;
                  const st = toolState[tool.id];
                  return (
                    <button
                      key={tool.id}
                      onClick={() => setActiveTool(tool.id)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-mono font-semibold transition-all ${
                        isActive
                          ? `${c.tabActive} shadow-lg`
                          : `${c.tab} hover:border-opacity-60 opacity-70 hover:opacity-100`
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {tool.label}
                      {st.status === 'loading' && (
                        <Loader2 className="w-3 h-3 animate-spin ml-0.5" />
                      )}
                      {st.status === 'done' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5" />
                      )}
                    </button>
                  );
                })}
                <button
                  onClick={() => { setShowHistory(h => !h); if (currentUser) loadHistory(); }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-mono font-semibold transition-all ml-auto ${
                    showHistory
                      ? 'bg-white/10 border-white/30 text-white'
                      : 'bg-white/4 border-white/15 text-white/50 hover:text-white/80'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  History
                </button>
              </div>

              {/* Active tool panel */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTool}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className={`rounded-2xl border ${colors.border} ${colors.bg} backdrop-blur-xl shadow-xl ${colors.glow} shadow-xl`}
                >
                  {/* Tool header */}
                  <div className={`px-6 py-4 border-b ${colors.border} flex items-start gap-3`}>
                    <div className={`w-9 h-9 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center shrink-0 mt-0.5`}>
                      {React.createElement(activeTool_.icon, { className: `w-4.5 h-4.5 ${colors.text}` })}
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-white font-['Space_Mono']">{activeTool_.label}</h2>
                      <p className="text-xs text-white/55 mt-0.5 leading-relaxed">{activeTool_.description}</p>
                    </div>
                  </div>

                  {/* Input form */}
                  {activeState.status !== 'done' && (
                    <div className="px-6 py-5 space-y-4 border-b border-white/8">
                      {activeTool_.fields.map(field => (
                        <div key={field.key}>
                          <label className="block text-xs font-mono font-semibold text-white/60 uppercase tracking-wider mb-1.5">
                            {field.label}
                          </label>
                          <input
                            type="text"
                            value={activeState.inputs[field.key] ?? ''}
                            onChange={e => updateInput(activeTool, field.key, e.target.value)}
                            placeholder={field.placeholder}
                            disabled={activeState.status === 'loading'}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && activeState.status !== 'loading') {
                                runResearch(activeTool);
                              }
                            }}
                            className="w-full bg-black/30 border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/22 focus:outline-none focus:border-white/35 transition-colors disabled:opacity-50 font-['Outfit']"
                          />
                        </div>
                      ))}
                      <div className="flex items-center gap-3 pt-1">
                        {activeState.status === 'loading' ? (
                          <button
                            onClick={cancelResearch}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/8 border border-white/15 text-white/60 hover:text-white text-sm font-semibold transition-all"
                          >
                            <X className="w-4 h-4" />
                            Cancel
                          </button>
                        ) : (
                          <button
                            onClick={() => runResearch(activeTool)}
                            disabled={!currentUser || activeTool_.fields.every(f => !(activeState.inputs[f.key]?.trim()))}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed ${colors.btn}`}
                          >
                            <Sparkles className="w-4 h-4" />
                            Run Analysis
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {!currentUser && (
                          <p className="text-xs text-white/40 font-mono">
                            <a href="/login" className="text-violet-400 hover:underline">Log in</a> to run research
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Loading steps */}
                  {activeState.status === 'loading' && activeState.steps.length > 0 && (
                    <div className="px-6 py-3 border-b border-white/8 space-y-1.5">
                      {activeState.steps.map((step, i) => (
                        <div key={i} className="flex items-center gap-2.5 text-xs font-mono text-white/50">
                          {i === activeState.steps.length - 1 ? (
                            <Loader2 className={`w-3 h-3 animate-spin ${colors.text}`} />
                          ) : (
                            <CheckCircle className="w-3 h-3 text-emerald-400" />
                          )}
                          <span className={i === activeState.steps.length - 1 ? 'text-white/80' : 'text-white/35 line-through'}>
                            {step.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Error state */}
                  {activeState.status === 'error' && (
                    <div className="px-6 py-5 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-rose-300">Research failed</p>
                        <p className="text-xs text-white/45 mt-0.5">{activeState.errorMsg}</p>
                        <button
                          onClick={() => resetTool(activeTool)}
                          className="mt-2 text-xs text-white/50 hover:text-white flex items-center gap-1.5 transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" /> Try again
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Streaming + done results */}
                  {(activeState.status === 'loading' || activeState.status === 'done') && activeState.result && (
                    <div className="px-6 py-5">
                      {/* Results header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-mono font-semibold ${colors.text} uppercase tracking-wider`}>
                            {activeState.status === 'loading' ? 'Streaming results…' : 'Research Complete'}
                          </span>
                          {activeState.status === 'loading' && (
                            <span className={`w-1.5 h-1.5 rounded-full ${colors.text.replace('text-', 'bg-')} animate-pulse`} />
                          )}
                        </div>
                        {activeState.status === 'done' && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => resetTool(activeTool)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/6 border border-white/12 text-white/50 hover:text-white text-xs font-semibold transition-all"
                            >
                              <RotateCcw className="w-3 h-3" />
                              New
                            </button>
                            <button
                              onClick={() => downloadReport(activeTool)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/6 border border-white/12 text-white/50 hover:text-white text-xs font-semibold transition-all"
                            >
                              <Download className="w-3 h-3" />
                              Download
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Markdown content */}
                      <div className="bg-black/20 rounded-xl border border-white/8 px-5 py-4 max-h-[62vh] overflow-y-auto">
                        <MarkdownDisplay content={activeState.result} />
                        {activeState.status === 'loading' && (
                          <span className={`inline-block w-2 h-4 ${colors.text.replace('text-', 'bg-')} ml-0.5 animate-pulse rounded-sm`} />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Idle empty state */}
                  {activeState.status === 'idle' && !activeState.result && currentUser && (
                    <div className="px-6 py-8 text-center">
                      <div className={`w-12 h-12 rounded-2xl ${colors.bg} border ${colors.border} flex items-center justify-center mx-auto mb-3`}>
                        {React.createElement(activeTool_.icon, { className: `w-5 h-5 ${colors.text}` })}
                      </div>
                      <p className="text-sm font-mono text-white/40">
                        Fill in the field above and click <span className="text-white/60">Run Analysis</span>
                      </p>
                      <p className="text-xs text-white/25 mt-1">Results stream in real-time via ASH + Perplexity</p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* History sidebar */}
            <AnimatePresence>
              {showHistory && (
                <motion.div
                  initial={{ opacity: 0, x: 20, width: 0 }}
                  animate={{ opacity: 1, x: 0, width: 280 }}
                  exit={{ opacity: 0, x: 20, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="shrink-0 overflow-hidden"
                >
                  <div className="w-[280px] bg-card/80 backdrop-blur-xl border border-white/12 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <History className="w-3.5 h-3.5 text-white/50" />
                        <span className="text-xs font-mono font-semibold text-white/60 uppercase tracking-wider">Recent Research</span>
                      </div>
                      <button onClick={() => setShowHistory(false)} className="text-white/30 hover:text-white/60 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="p-3 space-y-2 max-h-[65vh] overflow-y-auto">
                      {historyLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-4 h-4 animate-spin text-white/30" />
                        </div>
                      ) : !currentUser ? (
                        <p className="text-xs text-white/30 text-center py-8 font-mono">Log in to see history</p>
                      ) : history.length === 0 ? (
                        <p className="text-xs text-white/30 text-center py-8 font-mono">No research runs yet</p>
                      ) : (
                        history.map((item, i) => {
                          const tool = TOOLS.find(t => t.id === item.tool);
                          const c = COLOR_MAP[tool?.color ?? 'violet'];
                          return (
                            <button
                              key={`${item.id}-${i}`}
                              onClick={() => {
                                setActiveTool(item.tool ?? 'niche_finder');
                                setShowHistory(false);
                              }}
                              className="w-full text-left rounded-xl border border-white/8 bg-white/3 hover:bg-white/6 hover:border-white/15 p-3 transition-all"
                            >
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md ${c.bg} ${c.text} border ${c.border}`}>
                                  {item.toolLabel ?? item.tool}
                                </span>
                              </div>
                              <p className="text-xs text-white/60 leading-relaxed line-clamp-2">{item.input}</p>
                              <div className="flex items-center gap-1 mt-2 text-[10px] text-white/30 font-mono">
                                <Clock className="w-2.5 h-2.5" />
                                {item.completedAt
                                  ? new Date(item.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                  : 'Recent'}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Tool grid overview (when logged out) */}
          {!currentUser && (
            <div className="mt-12">
              <p className="text-center text-sm font-mono text-white/40 mb-6 uppercase tracking-wider">Available Research Tools</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {TOOLS.map(tool => {
                  const c = COLOR_MAP[tool.color];
                  const Icon = tool.icon;
                  return (
                    <motion.div
                      key={tool.id}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      className={`rounded-2xl border ${c.border} ${c.bg} p-5 backdrop-blur-xl`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-8 h-8 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center`}>
                          <Icon className={`w-4 h-4 ${c.text}`} />
                        </div>
                        <h3 className="text-sm font-bold text-white font-['Space_Mono']">{tool.label}</h3>
                      </div>
                      <p className="text-xs text-white/55 leading-relaxed">{tool.description}</p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </VideoBackground>
  );
};

export default ResearchLabPage;
