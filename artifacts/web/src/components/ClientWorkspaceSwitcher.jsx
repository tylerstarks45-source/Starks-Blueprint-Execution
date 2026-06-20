import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ChevronDown, Check, Plus, Loader2, User2 } from 'lucide-react';
import { useClient } from '@/contexts/ClientContext.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { toast } from 'sonner';
import { getAuthHeaders } from '@/lib/apiHeaders.js';

const AGENCY_TIERS = new Set(['operator', 'empire', 'pro', 'enterprise']);

const ClientWorkspaceSwitcher = ({ collapsed }) => {
  const { activeWorkspace, setActiveWorkspace, clearWorkspace } = useClient();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef(null);

  const isAgencyUser =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'FOUNDER_ADMIN' ||
    currentUser?.role === 'ADMIN' ||
    AGENCY_TIERS.has(currentUser?.membershipTier || '');

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchWorkspaces = async () => {
    if (loaded) return;
    setLoading(true);
    try {
      const res = await fetch('/api/clients', { headers: getAuthHeaders() });
      if (res.ok) setWorkspaces(await res.json());
    } catch {}
    setLoading(false);
    setLoaded(true);
  };

  const handleOpen = () => {
    setOpen(o => !o);
    if (!loaded) fetchWorkspaces();
  };

  const handleSelect = (ws) => {
    if (ws === null) {
      clearWorkspace();
      toast.success('Switched to your account');
    } else {
      setActiveWorkspace({ id: ws.id, name: ws.name, logoUrl: ws.logoUrl ?? null });
      toast.success(`Managing "${ws.name}"`);
    }
    setOpen(false);
  };

  if (!isAgencyUser) return null;

  // Collapsed: just a small icon button
  if (collapsed) {
    return (
      <div ref={ref} className="relative mx-2 mb-2">
        <button
          onClick={handleOpen}
          title={activeWorkspace ? `Client: ${activeWorkspace.name}` : 'My Account'}
          className={[
            'w-full flex items-center justify-center p-2 rounded-xl transition-all',
            activeWorkspace
              ? 'bg-primary/20 border border-primary/30 text-primary'
              : 'bg-white/5 border border-white/10 text-white/50 hover:text-white/80',
          ].join(' ')}
        >
          {activeWorkspace?.logoUrl ? (
            <img src={activeWorkspace.logoUrl} alt="" className="w-5 h-5 rounded object-cover" />
          ) : activeWorkspace ? (
            <Building2 className="w-5 h-5" />
          ) : (
            <User2 className="w-5 h-5" />
          )}
        </button>

        {open && (
          <div className="absolute left-full ml-2 top-0 w-56 bg-[#111] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
            <DropdownContent
              workspaces={workspaces}
              loading={loading}
              activeWorkspace={activeWorkspace}
              onSelect={handleSelect}
              navigate={navigate}
              onClose={() => setOpen(false)}
            />
          </div>
        )}
      </div>
    );
  }

  // Expanded: full-width button
  return (
    <div ref={ref} className="relative mx-3 mb-2">
      <button
        onClick={handleOpen}
        className={[
          'w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all text-left',
          activeWorkspace
            ? 'bg-primary/12 border-primary/25 text-foreground'
            : 'bg-white/4 border-white/8 text-white/60 hover:text-white/90 hover:bg-white/8',
        ].join(' ')}
      >
        <div className="flex items-center justify-center w-6 h-6 rounded-lg shrink-0 bg-white/8">
          {activeWorkspace?.logoUrl ? (
            <img src={activeWorkspace.logoUrl} alt="" className="w-4 h-4 rounded object-cover" />
          ) : activeWorkspace ? (
            <Building2 className="w-3.5 h-3.5 text-primary" />
          ) : (
            <User2 className="w-3.5 h-3.5 text-white/50" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-mono font-semibold tracking-wider uppercase text-white/30 leading-none mb-0.5">
            {activeWorkspace ? 'Managing Client' : 'Workspace'}
          </p>
          <p className="text-xs font-semibold truncate leading-none">
            {activeWorkspace ? activeWorkspace.name : 'My Account'}
          </p>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-white/30 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-1 bg-[#111] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
          <DropdownContent
            workspaces={workspaces}
            loading={loading}
            activeWorkspace={activeWorkspace}
            onSelect={handleSelect}
            navigate={navigate}
            onClose={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
};

function DropdownContent({ workspaces, loading, activeWorkspace, onSelect, navigate, onClose }) {
  return (
    <div>
      <div className="px-3 py-2 border-b border-white/8">
        <p className="text-[10px] font-mono text-white/30 uppercase tracking-wider">Switch Workspace</p>
      </div>

      {/* My Account option */}
      <button
        onClick={() => onSelect(null)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/6 transition-colors text-left"
      >
        <div className="w-6 h-6 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center shrink-0">
          <User2 className="w-3.5 h-3.5 text-white/50" />
        </div>
        <span className="flex-1 text-xs font-medium text-white/80 truncate">My Account</span>
        {!activeWorkspace && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
      </button>

      {loading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-4 h-4 text-white/30 animate-spin" />
        </div>
      )}

      {!loading && workspaces.length > 0 && (
        <div className="border-t border-white/6 py-1">
          {workspaces.map(ws => (
            <button
              key={ws.id}
              onClick={() => onSelect(ws)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/6 transition-colors text-left"
            >
              <div className="w-6 h-6 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
                {ws.logoUrl ? (
                  <img src={ws.logoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                )}
              </div>
              <span className="flex-1 text-xs font-medium text-white/80 truncate">{ws.name}</span>
              {activeWorkspace?.id === ws.id && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
            </button>
          ))}
        </div>
      )}

      {!loading && workspaces.length === 0 && (
        <p className="text-[11px] text-white/30 text-center py-4 px-3">No client workspaces yet</p>
      )}

      <div className="border-t border-white/8 p-2">
        <button
          onClick={() => { navigate('/clients'); onClose(); }}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold text-primary/70 hover:text-primary transition-colors rounded-lg hover:bg-primary/8"
        >
          <Plus className="w-3 h-3" /> Manage Clients
        </button>
      </div>
    </div>
  );
}

export default ClientWorkspaceSwitcher;
