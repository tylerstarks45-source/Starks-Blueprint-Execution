import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Zap, X, Plus, FlaskConical, Check, Trash2, Ban } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout.jsx';
import { Card, Badge, btn, btnPrimary, input, Modal, Spinner, ErrorBox } from '@/components/empire/ui.jsx';
import { CAP_LABEL } from '@/components/empire/IncomeMission.jsx';
import { controlApi } from '@/lib/empireApi.js';

const TONE = { ready: 'green', connect: 'amber', manual: 'violet', missing: 'rose' };
const ORDER = ['connect', 'manual', 'missing', 'ready'];
const INT_TONE = { draft: 'slate', tested: 'cyan', approved: 'green', disabled: 'rose' };
const EXAMPLE = JSON.stringify({
  name: 'Acme Podcasts', docsUrl: 'https://docs.acme.com/api', baseUrl: 'https://api.acme.com/v1',
  auth: { type: 'bearer', credentialKey: 'ACME_API_KEY' },
  actions: [{ name: 'listShows', method: 'GET', path: '/shows' }, { name: 'createEpisode', method: 'POST', path: '/shows/{showId}/episodes', kind: 'publish' }],
  capabilities: ['podcast_hosting'],
}, null, 2);

function Integrations({ onChange }) {
  const [items, setItems] = useState(null);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(null);
  const [testing, setTesting] = useState(null);
  const load = useCallback(() => controlApi.integrations().then(setItems).catch((e) => toast.error(e.message)), []);
  useEffect(() => { load(); }, [load]);
  const act = async (i, fn, done) => {
    setBusy(i.id);
    try { const r = await fn(); if (done) done(r); await load(); onChange(); } catch (e) { toast.error(e.message); } finally { setBusy(null); }
  };
  const save = async () => {
    let body;
    try { body = JSON.parse(editing); } catch { toast.error('Not valid JSON'); return; }
    try { await controlApi.defineIntegration(body); toast.success('Saved as draft. Test it, then approve it.'); setEditing(null); load(); } catch (e) { toast.error(e.message); }
  };
  const strip = ({ id, userId, key, status, lastTest, approvedAt, createdAt, updatedAt, ...rest }) => JSON.stringify(rest, null, 2);
  return (
    <Card title="Custom integrations" action={<button type="button" className={btn} onClick={() => setEditing(EXAMPLE)}><Plus className="w-3.5 h-3.5" /> Add</button>}>
      <p className="text-xs text-white/50 mb-3">Services ASH has no built-in connector for, defined from their API docs. Only the listed actions on the listed host can run. Each one needs a successful read-only test and your approval before ASH can use it, and any edit sends it back for re-approval. Save its key in <Link to="/connections" className="text-cyan-300 hover:underline">Connections</Link> under the credential name it uses.</p>
      {!items ? <Spinner /> : items.length === 0 ? <p className="text-sm text-white/50">None yet. Ask ASH: "Set up an integration for &lt;service&gt; from its API docs."</p> : (
        <ul className="divide-y divide-white/5">
          {items.map((i) => (
            <li key={i.id} className="py-3 text-sm space-y-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2"><span className="text-white">{i.name}</span><Badge tone={INT_TONE[i.status]}>{i.status}</Badge><span className="text-[11px] text-white/40">{i.baseUrl}</span></div>
                <div className="flex gap-2">
                  <button type="button" className={btn} disabled={busy === i.id} onClick={() => setTesting({ i, action: i.actions.find((a) => a.method === 'GET')?.name ?? '', params: '{}' })}><FlaskConical className="w-3.5 h-3.5" /> Test</button>
                  {(i.status === 'tested' || (i.status === 'disabled' && i.lastTest?.ok)) && <button type="button" className={btnPrimary} disabled={busy === i.id} onClick={() => act(i, () => controlApi.integrationAction(i.id, 'approve'), () => toast.success('Approved: ASH can use it now'))}><Check className="w-3.5 h-3.5" /> Approve</button>}
                  {i.status !== 'disabled' && <button type="button" className={btn} disabled={busy === i.id} onClick={() => act(i, () => controlApi.integrationAction(i.id, 'disable'))}><Ban className="w-3.5 h-3.5" /> Disable</button>}
                  <button type="button" className={btn} onClick={() => setEditing(strip(i))}>Edit</button>
                  <button type="button" className={btn} disabled={busy === i.id} onClick={() => act(i, () => controlApi.deleteIntegration(i.id))}><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <p className="text-xs text-white/60">{i.actions.map((a) => `${a.method} ${a.path}`).join(' · ')}</p>
              <p className="text-[11px] text-white/40">Provides: {i.capabilities.join(', ') || '—'} · Auth: {i.auth.type}{i.auth.credentialKey ? ` (${i.auth.credentialKey})` : ''}{i.lastTest && ` · Last test: ${i.lastTest.ok ? 'passed' : 'failed'} (${i.lastTest.action})`}</p>
            </li>
          ))}
        </ul>
      )}
      {testing && (
        <Modal title={`Test ${testing.i.name}`} onClose={() => setTesting(null)} footer={<><button type="button" className={btn} onClick={() => setTesting(null)}>Cancel</button><button type="button" className={btnPrimary} disabled={!testing.action || busy === testing.i.id} onClick={() => {
          let params;
          try { params = JSON.parse(testing.params || '{}'); } catch { toast.error('Params are not valid JSON'); return; }
          const { i, action } = testing;
          setTesting(null);
          act(i, () => controlApi.testIntegration(i.id, { action, params }), (r) => (r.result.ok ? toast.success('Test passed') : toast.error(`Test failed: ${r.result.error ?? r.result.status}`)));
        }}>Run test</button></>}>
          <p className="text-xs text-white/50 mb-2">Runs one read-only GET action against {testing.i.baseUrl}{testing.i.auth.credentialKey ? ` using your saved ${testing.i.auth.credentialKey}` : ''}.</p>
          <select className={input} value={testing.action} onChange={(e) => { const action = e.target.value; setTesting((t) => ({ ...t, action })); }}>
            {testing.i.actions.filter((a) => a.method === 'GET').map((a) => <option key={a.name} value={a.name}>{a.name} — GET {a.path}</option>)}
          </select>
          <textarea className={`${input} font-mono text-xs h-28 mt-2`} value={testing.params} onChange={(e) => { const params = e.target.value; setTesting((t) => ({ ...t, params })); }} spellCheck={false} aria-label="Params (JSON)" />
          <p className="text-[11px] text-white/40 mt-1">Params as JSON, e.g. {'{"id": "123"}'} for a path with {'{id}'}.</p>
        </Modal>
      )}
      {editing != null && (
        <Modal title="Integration definition" onClose={() => setEditing(null)} footer={<><button type="button" className={btn} onClick={() => setEditing(null)}>Cancel</button><button type="button" className={btnPrimary} onClick={save}>Save draft</button></>}>
          <textarea className={`${input} font-mono text-xs h-80`} value={editing} onChange={(e) => setEditing(e.target.value)} spellCheck={false} />
          <p className="text-[11px] text-white/40 mt-2">Never paste secrets here. Auth points at a credential name you save in Connections.</p>
        </Modal>
      )}
    </Card>
  );
}

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
            <Integrations onChange={load} />
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
