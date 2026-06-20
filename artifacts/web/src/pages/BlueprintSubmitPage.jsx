
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import PageMeta from '@/components/PageMeta.jsx';
import AuthLayout from '@/components/AuthLayout.jsx';
import { motion } from 'framer-motion';
import { PlusCircle, ArrowLeft, Loader2, CheckCircle2, Info } from 'lucide-react';
import { toast } from 'sonner';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
};

const DIFFICULTY_OPTIONS = ['beginner', 'intermediate', 'advanced'];

const InputField = ({ label, name, value, onChange, placeholder, required, type = 'text', hint }) => (
  <div className="space-y-1.5">
    <label className="text-sm font-semibold text-foreground flex items-center gap-1">
      {label} {required && <span className="text-rose-400">*</span>}
    </label>
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      className="w-full bg-muted/20 border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
    />
  </div>
);

const BlueprintSubmitPage = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    difficulty: 'beginner',
    estimatedTime: '',
    estimatedCost: '',
    estimatedEarnings: '',
    requiredTools: '',
    setupSteps: '',
    priceCredits: '0',
  });

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Blueprint name is required');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/blueprints/submit', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          difficulty: form.difficulty,
          estimatedTime: form.estimatedTime.trim() || undefined,
          estimatedCost: form.estimatedCost.trim() || undefined,
          estimatedEarnings: form.estimatedEarnings.trim() || undefined,
          requiredTools: form.requiredTools.trim() || undefined,
          setupSteps: form.setupSteps.trim() || undefined,
          priceCredits: Math.min(500, Math.max(0, parseInt(form.priceCredits, 10) || 0)),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Submission failed');
      }
      setSubmitted(true);
      toast.success('Blueprint submitted for review!');
    } catch (err) {
      toast.error(err.message || 'Failed to submit blueprint');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <AuthLayout>
        <div className="max-w-2xl mx-auto pt-12 pb-24 px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-emerald-500/30 rounded-2xl p-10 text-center"
          >
            <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-5" />
            <h2 className="text-2xl font-bold text-foreground mb-3">Blueprint Submitted!</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Your blueprint has been submitted for admin review. You'll receive a notification once it's been approved or if any changes are needed.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link
                to="/blueprints"
                className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors"
              >
                Browse Blueprints
              </Link>
              <Link
                to="/dashboard"
                className="px-5 py-2.5 border border-border/50 text-muted-foreground rounded-xl font-semibold text-sm hover:text-foreground hover:border-primary/40 transition-colors"
              >
                My Dashboard
              </Link>
            </div>
          </motion.div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <PageMeta title="Submit Blueprint | Starks Global Group" description="Share your AI automation blueprint with the community." />
      <div className="max-w-2xl mx-auto pt-8 pb-24 px-4">

        {/* Back */}
        <Link to="/blueprints" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Blueprints
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                <PlusCircle className="w-5 h-5 text-violet-400" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Submit a Blueprint</h1>
            </div>
            <p className="text-muted-foreground text-sm">
              Share your AI automation system with the community. All submissions are reviewed by our team before going live.
            </p>
          </div>

          {/* Info banner */}
          <div className="flex items-start gap-3 p-4 bg-violet-500/10 border border-violet-500/20 rounded-xl mb-6">
            <Info className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
            <div className="text-sm text-violet-300">
              <p className="font-semibold mb-0.5">Revenue Share</p>
              <p>If you set a credit price, you'll earn <span className="font-bold text-violet-200">70% of every sale</span> directly to your wallet balance.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 bg-card border border-border/40 rounded-2xl p-6">

            <InputField
              label="Blueprint Name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. AI Lead Generation System"
              required
            />

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Describe what this blueprint does, who it's for, and what outcome it delivers..."
                rows={4}
                className="w-full bg-muted/20 border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">Difficulty Level</label>
              <div className="flex gap-2 flex-wrap">
                {DIFFICULTY_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, difficulty: opt }))}
                    className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all border ${
                      form.difficulty === opt
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/20 text-muted-foreground border-border/40 hover:border-primary/40 hover:text-foreground'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <InputField
                label="Estimated Time"
                name="estimatedTime"
                value={form.estimatedTime}
                onChange={handleChange}
                placeholder="e.g. 4-8 hours"
              />
              <InputField
                label="Estimated Cost"
                name="estimatedCost"
                value={form.estimatedCost}
                onChange={handleChange}
                placeholder="e.g. $0-50/mo"
              />
            </div>

            <InputField
              label="Estimated Earnings"
              name="estimatedEarnings"
              value={form.estimatedEarnings}
              onChange={handleChange}
              placeholder="e.g. $500-2,000/mo"
              hint="Realistic monthly earnings a user could expect from this system."
            />

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">Required Tools</label>
              <p className="text-xs text-muted-foreground">List the tools needed (comma-separated, e.g. OpenRouter, Zapier, Make.com)</p>
              <textarea
                name="requiredTools"
                value={form.requiredTools}
                onChange={handleChange}
                placeholder="OpenRouter, Zapier, Google Sheets..."
                rows={2}
                className="w-full bg-muted/20 border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">Setup Steps</label>
              <p className="text-xs text-muted-foreground">Walk users through building this system. Use numbered lines (1. Connect API, 2. Configure webhook…)</p>
              <textarea
                name="setupSteps"
                value={form.setupSteps}
                onChange={handleChange}
                placeholder={"1. Sign up for OpenRouter and get your API key\n2. Create a new Zapier workflow\n3. Configure the trigger..."}
                rows={6}
                className="w-full bg-muted/20 border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all resize-none font-mono"
              />
            </div>

            <InputField
              label="Price (Credits)"
              name="priceCredits"
              value={form.priceCredits}
              onChange={handleChange}
              placeholder="0"
              type="number"
              hint="Set to 0 for free, or 5–99 credits for paid. You earn 70% of every sale."
            />

            <button
              type="submit"
              disabled={isSubmitting || !form.name.trim()}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
              ) : (
                <><PlusCircle className="w-4 h-4" /> Submit for Review</>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </AuthLayout>
  );
};

export default BlueprintSubmitPage;
