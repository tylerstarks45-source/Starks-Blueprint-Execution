import React, { useEffect, useRef, useState } from 'react';
import { Globe, RefreshCw, CheckCircle, AlertCircle, Loader2, ExternalLink, X, Camera, MousePointer, Keyboard, ChevronDown, ChevronUp } from 'lucide-react';

export default function BrowserView({ task, startUrl, authToken, onResult, onClose }) {
  const [events, setEvents] = useState([]);
  const [currentUrl, setCurrentUrl] = useState(startUrl || '');
  const [currentTitle, setCurrentTitle] = useState('');
  const [status, setStatus] = useState('loading'); // loading | browsing | done | error
  const [result, setResult] = useState('');
  const [screenshot, setScreenshot] = useState(null); // base64 JPEG from Playwright
  const [logCollapsed, setLogCollapsed] = useState(false);
  const logRef = useRef(null);
  const abortRef = useRef(null);
  const chatRef = useRef(null);

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
          addEvent({ type: 'error', message: `Server error ${resp.status}` });
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
          addEvent({ type: 'error', message: err.message });
        }
      }
    }

    stream();
    return () => { ctrl.abort(); };
  }, [task, startUrl, authToken]);

  function addEvent(event) {
    setEvents(prev => [...prev, { ...event, ts: Date.now() }].slice(-80));
  }

  function handleEvent(event) {
    addEvent(event);

    if (event.type === 'navigate') {
      setCurrentUrl(event.url || '');
      setCurrentTitle(event.title || event.url || '');
      setStatus('browsing');
    }

    // Playwright sends base64 JPEG screenshots on every snapshot event
    if (event.type === 'snapshot' && event.screenshot) {
      setScreenshot(event.screenshot);
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
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [events]);

  function handleClose() {
    abortRef.current?.abort();
    if (onClose) onClose();
  }

  const statusIcon = {
    loading: <Loader2 className="w-3 h-3 animate-spin text-blue-400" />,
    browsing: <Loader2 className="w-3 h-3 animate-spin text-violet-400" />,
    done: <CheckCircle className="w-3 h-3 text-green-400" />,
    error: <AlertCircle className="w-3 h-3 text-red-400" />,
  }[status];

  const statusLabel = {
    loading: 'Connecting…',
    browsing: 'Browsing…',
    done: 'Done',
    error: 'Error',
  }[status];

  const faviconUrl = currentUrl
    ? (() => { try { return `https://www.google.com/s2/favicons?domain=${new URL(currentUrl).hostname}&sz=16`; } catch { return null; } })()
    : null;

  // Latest thinking/action line to show in the overlay
  const latestActivity = [...events].reverse().find(e =>
    e.type === 'thinking' || e.type === 'action' || e.type === 'navigate'
  );

  return (
    <div className="rounded-xl border border-white/10 bg-[#0d0d14] overflow-hidden w-full">
      {/* Browser chrome bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#0a0a12] border-b border-white/8">
        <div className="flex gap-1.5 shrink-0">
          <button
            onClick={handleClose}
            className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors flex items-center justify-center group"
            title="Close browser"
          >
            <X className="w-1.5 h-1.5 text-red-900 opacity-0 group-hover:opacity-100" />
          </button>
          <div className="w-3 h-3 rounded-full bg-yellow-500/40" />
          <div className="w-3 h-3 rounded-full bg-green-500/40" />
        </div>

        <div className="flex-1 flex items-center gap-2 bg-black/40 border border-white/8 rounded-md px-2.5 py-1 min-w-0">
          {faviconUrl && (
            <img src={faviconUrl} alt="" className="w-3.5 h-3.5 shrink-0 rounded-sm" onError={e => { e.target.style.display = 'none'; }} />
          )}
          {!faviconUrl && <Globe className="w-3 h-3 text-white/20 shrink-0" />}
          <span className="text-[11px] text-white/45 font-mono truncate">{currentUrl || startUrl}</span>
          {status === 'done' && currentUrl && (
            <a href={currentUrl} target="_blank" rel="noopener noreferrer" className="ml-auto shrink-0" title="Open in new tab">
              <ExternalLink className="w-3 h-3 text-white/25 hover:text-white/60 transition-colors" />
            </a>
          )}
          {(status === 'loading' || status === 'browsing') && (
            <RefreshCw className="w-3 h-3 text-white/25 animate-spin shrink-0 ml-auto" />
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {statusIcon}
          <span className="text-[10px] text-white/35 font-mono">{statusLabel}</span>
        </div>
      </div>

      {/* Screenshot viewport — live JPEG from Playwright */}
      <div className="relative bg-[#0d0d14]" style={{ height: '400px' }}>
        {screenshot ? (
          <img
            src={`data:image/jpeg;base64,${screenshot}`}
            alt={currentTitle || 'Browser screenshot'}
            className="w-full h-full object-contain"
            style={{ background: '#fff' }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Globe className="w-5 h-5 text-blue-400 animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-xs text-white/50 font-mono">ASH Browser</p>
              <p className="text-[11px] text-white/25 mt-0.5 max-w-[200px] text-center">
                {status === 'loading' ? `Loading ${startUrl}…` : 'Navigating…'}
              </p>
            </div>
          </div>
        )}

        {/* Live activity overlay while browsing */}
        {(status === 'browsing' || status === 'loading') && latestActivity && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 bg-black/85 border border-white/15 backdrop-blur-sm rounded-lg px-2.5 py-1.5">
            <Loader2 className="w-3 h-3 animate-spin text-violet-400 shrink-0" />
            <span className="text-[11px] text-white/80 font-mono truncate">
              {latestActivity.description || latestActivity.title || 'Working…'}
            </span>
          </div>
        )}

        {/* Screenshot timestamp badge */}
        {screenshot && status === 'browsing' && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 border border-white/10 rounded px-1.5 py-0.5">
            <Camera className="w-2.5 h-2.5 text-white/40" />
            <span className="text-[9px] text-white/30 font-mono">live</span>
          </div>
        )}
      </div>

      {/* Activity log */}
      <div className="border-t border-white/8">
        <button
          onClick={() => setLogCollapsed(p => !p)}
          className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-white/3 transition-colors"
        >
          <span className="text-[10px] text-white/35 font-mono uppercase tracking-wider">ASH Activity Log</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/25">{events.length} events</span>
            {logCollapsed ? <ChevronDown className="w-3 h-3 text-white/25" /> : <ChevronUp className="w-3 h-3 text-white/25" />}
          </div>
        </button>

        {!logCollapsed && (
          <div ref={logRef} className="max-h-40 overflow-y-auto px-3 pb-3 space-y-1">
            {events.length === 0 && (
              <div className="text-[11px] text-white/25 italic pt-1">Starting browser session…</div>
            )}
            {events.filter(ev => ev.type !== 'snapshot').map((ev, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px] leading-snug">
                <span className="mt-0.5 shrink-0 w-3.5">
                  {ev.type === 'navigate' && <Globe className="w-3 h-3 text-blue-400" />}
                  {ev.type === 'thinking' && <Loader2 className="w-3 h-3 text-violet-400 animate-spin" />}
                  {ev.type === 'action' && <MousePointer className="w-3 h-3 text-yellow-400" />}
                  {ev.type === 'content' && <span className="text-white/20 text-[9px]">●</span>}
                  {ev.type === 'done' && <CheckCircle className="w-3 h-3 text-green-400" />}
                  {ev.type === 'error' && <AlertCircle className="w-3 h-3 text-red-400" />}
                </span>
                <span className={
                  ev.type === 'navigate' ? 'text-blue-300' :
                  ev.type === 'thinking' ? 'text-violet-300' :
                  ev.type === 'action' ? 'text-yellow-200' :
                  ev.type === 'done' ? 'text-green-300' :
                  ev.type === 'error' ? 'text-red-300' : 'text-white/35'
                }>
                  {ev.description || ev.title || ev.message || (ev.result?.slice(0, 120)) || ev.type}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Result panel — shown when done, stays until user closes */}
      {status === 'done' && result && (
        <div className="border-t border-green-500/15 bg-green-500/5 px-3 py-3">
          <div className="flex items-center gap-1.5 mb-2">
            <CheckCircle className="w-3.5 h-3.5 text-green-400" />
            <span className="text-[11px] font-semibold text-green-400 uppercase tracking-wider font-mono">ASH Browser Result</span>
            <button
              onClick={handleClose}
              className="ml-auto text-[10px] text-white/30 hover:text-white/60 border border-white/10 hover:border-white/25 rounded px-2 py-0.5 transition-colors font-mono"
            >
              Close Browser
            </button>
          </div>
          <p className="text-xs text-white/75 leading-relaxed whitespace-pre-wrap">{result}</p>
        </div>
      )}

      {status === 'error' && (
        <div className="border-t border-red-500/15 bg-red-500/5 px-3 py-2 flex items-center justify-between">
          <span className="text-[11px] text-red-400">Browser session ended with an error. Check the log above.</span>
          <button
            onClick={handleClose}
            className="text-[10px] text-white/30 hover:text-white/60 border border-white/10 hover:border-white/25 rounded px-2 py-0.5 transition-colors font-mono"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
