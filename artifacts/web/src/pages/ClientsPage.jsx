import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PageMeta from '@/components/PageMeta.jsx';
import AuthLayout from '@/components/AuthLayout.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useClient } from '@/contexts/ClientContext.jsx';
import { toast } from 'sonner';
import {
  Users, Plus, ExternalLink, Settings, Trash2, Loader2,
  ArrowRight, Briefcase, Activity, DollarSign, Link2, X,
  ChevronDown, Building2, LayoutDashboard,
} from 'lucide-react';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
};

const AGENCY_TIERS = new Set(['operator', 'empire', 'pro', 'enterprise']);

const HealthDot = ({ status }) => {
  const cls = status === 'healthy' ? 'bg-emerald-400' : status === 'degraded' ? 'bg-amber-400' : 'bg-zinc-500';
  return <span className={`w-2 h-2 rounded-full inline-block ${cls}`} />;
};

function CreateWorkspaceModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', logoUrl: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          name: form.name.trim(),
          logoUrl: form.logoUrl.trim() || null,
          notes: form.notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create workspace');
      }
      const workspace = await res.json();
      toast.success(`Client workspace "${workspace.name}" created`);
      onCreated(workspace);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border/60 rounded-2xl w-full max-w-md shadow-2xl"
      >
        <div className="flex items-center justify-between p-5 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">New Client Workspace</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">Client Name <span className="text-rose-400">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Acme Corp"
              required
              className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">Logo URL <span className="text-muted-foreground font-normal">(optional)</span></label>
            <input
              type="url"
              value={form.logoUrl}
              onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))}
              placeholder="https://example.com/logo.png"
              className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">Notes <span className="text-muted-foreground font-normal">(optional)</span></label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Internal notes about this client..."
              rows={3}
              className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-border/50 text-muted-foreground rounded-xl text-sm font-medium hover:border-primary/40 hover:text-foreground transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.name.trim()}
              className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 disabled:opacity-60 disabled:pointer-events-none transition-all flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {saving ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function ClientCard({ workspace, overview, onSwitch, onDelete, onRefreshPortal }) {
  const [deleting, setDeleting] = useState(false);
  const [showPortal, setShowPortal] = useState(false);
  const [portalUrl, setPortalUrl] = useState(null);
  const [refreshingPortal, setRefreshingPortal] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete workspace "${workspace.name}"? All associated systems will be unlinked.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/clients/${workspace.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Delete failed');
      toast.success(`"${workspace.name}" deleted`);
      onDelete(workspace.id);
    } catch {
      toast.error('Failed to delete workspace');
      setDeleting(false);
    }
  };

  const handleGetPortalLink = async () => {
    if (portalUrl) { setShowPortal(p => !p); return; }
    setRefreshingPortal(true);
    try {
      const res = await fetch(`/api/clients/${workspace.id}/portal-invite`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setPortalUrl(data.portalUrl);
      setShowPortal(true);
    } catch {
      toast.error('Failed to generate portal link');
    } finally {
      setRefreshingPortal(false);
    }
  };

  const copyPortalLink = () => {
    if (!portalUrl) return;
    navigator.clipboard.writeText(portalUrl);
    toast.success('Portal link copied!');
  };

  const revenueDollars = overview ? (overview.totalRevenueCents / 100).toFixed(2) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border/50 rounded-2xl p-5 flex flex-col gap-4 hover:border-primary/30 transition-all"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        {workspace.logoUrl ? (
          <img src={workspace.logoUrl} alt={workspace.name} className="w-10 h-10 rounded-lg object-cover shrink-0 bg-muted/30" />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-foreground truncate">{workspace.name}</h3>
          {workspace.notes && <p className="text-xs text-muted-foreground truncate mt-0.5">{workspace.notes}</p>}
        </div>
      </div>

      {/* Stats */}
      {overview ? (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted/20 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-foreground">{overview.systemsCount}</div>
            <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mt-0.5">Systems</div>
          </div>
          <div className="bg-muted/20 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-emerald-400">${revenueDollars}</div>
            <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mt-0.5">Revenue</div>
          </div>
          <div className="bg-muted/20 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-foreground">{overview.credentialsCount}</div>
            <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mt-0.5">Creds</div>
          </div>
        </div>
      ) : (
        <div className="h-16 flex items-center justify-center">
          <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
        </div>
      )}

      {/* Portal link (toggled) */}
      <AnimatePresence>
        {showPortal && portalUrl && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-primary/10 border border-primary/20 rounded-xl p-3"
          >
            <p className="text-xs text-muted-foreground mb-2 font-medium">Client portal link (read-only):</p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={portalUrl}
                className="flex-1 bg-transparent text-xs text-primary font-mono truncate outline-none"
              />
              <button onClick={copyPortalLink} className="text-primary hover:text-primary/80 shrink-0 transition-colors">
                <Link2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSwitch(workspace)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-primary/15 text-primary border border-primary/25 rounded-xl text-xs font-bold hover:bg-primary/25 transition-all"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          Manage
        </button>
        <button
          onClick={handleGetPortalLink}
          disabled={refreshingPortal}
          className="flex items-center justify-center gap-1 py-2 px-3 border border-border/50 text-muted-foreground rounded-xl text-xs font-medium hover:text-foreground hover:border-primary/30 transition-all disabled:opacity-60"
          title="Client portal"
        >
          {refreshingPortal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center justify-center py-2 px-3 border border-border/50 text-muted-foreground rounded-xl text-xs hover:text-rose-400 hover:border-rose-400/30 transition-all disabled:opacity-60"
          title="Delete workspace"
        >
          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </motion.div>
  );
}

const ClientsPage = () => {
  const { currentUser } = useAuth();
  const { setActiveWorkspace } = useClient();
  const navigate = useNavigate();

  const [workspaces, setWorkspaces] = useState([]);
  const [overviews, setOverviews] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const isAgencyTier = AGENCY_TIERS.has(currentUser?.membershipTier || '');
  const isAdmin = ['SUPER_ADMIN', 'FOUNDER_ADMIN', 'ADMIN', 'admin'].includes(currentUser?.role || '');

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/clients', { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setWorkspaces(data);
      // Load overviews in parallel
      const overviewResults = await Promise.allSettled(
        data.map(w =>
          fetch(`/api/clients/${w.id}/overview`, { headers: authHeaders() })
            .then(r => r.ok ? r.json() : null)
        )
      );
      const ovMap = {};
      overviewResults.forEach((result, i) => {
        if (result.status === 'fulfilled' && result.value) {
          ovMap[data[i].id] = result.value;
        }
      });
      setOverviews(ovMap);
    } catch {
      toast.error('Failed to load client workspaces');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreated = (workspace) => {
    setWorkspaces(prev => [...prev, workspace]);
    setShowCreate(false);
    // Load its overview
    fetch(`/api/clients/${workspace.id}/overview`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(ov => ov && setOverviews(prev => ({ ...prev, [workspace.id]: ov })))
      .catch(() => {});
  };

  const handleDelete = (id) => {
    setWorkspaces(prev => prev.filter(w => w.id !== id));
    setOverviews(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  const handleSwitch = (workspace) => {
    setActiveWorkspace({ id: workspace.id, name: workspace.name, logoUrl: workspace.logoUrl });
    toast.success(`Switched to "${workspace.name}"`);
    navigate('/systems');
  };

  return (
    <AuthLayout>
      <PageMeta title="Client Workspaces | Starks Global Group" description="Manage your agency client workspaces." />
      <div className="max-w-5xl mx-auto pt-8 pb-24 px-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Client Workspaces</h1>
            </div>
            <p className="text-sm text-muted-foreground ml-13">
              Manage separate workspaces for each client — systems, credentials, and revenue tracked independently.
            </p>
          </div>
          {(isAgencyTier || isAdmin) && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shrink-0"
            >
              <Plus className="w-4 h-4" /> New Client
            </button>
          )}
        </div>

        {/* Tier gate */}
        {!isAgencyTier && !isAdmin && (
          <div className="bg-card border border-amber-500/25 rounded-2xl p-8 text-center mb-8">
            <Briefcase className="w-12 h-12 text-amber-400 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-foreground mb-2">Operator Plan Required</h2>
            <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
              Client workspaces are available on the Operator plan and above. Upgrade to manage up to 10 clients from a single account.
            </p>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl font-semibold text-sm hover:bg-amber-500/30 transition-all"
            >
              View Plans <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : workspaces.length === 0 ? (
          <div className="bg-card border border-dashed border-border/60 rounded-2xl p-12 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="text-base font-semibold text-foreground mb-2">No client workspaces yet</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Create your first client workspace to start managing systems on behalf of clients.
            </p>
            {(isAgencyTier || isAdmin) && (
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all"
              >
                <Plus className="w-4 h-4" /> Create First Workspace
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspaces.map(w => (
              <ClientCard
                key={w.id}
                workspace={w}
                overview={overviews[w.id]}
                onSwitch={handleSwitch}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateWorkspaceModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </AuthLayout>
  );
};

export default ClientsPage;
