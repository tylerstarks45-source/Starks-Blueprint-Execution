import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { toast } from 'sonner';
import { Inbox, Check, X, SlidersHorizontal, Target } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout.jsx';
import { Card, Badge, btn, btnPrimary, input, Spinner, ErrorBox } from '@/components/empire/ui.jsx';
import { useEmpire, useOverview, notifyEmpireChanged } from '@/components/empire/useEmpireData.js';
import { controlApi, label } from '@/lib/empireApi.js';

const CATEGORY = { ashAction: 'ASH action', monitorOnly: 'Monitoring', draftContent: 'Draft content', schedulePosts: 'Scheduled posts', autoFixLowRisk: 'Low-risk fix', autoFixHighRisk: 'High-risk fix' };

export default function ApprovalsPage() {
  const [status, setStatus] = useState('pending');
  const approvals = useEmpire(() => controlApi.approvals(status), [status]);
  const overview = useOverview();
  const [busy, setBusy] = useState(null);
  const nameFor = (id) => overview.data?.businesses.find((b) => b.id === id)?.name;

  const resolve = async (a, action) => {
    setBusy(a.id);
    try {
      await controlApi.resolveApproval(a.id, action);
      toast.success(action === 'approve' ? 'Approved' : 'Rejected');
      approvals.reload(); notifyEmpireChanged();
    } catch (e) { toast.error(e.message); } finally { setBusy(null); }
  };
  const rows = approvals.data ?? [];

  return (
    <AuthLayout>
      <Helmet><title>Approvals | Starks Global Group</title></Helmet>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Inbox className="w-6 h-6 text-amber-300" /> Approvals</h1>
            <p className="text-sm text-white/50 mt-1">Everything ASH wants to do that your ASH Control settings hold for you, across all businesses.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <select className={`${input} !w-auto`} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
              <option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
            </select>
            <Link to="/missions" className={btn}><Target className="w-3.5 h-3.5" /> Missions</Link>
            <Link to="/ash-control" className={btn}><SlidersHorizontal className="w-3.5 h-3.5" /> ASH Control</Link>
          </div>
        </div>
        {approvals.error && <ErrorBox>{approvals.error}</ErrorBox>}
        <Card>
          {approvals.loading && !approvals.data ? <div className="py-8 flex justify-center text-white/50"><Spinner className="w-5 h-5" /></div>
            : !rows.length ? <p className="text-sm text-white/50 py-4">{status === 'pending' ? 'Nothing waiting for you.' : `No ${status} items.`}</p> : (
              <ul className="divide-y divide-white/5">
                {rows.map((a) => (
                  <li key={a.id} className="py-3 flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="text-sm text-white">{a.title}</div>
                      <div className="text-xs text-white/45 mt-1 flex flex-wrap gap-2 items-center">
                        <Badge tone={a.riskLevel === 'high' ? 'amber' : 'slate'}>{a.riskLevel} risk</Badge>
                        <span>{CATEGORY[a.category] ?? label(a.category)}</span>
                        <span>· {a.businessId ? nameFor(a.businessId) ?? `Business #${a.businessId}` : 'Whole empire'}</span>
                        {a.payload?.missionId && <Link to="/missions" className="underline">· Mission #{a.payload.missionId}</Link>}
                        <span>· {new Date(a.createdAt).toLocaleString()}</span>
                      </div>
                      {a.description && <p className="text-xs text-white/50 mt-1">Why: {a.description}</p>}
                    </div>
                    {a.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button type="button" className={btnPrimary} disabled={busy === a.id} onClick={() => resolve(a, 'approve')}>{busy === a.id ? <Spinner /> : <Check className="w-3.5 h-3.5" />} Approve</button>
                        <button type="button" className={btn} disabled={busy === a.id} onClick={() => resolve(a, 'reject')}><X className="w-3.5 h-3.5" /> Reject</button>
                      </div>
                    ) : <Badge tone={a.status === 'approved' ? 'green' : 'slate'}>{a.status}</Badge>}
                  </li>
                ))}
              </ul>
            )}
        </Card>
      </div>
    </AuthLayout>
  );
}
