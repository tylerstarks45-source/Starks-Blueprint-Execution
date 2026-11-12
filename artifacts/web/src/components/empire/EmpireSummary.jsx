import React from 'react';
import { Link } from 'react-router-dom';
import { centsUsd, usd } from '@/lib/empireApi.js';
import { useOverview } from './useEmpireData.js';

// Compact, real-data empire summary for the dashboard and Builder.
export default function EmpireSummary({ compact = false }) {
  const { data, error } = useOverview();
  const t = data?.totals;
  const cells = t ? [
    ['Businesses', t.businesses, '#00c8ff'],
    ['Income streams', t.incomeStreams, '#22c55e'],
    ['Assets', t.assets, '#8b5cf6'],
    ['Verified 30d', t.businessesWithRevenueTracking ? centsUsd(t.verifiedRevenueCents.last30) : 'Not tracked', '#34d399'],
    ['Projected /mo', usd(t.projectedMonthlyUsd), '#f59e0b'],
    ['Approvals', t.pendingApprovals, '#f472b6'],
  ] : [];
  return (
    <div className="flex flex-col gap-1.5 h-full">
      <div className="flex items-center justify-between">
        <p className="text-[8px] uppercase tracking-[0.2em] font-bold text-cyan-300/60">Empire</p>
        <Link to="/empire" className="text-[8px] font-mono uppercase tracking-widest text-cyan-300/70 hover:text-cyan-200">Command Center →</Link>
      </div>
      {error && <p className="text-[10px] text-red-300/80">Couldn't load: {error}</p>}
      {!t && !error && <p className="text-[10px] text-white/40">Loading…</p>}
      {t && (
        <div className={`grid ${compact ? 'grid-cols-3' : 'grid-cols-2'} gap-x-2 gap-y-1.5 flex-1`}>
          {cells.map(([l, v, c]) => (
            <div key={l} className="min-w-0">
              <p className="text-sm font-black font-mono truncate" style={{ color: c }}>{typeof v === 'number' ? v.toLocaleString('en-US') : v}</p>
              <p className="text-[7px] uppercase tracking-wider text-white/35 truncate">{l}</p>
            </div>
          ))}
        </div>
      )}
      {t && <p className="text-[8px] text-white/30">Projected = estimates. Verified = synced provider sales only.</p>}
    </div>
  );
}
