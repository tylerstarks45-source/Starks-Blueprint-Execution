import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Zap, X } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout.jsx';
import { Card, Badge, btn, Spinner, ErrorBox } from '@/components/empire/ui.jsx';
import { CAP_LABEL } from '@/components/empire/IncomeMission.jsx';
import { controlApi } from '@/lib/empireApi.js';

const TONE = { ready: 'green', connect: 'amber', manual: 'violet', missing: 'rose' };
const ORDER = ['connect', 'manual', 'missing', 'ready'];

export default function CapabilitiesPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const load = useCallback(() => controlApi.capabilities().then(setData).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  const dismiss = async (r) => {
    try { await controlApi.dismissCapabilityRequest(r.id); toast.success('Request dismissed'); load(); } catch (e) { toast.error(e.message); }
  };
  const caps = [...(data?.capabilities ?? [])].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));

  return (
    <AuthLayout>
      <Helmet><title>Capabilities | Starks Global Group</title></Helmet>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Zap className="w-6 h-6 text-cyan-300" /> Capabilities</h1>
          <p className="text-sm text-white/50 mt-1">What ASH can do for you right now. Plans are checked against this before you approve them. Connect services in <Link to="/connections" className="text-cyan-300 hover:underline">Connections</Link>.</p>
        </div>
        {error && <ErrorBox>{error}</ErrorBox>}
        {!data && !error && <Spinner className="w-5 h-5" />}
        {data && (
          <>
            <Card title={`Requests (${data.requests.length})`}>
              {data.requests.length === 0 ? <p className="text-sm text-white/50">Nothing is waiting. When a plan or mission needs something ASH can't do yet, it shows up here.</p> : (
                <ul className="divide-y divide-white/5">
                  {data.requests.map((r) => (
                    <li key={r.id} className="py-2 flex items-start justify-between gap-3 text-sm">
                      <div>
                        <div className="flex items-center gap-2"><Badge tone={TONE[r.kind]}>{CAP_LABEL[r.kind]}</Badge><span className="text-white">{r.name}</span></div>
                        <p className="text-xs text-white/50 mt-0.5">{r.reason}{r.missionId && <> · <Link to="/missions" className="text-cyan-300 hover:underline">mission #{r.missionId}</Link></>}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {r.kind === 'connect' && <Link to="/connections" className={btn}>Connect</Link>}
                        <button type="button" className={btn} onClick={() => dismiss(r)}><X className="w-3.5 h-3.5" /> Dismiss</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title="Everything ASH can do">
              <ul className="grid md:grid-cols-2 gap-2">
                {caps.map((c) => (
                  <li key={c.key} className="rounded-lg border border-white/10 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2"><span className="text-white">{c.name}</span><Badge tone={TONE[c.status]}>{CAP_LABEL[c.status]}</Badge></div>
                    <p className="text-xs text-white/50 mt-1">{c.note}</p>
                    {c.providers.length > 0 && <p className="text-[11px] text-white/40 mt-1">{c.providers.map((p) => `${p.name}${p.connected ? ' (connected)' : ''}`).join(' · ')}</p>}
                  </li>
                ))}
              </ul>
            </Card>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
