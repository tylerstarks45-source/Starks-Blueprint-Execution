import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, X, LayoutDashboard } from 'lucide-react';
import { useClient } from '@/contexts/ClientContext.jsx';
import { toast } from 'sonner';

const ClientWorkspaceSwitcher = ({ collapsed }) => {
  const { activeWorkspace, clearWorkspace } = useClient();
  const navigate = useNavigate();

  if (!activeWorkspace) return null;

  const handleClear = (e) => {
    e.stopPropagation();
    clearWorkspace();
    toast.success('Switched back to your account');
    navigate('/systems');
  };

  if (collapsed) {
    return (
      <div className="mx-2 mb-3">
        <button
          onClick={() => navigate('/clients')}
          title={`Client: ${activeWorkspace.name}`}
          className="w-full flex items-center justify-center p-2 bg-primary/15 border border-primary/25 rounded-xl hover:bg-primary/25 transition-all"
        >
          {activeWorkspace.logoUrl ? (
            <img src={activeWorkspace.logoUrl} alt={activeWorkspace.name} className="w-5 h-5 rounded object-cover" />
          ) : (
            <Building2 className="w-5 h-5 text-primary" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-3 mb-3">
      <div className="bg-primary/10 border border-primary/20 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
            {activeWorkspace.logoUrl ? (
              <img src={activeWorkspace.logoUrl} alt="" className="w-4 h-4 rounded object-cover" />
            ) : (
              <Building2 className="w-3.5 h-3.5 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-primary/70 uppercase tracking-wider">Managing Client</p>
            <p className="text-xs font-bold text-foreground truncate">{activeWorkspace.name}</p>
          </div>
          <button
            onClick={handleClear}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            title="Back to my account"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <button
          onClick={() => navigate('/clients')}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold text-primary/80 hover:text-primary transition-colors"
        >
          <LayoutDashboard className="w-3 h-3" />
          All Clients
        </button>
      </div>
    </div>
  );
};

export default ClientWorkspaceSwitcher;
