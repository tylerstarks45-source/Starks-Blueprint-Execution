import React, { useState } from 'react';
import { toast } from 'sonner';
import { empireApi, label } from '@/lib/empireApi.js';
import { Modal, Field, input, btn, btnPrimary, Spinner, ErrorBox } from './ui.jsx';
import { useBusinessTypes, notifyEmpireChanged } from './useEmpireData.js';

// Create or edit an income stream. `stream` = existing row to edit.
export default function StreamDialog({ businesses, businessId, stream, onClose }) {
  const { data } = useBusinessTypes();
  const [form, setForm] = useState({
    businessId: String(stream?.businessId ?? businessId ?? businesses?.[0]?.id ?? ''),
    title: stream?.title ?? '',
    streamType: stream?.streamType ?? 'digital_products',
    status: stream?.status ?? 'projected',
    estimatedMonthlyRevenue: stream?.estimatedMonthlyRevenue ?? '',
    notes: stream?.metadata?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e?.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = {
        businessId: Number(form.businessId), title: form.title.trim(), streamType: form.streamType, status: form.status,
        estimatedMonthlyRevenue: form.estimatedMonthlyRevenue === '' ? null : Number(form.estimatedMonthlyRevenue),
        notes: form.notes,
      };
      if (stream) await empireApi.updateStream(stream.id, body); else await empireApi.createStream(body);
      toast.success(stream ? 'Income stream updated' : 'Income stream added');
      notifyEmpireChanged();
      onClose();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  return (
    <Modal
      title={stream ? 'Edit income stream' : 'New income stream'}
      onClose={onClose}
      footer={<>
        <button type="button" className={btn} onClick={onClose}>Cancel</button>
        <button type="button" className={btnPrimary} disabled={saving || !form.title.trim() || !form.businessId} onClick={submit}>{saving && <Spinner />} Save</button>
      </>}
    >
      <form onSubmit={submit} className="space-y-3">
        <Field label="Business">
          <select className={input} value={form.businessId} onChange={set('businessId')}>
            {(businesses ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>
        <Field label="Name"><input className={input} value={form.title} onChange={set('title')} maxLength={160} autoFocus placeholder="e.g. Monthly membership" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kind">
            <select className={input} value={form.streamType} onChange={set('streamType')}>
              {(data?.streamTypes ?? [form.streamType]).map((s) => <option key={s} value={s}>{label(s)}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className={input} value={form.status} onChange={set('status')}>
              <option value="projected">Projected (not earning yet)</option>
              <option value="active">Active (earning)</option>
              <option value="inactive">Paused</option>
              <option value="archived">Archived</option>
            </select>
          </Field>
        </div>
        <Field label="Estimated monthly revenue (USD, optional)" hint="An estimate only. Verified revenue comes from connected payment and sales sources.">
          <input className={input} type="number" min="0" step="1" value={form.estimatedMonthlyRevenue} onChange={set('estimatedMonthlyRevenue')} />
        </Field>
        <Field label="Notes (optional)"><textarea className={input} rows={2} value={form.notes} onChange={set('notes')} maxLength={2000} /></Field>
        <ErrorBox>{error}</ErrorBox>
      </form>
    </Modal>
  );
}
