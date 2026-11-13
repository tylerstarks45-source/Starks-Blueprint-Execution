import React from 'react';
import { levelColor } from '@/lib/ashApi.js';

// Semi-circular gauge, value 0-100.
export default function Gauge({ value = 0, label, sublabel, size = 120 }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const r = size / 2 - 10;
  const cx = size / 2;
  const cy = size / 2;
  const arc = Math.PI * r;
  const color = levelColor(v);
  const d = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  return (
    <div className="flex flex-col items-center" role="meter" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <svg width={size} height={size / 2 + 12} viewBox={`0 0 ${size} ${size / 2 + 12}`}>
        <path d={d} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" strokeLinecap="round" />
        <path d={d} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={arc} strokeDashoffset={arc * (1 - v / 100)}
          style={{ transition: 'stroke-dashoffset 0.8s ease', filter: `drop-shadow(0 0 6px ${color}88)` }} />
        <text x={cx} y={cy - 2} textAnchor="middle" fill="white" fontSize={size / 5} fontWeight="700" fontFamily="monospace">{v}</text>
      </svg>
      {label ? <div className="text-xs font-semibold text-white/80 -mt-1">{label}</div> : null}
      {sublabel ? <div className="text-[10px] text-white/40">{sublabel}</div> : null}
    </div>
  );
}
