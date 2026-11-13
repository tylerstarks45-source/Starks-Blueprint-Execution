import React, { useState } from 'react';
import { toast } from 'sonner';
import { empireApi } from '@/lib/empireApi.js';
import { Modal, Field, input, btn, btnPrimary, Spinner, ErrorBox } from './ui.jsx';
import { useBusinessTypes, notifyEmpireChanged } from './useEmpireData.js';

export default function CreateBusinessDialog({ onClose, onCreated }) {
  const { data } = useBusinessTypes();
  const [form, setForm] = useState({ name: '', typeKey: '', websiteUrl: '', notes: '', createDefaultStreams: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const types = data?.types ?? [];
  const selected = types.find((t) => t.key === form.typeKey);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e?.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = { name: form.name.trim(), typeKey: form.typeKey, createDefaultStreams: form.createDefaultStreams };
      if (form.websiteUrl.trim()) body.websiteUrl = form.websiteUrl.trim();
      if (form.notes.trim()) body.notes = form.notes.trim();
      const res = await empireApi.createBusiness(body);
      toast.success(`${res.business.name} added to your empire`);
      notifyEmpireChanged();
      onCreated?.(res.business);
      onClose();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  return (
    <Modal
      title="New business"
      onClose={onClose}
      footer={<>
        <button type="button" className={btn} onClick={onClose}>Cancel</button>
        <button type="button" className={btnPrimary} disabled={saving || !form.name.trim() || !form.typeKey} onClick={submit}>{saving && <Spinner />} Create business</button>
      </>}
    >
      <form onSubmit={submit} className="space-y-3">
        <Field label="Business name"><input className={input} value={form.name} onChange={set('name')} maxLength={120} autoFocus placeholder="e.g. Northwind Candles" /></Field>
        <Field label="Business type" hint={selected?.description}>
          <select className={input} value={form.typeKey} onChange={set('typeKey')}>
            <option value="">Choose a type…</option>
            {['builtin', 'custom'].map((g) => {
              const opts = types.filter((t) => (g === 'builtin') === t.builtin);
              return opts.length ? (
                <optgroup key={g} label={g === 'builtin' ? 'Built-in types' : 'Your custom types'}>
                  {opts.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
                </optgroup>
              ) : null;
            })}
          </select>
        </Field>
        <Field label="Website (optional)"><input className={input} value={form.websiteUrl} onChange={set('websiteUrl')} placeholder="https://" /></Field>
        <Field label="What it does (optional)"><textarea className={input} rows={3} value={form.notes} onChange={set('notes')} maxLength={5000} /></Field>
        {selected?.streamTypes?.length > 0 && (
          <label className="flex items-start gap-2 text-sm text-white/70">
            <input type="checkbox" className="mt-1" checked={form.createDefaultStreams} onChange={set('createDefaultStreams')} />
            <span>Add this type's usual income streams as <b>projected</b>: {selected.streamTypes.map((s) => s.replace(/_/g, ' ')).join(', ')}. They count as earning only once real revenue is recorded.</span>
          </label>
        )}
        <ErrorBox>{error}</ErrorBox>
      </form>
    </Modal>
  );
}
