import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchBrainActivity, levelColor } from '@/lib/ashApi.js';

// Compact live view of ASH's brain regions, for the dashboard and builder.
export function useBrainActivity(intervalMs = 60000) {
  const [data, setData] = useState(null);
  useEffect(() => {
    let alive = true;
    const load = () => fetchBrainActivity().then((d) => { if (alive) setData(d); }).catch(() => {});
    load();
    const t = setInterval(load, intervalMs);
    return () => { alive = false; clearInterval(t); };
  }, [intervalMs]);
  return data;
}

export const overallLevel = (data) => {
  const s = data?.subsystems ?? [];
  return s.length ? Math.round(s.reduce((a, x) => a + x.level, 0) / s.length) : 0;
};

export default function BrainLevelsPanel({ data, compact = false }) {
  const navigate = useNavigate();
  const subsystems = data?.subsystems ?? [];
  return (
    <button type="button" onClick={() => navigate('/ash-brain')} className="w-full h-full text-left flex flex-col gap-1.5" aria-label="Open ASH Brain">
      <div className="flex items-center justify-between">
        <p className="text-[8px] uppercase tracking-[0.2em] font-bold" style={{ color: 'rgba(0,200,255,0.55)' }}>ASH Brain</p>
        <span className="text-[8px] font-mono text-white/40">open →</span>
      </div>
      {subsystems.length === 0 ? <p className="text-[10px] text-white/35 font-mono">Loading…</p> : (
        <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
          {subsystems.map((s) => (
            <div key={s.key} className="flex items-center gap-2" title={`${s.label}: ${s.level}%`}>
              <span className="w-16 shrink-0 text-[8px] font-mono uppercase text-white/50 truncate">{s.label}</span>
              <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${s.level}%`, background: levelColor(s.level) }} />
              </div>
              <span className="w-7 text-right text-[8px] font-mono text-white/45 tabular-nums">{s.level}</span>
            </div>
          ))}
        </div>
      )}
    </button>
  );
}
