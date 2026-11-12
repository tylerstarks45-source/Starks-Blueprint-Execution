import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Building2, Coins, Archive } from 'lucide-react';
import { empireApi, label } from '@/lib/empireApi.js';
import { input } from './ui.jsx';

export default function EmpireSearch() {
  const [q, setQ] = useState('');
  const [res, setRes] = useState(null);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (q.trim().length < 2) { setRes(null); return undefined; }
    const id = setTimeout(() => { empireApi.search(q.trim()).then(setRes).catch(() => setRes(null)); }, 250);
    return () => clearTimeout(id);
  }, [q]);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const total = res ? res.businesses.length + res.streams.length + res.assets.length : 0;
  const row = 'flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/5';
  return (
    <div ref={ref} className="relative w-full sm:w-72">
      <Search className="w-4 h-4 text-white/35 absolute left-3 top-1/2 -translate-y-1/2" />
      <input className={`${input} pl-9`} placeholder="Search businesses, streams, assets" aria-label="Search your empire"
        value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} />
      {open && res && (
        <div className="absolute z-30 mt-1 w-full rounded-xl border border-white/10 bg-[#0b0f1a] shadow-2xl max-h-80 overflow-y-auto py-1">
          {total === 0 && <p className="px-3 py-3 text-sm text-white/40">No matches</p>}
          {res.businesses.map((b) => <Link key={`b${b.id}`} to={`/business/${b.id}`} className={row}><Building2 className="w-3.5 h-3.5 text-cyan-300" />{b.name}</Link>)}
          {res.streams.map((s) => <Link key={`s${s.id}`} to={`/income-streams?businessId=${s.businessId ?? ''}`} className={row}><Coins className="w-3.5 h-3.5 text-emerald-300" />{s.title}<span className="ml-auto text-[10px] text-white/35">{label(s.streamType)}</span></Link>)}
          {res.assets.map((a) => <Link key={`a${a.id}`} to={`/asset-vault?businessId=${a.businessId ?? ''}`} className={row}><Archive className="w-3.5 h-3.5 text-violet-300" />{a.name}<span className="ml-auto text-[10px] text-white/35">{label(a.classKey)}</span></Link>)}
        </div>
      )}
    </div>
  );
}
