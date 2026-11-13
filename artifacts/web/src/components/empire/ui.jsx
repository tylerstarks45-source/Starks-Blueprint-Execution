import React, { useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';

export function Card({ title, icon: Icon, action, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-white/10 bg-black/60 p-4 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-2 mb-3">
          {title && <h2 className="flex items-center gap-2 text-sm font-semibold text-white/80 uppercase tracking-wider">{Icon && <Icon className="w-4 h-4 text-cyan-300" />}{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ icon: Icon, label, value, hint, tone = 'text-white' }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 text-white/50 text-xs uppercase tracking-wider">{Icon && <Icon className="w-3.5 h-3.5" />}{label}</div>
      <div className={`mt-2 text-2xl font-semibold tabular-nums ${tone}`}>{value}</div>
      {hint ? <div className="mt-1 text-xs text-white/40">{hint}</div> : null}
    </div>
  );
}

export function Badge({ children, tone = 'slate' }) {
  const tones = {
    slate: 'border-white/15 text-white/60',
    green: 'border-emerald-400/30 text-emerald-300 bg-emerald-400/10',
    amber: 'border-amber-400/30 text-amber-300 bg-amber-400/10',
    cyan: 'border-cyan-400/30 text-cyan-200 bg-cyan-400/10',
    violet: 'border-violet-400/30 text-violet-200 bg-violet-400/10',
    rose: 'border-rose-400/30 text-rose-300 bg-rose-400/10',
  };
  return <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border uppercase tracking-wider ${tones[tone]}`}>{children}</span>;
}

export const btn = 'text-xs px-3 py-2 rounded-lg border border-white/10 text-white/70 hover:text-white hover:bg-white/5 inline-flex items-center gap-1.5 disabled:opacity-50';
export const btnPrimary = 'text-xs px-3 py-2 rounded-lg border border-cyan-400/40 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20 inline-flex items-center gap-1.5 disabled:opacity-50';
export const input = 'w-full rounded-lg bg-black/60 border border-white/15 px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/60';

export function Field({ label: text, hint, children }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-white/60">{text}</span>
      {children}
      {hint && <span className="block text-[11px] text-white/35">{hint}</span>}
    </label>
  );
}

export function Modal({ title, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0b0f1a] shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 rounded hover:bg-white/10 text-white/50"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-white/10 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export const Spinner = ({ className = 'w-3.5 h-3.5' }) => <Loader2 className={`${className} animate-spin`} />;

export function ErrorBox({ children }) {
  return children ? <div className="rounded-xl border border-red-400/30 bg-red-500/10 text-red-200 text-sm p-3">{children}</div> : null;
}
