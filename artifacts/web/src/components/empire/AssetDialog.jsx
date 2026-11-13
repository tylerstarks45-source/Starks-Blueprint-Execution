import React, { useState } from 'react';
import { toast } from 'sonner';
import { empireApi } from '@/lib/empireApi.js';
import { Modal, Field, input, btn, btnPrimary, Spinner, ErrorBox } from './ui.jsx';
import { useBusinessTypes, notifyEmpireChanged } from './useEmpireData.js';

export default function AssetDialog({ businesses, businessId, onClose }) {
  const { data } = useBusinessTypes();
  const [form, setForm] = useState({ name: '', classKey: 'website', businessId: String(businessId ?? ''), externalUrl: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const classes = Object.entries(data?.assetClasses ?? { website: 'Website' });

  const submit = async (e) => {
    e?.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = { name: form.name.trim(), classKey: form.classKey, businessId: form.businessId ? Number(form.businessId) : null };
      if (form.externalUrl.trim()) body.externalUrl = form.externalUrl.trim();
      if (form.description.trim()) body.description = form.description.trim();
      await empireApi.createAsset(body);
      toast.success('Saved to the Asset Vault');
      notifyEmpireChanged();
      onClose();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  return (
    <Modal
      title="Add asset"
      onClose={onClose}
      footer={<>
        <button type="button" className={btn} onClick={onClose}>Cancel</button>
        <button type="button" className={btnPrimary} disabled={saving || !form.name.trim()} onClick={submit}>{saving && <Spinner />} Save</button>
      </>}
    >
      <form onSubmit={submit} className="space-y-3">
        <Field label="Name"><input className={input} value={form.name} onChange={set('name')} maxLength={200} autoFocus /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kind">
            <select className={input} value={form.classKey} onChange={set('classKey')}>
              {classes.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Business">
            <select className={input} value={form.businessId} onChange={set('businessId')}>
              <option value="">Not assigned</option>
              {(businesses ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Link (optional)"><input className={input} value={form.externalUrl} onChange={set('externalUrl')} placeholder="https://" /></Field>
        <Field label="Description (optional)"><textarea className={input} rows={2} value={form.description} onChange={set('description')} maxLength={2000} /></Field>
        <ErrorBox>{error}</ErrorBox>
      </form>
    </Modal>
  );
}
