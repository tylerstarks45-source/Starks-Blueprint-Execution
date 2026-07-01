import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, ChevronDown, Check, Plus, Loader2, LayoutGrid } from 'lucide-react';
import { useBusiness } from '@/contexts/BusinessContext.jsx';
import { getAuthHeaders } from '@/lib/apiHeaders.js';

const BusinessSwitcher = ({ collapsed }) => {
  const { activeBusiness, setActiveBusiness } = useBusiness();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchBusinesses = async () => {
    if (loaded) return;
    setLoading(true);
    try {
      const res = await fetch('/api/businesses', { headers: getAuthHeaders() });
      if (res.ok) setBusinesses(await res.json());
    } catch {}
    setLoading(false);
    setLoaded(true);
  };

  // Keep the list fresh whenever the switcher is opened so newly imported
  // businesses show up without a full page reload.
  const handleOpen = () => {
    setOpen((o) => !o);
    setLoaded(false);
  };

  useEffect(() => {
    if (open) fetchBusinesses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSelect = (biz) => {
    setActiveBusiness({ id: biz.id, name: biz.name, businessType: biz.businessType });
    navigate(`/business/${biz.id}`);
    setOpen(false);
  };

  if (businesses.length < 2 && loaded && !activeBusiness) {
    // Nothing to switch between yet; still let the user open it once loaded
    // so they can navigate to "Manage Businesses" — fallthrough below.
  }

  const label = activeBusiness ? activeBusiness.name : 'My Businesses';

  if (collapsed) {
    return (
      <div ref={ref} className="relative mx-2 mb-2">
        <button
          onClick={handleOpen}
          title={label}
          className={[
            'w-full flex items-center justify-center p-2 rounded-xl transition-all',
            activeBusiness
              ? 'bg-primary/20 border border-primary/30 text-primary'
              : 'bg-white/5 border border-white/10 text-white/50 hover:text-white/80',
          ].join(' ')}
        >
          <Store className="w-5 h-5" />
        </button>

        {open && (
          <div className="absolute left-full ml-2 top-0 w-56 bg-[#111] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
            <DropdownContent
              businesses={businesses}
              loading={loading}
              activeBusiness={activeBusiness}
              onSelect={handleSelect}
              navigate={navigate}
              onClose={() => setOpen(false)}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative mx-3 mb-2">
      <button
        onClick={handleOpen}
        className={[
          'w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all text-left',
          activeBusiness
            ? 'bg-primary/12 border-primary/25 text-foreground'
            : 'bg-white/4 border-white/8 text-white/60 hover:text-white/90 hover:bg-white/8',
        ].join(' ')}
      >
        <div className="flex items-center justify-center w-6 h-6 rounded-lg shrink-0 bg-white/8">
          <Store className="w-3.5 h-3.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-mono font-semibold tracking-wider uppercase text-white/30 leading-none mb-0.5">
            Business
          </p>
          <p className="text-xs font-semibold truncate leading-none">{label}</p>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-white/30 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-1 bg-[#111] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
          <DropdownContent
            businesses={businesses}
            loading={loading}
            activeBusiness={activeBusiness}
            onSelect={handleSelect}
            navigate={navigate}
            onClose={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
};

function DropdownContent({ businesses, loading, activeBusiness, onSelect, navigate, onClose }) {
  return (
    <div>
      <div className="px-3 py-2 border-b border-white/8">
        <p className="text-[10px] font-mono text-white/30 uppercase tracking-wider">Switch Business</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-4 h-4 text-white/30 animate-spin" />
        </div>
      )}

      {!loading && businesses.length > 0 && (
        <div className="py-1 max-h-64 overflow-y-auto ash-scroll">
          {businesses.map((biz) => (
            <button
              key={biz.id}
              onClick={() => onSelect(biz)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/6 transition-colors text-left"
            >
              <div className="w-6 h-6 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
                <Store className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="flex-1 text-xs font-medium text-white/80 truncate">{biz.name}</span>
              {activeBusiness?.id === biz.id && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
            </button>
          ))}
        </div>
      )}

      {!loading && businesses.length === 0 && (
        <p className="text-[11px] text-white/30 text-center py-4 px-3">No businesses yet</p>
      )}

      <div className="border-t border-white/8 p-2 flex flex-col gap-1">
        <button
          onClick={() => { navigate('/business-portfolio'); onClose(); }}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold text-primary/70 hover:text-primary transition-colors rounded-lg hover:bg-primary/8"
        >
          <LayoutGrid className="w-3 h-3" /> View All Businesses
        </button>
        <button
          onClick={() => { navigate('/business-import'); onClose(); }}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold text-white/50 hover:text-white/80 transition-colors rounded-lg hover:bg-white/6"
        >
          <Plus className="w-3 h-3" /> Import Business
        </button>
      </div>
    </div>
  );
}

export default BusinessSwitcher;
