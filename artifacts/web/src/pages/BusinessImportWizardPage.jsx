import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Building2, Check, Plus, Trash2,
  Loader2, Sparkles, Link2, Globe,
} from 'lucide-react';
import AuthLayout from '@/components/AuthLayout.jsx';
import { Helmet } from 'react-helmet';
import { toast } from 'sonner';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
};

const BUSINESS_TYPES = [
  'E-commerce', 'SaaS', 'Agency', 'Coaching / Course', 'Content / Media',
  'Local Service', 'Affiliate / Content Site', 'Marketplace', 'Other',
];

const REVENUE_MODELS = [
  'Subscription', 'One-time sales', 'Affiliate commissions', 'Ads',
  'Service fees', 'Course / digital product', 'Mixed', 'Not sure yet',
];

const CONNECTION_TYPES = [
  { key: 'social',              label: 'Social Media' },
  { key: 'email_provider',      label: 'Email Provider' },
  { key: 'payment_processor',   label: 'Payment Processor' },
  { key: 'crm',                 label: 'CRM' },
  { key: 'analytics',           label: 'Analytics' },
  { key: 'ads',                 label: 'Ad Platform' },
  { key: 'ecommerce_platform',  label: 'Ecommerce Platform' },
  { key: 'hosting',             label: 'Hosting / Website' },
  { key: 'other',               label: 'Other' },
];

const STEPS = ['Business Basics', 'Connect Platforms', 'Review & Import'];

function StepIndicator({ step }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((label, i) => (
        <React.Fragment key={label}>
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono border transition-all ${
                i < step
                  ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-400'
                  : i === step
                  ? 'bg-primary/20 border-primary/50 text-primary'
                  : 'bg-white/5 border-white/10 text-muted-foreground/40'
              }`}
            >
              {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={`text-xs font-mono hidden sm:inline ${i === step ? 'text-foreground font-semibold' : 'text-muted-foreground/50'}`}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && <div className="w-6 sm:w-10 h-px bg-white/10" />}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function BusinessImportWizardPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    businessType: '',
    revenueModel: '',
    websiteUrl: '',
    notes: '',
  });

  const [connections, setConnections] = useState([]);
  const [newConn, setNewConn] = useState({ connectionType: 'social', platformName: '', apiKeyValue: '' });

  const updateForm = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const addConnection = () => {
    if (!newConn.platformName.trim()) {
      toast.error('Enter a platform name (e.g. Instagram, Shopify)');
      return;
    }
    setConnections(prev => [...prev, { ...newConn, id: `${Date.now()}` }]);
    setNewConn({ connectionType: 'social', platformName: '', apiKeyValue: '' });
  };

  const removeConnection = (id) => setConnections(prev => prev.filter(c => c.id !== id));

  const canProceedStep0 = form.name.trim().length > 0;

  const handleBack = () => {
    if (step === 0) { navigate('/business-portfolio'); return; }
    setStep(s => s - 1);
  };

  const handleNext = () => {
    if (step === 0 && !canProceedStep0) {
      toast.error('Give your business a name to continue');
      return;
    }
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };

  const handleImport = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/businesses', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          name: form.name.trim(),
          businessType: form.businessType || undefined,
          revenueModel: form.revenueModel || undefined,
          websiteUrl: form.websiteUrl.trim() || undefined,
          notes: form.notes.trim() || undefined,
          origin: 'imported',
          status: 'active',
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create business');
      }
      const business = await res.json();

      for (const conn of connections) {
        try {
          await fetch(`/api/businesses/${business.id}/connections`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
              connectionType: conn.connectionType,
              platformName: conn.platformName.trim(),
              status: 'pending',
              metadata: conn.apiKeyValue ? { hasCredentialHint: true } : undefined,
            }),
          });
        } catch {
          // Best-effort: a failed connection shouldn't block the import.
        }
      }

      toast.success(`"${business.name}" imported successfully`);
      navigate(`/business-portfolio/${business.id}`);
    } catch (err) {
      toast.error(err.message || 'Failed to import business');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <Helmet><title>Import a Business · SBEP</title></Helmet>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-foreground font-mono mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-mono text-foreground">Import a Business</h1>
            <p className="text-xs text-muted-foreground/60 mt-0.5">Bring an existing business under ASH AI's management</p>
          </div>
        </div>

        <StepIndicator step={step} />

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              className="rounded-2xl border border-white/10 bg-black/70 p-6 space-y-5"
            >
              <div>
                <label className="block text-xs font-mono text-muted-foreground/70 mb-1.5">Business name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => updateForm('name', e.target.value)}
                  placeholder="e.g. Coastal Candle Co."
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:bg-white/8 transition-all"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-muted-foreground/70 mb-1.5">Business type</label>
                <div className="flex flex-wrap gap-2">
                  {BUSINESS_TYPES.map(type => (
                    <button
                      key={type}
                      onClick={() => updateForm('businessType', type)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        form.businessType === type
                          ? 'bg-primary/20 border border-primary/40 text-primary'
                          : 'bg-white/5 border border-white/10 text-muted-foreground/70 hover:text-foreground hover:bg-white/10'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-muted-foreground/70 mb-1.5">Revenue model</label>
                <div className="flex flex-wrap gap-2">
                  {REVENUE_MODELS.map(model => (
                    <button
                      key={model}
                      onClick={() => updateForm('revenueModel', model)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        form.revenueModel === model
                          ? 'bg-primary/20 border border-primary/40 text-primary'
                          : 'bg-white/5 border border-white/10 text-muted-foreground/70 hover:text-foreground hover:bg-white/10'
                      }`}
                    >
                      {model}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-muted-foreground/70 mb-1.5">Website URL</label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-muted-foreground/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={form.websiteUrl}
                    onChange={e => updateForm('websiteUrl', e.target.value)}
                    placeholder="https://yourbusiness.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:bg-white/8 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-muted-foreground/70 mb-1.5">Notes (optional)</label>
                <textarea
                  value={form.notes}
                  onChange={e => updateForm('notes', e.target.value)}
                  placeholder="Anything ASH should know about this business…"
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:bg-white/8 transition-all resize-none"
                />
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              className="rounded-2xl border border-white/10 bg-black/70 p-6 space-y-5"
            >
              <p className="text-xs text-muted-foreground/60">
                Add the platforms this business already uses. You can connect real credentials later from the Connections Hub — this just tells ASH what to look for.
              </p>

              {connections.length > 0 && (
                <div className="space-y-2">
                  {connections.map(conn => (
                    <div key={conn.id} className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center gap-2 min-w-0">
                        <Link2 className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                        <span className="text-sm text-foreground truncate">{conn.platformName}</span>
                        <span className="text-[10px] font-mono text-muted-foreground/50 uppercase">
                          {CONNECTION_TYPES.find(t => t.key === conn.connectionType)?.label}
                        </span>
                      </div>
                      <button onClick={() => removeConnection(conn.id)} className="text-muted-foreground/50 hover:text-rose-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-xl border border-dashed border-white/15 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={newConn.connectionType}
                    onChange={e => setNewConn(prev => ({ ...prev, connectionType: e.target.value }))}
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-foreground focus:outline-none focus:border-primary/40"
                  >
                    {CONNECTION_TYPES.map(t => (
                      <option key={t.key} value={t.key} className="bg-zinc-900">{t.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={newConn.platformName}
                    onChange={e => setNewConn(prev => ({ ...prev, platformName: e.target.value }))}
                    placeholder="Platform name (e.g. Shopify)"
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40"
                  />
                </div>
                <button
                  onClick={addConnection}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-foreground hover:bg-white/10 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Add platform
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              className="rounded-2xl border border-white/10 bg-black/70 p-6 space-y-5"
            >
              <div className="flex items-center gap-2 text-emerald-400">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-semibold">Ready to import</span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground/60">Name</span>
                  <span className="text-foreground font-medium">{form.name}</span>
                </div>
                {form.businessType && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground/60">Type</span>
                    <span className="text-foreground font-medium">{form.businessType}</span>
                  </div>
                )}
                {form.revenueModel && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground/60">Revenue model</span>
                    <span className="text-foreground font-medium">{form.revenueModel}</span>
                  </div>
                )}
                {form.websiteUrl && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground/60">Website</span>
                    <span className="text-foreground font-medium truncate max-w-[240px]">{form.websiteUrl}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground/60">Platforms</span>
                  <span className="text-foreground font-medium">{connections.length || 'None added'}</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground/50">
                After import, you'll land on the business detail page where you can connect real credentials and start assigning ASH AI systems to run it.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between mt-6">
          <button
            onClick={handleBack}
            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-muted-foreground hover:text-foreground transition-all"
          >
            {step === 0 ? 'Cancel' : 'Back'}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={handleNext}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleImport}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-60 transition-all"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {submitting ? 'Importing…' : 'Import Business'}
            </button>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}
