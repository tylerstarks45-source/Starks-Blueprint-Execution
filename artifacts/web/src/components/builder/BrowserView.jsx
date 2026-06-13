import React, { useEffect, useRef, useState } from 'react';
import { Globe, RefreshCw, CheckCircle, AlertCircle, Loader2, ExternalLink, ChevronDown, ChevronUp, X } from 'lucide-react';

export default function BrowserView({ task, startUrl, authToken, onResult, onClose }) {
  const [events, setEvents] = useState([]);
  const [currentUrl, setCurrentUrl] = useState(startUrl || '');
  const [currentTitle, setCurrentTitle] = useState('');
  const [status, setStatus] = useState('loading'); // loading | browsing | done | error
  const [result, setResult] = useState('');
  const [snapshotBlobUrl, setSnapshotBlobUrl] = useState(null);
  const [logCollapsed, setLogCollapsed] = useState(false);
  const logRef = useRef(null);
  const abortRef = useRef(null);
  const blobUrlRef = useRef(null);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

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
    setEvents(prev => [...prev, event].slice(-60));
  }

  function handleEvent(event) {
    addEvent(event);

    if (event.type === 'navigate') {
      setCurrentUrl(event.url || '');
      setCurrentTitle(event.title || event.url || '');
      setStatus('browsing');
    }

    if (event.type === 'snapshot' && event.html) {
      // Inject base tag so relative resources resolve correctly
      const baseTag = `<base href="${event.url || ''}" target="_blank">`;
      const injected = event.html.includes('<head>')
        ? event.html.replace('<head>', `<head>${baseTag}`)
        : `${baseTag}${event.html}`;

      const blob = new Blob([injected], { type: 'text/html' });
      const url = URL.createObjectURL(blob);

      // Revoke old blob URL
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = url;
      setSnapshotBlobUrl(url);
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
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    if (onClose) onClose();
  }

  const statusIcon = {
    loading: <Loader2 className="w-3 h-3 animate-spin text-blue-400" />,
    browsing: <Loader2 className="w-3 h-3 animate-spin text-violet-400" />,
    done: <CheckCircle className="w-3 h-3 text-green-400" />,
    error: <AlertCircle className="w-3 h-3 text-red-400" />,
  }[status];

  const statusLabel = { loading: 'Connecting…', browsing: 'Browsing…', done: 'Done', error: 'Error' }[status];

  const faviconUrl = currentUrl
    ? (() => { try { return `https://www.google.com/s2/favicons?domain=${new URL(currentUrl).hostname}&sz=16`; } catch { return null; } })()
    : null;

  return (
    <div className="rounded-xl border border-white/10 bg-[#0d0d14] overflow-hidden w-full">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#0a0a12] border-b border-white/8">
        <div className="flex gap-1.5 shrink-0">
          <button onClick={handleClose} className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors flex items-center justify-center group">
            <X className="w-1.5 h-1.5 text-red-900 opacity-0 group-hover:opacity-100" />
          </button>
          <div className="w-3 h-3 rounded-full bg-yellow-500/40" />
          <div className="w-3 h-3 rounded-full bg-green-500/40" />
        </div>

        <div className="flex-1 flex items-center gap-2 bg-black/40 border border-white/8 rounded-md px-2.5 py-1 min-w-0">
          {faviconUrl && <img src={faviconUrl} alt="" className="w-3.5 h-3.5 shrink-0 rounded-sm" onError={e => e.target.style.display='none'} />}
          {!faviconUrl && <Globe className="w-3 h-3 text-white/20 shrink-0" />}
          <span className="text-[11px] text-white/45 font-mono truncate">{currentUrl || startUrl}</span>
          {status === 'done' && currentUrl && (
            <a href={currentUrl} target="_blank" rel="noopener noreferrer" className="ml-auto shrink-0">
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

      {/* Page viewport — shows blob-rendered HTML snapshot */}
      <div className="relative bg-white" style={{ height: '380px' }}>
        {snapshotBlobUrl ? (
          <iframe
            key={snapshotBlobUrl}
            src={snapshotBlobUrl}
            title={currentTitle}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <div className="w-full h-full bg-[#0d0d14] flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Globe className="w-5 h-5 text-blue-400 animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-xs text-white/50 font-mono">ASH Browser</p>
              <p className="text-[11px] text-white/25 mt-0.5 max-w-[200px] text-center">{status === 'loading' ? `Loading ${startUrl}…` : 'Navigating…'}</p>
            </div>
          </div>
        )}

        {/* Overlay while actively browsing */}
        {status === 'browsing' && snapshotBlobUrl && (
          <div className="absolute bottom-2 left-2 flex items-center gap-2 bg-black/80 border border-white/15 backdrop-blur-sm rounded-lg px-2.5 py-1.5">
            <Loader2 className="w-3 h-3 animate-spin text-violet-400" />
            <span className="text-[11px] text-white/70 font-mono">ASH is browsing…</span>
          </div>
        )}
      </div>

      {/* Action log */}
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
          <div ref={logRef} className="max-h-36 overflow-y-auto px-3 pb-3 space-y-1">
            {events.length === 0 && <div className="text-[11px] text-white/25 italic pt-1">Starting browser session…</div>}
            {events.map((ev, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px] leading-snug">
                <span className="mt-0.5 shrink-0 w-3.5">
                  {ev.type === 'navigate' && <Globe className="w-3 h-3 text-blue-400" />}
                  {ev.type === 'snapshot' && <span className="text-green-400 text-[9px] font-bold">📸</span>}
                  {ev.type === 'thinking' && <Loader2 className="w-3 h-3 text-violet-400 animate-spin" />}
                  {ev.type === 'action' && <span className="text-yellow-300 font-bold">→</span>}
                  {ev.type === 'content' && <span className="text-white/20 text-[9px]">●</span>}
                  {ev.type === 'done' && <CheckCircle className="w-3 h-3 text-green-400" />}
                  {ev.type === 'error' && <AlertCircle className="w-3 h-3 text-red-400" />}
                </span>
                <span className={
                  ev.type === 'navigate' ? 'text-blue-300' :
                  ev.type === 'snapshot' ? 'text-green-300' :
                  ev.type === 'thinking' ? 'text-violet-300' :
                  ev.type === 'action' ? 'text-yellow-200' :
                  ev.type === 'done' ? 'text-green-300' :
                  ev.type === 'error' ? 'text-red-300' : 'text-white/35'
                }>
                  {ev.description || ev.title || ev.message || (ev.result?.slice(0, 100)) || ev.type}
                  {ev.type === 'snapshot' && ' — Page snapshot captured'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Result */}
      {status === 'done' && result && (
        <div className="border-t border-green-500/15 bg-green-500/5 px-3 py-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-green-400" />
            <span className="text-[11px] font-semibold text-green-400 uppercase tracking-wider font-mono">Browser Result</span>
          </div>
          <p className="text-xs text-white/75 leading-relaxed whitespace-pre-wrap">{result}</p>
        </div>
      )}
      {status === 'error' && (
        <div className="border-t border-red-500/15 bg-red-500/5 px-3 py-2">
          <span className="text-[11px] text-red-400">Browser session ended with an error. Check the log above.</span>
        </div>
      )}
    </div>
  );
}
