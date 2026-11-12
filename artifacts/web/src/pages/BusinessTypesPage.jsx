import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { toast } from 'sonner';
import { Shapes, Plus, Trash2 } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout.jsx';
import { Card, Badge, btn, btnPrimary, input, Field, Spinner, ErrorBox } from '@/components/empire/ui.jsx';
import { useBusinessTypes, notifyEmpireChanged } from '@/components/empire/useEmpireData.js';
import CreateBusinessDialog from '@/components/empire/CreateBusinessDialog.jsx';
import { empireApi, label } from '@/lib/empireApi.js';

export default function BusinessTypesPage() {
  const { data, error, loading } = useBusinessTypes();
  const [form, setForm] = useState({ name: '', description: '', streamTypes: [] });
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const types = data?.types ?? [];

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await empireApi.createType({ name: form.name.trim(), description: form.description.trim() || undefined, streamTypes: form.streamTypes });
      toast.success('Custom business type added');
      setForm({ name: '', description: '', streamTypes: [] });
      notifyEmpireChanged();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  };
  const remove = async (t) => {
    if (!window.confirm(`Delete the "${t.name}" type?`)) return;
    try { await empireApi.deleteType(t.key); toast.success('Type deleted'); notifyEmpireChanged(); } catch (err) { toast.error(err.message); }
  };
  const toggleStream = (s) => setForm((f) => ({ ...f, streamTypes: f.streamTypes.includes(s) ? f.streamTypes.filter((x) => x !== s) : [...f.streamTypes, s].slice(0, 10) }));

  return (
    <AuthLayout>
      <Helmet><title>Business Types | Starks Global Group</title></Helmet>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Shapes className="w-6 h-6 text-cyan-300" /> Business Types</h1>
            <p className="text-sm text-white/50 mt-1">The kinds of business you and ASH can start, with their usual income streams and assets. Add your own for anything not listed.</p>
          </div>
          <button type="button" className={btnPrimary} onClick={() => setCreating(true)}><Plus className="w-3.5 h-3.5" /> New business</button>
        </div>
        <ErrorBox>{error}</ErrorBox>
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 grid sm:grid-cols-2 gap-3 content-start">
            {loading && !data && <Spinner />}
            {types.map((t) => (
              <div key={t.key} className="rounded-xl border border-white/10 bg-black/60 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-white font-medium">{t.name}</p>
                    <p className="text-[10px] uppercase tracking-wider text-white/35">{label(t.category)}</p>
                  </div>
                  {t.builtin ? <Badge>built-in</Badge> : (
                    <span className="flex items-center gap-1"><Badge tone="violet">custom</Badge>
                      <button type="button" className="p-1 rounded hover:bg-red-500/10 text-white/40 hover:text-red-300" aria-label={`Delete ${t.name}`} onClick={() => remove(t)}><Trash2 className="w-3.5 h-3.5" /></button>
                    </span>
                  )}
                </div>
                {t.description && <p className="text-xs text-white/55 mt-2">{t.description}</p>}
                {t.streamTypes.length > 0 && <p className="text-[11px] text-emerald-200/70 mt-2">Streams: {t.streamTypes.map(label).join(', ')}</p>}
                {t.assetClasses.length > 0 && <p className="text-[11px] text-violet-200/70 mt-1">Assets: {t.assetClasses.map((a) => data?.assetClasses?.[a] ?? label(a)).join(', ')}</p>}
              </div>
            ))}
          </div>
          <Card title="Add a custom type" icon={Plus} className="self-start">
            <form onSubmit={create} className="space-y-3">
              <Field label="Name"><input className={input} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} maxLength={80} placeholder="e.g. Vending routes" /></Field>
              <Field label="Description (optional)"><textarea className={input} rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} maxLength={500} /></Field>
              <div>
                <p className="text-xs text-white/60 mb-1">Usual income streams</p>
                <div className="flex flex-wrap gap-1.5">
                  {(data?.streamTypes ?? []).map((s) => (
                    <button key={s} type="button" onClick={() => toggleStream(s)} aria-pressed={form.streamTypes.includes(s)}
                      className={`text-[11px] px-2 py-1 rounded-full border ${form.streamTypes.includes(s) ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200' : 'border-white/10 text-white/50 hover:text-white/80'}`}>{label(s)}</button>
                  ))}
                </div>
              </div>
              <button type="submit" className={btnPrimary} disabled={saving || form.name.trim().length < 2}>{saving && <Spinner />} Add type</button>
            </form>
          </Card>
        </div>
      </div>
      {creating && <CreateBusinessDialog onClose={() => setCreating(false)} />}
    </AuthLayout>
  );
}
