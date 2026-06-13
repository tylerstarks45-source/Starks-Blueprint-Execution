import React, { useEffect, useRef, useState } from 'react';
import { Globe, ArrowLeft, ArrowRight, RefreshCw, X, CheckCircle, AlertCircle, Loader2, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

export default function BrowserView({ task, startUrl, authToken, onResult, onClose }) {
  const [events, setEvents] = useState([]);
  const [currentUrl, setCurrentUrl] = useState(startUrl || '');
  const [currentTitle, setCurrentTitle] = useState('');
  const [status, setStatus] = useState('loading'); // loading | browsing | done | error
  const [result, setResult] = useState('');
  const [showIframe, setShowIframe] = useState(true);
  const [logCollapsed, setLogCollapsed] = useState(false);
  const logRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!task || !startUrl || !authToken) return;

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    async function stream() {
      try {
        const resp = await fetch('/api/browser-agent/run', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({ task, startUrl }),
          signal: ctrl.signal,
        });

        if (!resp.ok) {
          setStatus('error');
          setEvents(prev => [...prev, { type: 'error', message: `Server error ${resp.status}` }]);
          return;
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

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
              if (event.type === 'end') {
                setStatus(prev => prev === 'error' ? 'error' : 'done');
                break;
              }
              handleEvent(event);
            } catch { /* skip parse errors */ }
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setStatus('error');
          setEvents(prev => [...prev, { type: 'error', message: err.message }]);
        }
      }
    }

    stream();

    return () => { ctrl.abort(); };
  }, [task, startUrl, authToken]);

  function handleEvent(event) {
    setEvents(prev => {
      const next = [...prev, event];
      return next.slice(-50);
    });

    if (event.type === 'navigate') {
      setCurrentUrl(event.url || '');
      setCurrentTitle(event.title || event.url || '');
      setStatus('browsing');
    }
    if (event.type === 'done') {
      setStatus('done');
      setResult(event.result || '');
      if (onResult) onResult(event.result || '');
    }
    if (event.type === 'error') {
      setStatus('error');
    }
  }

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [events]);

  function handleClose() {
    abortRef.current?.abort();
    if (onClose) onClose();
  }

  const statusIcon = {
    loading: <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />,
    browsing: <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" />,
    done: <CheckCircle className="w-3.5 h-3.5 text-green-400" />,
    error: <AlertCircle className="w-3.5 h-3.5 text-red-400" />,
  }[status];

  const statusText = {
    loading: 'Connecting…',
    browsing: 'Browsing…',
    done: 'Done',
    error: 'Error',
  }[status];

  const faviconUrl = currentUrl
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(new URL(currentUrl).hostname)}&sz=16`
    : null;

  return (
    <div className="rounded-xl border border-white/10 bg-[#0d0d14] overflow-hidden w-full font-mono">
      {/* Browser chrome header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#111118] border-b border-white/8">
        <div className="flex gap-1.5 shrink-0">
          <button onClick={handleClose} className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
        </div>

        <div className="flex-1 flex items-center gap-2 bg-[#0a0a10] border border-white/8 rounded-md px-2.5 py-1 min-w-0">
          {faviconUrl && (
            <img src={faviconUrl} alt="" className="w-3.5 h-3.5 shrink-0 rounded-sm" onError={e => e.target.style.display='none'} />
          )}
          {!faviconUrl && <Globe className="w-3 h-3 text-white/30 shrink-0" />}
          <span className="text-[11px] text-white/50 truncate">{currentUrl || startUrl}</span>
          {(status === 'browsing' || status === 'loading') && (
            <RefreshCw className="w-3 h-3 text-white/30 animate-spin shrink-0 ml-auto" />
          )}
          {status === 'done' && (
            <a href={currentUrl} target="_blank" rel="noopener noreferrer" className="ml-auto shrink-0">
              <ExternalLink className="w-3 h-3 text-white/30 hover:text-white/60 transition-colors" />
            </a>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {statusIcon}
          <span className="text-[10px] text-white/40 font-mono">{statusText}</span>
        </div>
      </div>

      {/* Main area: iframe + log */}
      <div className="flex flex-col gap-0">
        {/* Iframe view */}
        {showIframe && currentUrl && (
          <div className="relative w-full bg-white" style={{ height: '320px' }}>
            <iframe
              key={currentUrl}
              src={currentUrl}
              title={currentTitle}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              onError={() => setShowIframe(false)}
            />
            {(status === 'loading' || status === 'browsing') && (
              <div className="absolute inset-0 bg-[#0d0d14]/60 flex items-center justify-center pointer-events-none">
                <div className="flex items-center gap-2 bg-[#111118]/90 border border-white/10 rounded-lg px-3 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                  <span className="text-xs text-white/70">ASH is browsing…</span>
                </div>
              </div>
            )}
          </div>
        )}
        {(!showIframe || !currentUrl) && status !== 'loading' && (
          <div className="h-48 flex items-center justify-center bg-[#0a0a10] text-white/20 text-xs">
            {status === 'loading' ? 'Loading…' : 'Preview not available for this site'}
          </div>
        )}

        {/* Action log */}
        <div className="border-t border-white/8">
          <button
            onClick={() => setLogCollapsed(p => !p)}
            className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-white/3 transition-colors"
          >
            <span className="text-[10px] text-white/40 font-mono uppercase tracking-wider">ASH Browser Log</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/30">{events.length} events</span>
              {logCollapsed ? <ChevronDown className="w-3 h-3 text-white/30" /> : <ChevronUp className="w-3 h-3 text-white/30" />}
            </div>
          </button>

          {!logCollapsed && (
            <div ref={logRef} className="max-h-40 overflow-y-auto px-3 pb-3 space-y-1">
              {events.length === 0 && (
                <div className="text-[11px] text-white/30 italic pt-1">Waiting for browser events…</div>
              )}
              {events.map((ev, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px] leading-snug">
                  <span className="mt-0.5 shrink-0">
                    {ev.type === 'navigate' && <Globe className="w-3 h-3 text-blue-400" />}
                    {ev.type === 'thinking' && <Loader2 className="w-3 h-3 text-violet-400 animate-spin" />}
                    {ev.type === 'action' && <span className="text-yellow-400">→</span>}
                    {ev.type === 'content' && <span className="text-white/30">📄</span>}
                    {ev.type === 'done' && <CheckCircle className="w-3 h-3 text-green-400" />}
                    {ev.type === 'error' && <AlertCircle className="w-3 h-3 text-red-400" />}
                  </span>
                  <span className={
                    ev.type === 'navigate' ? 'text-blue-300' :
                    ev.type === 'thinking' ? 'text-violet-300' :
                    ev.type === 'action' ? 'text-yellow-200' :
                    ev.type === 'done' ? 'text-green-300' :
                    ev.type === 'error' ? 'text-red-300' :
                    'text-white/50'
                  }>
                    {ev.description || ev.title || ev.message || ev.result?.slice(0, 120) || ev.type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Result box */}
        {status === 'done' && result && (
          <div className="border-t border-green-500/20 bg-green-500/5 px-3 py-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-green-400" />
              <span className="text-[11px] font-semibold text-green-400 uppercase tracking-wider">Browser Result</span>
            </div>
            <p className="text-xs text-white/80 leading-relaxed whitespace-pre-wrap">{result}</p>
          </div>
        )}
        {status === 'error' && (
          <div className="border-t border-red-500/20 bg-red-500/5 px-3 py-2">
            <span className="text-[11px] text-red-400">Browser session ended with an error. Check the log above.</span>
          </div>
        )}
      </div>
    </div>
  );
}
