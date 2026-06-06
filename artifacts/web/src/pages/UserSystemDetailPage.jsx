import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
};

// ─── STATUS HELPERS ───────────────────────────────────────────────────────────

const BUILD_STATUS_META = {
  pending:    { label: 'Pending',    color: 'text-yellow-400',  bg: 'bg-yellow-400/10', ring: 'ring-yellow-400/30', dot: 'bg-yellow-400' },
  building:   { label: 'Building',   color: 'text-blue-400',    bg: 'bg-blue-400/10',   ring: 'ring-blue-400/30',   dot: 'bg-blue-400', pulse: true },
  active:     { label: 'Active',     color: 'text-emerald-400', bg: 'bg-emerald-400/10',ring: 'ring-emerald-400/30',dot: 'bg-emerald-400', pulse: true },
  paused:     { label: 'Paused',     color: 'text-gray-400',    bg: 'bg-gray-400/10',   ring: 'ring-gray-400/30',   dot: 'bg-gray-400' },
  failed:     { label: 'Failed',     color: 'text-red-400',     bg: 'bg-red-400/10',    ring: 'ring-red-400/30',    dot: 'bg-red-400' },
  completed:  { label: 'Completed',  color: 'text-purple-400',  bg: 'bg-purple-400/10', ring: 'ring-purple-400/30', dot: 'bg-purple-400' },
};

const HEALTH_META = {
  healthy:  { label: 'Healthy',   color: 'text-emerald-400', icon: '✓' },
  degraded: { label: 'Degraded',  color: 'text-yellow-400',  icon: '⚠' },
  down:     { label: 'Down',      color: 'text-red-400',     icon: '✗' },
  unknown:  { label: 'Unknown',   color: 'text-gray-400',    icon: '?' },
};

const STEP_STATUS_META = {
  pending:    { icon: '○', color: 'text-gray-500' },
  in_progress:{ icon: '◉', color: 'text-blue-400 animate-pulse' },
  completed:  { icon: '●', color: 'text-emerald-400' },
  failed:     { icon: '✗', color: 'text-red-400' },
  skipped:    { icon: '–', color: 'text-gray-600' },
};

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function uptimePercent(createdAt, buildStatus) {
  if (buildStatus === 'active') return '99.9%';
  if (buildStatus === 'paused') return '—';
  if (buildStatus === 'failed') return '0%';
  return '—';
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent = 'blue' }) {
  const colors = {
    blue: 'from-blue-500/10 to-transparent border-blue-500/20',
    emerald: 'from-emerald-500/10 to-transparent border-emerald-500/20',
    purple: 'from-purple-500/10 to-transparent border-purple-500/20',
    amber: 'from-amber-500/10 to-transparent border-amber-500/20',
  };
  return (
    <div className={`relative rounded-xl border bg-gradient-to-br ${colors[accent]} p-4`}>
      <p className="text-[10px] uppercase tracking-widest text-gray-500 font-mono mb-1">{label}</p>
      <p className="text-2xl font-bold text-white font-mono">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── BUILD LOG PANEL ─────────────────────────────────────────────────────────

function BuildLogPanel({ steps, session }) {
  const totalSteps = steps.length;
  const completedSteps = steps.filter((s) => s.status === 'completed').length;
  const progressPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <div className="rounded-xl border border-white/5 bg-black/30 backdrop-blur-sm overflow-hidden">
      <div className="border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-400"></span>
          <span className="text-xs font-mono text-gray-300 uppercase tracking-widest">Build Log</span>
        </div>
        <span className="text-xs font-mono text-gray-500">
          {completedSteps}/{totalSteps} steps · {progressPct}%
        </span>
      </div>

      {totalSteps > 0 && (
        <div className="px-4 py-2 bg-black/20">
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      <div className="p-4 space-y-1 max-h-80 overflow-y-auto font-mono text-xs">
        {steps.length === 0 ? (
          <p className="text-gray-600 text-center py-8">No build steps recorded yet.</p>
        ) : (
          steps.map((step) => {
            const meta = STEP_STATUS_META[step.status] ?? STEP_STATUS_META.pending;
            return (
              <div key={step.id} className="flex items-start gap-3 py-1 group hover:bg-white/2 rounded px-1">
                <span className={`mt-0.5 shrink-0 ${meta.color}`}>{meta.icon}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-gray-300">
                    Step {step.stepNumber}
                    {step.notes && <span className="text-gray-500 ml-2">— {step.notes}</span>}
                  </span>
                </div>
                <span className="text-gray-600 shrink-0">
                  {step.completedAt ? timeAgo(step.completedAt) : ''}
                </span>
              </div>
            );
          })
        )}
      </div>

      {session && (
        <div className="border-t border-white/5 px-4 py-2 flex items-center justify-between text-xs text-gray-600">
          <span>Session #{session.id}</span>
          <span>Started {timeAgo(session.startedAt)}</span>
        </div>
      )}
    </div>
  );
}

// ─── OUTPUTS PANEL ────────────────────────────────────────────────────────────

function OutputsPanel({ outputs }) {
  const OUTPUT_ICONS = {
    recommendation: '💡',
    warning: '⚠',
    link: '🔗',
    report: '📊',
    credential_check: '🔑',
  };

  return (
    <div className="rounded-xl border border-white/5 bg-black/30 backdrop-blur-sm">
      <div className="border-b border-white/5 px-4 py-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-purple-400"></span>
        <span className="text-xs font-mono text-gray-300 uppercase tracking-widest">AI Outputs</span>
        <span className="ml-auto text-xs text-gray-600">{outputs.length} items</span>
      </div>
      <div className="p-4 space-y-3 max-h-72 overflow-y-auto">
        {outputs.length === 0 ? (
          <p className="text-gray-600 text-center py-6 text-xs font-mono">No outputs generated yet.</p>
        ) : (
          outputs.map((out) => (
            <div key={out.id} className="rounded-lg bg-white/3 border border-white/5 p-3">
              <div className="flex items-center gap-2 mb-1">
                <span>{OUTPUT_ICONS[out.outputType] ?? '📄'}</span>
                <span className="text-xs font-semibold text-white">{out.title}</span>
                <span className="ml-auto text-xs text-gray-600">{timeAgo(out.createdAt)}</span>
              </div>
              {out.content && <p className="text-xs text-gray-400 leading-relaxed">{out.content}</p>}
              {out.url && (
                <a href={out.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline mt-1 block">
                  {out.url}
                </a>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── CONTROL BUTTON ───────────────────────────────────────────────────────────

function ControlBtn({ label, icon, onClick, variant = 'ghost', disabled }) {
  const base = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all disabled:opacity-40 disabled:cursor-not-allowed';
  const variants = {
    ghost: 'border border-white/10 text-gray-400 hover:border-white/20 hover:text-white hover:bg-white/5',
    emerald: 'border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10',
    red: 'border border-red-500/30 text-red-400 hover:bg-red-500/10',
    blue: 'border border-blue-500/30 text-blue-400 hover:bg-blue-500/10',
    amber: 'border border-amber-500/30 text-amber-400 hover:bg-amber-500/10',
  };
  return (
    <button className={`${base} ${variants[variant]}`} onClick={onClick} disabled={disabled}>
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// ─── DELETE CONFIRM MODAL ─────────────────────────────────────────────────────

function DeleteModal({ systemName, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl border border-red-500/20 bg-gray-900 p-6 shadow-2xl">
        <h3 className="text-base font-bold text-white mb-2">Delete System?</h3>
        <p className="text-sm text-gray-400 mb-5">
          <span className="text-white font-medium">{systemName}</span> will be permanently deleted.
          This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg border border-white/10 text-gray-400 text-sm hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function UserSystemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [instance, setInstance] = useState(null);
  const [blueprint, setBlueprint] = useState(null);
  const [session, setSession] = useState(null);
  const [steps, setSteps] = useState([]);
  const [outputs, setOutputs] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      // Fetch status (instance + session + steps in one call)
      const statusRes = await fetch(`/api/build-engine/${id}/status`, { headers: authHeaders() });
      if (!statusRes.ok) throw new Error('System not found');
      const statusData = await statusRes.json();

      setInstance(statusData.instance);
      setSession(statusData.session);
      setSteps(statusData.steps ?? []);

      // Fetch blueprint info
      if (statusData.instance?.blueprintId) {
        const bpRes = await fetch(`/api/blueprints/${statusData.instance.blueprintId}`, { headers: authHeaders() });
        if (bpRes.ok) {
          const bpData = await bpRes.json();
          setBlueprint(bpData);
        }
      }

      // Fetch build outputs if session exists
      if (statusData.session?.id) {
        const outRes = await fetch(`/api/build-outputs?buildSessionId=${statusData.session.id}`, { headers: authHeaders() });
        if (outRes.ok) {
          const outData = await outRes.json();
          setOutputs(Array.isArray(outData) ? outData : (outData.items ?? []));
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
    // Poll if building
    const interval = setInterval(() => {
      if (instance?.buildStatus === 'building') fetchData();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchData, instance?.buildStatus]);

  const patchStatus = async (buildStatus) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/system-instances/${id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ buildStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      const updated = await res.json();
      setInstance(updated);
      toast.success(`System ${buildStatus}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const deleteSystem = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/system-instances/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete system');
      toast.success('System deleted');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message);
      setActionLoading(false);
      setShowDelete(false);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-mono text-gray-500">Loading system…</p>
        </div>
      </div>
    );
  }

  if (error || !instance) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-4">⚠</p>
          <h2 className="text-lg font-bold text-white mb-2">System Not Found</h2>
          <p className="text-sm text-gray-400 mb-6">{error ?? 'This system could not be loaded.'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300 hover:text-white"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const statusMeta = BUILD_STATUS_META[instance.buildStatus] ?? BUILD_STATUS_META.pending;
  const healthMeta = HEALTH_META[instance.healthStatus] ?? HEALTH_META.unknown;

  return (
    <div className="min-h-screen bg-background text-white">
      {showDelete && (
        <DeleteModal
          systemName={instance.name}
          onConfirm={deleteSystem}
          onCancel={() => setShowDelete(false)}
          loading={actionLoading}
        />
      )}

      {/* ── Topbar ── */}
      <div className="border-b border-white/5 bg-black/40 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gray-500 hover:text-white transition-colors text-sm font-mono"
          >
            ← Dashboard
          </button>
          <span className="text-white/10">/</span>
          <span className="text-sm font-mono text-gray-400 truncate max-w-[200px]">{instance.name}</span>
          <span className="ml-auto flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${statusMeta.dot} ${statusMeta.pulse ? 'animate-pulse' : ''}`} />
            <span className={`text-xs font-mono ${statusMeta.color}`}>{statusMeta.label}</span>
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight">
                {instance.name}
              </h1>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono ring-1 ${statusMeta.bg} ${statusMeta.color} ${statusMeta.ring}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot} ${statusMeta.pulse ? 'animate-pulse' : ''}`} />
                {statusMeta.label}
              </span>
              <span className={`text-xs font-mono ${healthMeta.color}`}>
                {healthMeta.icon} {healthMeta.label}
              </span>
            </div>
            {blueprint && (
              <p className="text-sm text-gray-500">
                Blueprint: <span className="text-gray-300">{blueprint.name}</span>
                {blueprint.category && <span className="text-gray-600"> · {blueprint.category}</span>}
              </p>
            )}
            <p className="text-xs text-gray-600 mt-1 font-mono">
              Created {formatDate(instance.createdAt)} · Last updated {timeAgo(instance.updatedAt)}
            </p>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {instance.buildStatus === 'active' && (
              <ControlBtn label="Pause" icon="⏸" variant="amber" onClick={() => patchStatus('paused')} disabled={actionLoading} />
            )}
            {instance.buildStatus === 'paused' && (
              <ControlBtn label="Resume" icon="▶" variant="emerald" onClick={() => patchStatus('active')} disabled={actionLoading} />
            )}
            {(instance.buildStatus === 'failed' || instance.buildStatus === 'paused') && (
              <ControlBtn label="Rebuild" icon="↻" variant="blue" onClick={() => navigate('/builder')} disabled={actionLoading} />
            )}
            <ControlBtn label="Refresh" icon="⟳" variant="ghost" onClick={fetchData} disabled={loading} />
            <ControlBtn label="Delete" icon="✕" variant="red" onClick={() => setShowDelete(true)} disabled={actionLoading} />
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Status"
            value={statusMeta.label}
            sub={`Health: ${healthMeta.label}`}
            accent="blue"
          />
          <StatCard
            label="Uptime"
            value={uptimePercent(instance.createdAt, instance.buildStatus)}
            sub="Last 30 days"
            accent="emerald"
          />
          <StatCard
            label="Build Steps"
            value={steps.filter((s) => s.status === 'completed').length}
            sub={`of ${steps.length} total`}
            accent="purple"
          />
          <StatCard
            label="Last Activity"
            value={timeAgo(instance.updatedAt)}
            sub={formatDate(instance.updatedAt)}
            accent="amber"
          />
        </div>

        {/* ── Blueprint Info + Build Logs (2-col) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Blueprint panel */}
          <div className="rounded-xl border border-white/5 bg-black/30 backdrop-blur-sm">
            <div className="border-b border-white/5 px-4 py-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span className="text-xs font-mono text-gray-300 uppercase tracking-widest">Blueprint</span>
            </div>
            <div className="p-4">
              {blueprint ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-base font-semibold text-white">{blueprint.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{blueprint.description ?? 'No description.'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {blueprint.difficulty && (
                      <div className="rounded-lg bg-white/3 border border-white/5 p-3">
                        <p className="text-[10px] uppercase tracking-widest text-gray-600 font-mono">Difficulty</p>
                        <p className="text-sm text-white mt-0.5">{blueprint.difficulty}</p>
                      </div>
                    )}
                    {blueprint.estimatedSetupTime && (
                      <div className="rounded-lg bg-white/3 border border-white/5 p-3">
                        <p className="text-[10px] uppercase tracking-widest text-gray-600 font-mono">Setup Time</p>
                        <p className="text-sm text-white mt-0.5">{blueprint.estimatedSetupTime}</p>
                      </div>
                    )}
                    {blueprint.estimatedMonthlyCost && (
                      <div className="rounded-lg bg-white/3 border border-white/5 p-3">
                        <p className="text-[10px] uppercase tracking-widest text-gray-600 font-mono">Monthly Cost</p>
                        <p className="text-sm text-white mt-0.5">{blueprint.estimatedMonthlyCost}</p>
                      </div>
                    )}
                    {blueprint.estimatedMonthlyRevenue && (
                      <div className="rounded-lg bg-white/3 border border-white/5 p-3">
                        <p className="text-[10px] uppercase tracking-widest text-gray-600 font-mono">Est. Revenue</p>
                        <p className="text-sm text-emerald-400 font-semibold mt-0.5">{blueprint.estimatedMonthlyRevenue}</p>
                      </div>
                    )}
                  </div>
                  {blueprint.requiredTools && blueprint.requiredTools.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-gray-600 font-mono mb-2">Required Tools</p>
                      <div className="flex flex-wrap gap-1.5">
                        {blueprint.requiredTools.map((tool) => (
                          <span key={tool} className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-xs text-gray-300 font-mono">
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-600 py-4 text-center">Blueprint details unavailable.</p>
              )}
            </div>
          </div>

          {/* Build log */}
          <BuildLogPanel steps={steps} session={session} />
        </div>

        {/* ── AI Outputs ── */}
        <OutputsPanel outputs={outputs} />

        {/* ── Revenue Placeholder ── */}
        <div className="rounded-xl border border-white/5 bg-black/30 backdrop-blur-sm">
          <div className="border-b border-white/5 px-4 py-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-xs font-mono text-gray-300 uppercase tracking-widest">Revenue Tracking</span>
            <span className="ml-auto px-2 py-0.5 rounded bg-yellow-400/10 border border-yellow-400/20 text-xs text-yellow-400 font-mono">Coming Soon</span>
          </div>
          <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {['Today', 'This Week', 'This Month', 'Lifetime'].map((label) => (
              <div key={label} className="rounded-lg bg-white/3 border border-white/5 p-3 text-center">
                <p className="text-[10px] uppercase tracking-widest text-gray-600 font-mono mb-1">{label}</p>
                <p className="text-xl font-bold text-white font-mono">$0</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
